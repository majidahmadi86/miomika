import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  UI_LANGUAGE_COOKIE,
  pickLanguageFromAcceptLanguage,
} from "@/lib/i18n/server";

const ONBOARDING_PREFIX = "/onboarding";
const UI_LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PREFIX || pathname.startsWith(`${ONBOARDING_PREFIX}/`);
}

/** Guests may visit every route; blocked list is intentionally empty */
function isGuestBlockedPath(_pathname: string): boolean {
  return false;
}

/** Logged-in only; guests explore from /home instead of a login wall */
function isAuthRequiredPath(pathname: string): boolean {
  return isOnboardingPath(pathname);
}

/**
 * Apply UI-language detection on first visit. Idempotent: only sets the cookie
 * when it's missing. The detection reads Accept-Language and falls back to
 * Thai (the primary market). The cookie persists for one year.
 */
function applyLanguageDetection(
  request: NextRequest,
  response: NextResponse,
): void {
  const existing = request.cookies.get(UI_LANGUAGE_COOKIE)?.value;
  if (existing === "th" || existing === "en") return;
  const detected = pickLanguageFromAcceptLanguage(
    request.headers.get("accept-language"),
  );
  response.cookies.set(UI_LANGUAGE_COOKIE, detected, {
    maxAge: UI_LANGUAGE_COOKIE_MAX_AGE,
    sameSite: "lax",
    path: "/",
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the OAuth callback handler run untouched — it manages its own
  // cookie writes via the redirect response.
  if (pathname.startsWith("/auth/callback")) {
    const passthrough = NextResponse.next({ request });
    applyLanguageDetection(request, passthrough);
    return passthrough;
  }

  const { response, user } = await updateSession(request);

  // Language detection runs on every non-API request so the cookie is set
  // before the first paint.
  if (!pathname.startsWith("/api")) {
    applyLanguageDetection(request, response);
  }

  if (pathname.startsWith("/api")) {
    return response;
  }

  if (!user && isGuestBlockedPath(pathname)) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (!user && isAuthRequiredPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
