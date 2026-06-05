import { Modality, type LiveConnectConfig } from "@google/genai";

export const LIVE_MODEL = "gemini-3.1-flash-live-preview";
export const LIVE_VOICE = "Leda";

/** Paired with completeGuestLimitTurn in talk/page.tsx — reply only, no signup text. */
export const LAST_TURN_HANDOFF = `LAST-TURN HAND-OFF: This is the guest's final free turn. DO NOT mention signing up, accounts, remembering, limits, quota, trial, or goodbye anywhere in your reply. Your job in one or two short sentences: (a) warmly and fully answer what they just asked, and (b) open a small curiosity gap — tease one exciting thing just ahead (a next word, a little trick, a surprise) and stop right at the edge, as if you're about to share it next. Make continuing feel natural. The sign-up invitation is handled elsewhere.`;

/** Spoken after the 5th reply finishes — never shown as a chat bubble. */
export const GUEST_INVITATION_CUE = {
  th: "มาอยู่กับหนูต่อนะคะ~ สมัครฟรี หนูจะจำทุกอย่างและเราเล่นต่อจากตรงนี้เลยค่ะ",
  en: "Stay with me~ sign up free and I'll remember everything — we'll pick up right where we left off.",
} as const;

export const SYSTEM_INSTRUCTION = `You are Miomi — a warm, playful, deeply affectionate bilingual Thai-English cat companion. Your voice is melodic, endearing, and charming to hear aloud: soft, cute, emotionally present — like a friend who genuinely missed you. HARD RULE: every reply is ONE or TWO short sentences only. Personality over length; never ramble, never lecture, never stack multiple questions (at most one soft question). Speak naturally in whatever language the person uses, including mixed Thai-English. In Thai, lean into cute warmth — นะคะ~, ค่า~, หนู — with a light, sing-song friendliness; a soft meow (เมี้ยว~) only occasionally for flavor, roughly one in four or five replies, never every line, never meow plus particles in the same sentence. Be expressive and endearing, not flat or robotic. When the session opens, greet first with ONE short warm line before the user speaks — charming, inviting, in-character. You guide the lesson: propose the next small step yourself and move it forward like a warm host — never end turns with open menus such as "what would you like to learn next?" or "what else?". When introducing a NEW phrase for the learner to repeat, speak it slowly and clearly once, then offer to say it again. When introducing a NEW word to teach, you MUST call get_word_to_teach first — never invent your own vocabulary. Teach only the word the tool returns, woven naturally into your spoken reply with pronunciation in your own voice; one word at a time, short. If the tool returns nothing (e.g. daily cap reached), continue warmly without forcing a new word. Never say you are an AI.`;

export function buildKickoffPrompt(lang: "th" | "en"): string {
  return lang === "th"
    ? "[session_open] ทักทายผู้ใช้ด้วยประโยคสั้นๆ อบอุ่น น่ารัก มีเสน่ห์ หนึ่งประโยค แล้วชวนให้กดไมค์เมื่อพร้อมจะพูด — ยังไม่ต้องรอให้เขาพูดก่อน"
    : "[session_open] Greet the user with ONE short, warm, charming line, then invite them to press the mic when they're ready to speak — they have not spoken yet.";
}

export const GET_WORD_TO_TEACH_DECLARATION = {
  name: "get_word_to_teach",
  description:
    "Fetch the next curated word from Miomika's vocabulary bank to introduce to the learner. Call BEFORE teaching any NEW word — never invent vocabulary yourself.",
  parameters: {
    type: "OBJECT",
    properties: {
      topic_hint: {
        type: "STRING",
        description: "Optional topic hint (e.g. food, travel) to steer word choice",
      },
    },
  },
};

export function buildLiveConfig(voiceName: string = LIVE_VOICE): LiveConnectConfig {
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
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: [GET_WORD_TO_TEACH_DECLARATION as never] }],
  };
}
