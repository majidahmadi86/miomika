import { createClient } from "@/lib/supabase/server";

export type Tier = "guest" | "free" | "pro" | "pro_max";
export type JourneyStage =
  | "tourist"
  | "student"
  | "worker"
  | "resident"
  | "unspecified";

export interface ServerProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: Tier;
  journey_stage: JourneyStage;
  gender: "masculine" | "feminine" | "neutral" | null;
  ui_language: "th" | "en";
  primary_language: string;
  learning_target_language: string;
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  miomi_stars: number;
  xp: number;
  level: number;
  streak: number;
  mood: number;
  welcome_shown_at: string | null;
  onboarding_completed_at: string | null;
  last_seen_at: string | null;
}

/**
 * Server-side profile reader. Single source of truth for user identity
 * in every API route, server action, and server component.
 *
 * Returns null if no session OR if session exists but no profile row.
 * NEVER trust client-sent tier or user_id — always call this instead.
 */
export async function getServerProfile(): Promise<ServerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `id, email, display_name, tier, journey_stage, gender,
       ui_language, primary_language, learning_target_language,
       cefr_level,
       miomi_stars, xp, level, streak, mood,
       welcome_shown_at, onboarding_completed_at, last_seen_at`,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id as string,
    email: (data.email as string | null) ?? user.email ?? null,
    display_name: (data.display_name as string | null) ?? null,
    tier: ((data.tier as Tier) ?? "free"),
    journey_stage: ((data.journey_stage as JourneyStage) ?? "unspecified"),
    gender: (data.gender as "masculine" | "feminine" | "neutral" | null) ?? null,
    ui_language: ((data.ui_language as "th" | "en") ?? "th"),
    primary_language: (data.primary_language as string | null) ?? "th",
    learning_target_language:
      (data.learning_target_language as string | null) ?? "en",
    cefr_level:
      (data.cefr_level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null) ?? null,
    miomi_stars: (data.miomi_stars as number | null) ?? 0,
    xp: (data.xp as number | null) ?? 0,
    level: (data.level as number | null) ?? 1,
    streak: (data.streak as number | null) ?? 0,
    mood: (data.mood as number | null) ?? 80,
    welcome_shown_at: (data.welcome_shown_at as string | null) ?? null,
    onboarding_completed_at:
      (data.onboarding_completed_at as string | null) ?? null,
    last_seen_at: (data.last_seen_at as string | null) ?? null,
  };
}

/**
 * Touch last_seen_at. Fire-and-forget — call from any authenticated route.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  } catch {
    /* swallow — last_seen drift is acceptable */
  }
}
