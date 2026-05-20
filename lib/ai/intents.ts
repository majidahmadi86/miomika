export type IntentFamily =
  | "learning"
  | "creating"
  | "translating"
  | "social"
  | "meta";

export type Intent =
  | "learning_ask_word"
  | "learning_ask_phrase"
  | "learning_request_topic"
  | "learning_request_practice"
  | "learning_use_target_word"
  | "learning_confusion"
  | "learning_correction_request"
  | "creator_caption"
  | "creator_script"
  | "creator_bio"
  | "creator_comment_reply"
  | "creator_translate_for_post"
  | "creator_idea"
  | "translate_word"
  | "translate_phrase"
  | "translate_sentence"
  | "translate_explain"
  | "social_greeting"
  | "social_emotion_positive"
  | "social_emotion_negative"
  | "social_smalltalk"
  | "social_gratitude"
  | "social_farewell"
  | "meta_set_goal"
  | "meta_set_level"
  | "meta_set_mode"
  | "meta_clarification_needed"
  | "meta_off_topic"
  | "meta_unclear";

export interface IntentSignal {
  intent: Intent;
  score: number;
  signals: string[];
}

export interface IntentDetectionResult {
  primary: IntentSignal;
  secondary: IntentSignal | null;
  family: IntentFamily;
  confidence: number;
  needsClarification: boolean;
}

export function getIntentFamily(intent: Intent): IntentFamily {
  if (intent.startsWith("learning_")) return "learning";
  if (intent.startsWith("creator_")) return "creating";
  if (intent.startsWith("translate_")) return "translating";
  if (intent.startsWith("social_")) return "social";
  return "meta";
}

export function classifyIntentAdvanced(
  message: string,
  currentTargetWord: string | null,
  exchangeNumber: number
): IntentDetectionResult {
  const lower = message.toLowerCase().trim();
  const thaiChars = (message.match(/[\u0E00-\u0E7F]/g) ?? []).length;
  const totalChars = message.replace(/\s/g, "").length;
  const thaiRatio = totalChars > 0 ? thaiChars / totalChars : 0;

  const scores: IntentSignal[] = [];

  const add = (intent: Intent, score: number, signals: string[]) => {
    scores.push({ intent, score, signals });
  };

  // TARGET WORD CHECK — highest priority
  if (currentTargetWord && lower.includes(currentTargetWord.toLowerCase())) {
    add("learning_use_target_word", 0.95, ["target_word_found"]);
  }

  // CREATOR INTENTS
  if (/(แคปชั่น|caption|โพสต์|post|tiktok|ig|instagram|facebook|youtube|line oa|อยากโพสต์|write.*post|help.*post)/i.test(lower)) {
    const boost = /(555|ปัง|เด้ง|slay|vibes)/i.test(lower) ? 0.2 : 0;
    add("creator_caption", 0.75 + boost, ["platform_or_post_keyword"]);
  }
  if (/(สคริปต์|script|hook|intro|video script|คลิป)/i.test(lower)) {
    add("creator_script", 0.75, ["script_keyword"]);
  }
  if (/(bio|ไบโอ|profile|โปรไฟล์)/i.test(lower)) {
    add("creator_bio", 0.75, ["bio_keyword"]);
  }
  if (/(ตอบคอมเมนต์|reply.*comment|comment reply|ตอบกลับ)/i.test(lower)) {
    add("creator_comment_reply", 0.80, ["comment_reply_keyword"]);
  }
  if (/(ไอเดีย|idea|content idea|อะไรดี|brainstorm)/i.test(lower)) {
    add("creator_idea", 0.65, ["idea_keyword"]);
  }

  // TRANSLATOR INTENTS
  if (/(แปลว่าอะไร|หมายถึงอะไร|what does.*mean|what is.*in (thai|english)|ภาษาไทยว่า|ภาษาอังกฤษว่า)/i.test(lower)) {
    add("learning_ask_word", 0.85, ["definition_question"]);
  }
  if (/(แปล|translate|in thai|in english|เป็นภาษา)/i.test(lower)) {
    const words = lower.split(/\s+/).length;
    if (words <= 3) add("translate_word", 0.75, ["translate_keyword_short"]);
    else if (words <= 8) add("translate_phrase", 0.75, ["translate_keyword_medium"]);
    else add("translate_sentence", 0.75, ["translate_keyword_long"]);
  }
  if (/(ทำไม|why|culturally|หมายถึงอะไรกันแน่|what.*really mean)/i.test(lower)) {
    add("translate_explain", 0.70, ["explain_keyword"]);
  }

  // LEARNING INTENTS
  if (/(พูดยังไง|how do you say|how to say|how do i say)/i.test(lower)) {
    add("learning_ask_phrase", 0.85, ["how_to_say"]);
  }
  if (/(สอน|อยากเรียน|teach me|i want to learn|want to learn|อยากเก่ง|เรียน)/i.test(lower)) {
    add("learning_request_topic", 0.80, ["teach_keyword"]);
  }
  if (/(ลอง|ฝึก|quiz|practice|test me|let me try|ทดสอบ|ซ้อม)/i.test(lower)) {
    add("learning_request_practice", 0.80, ["practice_keyword"]);
  }
  if (/(ถูกไหม|is this right|correct|ผิดไหม|is it correct|ใช่ไหม)/i.test(lower)) {
    add("learning_correction_request", 0.80, ["correction_keyword"]);
  }
  if (/(งง|ไม่เข้าใจ|don't understand|confused|huh|what\?|idk|เข้าใจไม่ได้)/i.test(lower)) {
    add("learning_confusion", 0.80, ["confusion_keyword"]);
  }

  // SOCIAL INTENTS
  if (/^(สวัสดี|หวัดดี|ดี|hi|hello|hey|เฮ้|sup|yo\b)/i.test(lower)) {
    add("social_greeting", 0.90, ["greeting_pattern"]);
  }
  if (/(ดีใจ|เย้|ปัง|yay|excited|love|amazing|awesome|สนุก|เริ่ด|โคตรดี)/i.test(lower)) {
    add("social_emotion_positive", 0.75, ["positive_emotion"]);
  }
  if (/(เหนื่อย|เศร้า|ร้องไห้|tired|sad|stressed|ไม่ไหว|หนักมาก|กลัว)/i.test(lower)) {
    add("social_emotion_negative", 0.75, ["negative_emotion"]);
  }
  if (/(ขอบคุณ|ขอบใจ|thanks|thank you|ty|thx|ขอบคุณมาก)/i.test(lower)) {
    add("social_gratitude", 0.90, ["gratitude_keyword"]);
  }
  if (/(บาย|bye|ลาก่อน|see you|good night|ราตรี|แล้วเจอกัน)/i.test(lower)) {
    add("social_farewell", 0.90, ["farewell_keyword"]);
  }

  // META INTENTS
  if (/(เป้าหมาย|goal|i want to be good|อยากเก่งเรื่อง|i want to improve)/i.test(lower)) {
    add("meta_set_goal", 0.80, ["goal_keyword"]);
  }
  if (/(ฉันเป็น|i'm a|i am a|level|beginner|intermediate|advanced|ระดับ)/i.test(lower)) {
    add("meta_set_level", 0.80, ["level_keyword"]);
  }

  // DEFAULT — making a statement
  if (scores.length === 0) {
    if (lower.length < 4) {
      add("meta_unclear", 0.60, ["too_short"]);
    } else if (thaiRatio > 0.5) {
      add("social_smalltalk", 0.40, ["thai_statement_default"]);
    } else {
      add("social_smalltalk", 0.40, ["english_statement_default"]);
    }
  }

  // Sort by score
  scores.sort((a, b) => b.score - a.score);
  const primary = scores[0]!;
  const secondary = scores[1] && scores[1].score > 0.4 ? scores[1] : null;
  const confidence = primary.score - (secondary?.score ?? 0);
  const needsClarification = confidence < 0.25 && exchangeNumber > 2;

  return {
    primary,
    secondary,
    family: getIntentFamily(primary.intent),
    confidence,
    needsClarification,
  };
}
