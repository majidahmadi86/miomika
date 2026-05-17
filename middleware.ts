import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ONBOARDING_PREFIX = "/onboarding";

function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PREFIX || pathname.startsWith(`${ONBOARDING_PREFIX}/`);
}

/** Logged-in only; guests explore from /home instead of a login wall */
function isAuthRequiredPath(pathname: string): boolean {
  return isOnboardingPath(pathname);
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return response;
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
