import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { pickLanguageFromAcceptLanguage } from "@/lib/i18n/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { isValidAppRedirect } from "@/lib/auth/redirect-to";
import { recordReferralAttribution } from "@/lib/referral/record-attribution";
import { log, logError } from "@/lib/debug/log";

/**
 * Supabase OAuth callback.
 *
 *   1. Exchange ?code= for a session — sets sb-* cookies on response.
 *   2. Inline read profile via getServerProfile() — same request context.
 *   3. Redirect: /onboarding for new users, /home for returning.
 *
 * MUST run untouched by middleware. middleware.ts matcher excludes
 * /auth/callback explicitly. See STATE.md.
 */
export async function GET(request: NextRequest) {
  Sentry.setTag("flow", "oauth");

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextOverride = searchParams.get("next");
  const isNewSignup = searchParams.get("signup") === "1";

  log("auth.callback", "received", {
    hasCode: !!code,
    isNewSignup,
    nextOverride: nextOverride ?? null,
  });

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_no_code", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_not_configured", origin),
    );
  }

  // Single response object — Supabase writes session cookies onto it via
  // setAll. We rewrite the Location header at the end so cookies + final
  // destination travel together.
  const response = NextResponse.redirect(new URL("/home", origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
          // Also mirror onto the request so getServerProfile() below sees
          // the fresh session (cookies() from next/headers reads request).
          request.cookies.set(name, value);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logError("auth.callback", "exchange failed", error);
    Sentry.captureException(error, { tags: { stage: "exchange" } });
    return NextResponse.redirect(new URL("/login?error=oauth_exchange", origin));
  }

  log("auth.callback", "exchanged", {
    user: data.user?.email ?? "unknown",
  });

  // Fire-and-forget welcome email for explicit ?signup=1 callbacks.
  if (isNewSignup && data.user?.email) {
    const lang = pickLanguageFromAcceptLanguage(
      request.headers.get("accept-language"),
    );
    void sendWelcomeEmail(data.user.email, lang).catch((e) => {
      logError("auth.callback", "welcome email failed", e);
    });
  }

  // Referral attribution — no-ops unless a brand-new account arrived via an invite link.
  if (data.user?.id) {
    await recordReferralAttribution(
      data.user.id,
      request.cookies.get("mk_ref")?.value,
    );
  }

  // Resolve profile inline. Cookies just written are visible.
  const profile = await getServerProfile();
  log("auth.callback", "profile", {
    hasProfile: !!profile,
    onboarded: !!profile?.onboarding_completed_at,
  });

  let redirectTo: string;
  if (nextOverride && isValidAppRedirect(nextOverride)) {
    redirectTo = nextOverride;
  } else if (!profile) {
    redirectTo = "/home";
  } else if (!profile.onboarding_completed_at) {
    redirectTo = "/onboarding";
  } else {
    redirectTo = "/home";
  }

  log("auth.callback", "redirect", { to: redirectTo });

  // Final response carries the session cookies onto the resolved destination.
  const finalResponse = NextResponse.redirect(new URL(redirectTo, origin));
  for (const cookie of response.cookies.getAll()) {
    finalResponse.cookies.set(cookie);
  }
  finalResponse.cookies.set("mk_ref", "", { maxAge: 0, path: "/" });
  return finalResponse;
}
