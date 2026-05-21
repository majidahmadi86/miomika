// /lib/library/reactions.ts
import { CORRECT_REACTIONS, INCORRECT_REACTIONS, END_OF_SESSION_MESSAGES } from "./responses";

export function getCorrectReaction(context: {
  type: "generic" | "pronunciation" | "usage" | "repeat_correct";
  word?: string;
}): { speech_th: string; speech_en: string } {
  const pool = CORRECT_REACTIONS[context.type] ?? CORRECT_REACTIONS.generic;
  const choice = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    speech_th: choice.th.replace("{word}", context.word ?? ""),
    speech_en: choice.en.replace("{word}", context.word ?? ""),
  };
}

export function getIncorrectReaction(
  attempt: 1 | 2 | 3,
  context: { correctAnswer?: string; hint?: string }
): { speech_th: string; speech_en: string } {
  if (attempt === 1) {
    const pool = INCORRECT_REACTIONS.first_attempt;
    const choice = pool[Math.floor(Math.random() * pool.length)]!;
    return { speech_th: choice.th, speech_en: choice.en };
  }
  if (attempt === 2) {
    const pool = INCORRECT_REACTIONS.second_attempt_with_hint;
    const choice = pool[Math.floor(Math.random() * pool.length)]!;
    return {
      speech_th: choice.th.replace("{hint}", context.hint ?? ""),
      speech_en: choice.en.replace("{hint}", context.hint ?? ""),
    };
  }
  // attempt === 3
  return {
    speech_th: INCORRECT_REACTIONS.max_attempts.th.replace(
      "{correct_answer}",
      context.correctAnswer ?? ""
    ),
    speech_en: INCORRECT_REACTIONS.max_attempts.en.replace(
      "{correct_answer}",
      context.correctAnswer ?? ""
    ),
  };
}

export function getEndOfSessionMessage(stats: {
  wordsMastered: number;
  exchangeCount: number;
}): { speech_th: string; speech_en: string } {
  if (stats.wordsMastered >= 3 && stats.exchangeCount >= 8) {
    return {
      speech_th: END_OF_SESSION_MESSAGES.strong_session.th.replace(
        "{n}",
        stats.wordsMastered.toString()
      ),
      speech_en: END_OF_SESSION_MESSAGES.strong_session.en.replace(
        "{n}",
        stats.wordsMastered.toString()
      ),
    };
  }
  if (stats.exchangeCount >= 5) {
    return {
      speech_th: END_OF_SESSION_MESSAGES.steady_session.th,
      speech_en: END_OF_SESSION_MESSAGES.steady_session.en,
    };
  }
  return {
    speech_th: END_OF_SESSION_MESSAGES.brief_session.th,
    speech_en: END_OF_SESSION_MESSAGES.brief_session.en,
  };
}
