/**
 * Billing tiers — the SINGLE source of truth for plan names, prices, and the
 * feature lines the paywall renders. Kept in sync with lib/ai/limits.ts
 * (DAILY_EXCHANGE_CAPS) and lib/live/voice-allowance.ts. Prices are config — adjust
 * here and the paywall follows. Stripe price IDs land in #4 on `stripePriceId`.
 * Voice minutes below are a MONTHLY pool (VOICE_PRO_MONTHLY_SECONDS /
 * VOICE_PRO_MAX_MONTHLY_SECONDS in voice-allowance.ts), not a daily reset —
 * keep this copy matching that file's real numbers, not a "per day" framing.
 */

export type TierId = "free" | "pro" | "pro_max";

export type Bilingual = { en: string; th: string };

export type Plan = {
  id: TierId;
  name: Bilingual;
  /** Monthly price in THB. null = free. */
  priceTHB: number | null;
  tagline: Bilingual;
  features: Bilingual[];
  /** Visually featured ("Most popular") in the paywall. */
  highlighted?: boolean;
  /** Stripe price id — wired in #4. */
  stripePriceId?: string;
  /** Stripe price id for the annual interval — wired in #4. */
  stripePriceIdYearly?: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: { en: "Free", th: "ฟรี" },
    priceTHB: null,
    tagline: { en: "Start learning with Miomi", th: "เริ่มเรียนกับมีโอมิ" },
    features: [
      { en: "25 chats a day with Miomi", th: "คุยกับมีโอมิ 25 ครั้งต่อวัน" },
      { en: "The full A1–C1 course library", th: "คอร์สเรียนครบ A1–C1" },
      { en: "Bonding, memory & streaks", th: "ความผูกพัน ความทรงจำ และสตรีค" },
    ],
  },
  {
    id: "pro",
    name: { en: "Pro", th: "โปร" },
    priceTHB: 299,
    tagline: { en: "Talk as much as you like", th: "คุยได้เต็มที่ไม่อั้น" },
    highlighted: true,
    features: [
      { en: "200 chats a day", th: "คุยได้ 200 ครั้งต่อวัน" },
      { en: "~200 minutes of voice a month", th: "เสียงประมาณ 200 นาทีต่อเดือน" },
      { en: "1 live speaking room a month", th: "ห้องพูดสด 1 ครั้งต่อเดือน" },
      { en: "Create your own courses", th: "สร้างคอร์สของคุณเองได้" },
      { en: "Everything in Free", th: "ทุกอย่างในแพ็กฟรี" },
    ],
  },
  {
    id: "pro_max",
    name: { en: "Pro Max", th: "โปร แม็กซ์" },
    priceTHB: 699,
    tagline: { en: "The fullest Miomi experience", th: "ประสบการณ์มีโอมิแบบเต็มที่สุด" },
    features: [
      { en: "400 chats a day", th: "คุยได้ 400 ครั้งต่อวัน" },
      { en: "~400 minutes of voice a month", th: "เสียงประมาณ 400 นาทีต่อเดือน" },
      { en: "3 live speaking rooms a month", th: "ห้องพูดสด 3 ครั้งต่อเดือน" },
      { en: "Create your own courses", th: "สร้างคอร์สของคุณเองได้" },
      { en: "Everything in Pro", th: "ทุกอย่างในแพ็กโปร" },
    ],
  },
];

export function planById(id: TierId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** The upgrade targets shown in the paywall (Free is the baseline, not an option). */
export const UPGRADE_PLANS: Plan[] = PLANS.filter((p) => p.id !== "free");

// ---------------------------------------------------------------------------
// Annual billing. ONE knob: how many months we charge for a full year.
// 10 = "2 months free" (≈17% off) — the category-standard hook. Lower it to 11
// ("1 month free", ≈8%) for a more conservative discount, or 12 for none.
// Stripe annual prices (#4) should equal yearlyPriceTHB(plan).
// ---------------------------------------------------------------------------
export const ANNUAL_MONTHS_CHARGED = 10;

/** Whole-percent saving vs paying monthly for twelve months. */
export const ANNUAL_SAVING_PCT = Math.round((1 - ANNUAL_MONTHS_CHARGED / 12) * 100);

/** Referral reward: both people get this many baht when the referred friend first pays. */
export const REFERRAL_REWARD_BAHT = 30;

/** Annual total in THB for a plan (null for free). */
export function yearlyPriceTHB(plan: Plan): number | null {
  return plan.priceTHB == null ? null : plan.priceTHB * ANNUAL_MONTHS_CHARGED;
}

// ---------------------------------------------------------------------------
// Room packs — one-off top-ups of Confident Speaking rooms, added to any plan.
// Shared by the paywall sheet and the standalone /pricing page. Purchase
// (one-time Stripe checkout) is wired alongside live voice returning.
// ---------------------------------------------------------------------------
export type RoomPack = {
  count: number;
  priceTHB: number;
  tag?: Bilingual;
  /** Stripe price id (one-time) — wired with payments. */
  stripePriceId?: string;
};

export const ROOM_PACKS: RoomPack[] = [
  { count: 10, priceTHB: 499 },
  { count: 30, priceTHB: 1399, tag: { en: "Best value", th: "คุ้มสุด" } },
];

/** Per-room price, rounded — for the "฿50 a room" line. */
export function perRoomTHB(pack: RoomPack): number {
  return Math.round(pack.priceTHB / pack.count);
}

/**
 * What's inside a Confident Speaking room — the short, single-sourced descriptor
 * shown inside each plan card and each room-pack card so the value reads the same
 * everywhere. Kept terse: each line is one glanceable phrase.
 */
export const ROOM_INSIDE: Bilingual[] = [
  { en: "Voice role-play with Miomi", th: "สวมบทบาทด้วยเสียงกับมีโอมิ" },
  { en: "Real scenes · Thai ↔ English", th: "สถานการณ์จริง · ไทย ↔ อังกฤษ" },
  { en: "Guided warm-up → exit ticket", th: "มีไกด์ตั้งแต่วอร์มอัพ → สรุปจบ" },
];
