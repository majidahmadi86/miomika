// /lib/library/responses.ts

export type LibraryResponse = {
  id: string;
  intent: string;
  user_archetype: "thai_learning_english" | "foreigner_learning_thai" | "mixed" | "any";
  trigger_patterns: RegExp[];
  response: {
    speech_th: string;
    speech_en: string;
    audio_key_th?: string;
    audio_key_en?: string;
  };
  follow_up?: {
    type: "word_card" | "exercise" | "translation_card" | "caption_card" | "none";
    payload_resolver:
      | "first_vocab_at_user_level"
      | "specific_word_id"
      | "phrase_id"
      | "dynamic"
      | "extract_from_input";
    payload_params?: Record<string, unknown>;
  };
  miomi_state_during: "idle" | "speaking" | "teaching" | "reacting" | "thinking";
  cost: 0;
};

export const LIBRARY_TEMPLATES: LibraryResponse[] = [
  // 1. TEACH_ME_ENGLISH
  {
    id: "teach_me_english",
    intent: "teach_me_english",
    user_archetype: "any",
    trigger_patterns: [
      /teach me english/i,
      /สอนภาษาอังกฤษ/,
      /อยากเรียน english/i,
      /i want to learn english/i,
      /สอน english/i,
    ],
    response: {
      speech_th:
        "ดีค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดในชีวิตประจำวันก่อนนะคะ คำแรก หนูจะสอนคำว่า 'hello' ค่า — เป็นคำทักทายที่ใช้ได้ทุกที่",
      speech_en:
        "Great~ Let's start with the most common everyday words. First, I'll teach you 'hello' — a greeting you can use anywhere",
    },
    follow_up: {
      type: "word_card",
      payload_resolver: "specific_word_id",
      payload_params: { word_en: "hello", cefr_level: "A1" },
    },
    miomi_state_during: "teaching",
    cost: 0,
  },

  // 2. TEACH_ME_THAI
  {
    id: "teach_me_thai",
    intent: "teach_me_thai",
    user_archetype: "any",
    trigger_patterns: [
      /teach me thai/i,
      /สอนภาษาไทย/,
      /i want to learn thai/i,
      /how do i learn thai/i,
      /สอน thai/i,
    ],
    response: {
      speech_th:
        "ดีใจค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดนะคะ หนูจะสอนคำว่า 'สวัสดี' ค่า — แปลว่า hello ใช้ได้ทั้งวันเลย",
      speech_en:
        "Yay~ Let's start with the most useful phrase first. I'll teach you 'sa-wat-dee' — it means hello, and Thai people use it all day.",
    },
    follow_up: {
      type: "word_card",
      payload_resolver: "specific_word_id",
      payload_params: { word_th: "สวัสดี", cefr_level: "A1" },
    },
    miomi_state_during: "teaching",
    cost: 0,
  },

  // 3. WHAT_DOES_X_MEAN
  {
    id: "what_does_x_mean",
    intent: "what_does_x_mean",
    user_archetype: "any",
    trigger_patterns: [
      /(.+) แปลว่าอะไร/,
      /what does (.+) mean/i,
      /ความหมายของ (.+)/,
      /(.+) คืออะไร/,
      /(.+) แปลว่า/,
    ],
    response: {
      // Templated — X is replaced at runtime by resolver
      speech_th: "คำว่า '{word_en}' แปลว่า '{word_th}' ค่า~ {miomi_note_th}",
      speech_en: "'{word_en}' means '{word_th}'. {miomi_note_en}",
    },
    follow_up: {
      type: "word_card",
      payload_resolver: "extract_from_input",
      payload_params: { lookup_table: "vocabulary_bank" },
    },
    miomi_state_during: "teaching",
    cost: 0,
  },

  // 4. HOW_DO_YOU_SAY_X
  {
    id: "how_do_you_say_x",
    intent: "how_do_you_say_x",
    user_archetype: "any",
    trigger_patterns: [
      /(.+) ภาษาไทยว่า/,
      /how do you say (.+)/i,
      /(.+) ภาษาอังกฤษว่า/,
      /(.+) เป็นภาษาไทย/,
      /พูด (.+) ยังไง/,
    ],
    response: {
      speech_th: "'{x}' พูดว่า '{translation}' ค่า~ ออกเสียงว่า '{romanization}'",
      speech_en: "'{x}' is '{translation}'. Pronounced '{romanization}'.",
    },
    follow_up: {
      type: "word_card",
      payload_resolver: "extract_from_input",
      payload_params: { lookup_table: "vocabulary_bank" },
    },
    miomi_state_during: "teaching",
    cost: 0,
  },

  // 5. HELP_ME_WRITE_CAPTION
  {
    id: "help_me_write_caption",
    intent: "help_me_write_caption",
    user_archetype: "any",
    trigger_patterns: [
      /help me write a caption/i,
      /ช่วยเขียนแคปชั่น/,
      /write a caption/i,
      /post idea/i,
      /แคปชั่น/,
    ],
    response: {
      speech_th:
        "ได้เลยค่า~ บอกหนูหน่อยว่าจะโพสต์เรื่องอะไร แล้วลงที่ไหน? Instagram, TikTok, Facebook?",
      speech_en:
        "Sure~ Tell me what you want to post about, and where? Instagram, TikTok, Facebook?",
    },
    follow_up: {
      type: "none",
      payload_resolver: "dynamic",
    },
    miomi_state_during: "speaking",
    cost: 0,
  },

  // 6. TRANSLATE_THIS
  {
    id: "translate_this",
    intent: "translate_this",
    user_archetype: "any",
    trigger_patterns: [
      /^translate this$/i,
      /^แปลให้หน่อย$/,
      /^แปลว่าอะไร$/,
      /^translate$/i,
    ],
    response: {
      speech_th: "ได้ค่า~ พิมพ์หรือพูดประโยคที่อยากแปลมาเลยค่า",
      speech_en: "Sure~ Type or say the sentence you want to translate.",
    },
    follow_up: {
      type: "none",
      payload_resolver: "dynamic",
    },
    miomi_state_during: "speaking",
    cost: 0,
  },

  // 7. FIRST_GREETING_OF_SESSION
  // (Engine-invoked — not user-triggered. See /lib/library/sessionOpener.ts)
  // Stored separately because it's compound (time-window + user-context appended)

  // 8. AFTER_CORRECT_ANSWER
  // (Event-invoked from exercises. See /lib/library/reactions.ts → getCorrectReaction)
  // Multiple pools defined separately due to context-specific selection

  // 9. AFTER_INCORRECT_ANSWER
  // (Event-invoked. See /lib/library/reactions.ts → getIncorrectReaction)

  // 10. END_OF_SESSION
  // (Event-invoked on session summary open. See /lib/library/reactions.ts → getEndOfSessionMessage)
];

// Session opener (Template 7) — invoked by /lib/library/sessionOpener.ts
export const GREETING_BY_TIME = {
  morning: { th: "อรุณสวัสดิ์ค่า~", en: "Good morning~" }, // 05:00-10:59
  lunch: { th: "กลางวันแล้วค่า~ กินข้าวยังคะ?", en: "Lunchtime~ have you eaten?" }, // 11:00-13:59
  afternoon: { th: "บ่ายดีค่า~", en: "Good afternoon~" }, // 14:00-17:59
  evening: { th: "เย็นแล้วค่า~ กลับบ้านหรือยังคะ?", en: "Evening~ back home yet?" }, // 18:00-21:59
  night: { th: "ดึกแล้วนะคะ~ ยังไม่นอนเหรอ?", en: "It's late~ not sleeping yet?" }, // 22:00-04:59
};

export const GREETING_APPENDS = {
  first_session_ever: {
    th: "หนูชื่อมิโอมิค่า อยากเรียนภาษาอะไรกับหนูดีคะ?",
    en: "I'm Miomi. What language would you like to learn?",
  },
  returning_under_24h: {
    th: "วันนี้คุยอะไรกันดีคะ?",
    en: "What shall we talk about today?",
  },
  returning_1_to_7_days: {
    th: "หายไปไหนมาคะ~ คิดถึงค่า",
    en: "Where have you been~ I missed you",
  },
  returning_7_plus_days: {
    th: "หายไปนานเลยค่า~ ดีใจที่กลับมานะคะ",
    en: "It's been so long~ I'm glad you're back",
  },
  streak_day_7: {
    th: "ครบ 7 วันแล้วค่า~ เก่งมาก! อยากฉลองด้วยอะไรดี?",
    en: "A full 7 days~ amazing! How shall we celebrate?",
  },
};

// Template 8: Correct reactions
export const CORRECT_REACTIONS = {
  generic: [
    { th: "เก่งมาก~ ตอบถูกเลยค่า", en: "Great~ that's right" },
    { th: "ใช่แล้ว! คุณจำได้ดีมากเลย", en: "Yes~ you remember it well" },
    { th: "เพอร์เฟกต์ค่า~", en: "Perfect~" },
    { th: "ดีมาก! ใช้คำได้ถูกเลย", en: "Great! you used the word correctly" },
  ],
  pronunciation: [
    { th: "ออกเสียงถูกเลยค่า~", en: "Pronunciation perfect~" },
    { th: "เพราะมากค่า~ ออกเสียงดี", en: "Beautiful~ great pronunciation" },
  ],
  usage: [
    // Use {word} placeholder for runtime substitution
    { th: "ใช้คำว่า '{word}' ได้ถูกแล้วนะคะ~", en: "You used '{word}' correctly~" },
  ],
  repeat_correct: [
    { th: "เก่งขึ้นเร็วมากเลย!", en: "You're improving so fast!" },
    { th: "คุณจำได้แม่นมากเลยค่า~", en: "You remember it so well~" },
  ],
};

// Template 9: Incorrect reactions
export const INCORRECT_REACTIONS = {
  first_attempt: [
    { th: "ลองอีกทีดูค่า~", en: "Try again~" },
    { th: "ใกล้แล้วนะคะ", en: "Almost there~" },
    { th: "ไม่เป็นไรค่า ลองดูใหม่", en: "It's okay, try once more" },
    { th: "เกือบถูกแล้ว ลองอีกที", en: "Very close, try again" },
  ],
  second_attempt_with_hint: [
    // {hint} placeholder for runtime substitution
    { th: "ลองคิดถึงคำที่ขึ้นต้นด้วย '{hint}' ดูค่า~", en: "Try thinking of a word that starts with '{hint}'~" },
    { th: "เริ่มต้นด้วยคำที่แปลว่า '{hint}' ค่า~", en: "Starts with a word that means '{hint}'~" },
  ],
  max_attempts: {
    // {correct_answer} placeholder
    th: "คำตอบคือ '{correct_answer}' ค่า~ ไม่เป็นไรเลยนะคะ เก็บคำนี้ไว้ลองครั้งหน้านะคะ",
    en: "The answer is '{correct_answer}'~ no worries. Save this word for next time.",
  },
};

// Template 10: End of session
export const END_OF_SESSION_MESSAGES = {
  strong_session: {
    // {n} placeholder for words mastered count
    th: "วันนี้คุณเก่งมากเลยค่า~ เรียนใหม่ได้ตั้ง {n} คำ — หนูภูมิใจมากเลยนะคะ",
    en: "You did so well today~ Learned {n} new words — I'm so proud of you",
  },
  steady_session: {
    th: "ดีค่า~ วันนี้ก็เรียนไปได้อีกค่า ทุกครั้งที่คุยกัน คุณก็เก่งขึ้นเรื่อยๆ นะคะ",
    en: "Nice~ another step forward today. Every time we talk, you get a little better.",
  },
  brief_session: {
    th: "ขอบคุณที่แวะมาค่า~ คราวหน้ามาคุยกันนานๆ นะคะ หนูรออยู่ค่า",
    en: "Thanks for stopping by~ Next time let's chat longer, I'll be waiting.",
  },
};
