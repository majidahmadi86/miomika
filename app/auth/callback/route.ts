import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { pickLanguageFromAcceptLanguage } from "@/lib/i18n/server";

/**
 * Supabase OAuth callback. Exchanges the auth code in the URL for a session,
 * then delegates to /api/auth/post-signup to decide the redirect destination.
 *
 * /api/auth/post-signup is the canonical "what should this user see next?"
 * router — see /docs/AUTH-FLOW.md.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const isNewSignup = searchParams.get("signup") === "1";

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

  const fallbackResponse = NextResponse.redirect(new URL("/home", origin));
  const collectedCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          collectedCookies.push({ name, value, options });
          fallbackResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_exchange", origin),
    );
  }

  // Send welcome email for new signups — fire-and-forget, never block redirect.
  if (isNewSignup && data.user?.email) {
    const lang = pickLanguageFromAcceptLanguage(request.headers.get("accept-language"));
    void sendWelcomeEmail(data.user.email, lang);
  }

  // Delegate redirect choice to the canonical post-signup route. Forward the
  // freshly-set session cookies so the request is authenticated.
  let redirectTo = "/home";
  try {
    const forwardedCookies = mergeCookieHeader(
      request.headers.get("cookie"),
      collectedCookies,
    );
    const res = await fetch(`${origin}/api/auth/post-signup`, {
      method: "POST",
      headers: { Cookie: forwardedCookies },
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as { redirect_to?: string };
      if (typeof json.redirect_to === "string" && json.redirect_to.startsWith("/")) {
        redirectTo = json.redirect_to;
      }
    }
  } catch {
    /* fall through to default redirect */
  }

  // CRITICAL: copy cookies from fallbackResponse (which Supabase wrote to) onto
  // the final response. The setAll callback only writes to fallbackResponse,
  // so we must transfer those cookies to whatever response we actually return.
  const finalResponse = NextResponse.redirect(new URL(redirectTo, origin));

  // Transfer all cookies that fallbackResponse collected (these are the sb-* tokens)
  fallbackResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      maxAge: cookie.maxAge,
    });
  });

  return finalResponse;
}

/**
 * Merge the request's existing Cookie header with any cookies the OAuth
 * exchange just set so the post-signup request sees the live session.
 */
function mergeCookieHeader(
  existing: string | null,
  added: { name: string; value: string }[],
): string {
  const map = new Map<string, string>();
  if (existing) {
    existing.split(/;\s*/).forEach((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) map.set(name, value);
    });
  }
  for (const { name, value } of added) {
    map.set(name, value);
  }
  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
