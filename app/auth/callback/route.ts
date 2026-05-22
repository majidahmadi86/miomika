import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { pickLanguageFromAcceptLanguage } from "@/lib/i18n/server";

/**
 * Supabase OAuth callback. Exchanges the auth code in the URL for a session,
 * then redirects to /onboarding (new users) or /home (returners).
 *
 * Phase 1, MIOMIKA.md §4.3 ("API /api/auth → auth callbacks") and §6.1 #3.
 * Phase 3A: adds ?celebrate=signup for new signups + welcome email via Resend.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const isNewSignup = searchParams.get("signup") === "1";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_no_code", origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", origin));
  }

  // Determine destination — new signups land on /home with ?celebrate=signup
  const destPath = safeNext(next);
  const destUrl = new URL(destPath, origin);
  if (isNewSignup || next === "/onboarding") {
    destUrl.pathname = "/home";
    destUrl.searchParams.set("celebrate", "signup");
  }

  const response = NextResponse.redirect(destUrl);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange", origin));
  }

  // Send welcome email for new signups — fire-and-forget, never block redirect
  if ((isNewSignup || next === "/onboarding") && data.user?.email) {
    const lang = pickLanguageFromAcceptLanguage(request.headers.get("accept-language"));
    void sendWelcomeEmail(data.user.email, lang);
  }

  return response;
}

/**
 * Only allow same-origin in-app paths so an attacker cannot redirect off-site
 * via the `next` parameter.
 */
function safeNext(next: string): string {
  if (!next || typeof next !== "string") return "/home";
  if (!next.startsWith("/")) return "/home";
  if (next.startsWith("//")) return "/home";
  return next;
}
