"use client";

/**
 * useGuidanceEngine — runs detection on context changes. Mounted once at
 * the AppShell layout level. Throttled so we don't recompute on every
 * keystroke.
 *
 * MIOMIKA.md §8 Phase 2 (Block D).
 */

import { useEffect, useRef } from "react";
import { useGuidanceStore } from "./store";
import { detectAllMoments } from "./triggers";
import type { GuidanceContext, GuidanceMoment } from "./types";

const PRIORITY_ORDER: Record<GuidanceMoment["priority"], number> = {
  firm: 3,
  medium: 2,
  soft: 1,
};

export function useGuidanceEngine(ctx: GuidanceContext): void {
  const currentMoment = useGuidanceStore((s) => s.currentMoment);
  const shownThisSession = useGuidanceStore((s) => s.shownThisSession);
  const setMoment = useGuidanceStore((s) => s.setMoment);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastCheckRef.current < 2000) return;
    lastCheckRef.current = now;

    if (currentMoment) return;

    const candidates = detectAllMoments({
      ...ctx,
      history: { moments_shown_this_session: shownThisSession },
    });
    if (candidates.length === 0) return;

    candidates.sort(
      (a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority],
    );
    const top = candidates[0]!;
    setMoment(top);
  }, [ctx, currentMoment, shownThisSession, setMoment]);
}
