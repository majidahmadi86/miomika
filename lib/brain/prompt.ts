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
  const lang = state.uiLanguage;
  const sections: string[] = [
    CORE_IDENTITY,
    buildUserContext(state),
    buildMemorySection(state),
    buildRightNowSection(state, userInput),
    buildMoveSection(move, lang, state),
    UNIVERSAL_RULES,
  ];

  return sections.join("\n\n");
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

function buildRightNowSection(state: BrainState, userInput: string): string {
  const uiLabel = state.uiLanguage === "th" ? "Thai" : "English";
  const targetLabel =
    state.targetLanguage === "th"
      ? "Thai"
      : state.targetLanguage === "en"
        ? "English"
        : "none";

  const languageRule = [
    `CRITICAL: Reply ENTIRELY in ${uiLabel} (${state.uiLanguage}).`,
    `The user's interface language is ${uiLabel} — this NEVER changes mid-conversation, no matter what language they just spoke.`,
    state.targetLanguage && state.isPracticeAttempt
      ? `If they speak ${targetLabel} as practice, acknowledge in ${uiLabel}, repeat the target word in ${targetLabel} for them to compare, then continue in ${uiLabel}.`
      : `If they speak ${targetLabel} as practice, acknowledge in ${uiLabel}, optionally repeat the target word in ${targetLabel}, then continue in ${uiLabel}.`,
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
