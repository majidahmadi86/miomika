import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  UI_LANGUAGE_COOKIE,
  pickLanguageFromAcceptLanguage,
} from "@/lib/i18n/server";

const UI_LANG_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Middleware — single responsibility per concern.
 *
 *   1. /auth/callback : bypass entirely. Excluded from matcher AND
 *      guarded at runtime. Wrapping it strips its Set-Cookie headers
 *      on Android Chrome.
 *   2. /api/* : refresh the Supabase session token but don't redirect.
 *   3. Everything else : refresh session, set ui-language cookie if
 *      missing, redirect logged-out users only when explicitly required.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Belt and suspenders — even though the matcher excludes /auth/callback,
  // never wrap it under any circumstance.
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  // Set ui-language cookie if not already present (skip for API requests).
  if (!pathname.startsWith("/api")) {
    const existing = request.cookies.get(UI_LANGUAGE_COOKIE)?.value;
    if (existing !== "th" && existing !== "en") {
      const detected = pickLanguageFromAcceptLanguage(
        request.headers.get("accept-language"),
      );
      response.cookies.set(UI_LANGUAGE_COOKIE, detected, {
        maxAge: UI_LANG_MAX_AGE,
        sameSite: "lax",
        path: "/",
      });
    }
  }

  // Onboarding is the only currently-protected path; everything else is
  // open to guests. Add more here only when truly necessary.
  if (!user && pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the OAuth callback.
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|vad/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wasm|onnx|mjs)$).*)",
  ],
};
