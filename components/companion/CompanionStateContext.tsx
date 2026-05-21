"use client";

/**
 * CompanionStateContext — single source of truth for Miomi's state across
 * the ambient companion surface. MIOMIKA.md §2.5 + §2 (14-state machine).
 *
 * For Phase 1 we implement only the states the companion button currently
 * needs: IDLE, HAPPY, LISTENING, SPEAKING, CELEBRATION, LOW_FUEL,
 * MISSING_USER, PLAYFUL. SLEEPING and the higher-priority one-shots
 * (LEVEL_UP, WORD_MASTERED, PAYMENT_CONFIRMED, FIRST_FUEL_TAP) wire in
 * Phase 3.
 *
 * The companion *sheet* (the conversation surface) keeps its own message
 * state — we only model "what is Miomi feeling right now" here.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type CompanionState =
  | "IDLE"
  | "HAPPY"
  | "LISTENING"
  | "SPEAKING"
  | "CELEBRATION"
  | "LOW_FUEL"
  | "MISSING_USER"
  | "PLAYFUL";

const STATE_PRIORITY: Record<CompanionState, number> = {
  CELEBRATION: 85,
  LISTENING: 55,
  SPEAKING: 65,
  HAPPY: 70,
  PLAYFUL: 20,
  LOW_FUEL: 50,
  MISSING_USER: 40,
  IDLE: 30,
};

const STATE_DECAY_MS: Partial<Record<CompanionState, number>> = {
  HAPPY: 5000,
  CELEBRATION: 1200,
  SPEAKING: 2000,
};

type CompanionContextValue = {
  state: CompanionState;
  /** Mark companion as having an unread proactive message (pulsing pink dot). */
  hasUnread: boolean;
  setUnread: (v: boolean) => void;
  /** Open the conversation sheet/panel. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Request a state transition. Higher-priority states win; equal-priority
   * replaces and resets decay. Lower-priority requests are dropped. */
  requestState: (next: CompanionState) => void;
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CompanionState>("IDLE");
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const decayTimerRef = useRef<number | null>(null);

  const scheduleDecay = useCallback((s: CompanionState) => {
    if (decayTimerRef.current) {
      window.clearTimeout(decayTimerRef.current);
      decayTimerRef.current = null;
    }
    const ms = STATE_DECAY_MS[s];
    if (!ms) return;
    decayTimerRef.current = window.setTimeout(() => {
      decayTimerRef.current = null;
      setState((curr) => (curr === s ? "IDLE" : curr));
    }, ms);
  }, []);

  const requestState = useCallback(
    (next: CompanionState) => {
      setState((curr) => {
        const currPriority = STATE_PRIORITY[curr] ?? 0;
        const nextPriority = STATE_PRIORITY[next] ?? 0;
        if (nextPriority < currPriority) return curr;
        scheduleDecay(next);
        return next;
      });
    },
    [scheduleDecay],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const setUnread = useCallback((v: boolean) => setHasUnread(v), []);

  const value = useMemo<CompanionContextValue>(
    () => ({
      state,
      hasUnread,
      setUnread,
      isOpen,
      open,
      close,
      requestState,
    }),
    [state, hasUnread, isOpen, open, close, requestState, setUnread],
  );

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) {
    throw new Error("useCompanion must be used within CompanionProvider");
  }
  return ctx;
}
