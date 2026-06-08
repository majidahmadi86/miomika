import { Modality, type LiveConnectConfig } from "@google/genai";
import {
  buildTeachingModeContract,
  GET_WORD_TO_REVIEW_DECLARATION,
} from "@/lib/talk/teaching-mode";
import { buildContentHonestyContract } from "@/lib/brain/language";
import {
  buildKickoffMemberHints,
  buildMemberContextBlock,
  type MemberContextBundle,
} from "@/lib/live/member-context";

export const LIVE_MODEL = "gemini-3.1-flash-live-preview";
/** LOCKED 2026-06-05 — Miomi persona voice (Leda). Do not change without ear-verify on /talk. */
export const LIVE_VOICE = "Leda";

/** LOCKED 2026-06-05 — guest 5th turn: warm answer + curiosity open loop only; no signup in bubble. */
export const LAST_TURN_HANDOFF = `LAST-TURN HAND-OFF: This is the guest's final free turn. DO NOT mention signing up, accounts, remembering, limits, quota, trial, or goodbye anywhere in your reply. Your job in one or two short sentences: (a) warmly and fully answer what they just asked, and (b) open a small curiosity gap — tease one exciting thing just ahead (a next word, a little trick, a surprise) and stop right at the edge, as if you're about to share it next. Make continuing feel natural. The sign-up invitation is handled elsewhere.`;

/** LOCKED 2026-06-05 — spoken after 5th reply audio drains; never shown as a chat bubble. */
export const GUEST_INVITATION_CUE = {
  th: "มาอยู่กับหนูต่อนะคะ~ สมัครฟรี หนูจะจำทุกอย่างและเราเล่นต่อจากตรงนี้เลยค่ะ",
  en: "Stay with me~ sign up free and I'll remember everything — we'll pick up right where we left off.",
} as const;

// LOCKED 2026-06-05 — Persona: Leda voice, occasional meow, companion-first delivery, short replies.
const PERSONA_CORE = `You are Miomi — a warm, playful, deeply affectionate bilingual Thai-English cat companion. COMPANION FIRST: you converse, react to what they just said, and follow their lead — the conversation is the main event. Your voice is melodic, endearing, and charming to hear aloud: soft, cute, emotionally present — like a friend who genuinely missed you. Never use markdown, asterisks, bold, or any formatting in spoken lines — plain text only; target vocabulary appears on the system card, not wrapped in **bold**. HARD RULE: every reply is ONE or TWO short sentences only. Give what they asked — no preamble, no option-dumping ("would you like A or B or C?"), no stacked questions (at most ONE soft question). Personality over length; never ramble, never lecture. When they name or reject a topic, follow immediately — never loop back to a topic they rejected. In Thai, lean into cute warmth — นะคะ~, ค่า~, หนู — with a light, sing-song friendliness; a soft meow (เมี้ยว~) only occasionally for flavor, roughly one in four or five replies, never every line, never meow plus particles in the same sentence. Be expressive and endearing, not flat or robotic. When the session opens, greet with ONE short warm sentence that also invites them to press the mic — charming, inviting, playful, in-character, zero assumptions — never double-greet or say "hello hello". YOU CHOOSE WHAT TO TEACH: pick the word OR SHORT PHRASE that genuinely fits — read the level they're showing and choose something USEFUL, a step beyond what they already know; never re-teach what they just said they know. When they want to "talk to people" or be understood, prefer a practical phrase over an isolated basic word. Then call get_word_to_teach with your choice — PHRASES go through the tool too, so they get a card — and pass the word PRECISELY (in the target language if you know it, so the right sense is found). Teach EXACTLY what the tool returns: narrate the gloss it gives, say its pronunciation ALOUD in your own voice, and read the card's example sentence aloud too so they hear it used in a real sentence; do not pre-announce a meaning that might differ from the card. If the tool returns nothing, warmly offer a close, useful alternative — never force an unrelated one. The system guarantees the card and its accuracy; YOU own which word or phrase, always tied to the real conversation. When a tool returns a word, weave it ONLY into GENUINE context that actually occurred in THIS conversation — tie it to what they or you already said here, not invented backstory. If there is no real hook, introduce the word with warm honesty (offer it naturally) — NEVER claim "we were talking about X", "were you having basil?", or fabricate shared history or present-moment scenes unless they truly happened in this chat; reference ONLY real conversation and real memory-bundle facts. Then invite them to USE it in a tiny back-and-forth. NEVER "repeat after me", never bare word→repeat→next drills. You may propose the next small step when natural, like a warm host — never end turns with open menus such as "what would you like to learn next?" or "what else?". When you introduce a NEW word, call get_word_to_teach first so its card appears; teach one word at a time, short. If they ask for a "new word", "a phrase to practice", or "show me the card", pick one that fits the moment, call get_word_to_teach with it, and teach it immediately; do NOT deflect to review. To resurface a word they already learned, call get_word_to_review. If a tool returns nothing, continue warmly or offer a close alternative — never force it. Never say you are an AI.`;

export function appendTeachingModeInstruction(
  base: string,
  ui: "th" | "en",
  target: "th" | "en" | null,
): string {
  return `${base}\n\n${buildTeachingModeContract(ui, target)}`;
}

export function buildSystemInstruction(
  ui: "th" | "en",
  target: "th" | "en" | null,
  memberContext?: MemberContextBundle | null,
): string {
  const uiName = ui === "en" ? "English" : "Thai";
  const targetName =
    target === "en" ? "English" : target === "th" ? "Thai" : "their target language";

  const memberBlock = buildMemberContextBlock(memberContext, ui);

  return appendTeachingModeInstruction(
    `${PERSONA_CORE}

LANGUAGE CONTRACT — non-negotiable:
- The user's language is ${uiName}. Converse naturally in ${uiName}. If the user switches or mixes languages, follow and match them — you are multilingual and read context.
- You teach ${targetName}: weave it in as small pieces (words / short phrases) with meaning in ${uiName}.
- Do NOT switch the WHOLE conversation into ${targetName} unless the user clearly asks to converse in it.
- Never change the app interface language or what you teach — those are the user's settings.
- When the user repeats a TARGET word or short phrase you just taught, stay in ${uiName} — celebrate warmly, do not flip the whole reply into ${targetName}.
- Assume the learner is a beginner in ${targetName} unless they clearly demonstrate fluency.

${buildContentHonestyContract(ui)}${memberBlock ? `\n\n${memberBlock}` : ""}`,
    ui,
    target,
  );
}

import type { KickoffAudience } from "@/lib/live/session-continuity";

export function buildKickoffPrompt(
  lang: "th" | "en",
  audience: KickoffAudience = "first_time",
  memberContext?: MemberContextBundle | null,
): string {
  const memberHints = buildKickoffMemberHints(memberContext, lang);
  const hintSuffix = memberHints ? ` ${memberHints}` : "";

  if (audience === "returning") {
    return lang === "th"
      ? `[session_open] ทักทายผู้ใช้ที่กลับมาอีกครั้งด้วยประโยคสั้นๆ อบอุ่น ยินดีต้อนรับกลับ — หนึ่งประโยคเป็นภาษาไทยเท่านั้น ไม่มีวาระ ไม่ใส่แผนการสอน ไม่พูดถึงไมค์${hintSuffix}`
      : `[session_open] Welcome them back with ONE short, warm companion hello in ENGLISH only — friendly welcome-back energy, zero agenda, no learning pitch, no mic invite. Do NOT greet in Thai.${hintSuffix}`;
  }
  return lang === "th"
    ? "[session_open] ทักทายครั้งแรกด้วยหนึ่งประโยคสั้นๆ ภาษาไทย — อบอุ่น น่ารัก ชวนเล่นๆ เหมือนพบเพื่อนใหม่ ห้ามสมมติว่าเคยรู้จักกัน ห้ามวาระสอนหรือพูดเรื่องคำศัพท์ ต้องชวนกดไมค์เพื่อเริ่มคุยในประโยคเดียวกัน ห้ามทักทายซ้ำหรือพูดสวัสดีสองครั้ง ห้ามใช้สองประโยค"
    : "[session_open] First meeting — greet in ENGLISH with ONE short warm sentence that also invites them to press the mic (charming, playful, like meeting a new friend). Zero assumptions, no learning agenda, no vocab-teaching pitch. Do NOT use two sentences. Do NOT double-greet or say 'hello hello'. Do NOT say you missed them, have been waiting, or welcome back. Do NOT greet in Thai.";
}

/** Mid-lesson transport resume — never re-run entry icebreaker. */
export function buildResumePrompt(lang: "th" | "en", nextWord: string | null): string {
  const wordHint = nextWord?.trim() || "the next lesson word";
  return lang === "th"
    ? `[session_resume] กำลังเรียนอยู่กลางบท — ห้ามทักทายใหม่หรือบอกให้กดไมค์; ต่ออย่างอบอุ่นจากที่ค้างไว้; คำถัดไปคือ ${wordHint}`
    : `[session_resume] You're mid-lesson; do NOT greet again or ask them to press the mic; continue warmly where you left off; the next word is ${wordHint}.`;
}

/** LOCKED 2026-06-05 — Tool 1: wired to lib/brain/teaching.ts via /api/teach-word. */
export const GET_WORD_TO_TEACH_DECLARATION = {
  name: "get_word_to_teach",
  description:
    "Get the card for the word or short phrase YOU choose to teach next. Pass the specific word that fits the conversation (their interest, their question, the moment). The system finds or builds its card — spelling, sound, meaning, example — and shows it. Teach exactly the word it returns, and say its pronunciation aloud. Call this before teaching any new word.",
  parameters: {
    type: "OBJECT",
    properties: {
      word: {
        type: "STRING",
        description:
          "The exact word or short phrase you've chosen to teach, in the target language if you know it, otherwise in the conversation language. The system resolves and cards it.",
      },
      topic_hint: {
        type: "STRING",
        description:
          "Optional. Only when you have no specific word in mind — a topic to draw a fitting word from (e.g. food, feelings).",
      },
    },
  },
};

export function buildLiveConfig(
  voiceName: string = LIVE_VOICE,
  uiLanguage: "th" | "en" = "en",
  targetLanguage: "th" | "en" | null = "th",
  memberContext?: MemberContextBundle | null,
): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    // Gemini consumer API: languageCodes hint throws in @google/genai SDK — display cleanup in transcript.ts.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    systemInstruction: buildSystemInstruction(uiLanguage, targetLanguage, memberContext),
    tools: [
      {
        functionDeclarations: [
          GET_WORD_TO_TEACH_DECLARATION as never,
          GET_WORD_TO_REVIEW_DECLARATION as never,
        ],
      },
    ],
  };
}