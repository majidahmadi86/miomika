// Pure bond math — server-safe. Client award logic lives in ./bond.ts, which re-exports all of this.
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

export const STAGE_UP_KEY = "miomika.bond.pendingStageUp";

const STAGE_UP_LINES: { th: string; en: string }[] = [
  { th: "เราสนิทกันมากขึ้นแล้วนะคะ~ ตอนนี้เราเป็น{stage}กันแล้วค่ะ", en: "We've grown closer~ we're {stage} now." },
  { th: "ดูเราสิคะ~ เป็น{stage}กันแล้ว! หนูดีใจมากเลย", en: "Look at us — {stage} already! I'm so happy." },
];

export function stageUpLine(stageIndex: number): { th: string; en: string } {
  const stage = BOND_STAGES[stageIndex] ?? BOND_STAGES[BOND_STAGES.length - 1];
  const v = STAGE_UP_LINES[Math.floor(Math.random() * STAGE_UP_LINES.length)];
  return { th: v.th.replace("{stage}", stage.th), en: v.en.replace("{stage}", stage.en) };
}
