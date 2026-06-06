/**
 * TEACHING MODE v1 — isolated lesson-flow contract (deterministic core + Live prompts).
 * Mixes NEW + REVIEW, context+USE (not parrot), light lesson arc.
 * Do not merge with LOCKED 2026-06-05 guest/handoff contracts.
 */

export type LessonPhase = "review" | "focus" | "use" | "recap";
export type WordPickKind = "new" | "review";

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

/** Which tool to call next — null when the phase is conversational (use/recap). */
export function recommendWordPick(
  state: TeachingModeState,
  opts: { hasDueReview: boolean; canIntroNew: boolean },
): WordPickKind | null {
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
- ลำดับ: ทบทวนคำที่เคยเรียน (REVIEW) → โฟกัสคำใหม่ 1–2 คำในบริบท (FOCUS) → ให้ผู้เรียนใช้คำ (USE) → สรุปอบอุ่น (RECAP). ห้ามสตรีมคำแยกๆ แบบสุ่ม
- Tool 1 get_word_to_teach: คำใหม่เท่านั้น — เรียกก่อนสอนคำใหม่ทุกครั้ง
- Tool 3 get_word_to_review: คำที่เคยเรียนและถึงเวลา spiral — เรียกเมื่อทบทวน ห้ามแต่งคำเอง
- คำแรกของเซสชัน: สอนเป็นคำใหม่ — ห้ามเปิดด้วย "จำได้ไหม…" ถ้ายังไม่เคยสอนคำนั้นในเซสชันนี้
- กรอบทบทวน ("จำคำนี้ได้ไหม…") ใช้เฉพาะคำจาก get_word_to_review หรือที่สอนไปแล้วในเซสชันเดียวกัน
- บริบท + การใช้ (ไม่ใช่พูดตาม): ใส่ประโยคตัวอย่างจาก tool ในคำตอบ แล้วถามคำถามสั้นๆ ให้ผู้เรียนใช้คำ "${targetName}" — ห้ามขอให้พูดตามอย่างเดียว
- สลับ NEW + REVIEW เมื่อมีคำทบทวนครบกำหนด — ห้ามสอนแต่คำใหม่ต่อเนื่อง`;
  }

  return `TEACHING MODE v1 — lesson arc (always follow):
- Shape: quick REVIEW of a known word → FOCUS (1–2 related NEW words in context) → USE (learner applies the word) → warm RECAP. Not a random stream of isolated words.
- Tool 1 get_word_to_teach: NEW words only — call before teaching any new vocabulary.
- Tool 3 get_word_to_review: spiral review of a word the learner already met — call when resurfacing known words; never invent review vocabulary.
- FIRST word of a session: teach as brand-new — NEVER open with "do you remember…" unless that exact word was already introduced earlier in THIS session.
- REVIEW framing ("remember this word…") ONLY for words returned by get_word_to_review or already taught earlier in the same session.
- CONTEXT + USE (not parrot): weave the tool's example sentence into your reply, then ask ONE tiny question so the learner USES the ${targetName} word (short answer or mini-sentence) — never "repeat after me" only.
- MIX new + review when spiral words are due — not an endless new-only stream.`;
}

export function buildPhaseNudge(
  state: TeachingModeState,
  ui: "th" | "en",
  opts: { hasDueReview: boolean; canIntroNew: boolean },
): string {
  const pick = recommendWordPick(state, opts);
  const toolHint = pick ? toolNameForPick(pick) : "none (conversation only)";

  if (ui === "th") {
    return `[lesson_phase] ระยะ=${state.phase} บทที่=${state.lessonNumber} เครื่องมือถัดไป=${toolHint}. ทำตาม TEACHING MODE v1 — ใช้ประโยคตัวอย่างจาก tool และถามให้ผู้เรียนใช้คำ ไม่ใช่พูดตาม`;
  }
  return `[lesson_phase] phase=${state.phase} lesson=${state.lessonNumber} next_tool=${toolHint}. Follow TEACHING MODE v1 — use the tool example as context and ask the learner to USE the word, not parrot.`;
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
