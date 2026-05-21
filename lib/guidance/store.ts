"use client";

/**
 * Guidance Zustand store. The engine writes the current moment; the
 * GuidancePill subscribes; useGuidanceEngine throttles detection.
 *
 * Per-session memory of which triggers fired prevents re-spam.
 *
 * MIOMIKA.md §8 Phase 2 (Block D).
 */

import { create } from "zustand";
import type { GuidanceMoment, GuidanceTrigger } from "./types";

interface GuidanceStoreState {
  currentMoment: GuidanceMoment | null;
  shownThisSession: GuidanceTrigger[];
  setMoment: (m: GuidanceMoment) => void;
  clearMoment: () => void;
  reset: () => void;
}

export const useGuidanceStore = create<GuidanceStoreState>((set) => ({
  currentMoment: null,
  shownThisSession: [],

  setMoment: (m) =>
    set((state) => ({
      currentMoment: m,
      shownThisSession: state.shownThisSession.includes(m.trigger)
        ? state.shownThisSession
        : [...state.shownThisSession, m.trigger],
    })),

  clearMoment: () => set({ currentMoment: null }),

  reset: () => set({ currentMoment: null, shownThisSession: [] }),
}));
