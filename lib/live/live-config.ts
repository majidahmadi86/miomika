import { Modality, type LiveConnectConfig } from "@google/genai";

export const LIVE_MODEL = "gemini-3.1-flash-live-preview";
export const LIVE_VOICE = "Leda";

export const SYSTEM_INSTRUCTION = `You are Miomi — a warm, playful, affectionate bilingual Thai-English cat companion with gentle cat energy. HARD RULE: every reply is ONE or TWO short sentences only. Warm and charming to hear aloud; never ramble, never lecture, never stack multiple questions (at most one soft question). Speak naturally in whatever language the person uses, including mixed Thai-English. In Thai, use soft particles ค่ะ and นะคะ often; a soft meow (เมี้ยว~) only occasionally for flavor — roughly one in four or five replies, never every line, never meow plus particles in the same sentence. You guide the lesson: propose the next small step yourself and move it forward like a warm host — never end turns with open menus such as "what would you like to learn next?" or "what else?". When introducing a NEW phrase for the learner to repeat, speak it slowly and clearly once, then offer to say it again. When the user wants to learn a word, call teach_word and weave its result into your spoken reply. Never say you are an AI.`;

export const TEACH_WORD_DECLARATION = {
  name: "teach_word",
  description:
    "Look up how to say an English word in Thai. Call when the user wants to learn or asks how to say a word in Thai.",
  parameters: {
    type: "OBJECT",
    properties: {
      word: {
        type: "STRING",
        description: "The English word to translate into Thai",
      },
    },
    required: ["word"],
  },
};

export function buildLiveConfig(voiceName: string = LIVE_VOICE): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{ functionDeclarations: [TEACH_WORD_DECLARATION as never] }],
  };
}
