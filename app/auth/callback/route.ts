import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import * as Sentry from "@sentry/nextjs";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { pickLanguageFromAcceptLanguage } from "@/lib/i18n/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { log, logError } from "@/lib/debug/log";

/**
 * Supabase OAuth callback.
 *
 * Flow:
 *   1. Exchange the `code` query param for a session (sets sb-* cookies).
 *   2. Read the user's profile inline via getServerProfile() — same request
 *      context, so cookies are visible to next/headers().
 *   3. Pick redirect destination based on onboarding state.
 *   4. Redirect with the session cookies attached.
 *
 * Critical invariants:
 *   - Canonical host is www.miomika.com. Supabase Site URL must match.
 *   - Cookies are written onto ONE response object; the final redirect
 *     reuses its headers so Set-Cookie survives.
 *   - No internal fetch hop. getServerProfile() reads cookies directly.
 *
 * See /docs/HOW-THIS-WORKS.md §1 for the full flow.
 */
export async function GET(request: NextRequest) {
  Sentry.setTag("flow", "oauth");

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const isNewSignup = searchParams.get("signup") === "1";
  const nextOverride = searchParams.get("next");

  log("auth.callback", "received", {
    hasCode: !!code,
    isNewSignup,
    nextOverride: nextOverride ?? null,
    origin,
  });

  if (!code) {
    log("auth.callback", "no code, redirecting to login");
    return NextResponse.redirect(new URL("/login?error=oauth_no_code", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    log("auth.callback", "supabase env missing");
    return NextResponse.redirect(
      new URL("/login?error=oauth_not_configured", origin),
    );
  }

  // Build the response object up front. Supabase's setAll callback writes
  // cookies onto THIS response. We rewrite the Location header at the end
  // so the cookies travel with the final redirect.
  const response = NextResponse.redirect(new URL("/home", origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
          // Also write to the request cookies so getServerProfile() below
          // (which reads via next/headers cookies()) sees the fresh session.
          request.cookies.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logError("auth.callback", "exchange failed", error, {
      errorName: error.name,
      errorStatus: (error as { status?: number }).status,
    });
    Sentry.captureException(error, { tags: { stage: "exchange" } });
    return NextResponse.redirect(
      new URL("/login?error=oauth_exchange", origin),
    );
  }

  log("auth.callback", "exchanged session", {
    user: data.user?.email ?? "unknown",
    userId: data.user?.id ?? "unknown",
  });

  // Fire-and-forget welcome email for new signups. Never block the redirect.
  if (isNewSignup && data.user?.email) {
    const lang = pickLanguageFromAcceptLanguage(
      request.headers.get("accept-language"),
    );
    void sendWelcomeEmail(data.user.email, lang).catch((e) => {
      logError("auth.callback", "welcome email failed", e);
    });
  }

  // Read profile inline. Same request context — cookies are visible.
  const profile = await getServerProfile();
  log("auth.callback", "profile read", {
    hasProfile: !!profile,
    tier: profile?.tier ?? "none",
    onboarded: !!profile?.onboarding_completed_at,
  });

  // Pick redirect destination.
  let redirectTo: string;
  if (nextOverride && nextOverride.startsWith("/")) {
    // Honor explicit ?next= override from signup/login pages.
    redirectTo = nextOverride;
  } else if (!profile) {
    // Auth succeeded but no profile row — should be rare. Send to home and
    // let the client-side guard re-fetch.
    redirectTo = "/home";
  } else if (!profile.onboarding_completed_at) {
    // Brand-new user — show celebration page which marks onboarding done.
    redirectTo = "/onboarding";
  } else {
    // Returning user — straight to home. NO celebration replay.
    redirectTo = "/home";
  }

  log("auth.callback", "resolved redirect", { to: redirectTo });

  // Build the final redirect response, carrying the Set-Cookie headers from
  // the original response object so the session lands in the browser.
  const finalResponse = NextResponse.redirect(new URL(redirectTo, origin));
  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie);
  });

  return finalResponse;
}
