"use client";

/**
 * GuidanceHost — mounts the guidance engine + pill at the app layout level.
 * Tracks user idle time and assembles the GuidanceContext from useProfile +
 * useSessionState.
 *
 * Hidden on /talk because the talk surface owns its own moment surface.
 *
 * MIOMIKA.md §8 Phase 2 (Block D — wire it everywhere).
 */

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useProfile } from "@/lib/auth/use-profile";
import { useSessionState } from "@/lib/ai/use-session-state";
import { useUILanguage } from "@/lib/i18n/client";
import { useCompanionStore } from "@/lib/companion/store";
import { useGuidanceEngine } from "@/lib/guidance/use-guidance";
import { useGuidanceStore } from "@/lib/guidance/store";
import { GuidancePill } from "./GuidancePill";
import type { GuidanceContext } from "@/lib/guidance/types";

const HIDDEN_ROUTES = new Set<string>(["/talk", "/login", "/signup"]);

export function GuidanceHost() {
  const pathname = usePathname();
  const { profile } = useProfile();
  const session = useSessionState();
  const lang = useUILanguage();
  const companionOpen = useCompanionStore((s) => s.isOpen);
  const shownThisSession = useGuidanceStore((s) => s.shownThisSession);
  const [idleSeconds, setIdleSeconds] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reset = () => setIdleSeconds(0);
    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "touchstart",
      "scroll",
      "keydown",
      "pointerdown",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const interval = window.setInterval(() => setIdleSeconds((s) => s + 1), 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      window.clearInterval(interval);
    };
  }, []);

  const ctx = useMemo<GuidanceContext>(
    () => ({
      user: {
        id: profile?.id ?? null,
        tier: profile?.tier ?? "guest",
        journey_stage: profile?.journey_stage ?? "unspecified",
        gender: profile?.gender ?? "neutral",
        last_seen_at: profile?.last_seen_at ?? null,
        welcome_shown_at: profile?.welcome_shown_at ?? null,
        onboarding_completed_at: profile?.onboarding_completed_at ?? null,
      },
      session: {
        exchange_count: session.exchange_count,
        fuel: session.fuel,
        streak_days: session.streak_days,
        pronunciation_failures_current_word: session.pronunciation_failures_current_word,
        idle_seconds: idleSeconds,
        last_action_at: session.last_action_at,
      },
      ui: {
        lang,
        pathname,
        companion_is_open: companionOpen,
      },
      history: { moments_shown_this_session: shownThisSession },
    }),
    [profile, session, lang, pathname, companionOpen, idleSeconds, shownThisSession],
  );

  useGuidanceEngine(ctx);

  if (HIDDEN_ROUTES.has(pathname)) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: 0,
        right: 0,
        zIndex: 55,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <GuidancePill />
    </div>
  );
}
