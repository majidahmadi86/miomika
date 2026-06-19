"use client";

import { createClient } from "@/lib/supabase/client";

export const BOND_THRESHOLDS = [0, 30, 90, 200, 400] as const;

export const BOND_STAGES: { th: string; en: string }[] = [
  { th: "เพื่อนใหม่", en: "New friends" },
  { th: "เริ่มสนิทกัน", en: "Warming up" },
  { th: "สนิทกันแล้ว", en: "Close" },
  { th: "เพื่อนซี้", en: "Close friends" },
  { th: "คู่หูสุดๆ", en: "Inseparable" },
];

export interface BondState {
  points: number;
  stageIndex: number;
  label: { th: string; en: string };
  nextAt: number | null;
  pctToNext: number;
}

export function deriveBond(points: number): BondState {
  const p = Math.max(0, Math.floor(points));
  let stageIndex = 0;
  for (let i = 0; i < BOND_THRESHOLDS.length; i++) {
    if (p >= BOND_THRESHOLDS[i]) stageIndex = i;
  }
  const curAt = BOND_THRESHOLDS[stageIndex];
  const nextAt = stageIndex < BOND_THRESHOLDS.length - 1 ? BOND_THRESHOLDS[stageIndex + 1] : null;
  const pctToNext = nextAt == null ? 1 : Math.min(1, (p - curAt) / (nextAt - curAt));
  return { points: p, stageIndex, label: BOND_STAGES[stageIndex], nextAt, pctToNext };
}

export interface BondAward {
  from: number;
  to: number;
  crossedStage: boolean;
  newStageIndex: number;
}

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
  return { from, to, crossedStage: toStage > fromStage, newStageIndex: toStage };
}

const DAILY_BOND = 5;
const DAILY_KEY = "miomika.bond.lastDaily";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Once-a-day "showing up" bond. Safe to call on every mount; self-guards to
 *  fire at most once per local day. Returns the award only if it fired. */
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
