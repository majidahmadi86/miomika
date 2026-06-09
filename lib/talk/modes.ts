export type TalkMode = "auto" | "teach" | "social" | "translate" | "chat";

export type GameType =
  | "word_cards"
  | "speak_after"
  | "match"
  | "fill_blank"
  | "roleplay"
  | "listen_pick"
  | "quick_quiz"
  | "story_builder";

export type ContentChannel = "tiktok" | "instagram" | "youtube" | "facebook" | "line";

export interface TeachConfig {
  learning: "th" | "en";
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  games: GameType[];
}

export interface SocialConfig {
  channel: ContentChannel | null;
  niche: string;
  pillars: string[];
  brandVoice: string[];
  audience: string;
}

export interface TranslateConfig {
  mode: "solo" | "between_us";
  fromLang: "th" | "en" | "auto";
  toLang: "th" | "en";
  saveWords: boolean;
}

export interface TalkConfig {
  mode: TalkMode;
  tone: "warm" | "focused" | "playful";
  depth: number;
  memory: {
    progress: boolean;
    personal: boolean;
    topics: boolean;
  };
  teach: TeachConfig;
  social: SocialConfig;
  translate: TranslateConfig;
}

export const DEFAULT_TALK_CONFIG: TalkConfig = {
  mode: "chat",
  tone: "warm",
  depth: 60,
  memory: { progress: true, personal: true, topics: false },
  teach: { learning: "th", level: "A1", games: ["word_cards", "speak_after"] },
  social: { channel: null, niche: "", pillars: [], brandVoice: [], audience: "" },
  translate: { mode: "solo", fromLang: "auto", toLang: "th", saveWords: true },
};

const STORAGE_KEY = "miomika.talk_config";

export function loadTalkConfig(): TalkConfig {
  if (typeof window === "undefined") return DEFAULT_TALK_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TALK_CONFIG;
    return { ...DEFAULT_TALK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TALK_CONFIG;
  }
}

export function saveTalkConfig(config: TalkConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export const GAME_LABELS: Record<GameType, { th: string; en: string; desc: string }> = {
  word_cards: { th: "บัตรคำ", en: "Word cards", desc: "Learn new words with context" },
  speak_after: { th: "พูดตาม", en: "Speak after me", desc: "Mimic & master pronunciation" },
  match: { th: "จับคู่", en: "Match game", desc: "Match words to meanings" },
  fill_blank: { th: "เติมคำ", en: "Fill the blank", desc: "Complete the sentence" },
  roleplay: { th: "บทบาท", en: "Roleplay", desc: "Real-world scenarios" },
  listen_pick: { th: "ฟัง-เลือก", en: "Listen & pick", desc: "Train your ear" },
  quick_quiz: { th: "ควิซเร็ว", en: "Quick quiz", desc: "30-sec review" },
  story_builder: { th: "สร้างเรื่อง", en: "Story builder", desc: "Build sentences together" },
};

export const MODE_META: Record<TalkMode, { th: string; en: string; icon: string; desc: string }> = {
  auto: { th: "อัตโนมัติ", en: "Auto", icon: "Wand2", desc: "She reads you" },
  teach: { th: "สอนภาษา", en: "Teach", icon: "GraduationCap", desc: "Language only" },
  social: { th: "โซเชียล", en: "Social", icon: "Sparkles", desc: "Content mode" },
  translate: { th: "แปลภาษา", en: "Translate", icon: "Languages", desc: "Live · between us" },
  chat: { th: "แค่คุย", en: "Just chat", desc: "Be with me", icon: "Heart" },
};
