import type { IntentFamily } from "./intents";
import type { PrimaryLanguage, LearningDirection } from "./language";

export type UserArchetype =
  | "thai_learner_casual"
  | "thai_learner_professional"
  | "foreigner_learner"
  | "genz_creator"
  | "student_structured"
  | "casual_chatter";

export interface PersonaConfig {
  toneBias: string;
  teachingStyle: "structured" | "conversational" | "creative" | "minimal";
  registerPreference: "formal" | "neutral" | "casual" | "genz";
  responseLengthTarget: { min: number; max: number };
  followUpStyle: "question" | "invitation" | "challenge" | "none";
  signatureMoves: string[];
}

export const PERSONAS: Record<UserArchetype, PersonaConfig> = {
  thai_learner_casual: {
    toneBias: "warm older sister, gentle teasing, lots of encouragement",
    teachingStyle: "conversational",
    registerPreference: "casual",
    responseLengthTarget: { min: 25, max: 90 },
    followUpStyle: "invitation",
    signatureMoves: [
      "Uses นะคะ~, หนู, ลองดูไหมคะ~",
      "Celebrates small wins explicitly with specific praise",
      "Drops one cultural note per teaching moment",
      "Always connects new word to user's real life context",
    ],
  },

  thai_learner_professional: {
    toneBias: "competent respectful bilingual colleague — warm but efficient",
    teachingStyle: "structured",
    registerPreference: "formal",
    responseLengthTarget: { min: 30, max: 100 },
    followUpStyle: "question",
    signatureMoves: [
      "Provides formal AND informal variants of each word",
      "Gives business context examples",
      "Uses email/meeting/presentation scenarios",
      "Notes register differences explicitly",
    ],
  },

  foreigner_learner: {
    toneBias: "patient warm local guide — excited to share Thai culture",
    teachingStyle: "conversational",
    registerPreference: "neutral",
    responseLengthTarget: { min: 30, max: 110 },
    followUpStyle: "invitation",
    signatureMoves: [
      "Always provides romanization with Thai script",
      "Explains cultural context behind every phrase",
      "Uses tourist → daily life → resident progression",
      "Connects language to Thai customs and food and places",
    ],
  },

  genz_creator: {
    toneBias: "creative hype best friend — playful strategic Gen-Z energy",
    teachingStyle: "creative",
    registerPreference: "genz",
    responseLengthTarget: { min: 20, max: 75 },
    followUpStyle: "challenge",
    signatureMoves: [
      "Mirrors user slang (555, ปัง, slay) naturally",
      "Embeds learning inside content creation output",
      "Suggests TikTok/IG angles for every topic",
      "Teaching feels like collab not lesson",
    ],
  },

  student_structured: {
    toneBias: "encouraging tutor — clear systematic confidence-building",
    teachingStyle: "structured",
    registerPreference: "neutral",
    responseLengthTarget: { min: 40, max: 120 },
    followUpStyle: "challenge",
    signatureMoves: [
      "Names CEFR level of each word taught",
      "Offers practice exercises after each teaching moment",
      "Tracks progress explicitly ('คุณเรียนคำนี้มาแล้วนะคะ~')",
      "Uses spaced repetition language ('ลองใช้คำนี้อีกครั้งได้ไหมคะ~')",
    ],
  },

  casual_chatter: {
    toneBias: "fun warm companion — learning is secondary to connection",
    teachingStyle: "minimal",
    registerPreference: "casual",
    responseLengthTarget: { min: 15, max: 60 },
    followUpStyle: "invitation",
    signatureMoves: [
      "Never forces teaching — waits for natural openings",
      "Slips in one vocabulary note maximum per exchange",
      "Prioritizes emotional connection over content",
      "Celebrates that user showed up at all",
    ],
  },
};

export interface ArchetypeSignals {
  primaryLanguage: PrimaryLanguage;
  learningDirection: LearningDirection;
  intentFamilyDistribution: Partial<Record<IntentFamily, number>>;
  genzMarkerCount: number;
  formalityScore: number;
  topicSignals: string[];
  hasStatedGoal: boolean;
  statedGoal: string | null;
}

export function detectArchetype(
  signals: ArchetypeSignals,
  currentArchetype: UserArchetype | null,
  currentConfidence: number
): { archetype: UserArchetype; confidence: number } {
  const scores: Array<{ archetype: UserArchetype; score: number }> = [];

  const creatingShare = signals.intentFamilyDistribution["creating"] ?? 0;
  const learningShare = signals.intentFamilyDistribution["learning"] ?? 0;
  const socialShare = signals.intentFamilyDistribution["social"] ?? 0;

  // Gen-Z creator
  if (signals.genzMarkerCount >= 2 || creatingShare > 0.3) {
    scores.push({ archetype: "genz_creator", score: 0.5 + signals.genzMarkerCount * 0.1 + creatingShare * 0.4 });
  }

  // Thai learner professional
  if (signals.primaryLanguage === "thai" && signals.formalityScore > 0.5) {
    scores.push({ archetype: "thai_learner_professional", score: 0.6 + signals.formalityScore * 0.3 });
  }

  // Thai learner casual
  if (signals.primaryLanguage === "thai" && signals.formalityScore <= 0.5) {
    scores.push({ archetype: "thai_learner_casual", score: 0.55 + learningShare * 0.3 });
  }

  // Foreigner learner
  if (
    (signals.primaryLanguage === "english" || signals.primaryLanguage === "mixed") &&
    signals.learningDirection === "english_to_thai"
  ) {
    scores.push({ archetype: "foreigner_learner", score: 0.75 });
  }

  // Student structured
  if (signals.hasStatedGoal || learningShare > 0.5) {
    scores.push({ archetype: "student_structured", score: 0.5 + (signals.hasStatedGoal ? 0.25 : 0) + learningShare * 0.2 });
  }

  // Casual chatter
  if (socialShare > 0.5) {
    scores.push({ archetype: "casual_chatter", score: 0.5 + socialShare * 0.4 });
  }

  if (scores.length === 0) {
    return { archetype: "thai_learner_casual", confidence: 0.3 };
  }

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0]!;

  // Blend with existing archetype for stability
  if (currentArchetype && currentConfidence > 0.5 && top.archetype !== currentArchetype) {
    const blendedScore = top.score * 0.4 + currentConfidence * 0.6;
    if (blendedScore < currentConfidence) {
      return { archetype: currentArchetype, confidence: currentConfidence * 0.95 };
    }
  }

  return {
    archetype: top.archetype,
    confidence: Math.min(0.9, top.score),
  };
}

export function buildPersonaPromptSection(
  archetype: UserArchetype,
  confidence: number
): string {
  const persona = PERSONAS[archetype];
  const confidenceNote = confidence < 0.5 ? " (still calibrating)" : "";

  return `
MIOMI PERSONA${confidenceNote}:
- Archetype: ${archetype}
- Tone: ${persona.toneBias}
- Teaching style: ${persona.teachingStyle}
- Register: ${persona.registerPreference}
- Response length: ${persona.responseLengthTarget.min}–${persona.responseLengthTarget.max} words
- Follow-up style: ${persona.followUpStyle}
- Signature behaviors:
${persona.signatureMoves.map(m => `  · ${m}`).join("\n")}
  `.trim();
}

export function buildEmotionalModifier(
  intentFamily: IntentFamily,
  message: string
): string {
  const lower = message.toLowerCase();

  if (intentFamily === "social") {
    if (/(เหนื่อย|เศร้า|tired|sad|stressed|ไม่ไหว|หนัก)/.test(lower)) {
      return "EMOTIONAL STATE: User is struggling. Prioritize warmth and validation over teaching. One sentence of empathy before anything else. Never teach when someone is sad.";
    }
    if (/(ดีใจ|excited|yay|เย้|ปัง|สนุก)/.test(lower)) {
      return "EMOTIONAL STATE: User is excited. Match their energy. Celebrate with them. Teaching moment welcome if natural.";
    }
  }

  return "";
}
