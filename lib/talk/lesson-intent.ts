/**
 * User-stated lesson content intent — topic preference + rejected topics.
 * Zero-cost. Wired into selectLessonTopic and /talk honor path.
 */

import { detectTopicFromMessage } from "@/lib/ai/vocabulary";

export type LessonContentIntent = {
  /** Bank topic id to steer the rebuilt lesson toward */
  topicHint: string | null;
  /** Bank topic ids the user rejected — never pick these */
  excludeTopics: string[];
  /** Rebuild the lesson plan around this intent */
  shouldRebuild: boolean;
};

const POSITIVE_INTENT_RE =
  /(?:want|let'?s|give me|teach me|learn|practice|focus on|switch to|instead|rather|how about|show me|talk about|daily phrases?|everyday phrases?|everyday expressions?)/i;

/** Map rejection keywords → vocabulary_bank topic ids */
const REJECTION_SIGNALS: Array<{ re: RegExp; topic: string }> = [
  {
    re: /(?:not|no|don'?t|without|skip|stop|enough|no more|never|hate)\s+(?:want\s+)?(?:any\s+)?(?:more\s+)?(?:talk(?:ing)?\s+about\s+)?(?:the\s+)?(?:topic\s+of\s+)?(?:food|ingredients?|eating|restaurant|อาหาร|กิน)/i,
    topic: "food",
  },
  {
    re: /(?:not|no|don'?t|without|skip|stop)\s+(?:want\s+)?(?:any\s+)?(?:more\s+)?(?:travel|trips?|airport|hotels?|เที่ยว|ท่องเที่ยว)/i,
    topic: "travel",
  },
  {
    re: /(?:not|no|don'?t|without|skip|stop)\s+(?:want\s+)?(?:any\s+)?(?:more\s+)?(?:shopping|market|mall|ซื้อ|ช้อป)/i,
    topic: "shopping",
  },
  {
    re: /(?:not|no|don'?t|without|skip|stop)\s+(?:want\s+)?(?:any\s+)?(?:more\s+)?(?:family|ครอบครัว)/i,
    topic: "family",
  },
  {
    re: /(?:not|no|don'?t|without|skip|stop)\s+(?:want\s+)?(?:any\s+)?(?:more\s+)?(?:work|office|job|งาน|ทำงาน)/i,
    topic: "work",
  },
];

function detectRejectedTopics(text: string): string[] {
  const rejected = new Set<string>();
  for (const { re, topic } of REJECTION_SIGNALS) {
    if (re.test(text)) rejected.add(topic);
  }
  return [...rejected];
}

function detectPositiveTopicHint(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bdaily\s+phrases?\b|\beveryday\s+(?:phrases?|expressions?)\b/i.test(lower)) {
    return "daily_routine";
  }
  if (!POSITIVE_INTENT_RE.test(text)) return null;
  return detectTopicFromMessage(text);
}

/** Parse user-stated topic preference or rejection from a message. */
export function detectLessonContentIntent(message: string): LessonContentIntent | null {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const excludeTopics = detectRejectedTopics(trimmed);
  const topicHint = detectPositiveTopicHint(trimmed);

  if (!topicHint && excludeTopics.length === 0) return null;

  return {
    topicHint,
    excludeTopics,
    shouldRebuild: true,
  };
}

/** Hidden nudge after the system rebuilds the lesson for stated content intent. */
export function buildContentIntentNudge(
  intent: LessonContentIntent,
  ui: "th" | "en",
  newTopic: string | null,
  nextWord: string | null,
): string {
  void nextWord;
  const excluded = intent.excludeTopics.length ? intent.excludeTopics.join(", ") : "none";
  const topic = newTopic ?? intent.topicHint ?? "auto";
  if (ui === "th") {
    return `[content_intent] ผู้ใช้ระบุหัวข้อ — สร้างบทเรียนใหม่ topic=${topic} ห้ามใช้=${excluded}. เลือกคำที่เข้ากับหัวข้อใหม่แล้วเรียก get_word_to_teach ห้ามกลับไปหัวข้อที่ปฏิเสธ ตอบสั้น 1–2 ประโยค ให้สิ่งที่ขอ`;
  }
  return `[content_intent] User stated content intent — rebuilt lesson topic=${topic} excluded=${excluded}. Choose a word that fits the new topic and call get_word_to_teach with it; NEVER loop back to rejected topics. Reply in 1–2 sentences; give what they asked — no preamble, no option menus.`;
}
