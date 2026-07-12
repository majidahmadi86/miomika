// A rare, contextual line Miomi says on Home when a genuine "moment" fits —
// same restrained cadence as her stage-up/level-up bubbles, never a generic
// ad. Extend this list carefully: one TRUE, observable thing per entry
// (something she'd actually notice), never a cold sell. At most one shown
// per visit, gated so it can't repeat too often.

const SEEN_KEY = "miomika.featureMoment.lastSeenAt";
const MIN_GAP_DAYS = 4;

export type FeatureMoment = {
  id: string;
  line: { th: string; en: string };
  href: string;
};

function daysSince(iso: string | null): number {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * Returns at most one feature moment to show right now, or null if none
 * apply or the gap since the last one hasn't passed yet. Checked in
 * priority order — first match wins.
 */
export function pickFeatureMoment(profile: { tier: string; streak: number }): FeatureMoment | null {
  try {
    if (daysSince(window.localStorage.getItem(SEEN_KEY)) < MIN_GAP_DAYS) return null;
  } catch {
    return null;
  }

  // A free-tier learner with a real, earned streak — a warm celebration of
  // something true. Note: the bubble is not tappable (pointer-events-none,
  // by design, shared with all her other flavor lines) — so this is pure
  // affirmation, never an implied call-to-action. Any actual next step
  // belongs on a real, tappable card instead.
  if (profile.tier === "free" && profile.streak >= 3) {
    return {
      id: "free_streak_pro",
      line: {
        th: `${profile.streak} วันติดกันแล้วนะ เก่งมากเลยค่ะ~ 🐾`,
        en: `${profile.streak} days together already — you're doing so well 🐾`,
      },
      href: "/pricing",
    };
  }

  return null;
}

export function markFeatureMomentSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
  } catch {
    /* non-fatal */
  }
}
