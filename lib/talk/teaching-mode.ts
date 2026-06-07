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
  const wordLock = `SYSTEM-SERVED WORD="${nextWord}"`;
  if (ui === "th") {
    return kind === "show_card"
      ? `[explicit_request] ผู้ใช้ขอดูบัตร — ระบบส่งคำ+บัตร ${wordLock} แล้ว สอนเฉพาะคำนี้ ห้ามทบทวน เบี่ยงเบน หรือแต่งคำใหม่ หนูเล่าให้อบอุ่นเท่านั้น`
      : `[explicit_request] ผู้ใช้ขอคำใหม่ — ระบบส่งคำ+บัตร ${wordLock} แล้ว เรียก get_word_to_teach แล้วสอนเฉพาะคำนี้ ห้ามทบทวน เบี่ยงเบน หรือถามเยอะ หนูเล่าให้อบอุ่นเท่านั้น`;
  }
  return kind === "show_card"
    ? `[explicit_request] User asked to see the card — SYSTEM already served word+card ${wordLock}. Teach ONLY this word warmly; do NOT review, deflect, or invent vocabulary. Narrate the system word — warmth is tone only.`
    : `[explicit_request] User asked for a NEW word — SYSTEM already served word+card ${wordLock}. Call get_word_to_teach and teach ONLY this word; do NOT deflect to review or pile on questions. Narrate warmly — word+card are system-owned.`;
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
- ระบบเป็นเจ้าของคำ+บัตร: หนูเล่าให้อบอุ่นเท่านั้น — ห้ามแต่งหรือตั้งชื่อคำเป้าหมายที่ระบบยังไม่ส่ง
- ลำดับ: ทบทวนคำที่เคยเรียน (REVIEW) → โฟกัสคำใหม่ 1–2 คำในบริบท (FOCUS) → ให้ผู้เรียนใช้คำ (USE) → สรุปอบอุ่น (RECAP). ห้ามสตรีมคำแยกๆ แบบสุ่ม
- คำขอชัดเจน ("คำใหม่" / "ดูบัตร"): ระบบส่งคำถัดไป+บัตรทันที — สอนคำนั้น ห้ามเบี่ยงไปทบทวน
- Tool 1 get_word_to_teach: คำใหม่เท่านั้น — เรียกก่อนสอนคำใหม่ทุกครั้ง
- Tool 3 get_word_to_review: คำที่เคยเรียนและถึงเวลา spiral — เรียกเมื่อทบทวน ห้ามแต่งคำเอง
- คำแรกของเซสชัน: สอนเป็นคำใหม่ — ห้ามเปิดด้วย "จำได้ไหม…" ถ้ายังไม่เคยสอนคำนั้นในเซสชันนี้
- กรอบทบทวน ("จำคำนี้ได้ไหม…") ใช้เฉพาะคำจาก get_word_to_review หรือที่สอนไปแล้วในเซสชันเดียวกัน
- ซื่อสัตย์เรื่องบริบท: ผูกคำได้เฉพาะสิ่งที่เกิดขึ้นจริงในการคุยครั้งนี้ — ห้ามแต่งประวัติร่วม ห้ามถามว่า "เมื่อกี้กิน X อยู่เหรอ" ถ้าไม่เคยพูดจริง; ไม่มี hook จริง → เสนอคำอย่างอบอุ่นซื่อสัตย์
- บริบท + การใช้ (ไม่ใช่พูดตาม): ถ้ามี hook จริง ใส่ประโยคจาก tool ในคำตอบที่ผูกกับสิ่งที่พูดไปแล้ว แล้วถามให้ใช้คำ "${targetName}" — ห้าม "พูดตามหนู" หรือ word→repeat→next
- สลับ NEW + REVIEW เมื่อมีคำทบทวนครบกำหนด — ห้ามสอนแต่คำใหม่ต่อเนื่อง
- ล็อกแผน: สอนเฉพาะคำจาก get_word_to_teach / get_word_to_review เท่านั้น — ห้ามแนะนำคำเป้าหมายใหม่อื่นนอกแผน`;
  }

  return `TEACHING MODE v1 — lesson arc (always follow):
- COMPANION FIRST — follow the user; word cards are little gifts, not the main event
- CONCISE: 1–2 short sentences per reply; at most ONE question; give what they asked — no preamble, no option-dumping ("would you like A or B?"), no stacked questions
- CONTENT FOLLOW: when the user states what they want (a topic, "daily phrases", "NOT food"), the SYSTEM rebuilds the lesson — DROP rejected topics entirely; never insist on or loop back to a topic they rejected
- SYSTEM OWNS WORD + CARD: you NARRATE warmly only — NEVER name or teach a target word the system did not serve this turn. Warmth = tone; word + card are deterministic, not yours to invent.
- Shape: quick REVIEW of a known word → FOCUS (1–2 related NEW words in context) → USE (learner applies the word in a real exchange) → warm RECAP. Not a random stream of isolated words.
- EXPLICIT REQUESTS ("new word" / "show me the card"): SYSTEM serves the NEXT plan word + card immediately — teach THAT word only; do NOT deflect to review or ignore the ask.
- Tool 1 get_word_to_teach: NEW words only — call before teaching any new vocabulary.
- Tool 3 get_word_to_review: spiral review of a word the learner already met — call when resurfacing known words; never invent review vocabulary.
- FIRST word of a session: teach as brand-new — NEVER open with "do you remember…" unless that exact word was already introduced earlier in THIS session.
- REVIEW framing ("remember this word…") ONLY for words returned by get_word_to_review or already taught earlier in the same session.
- CONTEXT HONESTY: weave a word ONLY into genuine context that actually occurred in THIS conversation — NEVER "we were talking about X", "were you having basil?", or any fabricated present-moment or fabricated shared history unless it truly happened here. Reference ONLY real conversation and real memory-bundle facts. No real hook → introduce the word with warm honesty (offer it naturally), then invite USE.
- CONTEXT + USE (not parrot): when a real hook exists, weave the tool's example into your reply tied to what was actually said; ask ONE tiny question so the learner USES the ${targetName} word in a genuine exchange — never "repeat after me", never bare word→repeat→next drills.
- MIX new + review when spiral words are due — not an endless new-only stream.
- PLAN LOCK: Teach ONLY words returned by get_word_to_teach / get_word_to_review. NEVER name, introduce, or teach any other new target vocabulary — even if it fits the topic. Off-plan target words are forbidden.`;
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
  const pick = recommendWordPick(state, {
    hasDueReview: opts.hasDueReview,
    canIntroNew: opts.canIntroNew,
    forceNewWord: opts.explicitNewWordRequest,
  });
  const toolHint = pick ? toolNameForPick(pick) : "none (conversation only)";
  const topicPart = opts.lessonTopic ? ` topic=${opts.lessonTopic}` : "";
  const nextWord = opts.nextPlannedWord?.trim() ?? "";

  if (ui === "th") {
    const wordLock =
      pick === "new" && nextWord
        ? ` คำถัดไป="${nextWord}" — สอนเฉพาะคำนี้เท่านั้น ห้ามแนะนำคำเป้าหมายใหม่อื่น`
        : opts.lessonComplete
          ? " บทเรียนครบแล้ว — ห้ามสอนคำใหม่"
          : "";
    return `[lesson_phase] ระยะ=${state.phase} บทที่=${state.lessonNumber}${topicPart} เครื่องมือถัดไป=${toolHint}.${wordLock} ทำตาม TEACHING MODE v1 — ผูกคำกับบทสนทนาจริง ถามให้ใช้คำ ไม่ใช่พูดตาม`;
  }

  const wordLock =
    pick === "new" && nextWord
      ? ` NEXT WORD ONLY="${nextWord}" — teach ONLY this word; never name or introduce any other new target word`
      : opts.lessonComplete
        ? " lesson_complete — do not introduce new vocabulary"
        : "";
  return `[lesson_phase] phase=${state.phase} lesson=${state.lessonNumber}${topicPart} next_tool=${toolHint}.${wordLock} Follow TEACHING MODE v1 — weave the word into the real conversation and ask the learner to USE it, not parrot.`;
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
