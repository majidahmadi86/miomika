import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";
import { isValidAppRedirect } from "@/lib/auth/redirect-to";
import { log } from "@/lib/debug/log";

function resolveRequestedRedirect(request: NextRequest, bodyRedirect?: unknown): string | null {
  const fromQuery = request.nextUrl.searchParams.get("redirect_to");
  const candidate =
    (typeof bodyRedirect === "string" ? bodyRedirect : null) ??
    (fromQuery && isValidAppRedirect(fromQuery) ? fromQuery : null);
  return candidate && isValidAppRedirect(candidate) ? candidate : null;
}

/**
 * POST /api/auth/post-signup
 *
 * Called after the OAuth callback succeeds OR after onboarding completes.
 * Single source of truth for "where does this user go next?"
 *
 * Returns: { profile, redirect_to, celebrate }
 *  - profile        — ServerProfile (canonical)
 *  - redirect_to    — '/onboarding' | '/home' | '/home?celebrate=signup' | stored path
 *  - celebrate      — 'signup' | null
 */
export async function POST(request: NextRequest) {
  Sentry.setTag("flow", "oauth");

  let bodyRedirect: unknown;
  try {
    const body = await request.json();
    bodyRedirect = body?.redirect_to;
  } catch {
    bodyRedirect = undefined;
  }

  const profile = await getServerProfile();
  log("auth.post-signup", "called", {
    hasProfile: !!profile,
    onboarded: !!profile?.onboarding_completed_at,
    requestedRedirect: resolveRequestedRedirect(request, bodyRedirect),
  });

  if (!profile) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  void touchLastSeen(profile.id);

  const safeRedirect = resolveRequestedRedirect(request, bodyRedirect);

  let redirect_to: string;
  let celebrate: "signup" | null = null;

  if (!profile.onboarding_completed_at) {
    redirect_to = "/onboarding";
  } else if (safeRedirect) {
    redirect_to = safeRedirect;
  } else {
    const completedAt = new Date(profile.onboarding_completed_at).getTime();
    if (!Number.isNaN(completedAt) && Date.now() - completedAt < 30_000) {
      redirect_to = "/home?celebrate=signup";
      celebrate = "signup";
    } else {
      redirect_to = "/home";
    }
  }

  log("auth.post-signup", "resolved", { redirect_to, celebrate });
  return NextResponse.json({ profile, redirect_to, celebrate });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
