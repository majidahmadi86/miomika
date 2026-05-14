"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export const GUEST_TAB_LOCK_COPY = {
  th: "สมัครฟรีเพื่อใช้งานนะคะ~",
  en: "Sign up free to unlock everything~",
} as const;

export const GUEST_SOFT_SIGNUP_COPY = {
  th: "อยากให้หนูช่วยโพสต์ไหมคะ? สมัครฟรีได้เลยนะ~",
  en: "Want help posting? You can sign up free~",
} as const;

type GuestInvitePhase = "none" | "tab_lock" | "soft_nudge";

type GuestExplorationContextValue = {
  /** True once auth has been checked and there is no session */
  isGuest: boolean;
  /** False until first getSession completes */
  authReady: boolean;
  guestInvitePhase: GuestInvitePhase;
  openLockedTabPrompt: () => void;
  openSoftSignupPrompt: () => void;
  dismissGuestInvite: () => void;
};

const GuestExplorationContext = createContext<GuestExplorationContextValue | null>(
  null,
);

const SOFT_NUDGE_SESSION_KEY = "miomika_guest_soft_nudge_shown";

export function GuestExplorationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [guestInvitePhase, setGuestInvitePhase] =
    useState<GuestInvitePhase>("none");

  const authReady = userId !== undefined;
  const isGuest = authReady && userId === null;

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      if (session?.user) {
        setGuestInvitePhase("none");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const openLockedTabPrompt = useCallback(() => {
    setGuestInvitePhase("tab_lock");
  }, []);

  /** Soft signup ask — at most one automatic timer per session; Create taps also use this. */
  const openSoftSignupPrompt = useCallback(() => {
    markSoftGuestNudgeServed();
    setGuestInvitePhase("soft_nudge");
  }, []);

  const dismissGuestInvite = useCallback(() => {
    setGuestInvitePhase("none");
  }, []);

  const value = useMemo(
    () => ({
      isGuest,
      authReady,
      guestInvitePhase,
      openLockedTabPrompt,
      openSoftSignupPrompt,
      dismissGuestInvite,
    }),
    [
      isGuest,
      authReady,
      guestInvitePhase,
      openLockedTabPrompt,
      openSoftSignupPrompt,
      dismissGuestInvite,
    ],
  );

  return (
    <GuestExplorationContext.Provider value={value}>
      {children}
    </GuestExplorationContext.Provider>
  );
}

export function useGuestExploration(): GuestExplorationContextValue {
  const ctx = useContext(GuestExplorationContext);
  if (!ctx) {
    throw new Error("useGuestExploration must be used within GuestExplorationProvider");
  }
  return ctx;
}

/** Fire at most once per browser tab session */
export function markSoftGuestNudgeServed(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SOFT_NUDGE_SESSION_KEY, "1");
  } catch {
    /* noop */
  }
}

export function hasSoftGuestNudgeBeenServed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SOFT_NUDGE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Home: after 30s, soft nudge if this session has not already seen the soft prompt */
export function useGuestHomeSoftNudgeTimer(
  isGuest: boolean,
  openSoftSignupPrompt: () => void,
): void {
  useEffect(() => {
    if (!isGuest) return;
    const id = window.setTimeout(() => {
      if (hasSoftGuestNudgeBeenServed()) return;
      openSoftSignupPrompt();
    }, 30_000);
    return () => window.clearTimeout(id);
  }, [isGuest, openSoftSignupPrompt]);
}
