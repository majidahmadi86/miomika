"use client";

/**
 * Zustand store for the ambient companion. Single source of truth for:
 *   - Miomi's current animation state (with priority-based transitions)
 *   - whether the sheet/panel is open
 *   - whether the companion button shows an unread pulse
 *
 * Replaces the Phase-1 CompanionStateContext. The Context shim still exists
 * in /components/companion/CompanionStateContext.tsx for backward compat with
 * any caller that hasn't migrated yet.
 *
 * MIOMIKA.md §2.5.
 */

import { create } from "zustand";
import type { MiomiAnimationState, CompanionStateLegacy } from "./types";
import { toAnimationState } from "./types";

const STATE_PRIORITY: Record<MiomiAnimationState, number> = {
  excited: 85,
  speaking: 65,
  happy: 70,
  listening: 55,
  low_fuel: 50,
  missing_user: 40,
  thinking: 35,
  idle: 30,
  playful: 20,
};

const STATE_DECAY_MS: Partial<Record<MiomiAnimationState, number>> = {
  happy: 5000,
  excited: 1200,
  speaking: 2000,
};

interface CompanionStoreState {
  state: MiomiAnimationState;
  isOpen: boolean;
  hasUnread: boolean;
  _decayTimer: number | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setUnread: (v: boolean) => void;
  requestState: (next: MiomiAnimationState | CompanionStateLegacy) => void;
}

function isLegacy(s: string): s is CompanionStateLegacy {
  return /^[A-Z_]+$/.test(s);
}

export const useCompanionStore = create<CompanionStoreState>((set, get) => ({
  state: "idle",
  isOpen: false,
  hasUnread: false,
  _decayTimer: null,

  open: () => {
    const prev = get();
    if (prev._decayTimer) {
      window.clearTimeout(prev._decayTimer);
    }
    set({ isOpen: true, hasUnread: false, _decayTimer: null });
  },

  close: () => set({ isOpen: false }),

  toggle: () => {
    if (get().isOpen) get().close();
    else get().open();
  },

  setUnread: (v) => set({ hasUnread: v }),

  requestState: (raw) => {
    const next: MiomiAnimationState = isLegacy(raw)
      ? toAnimationState(raw)
      : raw;
    const curr = get().state;
    const currPriority = STATE_PRIORITY[curr] ?? 0;
    const nextPriority = STATE_PRIORITY[next] ?? 0;
    if (nextPriority < currPriority) return;

    if (get()._decayTimer) {
      window.clearTimeout(get()._decayTimer!);
    }

    const decayMs = STATE_DECAY_MS[next];
    let timer: number | null = null;
    if (decayMs) {
      timer = window.setTimeout(() => {
        const now = get();
        if (now.state === next) {
          set({ state: "idle", _decayTimer: null });
        }
      }, decayMs);
    }

    set({ state: next, _decayTimer: timer });
  },
}));
