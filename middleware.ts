import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ONBOARDING_PREFIX = "/onboarding";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let the OAuth callback handler run untouched — it manages its own
  // cookie writes via the redirect response.
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next({ request });
  }

  const { response, user } = await updateSession(request);

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
