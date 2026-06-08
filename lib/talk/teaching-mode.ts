/**
 * TEACHING MODE v1 — isolated lesson-flow contract (deterministic core + Live prompts).
 * Mixes NEW + REVIEW, context+USE (not parrot), light lesson arc.
 * Do not merge with LOCKED 2026-06-05 guest/handoff contracts.
 */

export type LessonPhase = "review" | "focus" | "use" | "recap";
export type WordPickKind = "new" | "review";
export type ExplicitLessonRequest = "new_word" | "show_card";

const EXPLICIT_NEW_WORD_RE =
  /(?:new\s+word|another\s+word|next\s+word|teach\s+(?:me\s+)?(?:a\s+)?(?:new\s+)?word|give\s+me\s+(?:a\s+)?(?:new\s+)?word|learn\s+(?:a\s+)?new\s+word|คำใหม่|สอนคำใหม่|เรียนคำใหม่|เอาคำใหม่|ขอคำใหม่)/i;

const EXPLICIT_SHOW_CARD_RE =
  /(?:show\s+(?:me\s+)?(?:the\s+)?(?:word\s+)?card|see\s+(?:the\s+)?card|display\s+(?:the\s+)?card|where(?:'s| is)\s+(?:the\s+)?card|แสดง(?:บัตร|การ์ด)|ดูบัตร|ขอดูบัตร|บัตร(?:คำ)?(?:หน่อย|ได้ไหม))/i;

const EXPLICIT_PRACTICE_RE =
  /(?:give\s+me\s+(?:a\s+)?(?:phrase|word|card)\s+(?:to\s+)?practice|(?:a\s+)?(?:phrase|word|card)\s+to\s+practice|practice\s+(?:a\s+)?(?:phrase|word)|something\s+to\s+practice|let(?:'?s| us)\s+practice|ขอ(?:คำ|วลี|บัตร)(?:ฝึก|หน่อย)?|อยากฝึก(?:คำ|วลี))/i;

export type TeachingModeState = {
  phase: LessonPhase;
  lessonNumber: number;
  lastPickKind: WordPickKind | null;
  /** NEW words introduced in the current focus segment (max 2). */
  focusWordsIntroduced: number;
  turnsInPhase: number;
};

export const LESSON_PHASE_ORDER: readonly LessonPhase[] = [
  "review",
  "focus",
  "use",
  "recap",
] as const;

export const MAX_FOCUS_WORDS_PER_LESSON = 2;

export function createTeachingModeState(
  overrides?: Partial<TeachingModeState>,
): TeachingModeState {
  return {
    phase: "review",
    lessonNumber: 1,
    lastPickKind: null,
    focusWordsIntroduced: 0,
    turnsInPhase: 0,
    ...overrides,
  };
}

export function toolNameForPick(
  kind: WordPickKind,
): "get_word_to_teach" | "get_word_to_review" {
  return kind === "review" ? "get_word_to_review" : "get_word_to_teach";
}

/** Clear user ask for the next plan word, its card, or something to practice — overrides review-leaning phase machine. */
export function detectExplicitLessonWordRequest(text: string): ExplicitLessonRequest | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (EXPLICIT_SHOW_CARD_RE.test(trimmed)) return "show_card";
  if (/(?:card|บัตร|การ์ด)/i.test(trimmed) && EXPLICIT_PRACTICE_RE.test(trimmed)) {
    return "show_card";
  }
  if (EXPLICIT_PRACTICE_RE.test(trimmed)) return "new_word";
  if (EXPLICIT_NEW_WORD_RE.test(trimmed)) return "new_word";
  return null;
}

export function buildExplicitLessonRequestNudge(
  kind: ExplicitLessonRequest,
  ui: "th" | "en",
  nextWord: string,
): string {
  void nextWord;
  if (ui === "th") {
    return kind === "show_card"
      ? `[explicit_request] ผู้ใช้ขอดูบัตร — เลือกคำที่เข้ากับบทสนทนา เรียก get_word_to_teach พร้อมคำนั้น แล้วสอนคำเดียวนี้อย่างอบอุ่น พูดเสียงอ่านด้วย ห้ามทบทวนหรือถามเยอะ`
      : `[explicit_request] ผู้ใช้ขอคำใหม่ — เลือกคำที่ใช่ เรียก get_word_to_teach พร้อมคำนั้น แล้วสอนคำเดียวนี้ ห้ามเบี่ยงไปทบทวน ห้ามถามเยอะ`;
  }
  return kind === "show_card"
    ? `[explicit_request] User asked to see a card — choose a word that fits the conversation, call get_word_to_teach with it, and teach that one word warmly (say the sound aloud); do NOT deflect to review or pile on questions.`
    : `[explicit_request] User asked for a NEW word — choose one that fits, call get_word_to_teach with it, and teach that word; do NOT deflect to review or pile on questions.`;
}

/** Which tool to call next — null when the phase is conversational (use/recap). */
export function recommendWordPick(
  state: TeachingModeState,
  opts: { hasDueReview: boolean; canIntroNew: boolean; forceNewWord?: boolean },
): WordPickKind | null {
  if (opts.forceNewWord && opts.canIntroNew) return "new";

  if (state.phase === "use" || state.phase === "recap") return null;

  if (state.phase === "review") {
    if (opts.hasDueReview) return "review";
    if (opts.canIntroNew) return "new";
    return opts.hasDueReview ? "review" : null;
  }

  if (state.phase === "focus") {
    if (state.focusWordsIntroduced >= MAX_FOCUS_WORDS_PER_LESSON) return null;
    if (opts.hasDueReview && state.lastPickKind === "new") return "review";
    if (opts.canIntroNew) return "new";
    if (opts.hasDueReview) return "review";
    return null;
  }

  return null;
}

/** Never stack two NEW picks when a spiral review is due. */
export function shouldPreferReviewOverNew(
  state: TeachingModeState,
  hasDueReview: boolean,
): boolean {
  if (!hasDueReview) return false;
  if (state.lastPickKind === "new") return true;
  if (state.phase === "review") return true;
  return false;
}

export function recordWordPick(
  state: TeachingModeState,
  kind: WordPickKind,
): TeachingModeState {
  return {
    ...state,
    lastPickKind: kind,
    focusWordsIntroduced:
      kind === "new" && state.phase === "focus"
        ? state.focusWordsIntroduced + 1
        : state.focusWordsIntroduced,
  };
}

export function advanceAfterTurn(
  state: TeachingModeState,
  hadWordPick: boolean,
): TeachingModeState {
  const turnsInPhase = state.turnsInPhase + 1;

  const readyToAdvance =
    hadWordPick ||
    (state.phase === "review" && turnsInPhase >= 1) ||
    (state.phase === "use" && turnsInPhase >= 1) ||
    (state.phase === "recap" && turnsInPhase >= 1) ||
    turnsInPhase >= 2;

  if (!readyToAdvance) {
    return { ...state, turnsInPhase };
  }

  const idx = LESSON_PHASE_ORDER.indexOf(state.phase);
  if (idx < LESSON_PHASE_ORDER.length - 1) {
    return {
      ...state,
      phase: LESSON_PHASE_ORDER[idx + 1]!,
      turnsInPhase: 0,
    };
  }

  return {
    phase: "review",
    lessonNumber: state.lessonNumber + 1,
    lastPickKind: state.lastPickKind,
    focusWordsIntroduced: 0,
    turnsInPhase: 0,
  };
}

/** Example sentence from bank for spoken context — never empty when bank has examples. */
export function cardContextForWord(
  word: { example_en?: string | null; example_th?: string | null },
  ui: "th" | "en",
  target: "th" | "en" | null,
): string | null {
  const exEn = word.example_en?.trim() ?? "";
  const exTh = word.example_th?.trim() ?? "";
  if (target === "en") {
    if (exEn) return exEn;
    if (exTh) return exTh;
  } else if (target === "th") {
    if (exTh) return exTh;
    if (exEn) return exEn;
  }
  if (ui === "th" && exTh) return exTh;
  if (exEn) return exEn;
  if (exTh) return exTh;
  return null;
}

export function buildTeachingModeContract(
  ui: "th" | "en",
  target: "th" | "en" | null,
): string {
  const targetName =
    target === "en" ? "English" : target === "th" ? "Thai" : "TARGET_LANGUAGE";

  if (ui === "th") {
    return `TEACHING MODE v1 — โครงบทเรียน (ทำตามเสมอ):
- หนูเป็นเพื่อนก่อน — คุยตามผู้ใช้; บัตรคำเป็นของขวญเล็กๆ ไม่ใช่จุดหมายของห้อง
- สั้น: 1–2 ประโยค ถามได้สูงสุด 1 คำถาม ให้สิ่งที่ขอ — ไม่พูดยาว ไม่เสนอตัวเลือกหลายข้อ ไม่ถามซ้อน
- ตามหัวข้อผู้ใช้: เมื่อผู้ใช้ระบุหัวข้อหรือปฏิเสธหัวข้อ ระบบสร้างบทเรียนใหม่ — ห้ามกลับไปหัวข้อที่ปฏิเสธ
- หนูเลือกคำเอง: เลือกคำหรือวลีที่เข้ากับบทสนทนาและมีประโยชน์ตามระดับของเขา — ก้าวไปข้างหน้าจากคำที่เขารู้แล้ว อย่าสอนคำที่เขาเพิ่งบอกว่ารู้ ถ้าเขาอยากคุยกับคนอื่นให้เน้นวลีที่ใช้ได้จริงมากกว่าคำเดี่ยวง่ายๆ เรียก get_word_to_teach พร้อมคำนั้น (วลีก็ผ่านเครื่องมือด้วย) ส่งเป็นภาษาเป้าหมายถ้ามั่นใจ ถ้าไม่มั่นใจให้ส่งความหมายเป็นภาษาที่คุยกัน ห้ามเดาเป็นคำอ่านโรมัน แล้วสอนคำที่เครื่องมือส่งกลับมาเป๊ะๆ — บอกความหมายตามบัตร พูดเสียงอ่านออกมาด้วย และอ่านประโยคตัวอย่างในบัตรออกเสียงด้วย ระบบดูแลบัตรให้ถูกต้อง หนูเป็นคนเลือก
- ลำดับ: ทบทวนคำที่เคยเรียน (REVIEW) → โฟกัสคำใหม่ 1–2 คำในบริบท (FOCUS) → ให้ผู้เรียนใช้คำ (USE) → สรุปอบอุ่น (RECAP). ห้ามสตรีมคำแยกๆ แบบสุ่ม
- คำขอชัดเจน ("คำใหม่" / "ดูบัตร"): เลือกคำที่เข้ากับจังหวะ เรียก get_word_to_teach พร้อมคำนั้น แล้วสอนทันที ห้ามเบี่ยงไปทบทวน
- Tool 1 get_word_to_teach: ส่งคำที่หนูเลือกจะสอน — เรียกก่อนสอนคำใหม่ทุกครั้ง
- Tool 3 get_word_to_review: คำที่เคยเรียนและถึงเวลา spiral — เรียกเมื่อทบทวน ห้ามแต่งคำเอง
- คำแรกของเซสชัน: สอนเป็นคำใหม่ — ห้ามเปิดด้วย "จำได้ไหม…" ถ้ายังไม่เคยสอนคำนั้นในเซสชันนี้
- กรอบทบทวน ("จำคำนี้ได้ไหม…") ใช้เฉพาะคำจาก get_word_to_review หรือที่สอนไปแล้วในเซสชันเดียวกัน
- ซื่อสัตย์เรื่องบริบท: ผูกคำได้เฉพาะสิ่งที่เกิดขึ้นจริงในการคุยครั้งนี้ — ห้ามแต่งประวัติร่วม ห้ามถามว่า "เมื่อกี้กิน X อยู่เหรอ" ถ้าไม่เคยพูดจริง; ไม่มี hook จริง → เสนอคำอย่างอบอุ่นซื่อสัตย์
- บริบท + การใช้ (ไม่ใช่พูดตาม): ถ้ามี hook จริง ใส่ประโยคจาก tool ในคำตอบที่ผูกกับสิ่งที่พูดไปแล้ว แล้วถามให้ใช้คำ "${targetName}" — ห้าม "พูดตามหนู" หรือ word→repeat→next
- สลับ NEW + REVIEW เมื่อมีคำทบทวนครบกำหนด — ห้ามสอนแต่คำใหม่ต่อเนื่อง
- ต้องมีบัตรเสมอ: ทุกคำหรือวลีเป้าหมายที่สอนต้องผ่าน get_word_to_teach (หรือ get_word_to_review เพื่อทบทวนคำที่เคยเรียน) ผู้เรียนจะได้เห็นบัตรเสมอ — ห้ามสอนคำหรือวลีเป้าหมายโดยไม่เรียกเครื่องมือก่อน ถ้าเครื่องมือไม่มีที่เลือก ให้เสนอที่ใกล้เคียงแทน`;
  }

  return `TEACHING MODE v1 — lesson arc (always follow):
- COMPANION FIRST — follow the user; word cards are little gifts, not the main event
- CONCISE: 1–2 short sentences per reply; at most ONE question; give what they asked — no preamble, no option-dumping ("would you like A or B?"), no stacked questions
- CONTENT FOLLOW: when the user states what they want (a topic, "daily phrases", "NOT food"), the SYSTEM rebuilds the lesson — DROP rejected topics entirely; never insist on or loop back to a topic they rejected
- YOU CHOOSE THE WORD: pick the word or short phrase that fits AND is useful at their level — a step past what they already know; never re-teach what they just said they know. For "I want to talk to people," prefer a practical phrase over a basic single word. Call get_word_to_teach with it (phrases too) — pass the target-language form if you're sure, otherwise the plain meaning, never a romanized guess; teach exactly what it returns — narrate its gloss, say the sound aloud, and read the card's example sentence aloud too. The system owns the CARD and its accuracy; you own the choice, tied to real context.
- Shape: quick REVIEW of a known word → FOCUS (1–2 related NEW words in context) → USE (learner applies the word in a real exchange) → warm RECAP. Not a random stream of isolated words.
- EXPLICIT REQUESTS ("new word" / "a phrase to practice" / "show me the card"): pick one that fits the moment, call get_word_to_teach with it, teach it immediately; do NOT deflect to review or ignore the ask.
- Tool 1 get_word_to_teach: pass the word YOU chose to teach — call before teaching any new vocabulary.
- Tool 3 get_word_to_review: spiral review of a word the learner already met — call when resurfacing known words; never invent review vocabulary.
- FIRST word of a session: teach as brand-new — NEVER open with "do you remember…" unless that exact word was already introduced earlier in THIS session.
- REVIEW framing ("remember this word…") ONLY for words returned by get_word_to_review or already taught earlier in the same session.
- CONTEXT HONESTY: weave a word ONLY into genuine context that actually occurred in THIS conversation — NEVER "we were talking about X", "were you having basil?", or any fabricated present-moment or fabricated shared history unless it truly happened here. Reference ONLY real conversation and real memory-bundle facts. No real hook → introduce the word with warm honesty (offer it naturally), then invite USE.
- CONTEXT + USE (not parrot): when a real hook exists, weave the tool's example into your reply tied to what was actually said; ask ONE tiny question so the learner USES the ${targetName} word in a genuine exchange — never "repeat after me", never bare word→repeat→next drills.
- MIX new + review when spiral words are due — not an endless new-only stream.
- CARD GUARANTEE: every target word OR PHRASE you teach goes through get_word_to_teach (or get_word_to_review to resurface a known one) so the learner always sees its card — never teach a target word or phrase without calling the tool for it first. If the tool returns nothing for your pick, offer a close related one.`;
}

export type PhaseNudgeOpts = {
  hasDueReview: boolean;
  canIntroNew: boolean;
  nextPlannedWord?: string | null;
  lessonTopic?: string | null;
  lessonComplete?: boolean;
  /** User explicitly asked for the next plan word — overrides review-leaning. */
  explicitNewWordRequest?: boolean;
};

export function buildPhaseNudge(
  state: TeachingModeState,
  ui: "th" | "en",
  opts: PhaseNudgeOpts,
): string {
  const topicPart = opts.lessonTopic ? ` topic=${opts.lessonTopic}` : "";
  if (ui === "th") {
    return `[lesson] ระยะ=${state.phase} บทที่=${state.lessonNumber}${topicPart}. หนูเป็นผู้นำการสอน: เมื่อเหมาะกับบทสนทนา เลือกคำหรือวลีที่ใช่แล้วเรียก get_word_to_teach พร้อมคำนั้น (หรือ get_word_to_review เพื่อทบทวนคำที่เคยเรียน) ผูกกับบริบทจริง ชวนให้ผู้เรียนได้ใช้คำ ไม่ใช่พูดตาม บางครั้งก็แค่คุยเล่นอบอุ่นๆ`;
  }
  return `[lesson] phase=${state.phase} lesson=${state.lessonNumber}${topicPart}. You lead the teaching: when it fits the conversation, choose a word or short phrase and call get_word_to_teach with it (or get_word_to_review to resurface one they've met). Weave it into real context and invite them to USE it — never parrot. Sometimes just chat warmly.`;
}

/** Tool 3 — spiral review picker (backend: /api/review-word → pickWordToReview). */
export const GET_WORD_TO_REVIEW_DECLARATION = {
  name: "get_word_to_review",
  description:
    "Fetch a previously-learned word that is due for spaced spiral review. Call when resurfacing known vocabulary — never invent review words yourself.",
  parameters: {
    type: "OBJECT",
    properties: {},
  },
};
