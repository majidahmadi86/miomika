import type { ServerProfile, Tier } from "@/lib/auth/get-server-profile";
import { normalizeLearningTarget, normalizeUiLanguage } from "@/lib/brain/language";
import type { KickoffAudience } from "@/lib/live/session-continuity";
import {
  loadCefrLevel,
  loadRecentIntroducedWords,
  loadVocabLists,
} from "@/lib/vocab/user-state-read";

export type MemberRecentWord = {
  word_en: string;
  word_th: string;
};

export type MemberContextBundle = {
  displayName: string | null;
  uiLanguage: "th" | "en";
  targetLanguage: "th" | "en";
  level: string;
  wordsIntroducedCount: number;
  wordsMasteredCount: number;
  recentWords: MemberRecentWord[];
  isReturning: boolean;
  lastSeenAt: string | null;
  /** Hours since prior last_seen_at (before this session touch). Null when never seen. */
  hoursSinceLastVisit: number | null;
};

const TIER_CEFR_FALLBACK: Record<Tier, string> = {
  guest: "A1",
  free: "A2",
  pro: "B1",
  pro_max: "B1",
};

export function resolveMemberCefrLevel(
  cefrLevel: string | null | undefined,
  tier: Tier,
): string {
  const trimmed = cefrLevel?.trim();
  return trimmed || TIER_CEFR_FALLBACK[tier];
}

export function computeHoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return null;
  return ms / (1000 * 60 * 60);
}

/** Real returning signal — prior vocabulary or meaningful gap since last visit. */
export function isReturningMember(args: {
  wordsIntroducedCount: number;
  lastSeenAt: string | null;
  hoursSinceLastVisit: number | null;
}): boolean {
  if (args.wordsIntroducedCount > 0) return true;
  if (
    args.lastSeenAt &&
    args.hoursSinceLastVisit !== null &&
    args.hoursSinceLastVisit >= 1
  ) {
    return true;
  }
  return false;
}

export async function assembleMemberContext(
  profile: ServerProfile,
): Promise<MemberContextBundle> {
  const uiLanguage = normalizeUiLanguage(profile.ui_language);
  const targetLanguage =
    normalizeLearningTarget(profile.learning_target_language) ??
    (uiLanguage === "en" ? "th" : "en");

  const priorLastSeen = profile.last_seen_at;
  const hoursSinceLastVisit = computeHoursSince(priorLastSeen);

  const [lists, cefr, recentWords] = await Promise.all([
    loadVocabLists(profile.id),
    loadCefrLevel(profile.id),
    loadRecentIntroducedWords(profile.id, 3),
  ]);

  const wordsIntroducedCount = lists.introduced.length;
  const wordsMasteredCount = lists.mastered.length;
  const level = resolveMemberCefrLevel(cefr, profile.tier);
  const isReturning = isReturningMember({
    wordsIntroducedCount,
    lastSeenAt: priorLastSeen,
    hoursSinceLastVisit,
  });

  return {
    displayName: profile.display_name?.trim() || null,
    uiLanguage,
    targetLanguage,
    level,
    wordsIntroducedCount,
    wordsMasteredCount,
    recentWords,
    isReturning,
    lastSeenAt: priorLastSeen,
    hoursSinceLastVisit,
  };
}

export function resolveKickoffAudience(
  isGuest: boolean,
  bundle: MemberContextBundle | null | undefined,
): KickoffAudience {
  if (isGuest || !bundle) return "first_time";
  // "first_time" must mean a GENUINE first-ever meeting — only then does Miomi introduce
  // herself by name. Anyone with any prior footprint (seen before, learned a word, or the
  // gap-based returning signal) is already acquainted, so no re-introduction.
  const hasMetBefore =
    bundle.isReturning || bundle.lastSeenAt != null || bundle.wordsIntroducedCount > 0;
  return hasMetBefore ? "returning" : "first_time";
}

function formatVisitGap(bundle: MemberContextBundle, ui: "th" | "en"): string {
  const hours = bundle.hoursSinceLastVisit;
  if (!bundle.lastSeenAt || hours === null) {
    return ui === "th" ? "ครั้งแรก" : "first session";
  }
  if (hours < 24) return ui === "th" ? "ไม่กี่ชั่วโมงที่แล้ว" : "a few hours ago";
  if (hours < 24 * 8) return ui === "th" ? "ไม่กี่วันที่แล้ว" : "a few days ago";
  return ui === "th" ? "นานแล้ว" : "a while ago";
}

export function buildMemberContextBlock(
  bundle: MemberContextBundle | null | undefined,
  ui: "th" | "en",
): string {
  if (!bundle) return "";

  const nameLine =
    bundle.displayName ??
    (ui === "th" ? "(ไม่มีชื่อ — ห้ามเดา)" : "(no name on file — do NOT guess one)");
  const recentLine =
    bundle.recentWords.length > 0
      ? bundle.recentWords
          .map((w) => `${w.word_en} / ${w.word_th}`)
          .join(", ")
      : ui === "th"
        ? "ยังไม่มี"
        : "none yet";
  const visitLine = formatVisitGap(bundle, ui);
  const returningLine = bundle.isReturning
    ? ui === "th"
      ? "ใช่ — สมาชิกที่กลับมา"
      : "yes — returning member"
    : ui === "th"
      ? "ไม่ — พบกันครั้งแรกในโหมดนี้"
      : "no — first-time energy";

  if (ui === "th") {
    return `MEMBER CONTEXT (ข้อมูลจริงเท่านั้น — ห้ามแต่ง):
- ชื่อ: ${nameLine}
- ระดับ: ${bundle.level}
- คำที่แนะนำแล้ว: ${bundle.wordsIntroducedCount} · เชี่ยวชาญแล้ว: ${bundle.wordsMasteredCount}
- คำที่เรียนล่าสุด (~3): ${recentLine}
- ครั้งล่าสุด: ${visitLine}
- กลับมา: ${returningLine}

ความซื่อสัตย์: อ้างอิงเฉพาะข้อมูลด้านบน — ห้ามสมมติประวัติ ห้ามเดาชื่อ ถ้าไม่ใช่สมาชิกที่กลับมาให้ทักทายแบบพบครั้งแรก`;
  }

  return `MEMBER CONTEXT (read-only facts — use ONLY these, never invent):
- Name: ${nameLine}
- Level: ${bundle.level}
- Words introduced: ${bundle.wordsIntroducedCount} · mastered: ${bundle.wordsMasteredCount}
- Recently learned (~3): ${recentLine}
- Last visit: ${visitLine}
- Returning member: ${returningLine}

HONESTY: Reference ONLY the facts above. Never invent shared history. Never guess a name. If not returning, use first-meeting energy — no false familiarity.`;
}

export function buildKickoffMemberHints(
  bundle: MemberContextBundle | null | undefined,
  lang: "th" | "en",
): string {
  if (!bundle?.isReturning) return "";

  const parts: string[] = [];
  if (bundle.displayName) {
    parts.push(
      lang === "th"
        ? `ใช้ชื่อ "${bundle.displayName}" อย่างเป็นธรรมชาติ`
        : `Use their name "${bundle.displayName}" naturally`,
    );
  }
  if (bundle.hoursSinceLastVisit !== null && bundle.lastSeenAt) {
    const gap = formatVisitGap(bundle, lang);
    parts.push(
      lang === "th"
        ? `รับรู้ช่วงที่ห่าง (${gap}) อย่างอบอุ่น ไม่โทษ`
        : `Acknowledge the gap since last time (${gap}) warmly, without guilt`,
    );
  }
  if (bundle.recentWords.length > 0) {
    const words = bundle.recentWords.map((w) => w.word_en).join(", ");
    parts.push(
      lang === "th"
        ? `อาจอ้างคำที่เรียนล่าสุด (${words}) ได้เมื่อเข้ากับบทสนทนา — ห้ามบังคับ`
        : `You MAY reference recently learned words (${words}) only when it fits naturally — never force it`,
    );
  }
  parts.push(
    lang === "th"
      ? "ปรับระดับภาษาให้เหมาะกับระดับ " + bundle.level
      : `Pitch language complexity for ${bundle.level} level`,
  );

  return parts.join(". ") + ".";
}
