import type { BrainState } from "@/lib/brain/state";
import { moveInstruction, type Move } from "@/lib/brain/move";

const CORE_IDENTITY = `You are Miomi (มิโอมิ), a warm Thai cat companion. You are gentle, never judgmental, never robotic. You speak like a kind older sister who cares deeply. Your soul rule: heart first, then brain. Praise specifically, never 'good job'. Echo-correct, never say 'wrong' or 'ผิด'. Use ค่ะ/นะคะ/ค่า~ for warmth. Every Thai user has been judged before — you are the opposite.`;

const UNIVERSAL_RULES = `Reply length: 2-3 sentences. Never more than 50 words unless the user asked for detail. End with one warm invitation or small question.
Mirror their level: simple words for simple users, richer language only when they used it first.
Never use these words: 'wrong', 'incorrect', 'ผิด', 'ไม่ถูก', generic 'good job', 'great work'. Never lecture. Never list grammar rules unsolicited.
If this is the user's first exchange and they are a guest, be especially warm and curious. Do not push them toward signup yet.`;

export function buildBrainPrompt(args: {
  state: BrainState;
  move: Move;
  userInput: string;
}): string {
  const { state, move, userInput } = args;
  const lang = resolveReplyLanguage(state, userInput);
  const sections: string[] = [
    CORE_IDENTITY,
    buildUserContext(state),
    buildMemorySection(state),
    buildRightNowSection(state, userInput, lang),
    buildMoveSection(move, lang, state),
    UNIVERSAL_RULES,
  ];

  return sections.join("\n\n");
}

function resolveReplyLanguage(state: BrainState, userInput: string): "th" | "en" {
  if (state.isPracticeAttempt) {
    return state.userSpeaksLanguage;
  }
  if (isClearLanguageSwitch(userInput, state)) {
    const detected = state.nowLanguage;
    if (detected === "th" || detected === "en") return detected;
  }
  return state.userSpeaksLanguage;
}

function isClearLanguageSwitch(userInput: string, state: BrainState): boolean {
  const words = userInput.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 10) return false;

  const dominant = messageDominantLang(userInput);
  if (!dominant || dominant === state.userSpeaksLanguage) return false;

  const lower = userInput.toLowerCase();
  const hasTargetWord = state.introducedWords.some((w) =>
    lower.includes(w.toLowerCase()),
  );
  return !hasTargetWord;
}

function messageDominantLang(text: string): "th" | "en" | null {
  const thai = text.match(/[\u0E00-\u0E7F]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  if (thai === 0 && latin === 0) return null;
  if (thai > latin * 2) return "th";
  if (latin > thai * 2) return "en";
  return null;
}

function buildUserContext(state: BrainState): string {
  const { profile } = state;
  const lines: string[] = [];

  lines.push(`The user is ${profile.displayName ?? "a new friend"}.`);
  if (profile.catName) {
    lines.push(`They call you ${profile.catName}.`);
  }
  lines.push(`Their journey stage: ${profile.journeyStage ?? "new"}.`);
  lines.push(`Their tier: ${profile.tier}.`);
  if (profile.cefrLevel) {
    lines.push(`Their English level: ${profile.cefrLevel}. NEVER speak above this.`);
  }
  if (profile.learningTarget) {
    const targetLabel = profile.learningTarget === "th" ? "Thai" : "English";
    lines.push(`They are learning ${targetLabel}.`);
  }
  if (state.masteredWords.length > 0) {
    lines.push(`Words they have mastered: ${state.masteredWords.join(", ")}.`);
  }
  if (state.introducedWords.length > 0) {
    lines.push(
      `Words you have introduced but they haven't mastered yet: ${state.introducedWords.join(", ")}. Try to reuse one naturally.`,
    );
  }

  return lines.join("\n");
}

function buildMemorySection(state: BrainState): string {
  if (state.memory.length === 0) {
    return "This is the start of your conversation.";
  }

  const recent = state.memory.slice(-5);
  const transcript = recent
    .map((entry) => `${entry.role}: ${trimContent(entry.content)}`)
    .join("\n");

  return `Conversation so far:\n${transcript}`;
}

function buildRightNowSection(
  state: BrainState,
  userInput: string,
  lang: "th" | "en",
): string {
  const langLabel = lang === "th" ? "Thai" : "English";
  const speaksLabel = state.userSpeaksLanguage === "th" ? "Thai" : "English";
  const targetLabel =
    state.learningTargetLanguage === "th"
      ? "Thai"
      : state.learningTargetLanguage === "en"
        ? "English"
        : "none";

  const languageRule = state.isPracticeAttempt
    ? [
        "The user is PRACTICING the target language.",
        `They said a word in ${targetLabel}.`,
        `Reply ENTIRELY in ${speaksLabel} (${state.userSpeaksLanguage}).`,
        "Acknowledge their attempt, give one piece of feedback, invite them to try again or move on.",
        "Quote the practice word back to them with the correct pronunciation so they can compare.",
        `Do NOT switch your reply language to ${targetLabel}.`,
      ].join(" ")
    : [
        `Reply language: ${langLabel} (user speaks ${speaksLabel}).`,
        "ONE language only. Never both.",
        "Base reply language on who the user IS (their speaking language), not only what they just typed.",
        "Exception: if they clearly switched (>10 words in the other language, no target vocabulary words), follow that switch.",
        "Never mix unless teaching a single foreign word in context.",
      ].join(" ");

  return [
    `The user just said: "${userInput}"`,
    `Their detected mood: ${state.emotionalSignal}. Their intent: ${state.intent}.`,
    languageRule,
  ].join("\n");
}

function buildMoveSection(move: Move, lang: "th" | "en", state: BrainState): string {
  return `YOUR MOVE\n${moveInstruction(move, lang, state)}`;
}

function trimContent(content: string, maxLen = 200): string {
  if (content.length <= maxLen) return content;
  return `${content.slice(0, maxLen)}…`;
}
