/**
 * Billing tiers — the SINGLE source of truth for plan names, prices, and the
 * feature lines the paywall renders. Kept in sync with lib/ai/limits.ts
 * (DAILY_EXCHANGE_CAPS) and lib/live/voice-allowance.ts. Prices are config — adjust
 * here and the paywall follows. Stripe price IDs land in #4 on `stripePriceId`.
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
      { en: "One free live session to try", th: "ทดลองห้องพูดสดได้ 1 ครั้ง" },
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
      { en: "10 minutes of voice a day", th: "เสียง 10 นาทีต่อวัน" },
      { en: "1 live speaking session a month", th: "ห้องพูดสด 1 ครั้งต่อเดือน" },
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
      { en: "30 minutes of voice a day", th: "เสียง 30 นาทีต่อวัน" },
      { en: "3 live speaking sessions a month", th: "ห้องพูดสด 3 ครั้งต่อเดือน" },
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
