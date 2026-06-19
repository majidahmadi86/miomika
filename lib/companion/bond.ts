"use client";

import { createClient } from "@/lib/supabase/client";
import { deriveBond, STAGE_UP_KEY, type BondAward } from "./bond-core";

export * from "./bond-core";

/** Add bond points to the signed-in user's account. Members only. */
export async function awardBond(amount: number): Promise<BondAward | null> {
  if (amount <= 0) return null;
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data: row, error: readErr } = await supabase
    .from("profiles")
    .select("bond_points")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) {
    console.error("[bond] read failed:", readErr);
    return null;
  }
  const from = (row?.bond_points as number | null) ?? 0;
  const to = from + amount;

  const { error: writeErr } = await supabase
    .from("profiles")
    .update({ bond_points: to })
    .eq("id", userId);
  if (writeErr) {
    console.error("[bond] write failed:", writeErr);
    return null;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("miomika:profile-refresh"));
  }

  const fromStage = deriveBond(from).stageIndex;
  const toStage = deriveBond(to).stageIndex;
  const crossedStage = toStage > fromStage;
  if (crossedStage && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STAGE_UP_KEY, String(toStage));
    } catch {
      /* non-fatal */
    }
  }
  return { from, to, crossedStage, newStageIndex: toStage };
}

const DAILY_BOND = 10;
const DAILY_KEY = "miomika.bond.lastDaily";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Once-a-day "showing up" bond. Safe to call on every mount; self-guards once/local-day. */
export async function awardDailyBond(): Promise<BondAward | null> {
  if (typeof window === "undefined") return null;
  try {
    if (window.localStorage.getItem(DAILY_KEY) === todayKey()) return null;
    const result = await awardBond(DAILY_BOND);
    if (result) window.localStorage.setItem(DAILY_KEY, todayKey());
    return result;
  } catch {
    return null;
  }
}
