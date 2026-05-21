"use server";

/**
 * Server actions for the welcome screen lifecycle.
 *
 * markWelcomeShown — flips public.users.welcome_shown_at to NOW() for the
 * current authenticated user. Best-effort: silently no-ops for anonymous
 * sessions (guest mode has no DB row to write).
 *
 * MIOMIKA.md §8 Phase 2 (Block A1).
 */

import { createClient } from "@/lib/supabase/server";

export async function markWelcomeShown(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { data: userResp } = await supabase.auth.getUser();
    const user = userResp?.user;
    if (!user) return { ok: false };

    const { error } = await supabase
      .from("users")
      .update({
        welcome_shown_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
