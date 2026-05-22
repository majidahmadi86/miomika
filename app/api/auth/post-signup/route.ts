import { NextResponse } from "next/server";
import { getServerProfile, touchLastSeen } from "@/lib/auth/get-server-profile";

/**
 * POST /api/auth/post-signup
 *
 * Called after the OAuth callback succeeds OR after onboarding completes.
 * Single source of truth for "where does this user go next?"
 *
 * Returns: { profile, redirect_to, celebrate }
 *  - profile        — ServerProfile (canonical)
 *  - redirect_to    — '/onboarding' | '/home' | '/home?celebrate=signup'
 *  - celebrate      — 'signup' | null
 */
export async function POST() {
  const profile = await getServerProfile();

  if (!profile) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  void touchLastSeen(profile.id);

  let redirect_to: string;
  let celebrate: "signup" | null = null;

  if (!profile.onboarding_completed_at) {
    redirect_to = "/onboarding";
  } else {
    const completedAt = new Date(profile.onboarding_completed_at).getTime();
    if (!Number.isNaN(completedAt) && Date.now() - completedAt < 30_000) {
      redirect_to = "/home?celebrate=signup";
      celebrate = "signup";
    } else {
      redirect_to = "/home";
    }
  }

  return NextResponse.json({ profile, redirect_to, celebrate });
}

export async function GET() {
  return POST();
}
