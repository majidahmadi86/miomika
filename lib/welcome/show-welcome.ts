/**
 * shouldShowWelcome — pure decision function.
 *
 * Centralizes the "single-show contract" for the welcome screen so home page
 * and any future entry points reason about it the same way. See
 * MIOMIKA.md §8 Phase 2 (Block A1).
 *
 * Decision order:
 *   1. localStorage flag set → no
 *   2. profile.welcome_shown_at set → no
 *   3. authenticated returner active in last 7 days → no
 *   4. otherwise → yes
 */

export const WELCOME_LOCAL_STORAGE_KEY = "miomika-welcomed-v1";

export interface WelcomeProfileLike {
  tier?: "guest" | "free" | "pro" | "pro_max" | null;
  last_seen_at?: string | null;
  welcome_shown_at?: string | null;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowWelcome(
  profile: WelcomeProfileLike | null,
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  if (storage) {
    try {
      if (storage.getItem(WELCOME_LOCAL_STORAGE_KEY)) return false;
    } catch {
      // private mode / quota — fall through to the profile checks
    }
  }

  if (profile?.welcome_shown_at) return false;

  if (profile && profile.tier && profile.tier !== "guest") {
    const last = profile.last_seen_at ? Date.parse(profile.last_seen_at) : NaN;
    if (Number.isFinite(last) && Date.now() - last < SEVEN_DAYS_MS) {
      return false;
    }
  }

  return true;
}

export function markWelcomeShownLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      WELCOME_LOCAL_STORAGE_KEY,
      new Date().toISOString(),
    );
  } catch {
    // private mode — best effort; in-session module guard still applies
  }
}
