"use client";

/**
 * Minimal Phase-2 client-side session state. The real per-session AI engine
 * lives in lib/ai/session.ts (server side); this hook surfaces only what the
 * guidance system needs: exchange count, fuel, streak, pronunciation
 * failures, last action timestamp.
 *
 * Phase-2 default: returns a safe initial state. Talk-page sessions can push
 * updates through window events (`miomi:session-update`) or a future store.
 * The guidance engine reads what's available and degrades gracefully when
 * fields are missing.
 */

import { useEffect, useState } from "react";

export interface FuelState {
  heart: number;
  zap: number;
  brain: number;
}

export interface SessionStateShape {
  exchange_count: number;
  fuel: FuelState;
  streak_days: number;
  pronunciation_failures_current_word: number;
  last_action_at: number;
}

const DEFAULT_SESSION: SessionStateShape = {
  exchange_count: 0,
  fuel: { heart: 100, zap: 100, brain: 100 },
  streak_days: 0,
  pronunciation_failures_current_word: 0,
  last_action_at: Date.now(),
};

const EVENT_NAME = "miomi:session-update";

export function emitSessionUpdate(patch: Partial<SessionStateShape>): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: patch }));
}

export function useSessionState(): SessionStateShape {
  const [state, setState] = useState<SessionStateShape>(DEFAULT_SESSION);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Partial<SessionStateShape>>).detail;
      if (!detail) return;
      setState((curr) => ({ ...curr, ...detail, last_action_at: Date.now() }));
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  return state;
}
