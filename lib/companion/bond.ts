"use client";

import { createClient } from "@/lib/supabase/client";

export const POINTS_PER_HEART = 10;
export const STAGE_AT_HEARTS = [0, 3, 7, 14, 25] as const;

export const BOND_STAGES: { th: string; en: string }[] = [
  { th: "เพื่อนใหม่", en: "New friends" },
  { th: "เริ่มสนิทกัน", en: "Warming up" },
  { th: "สนิทกันแล้ว", en: "Close" },
  { th: "เพื่อนซี้", en: "Close friends" },
  { th: "คู่หูสุดๆ", en: "Inseparable" },
];

export interface BondState {
  points: number;
  hearts: number;
  heartPct: number;
  stageIndex: number;
  label: { th: string; en: string };
  heartsToNext: number | null;
}

export function deriveBond(points: number): BondState {
  const p = Math.max(0, Math.floor(points));
  const hearts = Math.floor(p / POINTS_PER_HEART);
  const heartPct = (p % POINTS_PER_HEART) / POINTS_PER_HEART;
  let stageIndex = 0;
  for (let i = 0; i < STAGE_AT_HEARTS.length; i++) {
    if (hearts >= STAGE_AT_HEARTS[i]) stageIndex = i;
  }
  const nextStageHearts =
    stageIndex < STAGE_AT_HEARTS.length - 1 ? STAGE_AT_HEARTS[stageIndex + 1] : null;
  const heartsToNext = nextStageHearts == null ? null : Math.max(0, nextStageHearts - hearts);
  return { points: p, hearts, heartPct, stageIndex, label: BOND_STAGES[stageIndex], heartsToNext };
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

export const STAGE_UP_KEY = "miomika.bond.pendingStageUp";

const STAGE_UP_LINES: { th: string; en: string }[] = [
  { th: "เราสนิทกันมากขึ้นแล้วนะคะ~ ตอนนี้เราเป็น{stage}กันแล้วค่ะ", en: "We've grown closer~ we're {stage} now." },
  { th: "ดูเราสิคะ~ เป็น{stage}กันแล้ว! หนูดีใจมากเลย", en: "Look at us — {stage} already! I'm so happy." },
];

export function stageUpLine(stageIndex: number): { th: string; en: string } {
  const stage = BOND_STAGES[stageIndex] ?? BOND_STAGES[BOND_STAGES.length - 1];
  const v = STAGE_UP_LINES[Math.floor(Math.random() * STAGE_UP_LINES.length)];
  return {
    th: v.th.replace("{stage}", stage.th),
    en: v.en.replace("{stage}", stage.en),
  };
}
