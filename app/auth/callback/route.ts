import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase OAuth callback. Exchanges the auth code in the URL for a session,
 * then redirects to /onboarding (new users) or /home (returners).
 *
 * The `next` query parameter overrides the default destination — login uses
 * `?next=/home`, signup uses `?next=/onboarding`.
 *
 * Phase 1, MIOMIKA.md §4.3 ("API /api/auth → auth callbacks") and §6.1 #3.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth_no_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", origin));
  }

  // Build the redirect response first so cookie writes propagate to the browser.
  const response = NextResponse.redirect(new URL(safeNext(next), origin));

  const supabase = createServerClient(url, key, {
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_exchange", origin));
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
