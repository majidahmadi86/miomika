"use client";

/**
 * useProfile — minimal client-side profile hook.
 *
 * Fetches the authenticated user's public.users row plus auth metadata in one
 * pass. Returns null for guests (no session). Used by:
 *   - WelcomeScreen (welcome_shown_at, tier, last_seen_at)
 *   - AppShell guidance engine context
 *   - any client component that needs typed profile data
 *
 * Phase-2 minimal: no SWR/react-query caching layer. We rely on Supabase's
 * own in-memory caches and the cookie session. Phase 3 wires real-time
 * subscriptions if needed.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setUILanguageCookie } from "@/lib/i18n/client";

export type Tier = "guest" | "free" | "pro" | "pro_max";
export type JourneyStage =
  | "tourist"
  | "student"
  | "worker"
  | "resident"
  | "unspecified";
export type Gender = "masculine" | "feminine" | "neutral";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: Tier;
  journey_stage: JourneyStage | null;
  gender: Gender | null;
  level: number | null;
  streak: number | null;
  last_seen_at: string | null;
  welcome_shown_at: string | null;
  onboarding_completed_at: string | null;
  ui_language: "th" | "en" | null;
  learning_target_language: "th" | "en" | null;
  active_character_id: string | null;
  miomi_stars: number | null;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  authReady: boolean;
}

/**
 * Returns the current profile. While loading, profile is null and `loading`
 * is true — callers should gate on `authReady` before treating null as
 * "no session".
 */
export function useProfile(): ProfileState {
  const [state, setState] = useState<ProfileState>({
    profile: null,
    loading: true,
    authReady: false,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        if (cancelled) return;
        setState({ profile: null, loading: false, authReady: true });
        return;
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select(
          "id, email, display_name, tier, journey_stage, gender, level, streak, last_seen_at, welcome_shown_at, onboarding_completed_at, ui_language, learning_target_language, active_character_id, miomi_stars",
        )
        .eq("id", user.id)
        .maybeSingle();

      // DIAGNOSTIC: remove after verifying
      console.log("[useProfile] query result:", {
        user_id: user.id,
        data: row ? { tier: (row as { tier?: string }).tier, email: (row as { email?: string }).email } : null,
        error: error ? { message: error.message, code: (error as { code?: string }).code } : null,
      });

      if (cancelled) return;
      if (error || !row) {
        setState({
          profile: {
            id: user.id,
            email: user.email ?? null,
            display_name: null,
            tier: "free",
            journey_stage: null,
            gender: null,
            level: 1,
            streak: 0,
            last_seen_at: null,
            welcome_shown_at: null,
            onboarding_completed_at: null,
            ui_language: null,
            learning_target_language: null,
            active_character_id: "miomi",
            miomi_stars: 0,
          },
          loading: false,
          authReady: true,
        });
        return;
      }

      setState({
        profile: {
          id: row.id as string,
          email: (row.email as string | null) ?? user.email ?? null,
          display_name: (row.display_name as string | null) ?? null,
          tier: ((row.tier as Tier) ?? "free"),
          journey_stage: (row.journey_stage as JourneyStage | null) ?? null,
          gender: (row.gender as Gender | null) ?? null,
          level: (row.level as number | null) ?? 1,
          streak: (row.streak as number | null) ?? 0,
          last_seen_at: (row.last_seen_at as string | null) ?? null,
          welcome_shown_at: (row.welcome_shown_at as string | null) ?? null,
          onboarding_completed_at: (row.onboarding_completed_at as string | null) ?? null,
          ui_language: (row.ui_language as "th" | "en" | null) ?? null,
          learning_target_language:
            (row.learning_target_language as "th" | "en" | null) ?? null,
          active_character_id: (row.active_character_id as string | null) ?? "miomi",
          miomi_stars: (row.miomi_stars as number | null) ?? 0,
        },
        loading: false,
        authReady: true,
      });
    }

    void load();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        void load();
      } else if (event === "SIGNED_OUT") {
        if (cancelled) return;
        setState({ profile: null, loading: false, authReady: true });
      }
    });

    const onForceRefresh = () => void load();
    if (typeof window !== "undefined") {
      window.addEventListener("miomika:profile-refresh", onForceRefresh);
    }

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("miomika:profile-refresh", onForceRefresh);
      }
    };
  }, []);

  return state;
}

/** Persist reply language to profile + cookie; refreshes useProfile listeners. */
export async function updateUiLanguage(lang: "th" | "en"): Promise<void> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("profiles")
    .update({ ui_language: lang })
    .eq("id", userId);
  if (error) {
    console.error("[profile] updateUiLanguage failed:", error);
    return;
  }
  setUILanguageCookie(lang);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("miomika:profile-refresh"));
  }
}
