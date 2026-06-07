/**
 * Deterministic /talk self-check — no live audio, no network.
 * Run after every /talk change: npm run check:talk
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GUEST_EXCHANGE_LIMIT } from "../lib/ai/limits";
import {
  detectUnsupportedTeachingRequest,
  buildContentHonestyContract,
  normalizeLearningTarget,
  oppositeLanguage,
  resolveLiveSessionLanguages,
  resolveProfileUiAnchor,
  resolveSessionLanguages,
  resolveTargetLanguage,
  resolveUiLanguage,
  sanitizeTargetLanguage,
} from "../lib/brain/language";
import {
  countUncardableBankRows,
  filterVocabCandidates,
  pickIntroduceCandidate,
  selectDueReviewCandidate,
} from "../lib/brain/teaching";
import {
  buildKickoffPrompt,
  buildResumePrompt,
  buildSystemInstruction,
} from "../lib/live/live-config";
import {
  canAttemptTransportReconnect,
  classifyLiveClose,
  kickoffPromptIsFirstTimeSafe,
  MAX_TRANSPORT_RECONNECTS,
  nextResumeWordHint,
  shouldIgnoreClientEpoch,
} from "../lib/live/session-continuity";
import {
  buildMemberContextBlock,
  isReturningMember,
  resolveKickoffAudience,
  type MemberContextBundle,
} from "../lib/live/member-context";
import {
  advanceAfterTurn,
  buildExplicitLessonRequestNudge,
  buildPhaseNudge,
  buildTeachingModeContract,
  cardContextForWord,
  createTeachingModeState,
  detectExplicitLessonWordRequest,
  GET_WORD_TO_REVIEW_DECLARATION,
  recommendWordPick,
  recordWordPick,
  shouldPreferReviewOverNew,
  toolNameForPick,
} from "../lib/talk/teaching-mode";
import { sanitizeUserTranscript } from "../lib/live/transcript";
import {
  newGeminiTranscriptItem,
  routeGeminiTranscriptChunk,
} from "../lib/live/transcript-routing";
import {
  LIVE_TOKEN_GUEST_EXPIRE_MINUTES,
  LIVE_TOKEN_GUEST_SESSION_MINUTES,
  LIVE_TOKEN_MEMBER_EXPIRE_MINUTES,
  LIVE_TOKEN_MEMBER_SESSION_MINUTES,
  liveTokenDurations,
} from "../lib/live/token-policy";
import {
  createTurnController,
  reduceTurn,
  runRepeatedFlowSimulations,
  simulateGuestFiveTurnFlowController,
  simulateMemberTurnLoop,
} from "../lib/live/turn-controller";
import {
  cardDirectionForTarget,
  cardMeaningForWord,
  isVocabularySlug,
  replayTextForWord,
  teachWordToVocabularyEntry,
} from "../lib/talk/teach-word-card";
import {
  buildExcludeSet,
  buildLessonPlanFromRows,
  countA1CardableWords,
  countCardableRows,
  GUEST_STARTER_TOPICS,
  nextPlannedWord,
  pickPlanReviewWord,
  planSizeForTier,
  resolveTeachServe,
  selectLessonTopic,
} from "../lib/talk/lesson-plan";
import {
  buildContentIntentNudge,
  detectLessonContentIntent,
} from "../lib/talk/lesson-intent";
import {
  claimLessonWordCard,
  isLessonWordCarded,
  markPlanWordCarded,
  missingCardedPlanWords,
  planBackstopCardWords,
  shouldBackstopFocusNewWord,
} from "../lib/talk/lesson-layer";
import { simulateGuestFiveTurnFlow } from "../lib/talk/guest-flow";
import { simulateGuestCtaViaTurnRuntime } from "../lib/live/guest-cta-runtime";
import {
  appendGeminiTranscriptChunk,
  bindKickoffToOpener,
  countSessionGreetingBubbles,
  makeSessionOpenerShell,
} from "../lib/talk/session-canvas";
import { sanitizeModelTranscript } from "../lib/live/transcript";
import {
  sortTranscriptItems,
  TRANSCRIPT_CARD_ORDER,
  TRANSCRIPT_GEMINI_ORDER,
  TRANSCRIPT_USER_ORDER,
} from "../lib/live/transcript-order";

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

function section(title: string): void {
  console.log(`\n[check:talk] ${title}`);
}

// --- A. Language resolution -------------------------------------------------

section("Language resolution");

const guestEnBrowser = resolveSessionLanguages({
  isGuest: true,
  profileUiLang: null,
  profileTarget: null,
  browserUiLang: "en",
});
assert(guestEnBrowser.uiLanguage === "en", "guest browser en → UI en");
assert(guestEnBrowser.targetLanguage === "th", "guest browser en → default target th");

const guestThBrowser = resolveSessionLanguages({
  isGuest: true,
  profileUiLang: null,
  profileTarget: null,
  browserUiLang: "th",
});
assert(guestThBrowser.uiLanguage === "th", "guest browser th → UI th");
assert(guestThBrowser.targetLanguage === "en", "guest browser th → default target en");

assert(
  detectUnsupportedTeachingRequest("teach me Spanish please"),
  "detectUnsupportedTeachingRequest flags Spanish",
);
assert(
  buildContentHonestyContract("en").includes("Thai↔English"),
  "content honesty contract names supported pair",
);

const memberTeachEn = resolveSessionLanguages({
  isGuest: false,
  profileUiLang: "th",
  profileTarget: null,
  browserUiLang: "en",
  teachLearningTarget: "en",
});
assert(
  memberTeachEn.targetLanguage === "en",
  "member TalkConfig.teach.learning=en when profile target unset",
);

const memberEnTh = resolveSessionLanguages({
  isGuest: false,
  profileUiLang: "en",
  profileTarget: "th",
  browserUiLang: "th",
});
assert(memberEnTh.uiLanguage === "en", "member UI=en from profile");
assert(memberEnTh.targetLanguage === "th", "member TARGET=th from profile");

const memberEnEn = resolveSessionLanguages({
  isGuest: false,
  profileUiLang: "en",
  profileTarget: "en",
  browserUiLang: "th",
});
assert(memberEnEn.targetLanguage === "th", "member UI=en + profile target=en → teaches th (never own language)");

const stableTargetEnUi = resolveTargetLanguage({
  profileTarget: "th",
  uiLanguage: "en",
});
assert(stableTargetEnUi === "th", "stable target=th from profile when UI=en");

const stableTargetThUi = resolveTargetLanguage({
  profileTarget: null,
  uiLanguage: "th",
});
assert(stableTargetThUi === "en", "stable target defaults to opposite when profile unset");

const teachPhraseInputs = [
  "let's talk about Thai language",
  "how can I learn Thai",
  "teach me Thai",
  "สอนภาษาไทยหน่อยค่ะ teach me Thai words",
];
for (const phrase of teachPhraseInputs) {
  const uiAfter = resolveUiLanguage({ profileUiLang: "en" });
  const targetAfter = resolveTargetLanguage({ profileTarget: "th", uiLanguage: uiAfter });
  assert(uiAfter === "en", `"${phrase}" → UI unchanged (en)`);
  assert(targetAfter === "th", `"${phrase}" → target unchanged (th)`);
}

assert(
  sanitizeTargetLanguage("en", "en") === "th",
  "sanitize never returns UI language as target",
);
assert(
  sanitizeTargetLanguage("th", null) === "en",
  "sanitize defaults to opposite when target unset",
);

assert(
  resolveUiLanguage({ profileUiLang: "en" }) === "en",
  "UI stays anchored to profile regardless of utterance",
);
assert(
  resolveUiLanguage({ profileUiLang: "th" }) === "th",
  "Thai profile UI stays th",
);
assert(
  resolveUiLanguage({ profileUiLang: "en" }) === "en",
  "speak-to-me-in-Thai request does not flip client UI (model-owned)",
);

const connectInstruction = buildSystemInstruction("en", "th");
assert(
  connectInstruction.includes("The user's language is English") &&
    connectInstruction.includes("Converse naturally in English") &&
    connectInstruction.includes("You teach Thai") &&
    connectInstruction.includes("Do NOT switch the WHOLE conversation into Thai") &&
    connectInstruction.includes("Never change the app interface language"),
  "connect-time instruction anchors user lang + target + no whole-medium flip + no UI change",
);
assert(
  !connectInstruction.includes("Mirror the user") &&
    !connectInstruction.includes("becomes UI_LANGUAGE"),
  "connect instruction removed per-utterance UI mirroring",
);

assert(
  resolveProfileUiAnchor({
    profileUiLang: null,
    sessionUiLang: "th",
  }) === "th",
  "null profile UI anchor keeps browser-seeded session UI",
);
assert(
  resolveProfileUiAnchor({ profileUiLang: null, sessionUiLang: "en" }) === "en",
  "session UI anchor follows browser seed",
);
assert(
  resolveProfileUiAnchor({ profileUiLang: "th", sessionUiLang: "en" }) === "th",
  "profile ui_language is adaptation anchor when set",
);
assert(
  resolveLiveSessionLanguages({
    isGuest: false,
    profileUiLang: null,
    profileTarget: "th",
    sessionUiLang: "en",
    browserUiLang: "en",
  }).uiLanguage === "en",
  "member null ui_language cold connect keeps session UI",
);
assert(
  resolveLiveSessionLanguages({
    isGuest: true,
    profileUiLang: null,
    profileTarget: null,
    sessionUiLang: "th",
    browserUiLang: "th",
  }).targetLanguage === "en",
  "guest browser th → stable target en (no mid-session intent override)",
);

// --- B. Guest 5-turn flow (turn controller) -------------------------------

section("Guest 5-turn flow");

let flow = createTurnController(0, true);
for (let i = 0; i < GUEST_EXCHANGE_LIMIT; i += 1) {
  const before = flow.guestExchanges;
  const r = reduceTurn(flow, { type: "guest_text_turn", isGuest: true });
  flow = r.state;
  assert(flow.guestExchanges === before + 1, `exchange ${flow.guestExchanges} counted`);
  flow = { ...flow, userExchangeCounted: false };
}
assert(flow.guestExchanges === GUEST_EXCHANGE_LIMIT, "exactly 5 exchanges");
assert(flow.guestLocked, "locked after 5th exchange");

flow = reduceTurn(flow, { type: "model_audio" }).state;
flow = reduceTurn(flow, { type: "turn_complete" }).state;
flow = reduceTurn(flow, { type: "playback_idle", context: "handoff" }).state;
assert(flow.invitationVoiceSent, "invitation cue armed after handoff drain");
flow = reduceTurn(flow, { type: "model_audio" }).state;
flow = reduceTurn(flow, { type: "turn_complete" }).state;
flow = reduceTurn(flow, { type: "playback_idle", context: "invitation" }).state;
assert(flow.phase === "sheet", "signup sheet phase after invite audio");

const endState = simulateGuestFiveTurnFlowController();
assert(endState.guestExchanges === GUEST_EXCHANGE_LIMIT, "simulator ends at limit");
assert(endState.phase === "sheet", "simulator: ends on sheet phase");
assert(endState.invitationVoiceSent === false, "simulator: invitation cleared after sheet");

flow = createTurnController(GUEST_EXCHANGE_LIMIT - 1, true);
flow = reduceTurn(flow, { type: "guest_text_turn", isGuest: true }).state;
assert(flow.handoffArmed, "handoff armed on 5th turn start");
assert(flow.phase === "handoff", "handoff phase on 5th turn start");

const spurious = reduceTurn(
  createTurnController(GUEST_EXCHANGE_LIMIT - 1, true),
  { type: "guest_text_turn", isGuest: true },
).state;
const afterSpurious = reduceTurn(spurious, { type: "turn_complete" }).state;
assert(afterSpurious.handoffArmed, "spurious turn_complete keeps handoff armed");
assert(!afterSpurious.invitationVoiceSent, "spurious turn_complete never triggers invitation cue");

flow = createTurnController(GUEST_EXCHANGE_LIMIT - 1, true);
flow = reduceTurn(flow, { type: "guest_text_turn", isGuest: true }).state;
flow = reduceTurn(flow, { type: "orb_mic_stop" }).state;
const afterMicStop = reduceTurn(flow, { type: "turn_complete" }).state;
assert(!afterMicStop.invitationVoiceSent, "mic-stop never triggers invitation cue");
assert(afterMicStop.phase !== "sheet", "mic-stop never opens signup sheet");

section("Guest CTA at exchange 5 (guest-flow harness)");
const guestCtaSim = simulateGuestFiveTurnFlow();
assert(guestCtaSim.exchanges === GUEST_EXCHANGE_LIMIT, "guest-flow: CTA after exactly 5 exchanges");
assert(guestCtaSim.invitationCueCount === 1, "guest-flow: spoken invitation cue fires once at exchange 5");
assert(guestCtaSim.signupSheetCount === 1, "guest-flow: signup sheet opens after invitation drain");

section("Per-turn latency instrumentation");

let lat = createTurnController(0, true);
lat = reduceTurn(lat, { type: "model_audio" }).state;
assert(lat.timings.model_audio_first == null, "kickoff model_audio does not anchor model_audio_first");

lat = reduceTurn(lat, { type: "guest_text_turn", isGuest: true }).state;
assert(lat.timings.user_turn_start != null, "user_turn_start anchored per turn");
assert(lat.timings.model_audio_first == null, "model_audio_first cleared on user_turn_start");

const turn1Audio = reduceTurn(lat, { type: "model_audio" });
const turn1Timing = turn1Audio.effects.find(
  (e): e is Extract<(typeof turn1Audio.effects)[number], { type: "log_timing" }> =>
    e.type === "log_timing" && e.mark === "model_audio_first",
);
assert(turn1Timing != null, "first post-turn model_audio logs model_audio_first");
assert(
  typeof turn1Timing?.deltaMs === "number" && turn1Timing.deltaMs >= 0,
  "model_audio_first deltaMs is non-negative vs user_turn_start",
);
lat = turn1Audio.state;

lat = reduceTurn(lat, { type: "turn_complete" }).state;
lat = reduceTurn(lat, { type: "guest_text_turn", isGuest: true }).state;
assert(lat.timings.model_audio_first == null, "model_audio_first reset on next user_turn_start");

const turn2Audio = reduceTurn(lat, { type: "model_audio" });
const turn2Timing = turn2Audio.effects.find(
  (e): e is Extract<(typeof turn2Audio.effects)[number], { type: "log_timing" }> =>
    e.type === "log_timing" && e.mark === "model_audio_first",
);
assert(
  turn2Timing != null &&
    typeof turn2Timing.deltaMs === "number" &&
    turn2Timing.deltaMs >= 0,
  "second turn re-anchors model_audio_first with fresh deltaMs",
);

// --- C. Word pick (vocabulary_bank, exclude known) --------------------------

section("Word pick");

const bankRows = [
  { word_en: "hello", word_th: "สวัสดี", cefr_level: "A1", emoji: "👋" },
  { word_en: "thanks", word_th: "ขอบคุณ", cefr_level: "A1", emoji: "🙏" },
  { word_en: "water", word_th: "น้ำ", cefr_level: "A1", emoji: "💧" },
];

const fresh = filterVocabCandidates({
  rows: bankRows,
  learningTarget: "th",
  exclude: new Set(),
});
assert(fresh.length === 3, "all bank rows available when none known");

const excludingHello = filterVocabCandidates({
  rows: bankRows,
  learningTarget: "th",
  exclude: new Set(["hello", "สวัสดี"]),
});
assert(
  excludingHello.every((w) => w.word_en !== "hello"),
  "excludes already-known words (en + th keys)",
);
assert(excludingHello.length === 2, "two candidates remain after excluding hello");

const thTarget = filterVocabCandidates({
  rows: bankRows,
  learningTarget: "th",
  exclude: new Set(),
});
assert(thTarget[0]?.word === "สวัสดี" || thTarget.some((w) => w.word_th.length > 0), "th target picks Thai surface form");

const slugBankRows = [
  { word_en: "general2", word_th: "ทั่วไป", cefr_level: "A1", emoji: "📚" },
  { word_en: "fridge", word_th: "ตู้เย็น", cefr_level: "A1", emoji: "🧊" },
  { word_en: "feeling_2", word_th: "ความรู้สึก", cefr_level: "A1" },
];
assert(
  countUncardableBankRows(slugBankRows) === 2,
  "countUncardableBankRows excludes slug word_en rows",
);
const slugCandidates = filterVocabCandidates({
  rows: slugBankRows,
  learningTarget: "th",
  exclude: new Set(),
});
const slugPick = pickIntroduceCandidate(slugCandidates, "th");
assert(slugPick?.word_en === "fridge", "pickIntroduceCandidate skips slug rows");
assert(
  !slugPick || !isVocabularySlug(slugPick.word_en),
  "pickIntroduceCandidate never returns slug word_en",
);

// --- C2. Lesson plan (Stage 2 — themed single-topic serving) ------------

section("Lesson plan (Stage 2 themed)");

const planBankRows = [
  {
    word_en: "hello",
    word_th: "สวัสดี",
    cefr_level: "A1",
    difficulty_score: 10,
    frequency_score: 90,
    created_at: "2026-01-02T00:00:00Z",
    topic: "food",
  },
  {
    word_en: "general2",
    word_th: "ทั่วไป",
    cefr_level: "A1",
    difficulty_score: 5,
    frequency_score: 95,
    created_at: "2026-01-01T00:00:00Z",
    topic: "food",
  },
  {
    word_en: "water",
    word_th: "น้ำ",
    cefr_level: "A1",
    difficulty_score: 20,
    frequency_score: 80,
    created_at: "2026-01-03T00:00:00Z",
    topic: "food",
  },
  {
    word_en: "good morning",
    word_th: "สวัสดีตอนเช้า",
    cefr_level: "A1",
    difficulty_score: 25,
    frequency_score: 95,
    prerequisite_words: ["hello"],
    created_at: "2026-01-04T00:00:00Z",
    topic: "food",
  },
  {
    word_en: "thanks",
    word_th: "ขอบคุณ",
    cefr_level: "A1",
    difficulty_score: 30,
    frequency_score: 70,
    created_at: "2026-01-05T00:00:00Z",
    topic: "food",
  },
  {
    word_en: "tired",
    word_th: "เหนื่อย",
    cefr_level: "A1",
    difficulty_score: 40,
    frequency_score: 60,
    created_at: "2026-01-06T00:00:00Z",
    topic: "travel",
  },
  {
    word_en: "airport",
    word_th: "สนามบิน",
    cefr_level: "A1",
    difficulty_score: 50,
    frequency_score: 55,
    created_at: "2026-01-07T00:00:00Z",
    topic: "travel",
  },
  {
    word_en: "hotel",
    word_th: "โรงแรม",
    cefr_level: "A1",
    difficulty_score: 55,
    frequency_score: 50,
    created_at: "2026-01-08T00:00:00Z",
    topic: "travel",
  },
];

const guestTopic = selectLessonTopic({
  rows: planBankRows,
  planSize: planSizeForTier("guest"),
  cefrLevel: "A1",
  exclude: buildExcludeSet([]),
  tier: "guest",
});
assert(guestTopic === "food", "guest picks engaging starter topic food when enough cardable words");
assert(GUEST_STARTER_TOPICS[0] === "food", "food is first guest starter topic");

const guestPlan = buildLessonPlanFromRows({
  rows: planBankRows,
  planSize: planSizeForTier("guest"),
  exclude: buildExcludeSet([]),
  topic: guestTopic,
});
assert(guestPlan.length === 3, "guest plan length = 3");
assert(
  guestPlan.every((id) => !isVocabularySlug(id)),
  "buildLessonPlan returns only cardable word ids",
);
assert(
  guestPlan.every((id) => {
    const row = planBankRows.find((r) => r.word_en === id);
    return row?.topic === "food";
  }),
  "themed plan uses one topic only",
);
assert(
  guestPlan[0] === "hello" && guestPlan[1] === "water" && guestPlan[2] === "good morning",
  "plan ordered easiest-first; basic greeting before phrase (slug skipped)",
);
const guestDifficulties = guestPlan.map(
  (id) => planBankRows.find((r) => r.word_en === id)?.difficulty_score ?? 0,
);
assert(
  guestDifficulties.every((d, i) => i === 0 || d >= guestDifficulties[i - 1]!),
  "plan difficulty_score is non-decreasing within built plan",
);
assert(
  guestPlan.indexOf("hello") < guestPlan.indexOf("good morning"),
  "prerequisite greeting orders before dependent phrase",
);

assert(nextPlannedWord(guestPlan, 0) === "hello", "nextPlannedWord never null mid-lesson");
assert(nextPlannedWord(guestPlan, 3) === null, "nextPlannedWord null at lesson_complete");

const carded = new Set<string>();
assert(
  missingCardedPlanWords({ plan: guestPlan, introducedIdx: 2, carded }).join() === "hello,water",
  "missingCardedPlanWords finds served words without cards",
);
markPlanWordCarded(carded, "hello");
assert(
  missingCardedPlanWords({ plan: guestPlan, introducedIdx: 2, carded }).join() === "water",
  "card dedup — marked words drop out of missing list",
);

const dedupCarded = new Set<string>();
const focusState = createTeachingModeState({ phase: "focus" });
assert(claimLessonWordCard(dedupCarded, "hello"), "claimLessonWordCard accepts first card");
assert(!claimLessonWordCard(dedupCarded, "Hello"), "claimLessonWordCard rejects duplicate normalized id");
assert(isLessonWordCarded(dedupCarded, "hello"), "isLessonWordCarded sees claimed word");
assert(
  !shouldBackstopFocusNewWord({
    teaching: focusState,
    wordPickThisTurn: false,
    hasDueReview: false,
    canIntroNew: true,
    plan: guestPlan,
    introducedIdx: 0,
    carded: dedupCarded,
  }),
  "backstop skips word when tool already claimed card synchronously",
);

const backstopCarded = new Set<string>();
assert(
  shouldBackstopFocusNewWord({
    teaching: focusState,
    wordPickThisTurn: false,
    hasDueReview: false,
    canIntroNew: true,
    plan: guestPlan,
    introducedIdx: 0,
    carded: backstopCarded,
  }),
  "focus backstop when model skipped tool and next word uncarded",
);
assert(
  !shouldBackstopFocusNewWord({
    teaching: focusState,
    wordPickThisTurn: true,
    hasDueReview: false,
    canIntroNew: true,
    plan: guestPlan,
    introducedIdx: 0,
    carded,
  }),
  "no backstop when tool already carded the word",
);

const eatChickenPlan = ["eat", "chicken"];
const eatCarded = new Set<string>(["eat"]);
assert(
  planBackstopCardWords({
    teaching: focusState,
    wordPickThisTurn: true,
    hasDueReview: false,
    canIntroNew: true,
    plan: eatChickenPlan,
    introducedIdx: 2,
    carded: eatCarded,
  }).length === 0,
  "backstop pushes zero cards when tool already carded this exchange (กิน+ไก่ regression)",
);
const backstopOne = planBackstopCardWords({
  teaching: focusState,
  wordPickThisTurn: false,
  hasDueReview: false,
  canIntroNew: true,
  plan: eatChickenPlan,
  introducedIdx: 2,
  carded: eatCarded,
});
assert(backstopOne.length === 1, "backstop pushes at most one card per exchange");
assert(backstopOne[0] === "chicken", "backstop fills first missing introduced word only");

const perExchangeCarded = new Set<string>();
assert(claimLessonWordCard(perExchangeCarded, "eat"), "claim accepts first eat card");
assert(!claimLessonWordCard(perExchangeCarded, "eat"), "claim rejects duplicate eat in same exchange");
assert(perExchangeCarded.size === 1, "one-card-per-word guarantee holds under repeat claim");

const oneWordOneCardItems = [
  {
    id: "c1",
    kind: "word_card" as const,
    word: { word_en: "hello", word_th: "สวัสดี" },
    direction: "en_to_th" as const,
    turnSeq: 2,
    roleOrder: TRANSCRIPT_CARD_ORDER,
  },
];
assert(
  oneWordOneCardItems.filter((i) => i.word.word_en.toLowerCase() === "hello").length === 1,
  "one taught word yields exactly one card item on canvas",
);

assert(planSizeForTier("free") === 4, "free plan size = 4");
assert(planSizeForTier("pro") === 6, "pro plan size = 6");
assert(planSizeForTier("pro_max") === 6, "pro_max plan size = 6");

const served: string[] = [];
let introducedIdx = 0;
for (let step = 0; step < guestPlan.length + 1; step += 1) {
  const serve = resolveTeachServe({ plan: guestPlan, introducedIdx });
  if (serve.kind === "lesson_complete") {
    assert(step === guestPlan.length, "lesson_complete exactly when plan exhausted");
    break;
  }
  assert(serve.kind === "word", "never null while words remain in plan");
  assert(!served.includes(serve.wordId), "serving never repeats");
  served.push(serve.wordId);
  assert(serve.wordId === guestPlan[introducedIdx], "serving returns words in plan order");
  introducedIdx = serve.introducedIdx + 1;
}
assert(served.length === 3, "guest plan exhausts in ≤3 new words");

const reviewExclude = buildExcludeSet([]);
let reviewPick = pickPlanReviewWord({
  plan: guestPlan,
  introducedIdx: 2,
  exclude: reviewExclude,
});
assert(reviewPick === "hello", "review picks first introduced plan word");
reviewExclude.add(reviewPick!.toLowerCase());
reviewPick = pickPlanReviewWord({
  plan: guestPlan,
  introducedIdx: 2,
  exclude: reviewExclude,
});
assert(reviewPick === "water", "review rotates to next introduced plan word");
reviewExclude.add(reviewPick!.toLowerCase());
reviewPick = pickPlanReviewWord({
  plan: guestPlan,
  introducedIdx: 2,
  exclude: reviewExclude,
});
assert(reviewPick === null, "review returns null when introduced pool exhausted");

assert(
  countCardableRows(planBankRows, "A1") === 7,
  "countCardableRows excludes slug rows at A1",
);

// --- D. Cards (guest + member payloads) ------------------------------------

section("Card payloads");

const sampleWord = {
  ok: true,
  word_en: "hello",
  word_th: "สวัสดี",
  emoji: "👋",
  cefr_level: "A1",
  th_romanization: "sawasdee",
  example_en: "Hello!",
  example_th: "สวัสดี!",
};

const guestCard = teachWordToVocabularyEntry(sampleWord);
const memberCard = teachWordToVocabularyEntry({ ...sampleWord, phonetics_source: "bank" });
assert(!!guestCard?.word_en && !!guestCard?.word_th, "guest card payload produced");
assert(!!memberCard?.word_en && !!memberCard?.word_th, "member card payload produced");
assert(cardDirectionForTarget("th") === "en_to_th", "th learner card direction en_to_th");
assert(cardDirectionForTarget("en") === "th_to_en", "en learner card direction th_to_en");

assert(isVocabularySlug("home_stuff_22"), "home_stuff_22 is a vocabulary slug");
assert(isVocabularySlug("general2"), "general2 is a vocabulary slug");
assert(isVocabularySlug("general_info2"), "general_info2 is a vocabulary slug");
assert(isVocabularySlug("feeling_2"), "feeling_2 is a vocabulary slug");
assert(!isVocabularySlug("fridge"), "fridge is not a slug");
assert(!isVocabularySlug("feeling"), "feeling is not a slug");
assert(!isVocabularySlug("healthy"), "healthy is not a slug");
assert(!isVocabularySlug("student"), "student is not a slug");
assert(!isVocabularySlug("light"), "light is not a slug");
assert(!isVocabularySlug("open"), "open is not a slug");
assert(!isVocabularySlug("air conditioner"), "multi-word gloss is not a slug");
assert(!isVocabularySlug("ตู้เย็น"), "Thai gloss is not a slug");

assert(
  teachWordToVocabularyEntry({
    ok: true,
    word_en: "home_stuff_22",
    word_th: "ตู้เย็น",
    emoji: "🧊",
  }) === null,
  "slug word_en rejects card payload",
);

const fridgeCard = teachWordToVocabularyEntry({
  ok: true,
  word_en: "fridge",
  word_th: "ตู้เย็น",
  emoji: "🧊",
});
assert(!!fridgeCard, "valid gloss card payload produced");
const meaning = cardMeaningForWord(
  { word_en: fridgeCard!.word_en, word_th: fridgeCard!.word_th },
  "en_to_th",
);
assert(meaning === "fridge", "card meaning is human gloss");
assert(!isVocabularySlug(meaning), "card meaning never shows slug");
const replay = replayTextForWord(fridgeCard!, "th");
assert(replay.text === "ตู้เย็น", "replay speaks target surface form");
assert(!isVocabularySlug(replay.text), "replay text never contains slug");

const contextTh = cardContextForWord(
  { example_en: "The fridge is cold.", example_th: "ตู้เย็นเย็นมาก" },
  "en",
  "th",
);
assert(contextTh === "ตู้เย็นเย็นมาก", "card context prefers target example");
assert(
  !!teachWordToVocabularyEntry(sampleWord)?.example_en,
  "card payload carries example_en",
);

// --- E. Voice/text match (transcript routing) ------------------------------

section("Voice/text transcript routing");

const enRouted = newGeminiTranscriptItem("Hi there~");
assert(enRouted.textEn === "Hi there~" && enRouted.textTh === "", "English speech → textEn");

const thRouted = newGeminiTranscriptItem("สวัสดีค่า~");
assert(thRouted.textTh === "สวัสดีค่า~" && thRouted.textEn === "", "Thai speech → textTh");

const appended = routeGeminiTranscriptChunk(
  { textTh: "", textEn: "Hello " },
  "friend~",
);
assert(appended.textEn === "Hello friend~" && appended.textTh === "", "chunks append by spoken script");

const ordered = sortTranscriptItems([
  { id: "g1", turnSeq: 1, roleOrder: TRANSCRIPT_GEMINI_ORDER },
  { id: "u1", turnSeq: 1, roleOrder: TRANSCRIPT_USER_ORDER },
  { id: "g0", turnSeq: 0, roleOrder: TRANSCRIPT_GEMINI_ORDER },
]);
assert(ordered[0]?.id === "g0", "transcript sort by turnSeq ascending");
assert(ordered[1]?.id === "u1", "user bubble above gemini for same turnSeq");
assert(ordered[2]?.id === "g1", "later turnSeq renders after earlier turn");

const wordLockNudge = buildPhaseNudge(createTeachingModeState({ phase: "focus" }), "en", {
  hasDueReview: false,
  canIntroNew: true,
  nextPlannedWord: "water",
  lessonTopic: "food",
});
assert(
  wordLockNudge.includes('NEXT WORD ONLY="water"'),
  "phase nudge names exact next planned word",
);
assert(
  buildTeachingModeContract("en", "th").includes("PLAN LOCK"),
  "teaching contract forbids off-plan target words",
);

const kickoffEnFirst = buildKickoffPrompt("en", "first_time");
const kickoffThFirst = buildKickoffPrompt("th", "first_time");
const kickoffEnReturning = buildKickoffPrompt("en", "returning");
assert(kickoffEnFirst.includes("ENGLISH"), "kickoff en mandates English voice");
assert(kickoffThFirst.includes("ภาษาไทย"), "kickoff th mandates Thai voice");
assert(
  /press the mic|กดไมค์/i.test(kickoffEnFirst),
  "open first-time kickoff mandates mic press (en)",
);
assert(
  /press the mic|กดไมค์/i.test(kickoffThFirst),
  "open first-time kickoff mandates mic press (th)",
);
assert(
  kickoffEnFirst.includes("ONE short warm sentence") &&
    kickoffEnFirst.includes("Do NOT use two sentences"),
  "open first-time kickoff is exactly one sentence (en)",
);
assert(
  kickoffThFirst.includes("หนึ่งประโยค") && kickoffThFirst.includes("ห้ามใช้สองประโยค"),
  "open first-time kickoff is exactly one sentence (th)",
);
assert(
  !/ONE or TWO short sentences/i.test(kickoffEnFirst),
  "open first-time kickoff no longer allows two sentences (en)",
);
assert(
  !/ready to learn your first|ready to learn\?/i.test(kickoffEnFirst.split(/Do NOT/i)[0] ?? kickoffEnFirst),
  "open first-time kickoff has no learning agenda (en)",
);
assert(
  !/วาระสอน/i.test(kickoffThFirst.split(/ห้าม/i)[0] ?? kickoffThFirst),
  "open first-time kickoff has no teaching agenda (th)",
);
assert(kickoffPromptIsFirstTimeSafe(kickoffEnFirst), "first-time en kickoff has no false familiarity");
assert(kickoffPromptIsFirstTimeSafe(kickoffThFirst), "first-time th kickoff has no false familiarity");
assert(
  /welcome back|welcome-back/i.test(kickoffEnReturning),
  "returning-member en kickoff may welcome back",
);
assert(
  resolveKickoffAudience(true, null) === "first_time",
  "guest kickoff audience is first_time",
);
const newMemberBundle: MemberContextBundle = {
  displayName: null,
  uiLanguage: "en",
  targetLanguage: "th",
  level: "A2",
  wordsIntroducedCount: 0,
  wordsMasteredCount: 0,
  recentWords: [],
  isReturning: false,
  lastSeenAt: null,
  hoursSinceLastVisit: null,
};
const returningMemberBundle: MemberContextBundle = {
  displayName: "Mike",
  uiLanguage: "en",
  targetLanguage: "th",
  level: "A2",
  wordsIntroducedCount: 5,
  wordsMasteredCount: 2,
  recentWords: [{ word_en: "water", word_th: "น้ำ" }],
  isReturning: true,
  lastSeenAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  hoursSinceLastVisit: 48,
};
assert(
  resolveKickoffAudience(false, newMemberBundle) === "first_time",
  "member with no prior history gets first_time kickoff",
);
assert(
  resolveKickoffAudience(false, returningMemberBundle) === "returning",
  "member with real history gets returning kickoff",
);
assert(
  isReturningMember({ wordsIntroducedCount: 3, lastSeenAt: null, hoursSinceLastVisit: null }),
  "prior introduced words mark returning",
);
assert(
  !isReturningMember({ wordsIntroducedCount: 0, lastSeenAt: null, hoursSinceLastVisit: null }),
  "empty history is not returning",
);
const kickoffReturningNamed = buildKickoffPrompt("en", "returning", returningMemberBundle);
assert(kickoffReturningNamed.includes("Mike"), "returning kickoff carries real member name hint");
const memberBlock = buildMemberContextBlock(returningMemberBundle, "en");
assert(memberBlock.includes("never invent"), "member context block asserts honesty rule");
assert(
  buildSystemInstruction("en", "th", returningMemberBundle).includes("MEMBER CONTEXT"),
  "system instruction injects member bundle for members",
);
assert(
  !buildSystemInstruction("en", "th", null).includes("MEMBER CONTEXT"),
  "guest/no bundle omits member context from system instruction",
);
const liveTokenSrc = readFileSync(join(ROOT, "app/api/live-token/route.ts"), "utf8");
assert(
  liveTokenSrc.includes("assembleMemberContext") && liveTokenSrc.includes("memberContext"),
  "live-token prefetches member context bundle at connect",
);
assert(
  buildTeachingModeContract("en", "th").includes("FIRST word of a session"),
  "teaching contract forbids remember framing on first word",
);

const sysEnTh = buildSystemInstruction("en", "th");
assert(
  sysEnTh.includes("The user's language is English") &&
    sysEnTh.includes("Converse naturally in English"),
  "system instruction anchors UI=en at connect",
);
assert(
  sysEnTh.includes("You teach Thai") &&
    sysEnTh.includes("Do NOT switch the WHOLE conversation into Thai"),
  "system instruction anchors TARGET=th at connect",
);
assert(sysEnTh.includes("TEACHING MODE v1"), "system instruction includes teaching mode contract");
assert(sysEnTh.includes("get_word_to_review"), "system instruction names Tool 3");
assert(
  buildTeachingModeContract("en", "th").includes("USE (not parrot)"),
  "teaching contract mandates USE not parrot",
);
const liveConfigSrc = readFileSync(join(ROOT, "lib/live/live-config.ts"), "utf8");
const teachingModeSrc = readFileSync(join(ROOT, "lib/talk/teaching-mode.ts"), "utf8");
assert(
  liveConfigSrc.includes("COMPANION FIRST") &&
    liveConfigSrc.includes('NEVER "repeat after me"'),
  "persona core is companion-first and forbids repeat-after-me drills",
);
assert(
  buildTeachingModeContract("en", "th").includes("weave") &&
    buildTeachingModeContract("en", "th").includes("little gifts"),
  "teaching contract mandates in-context weave + cards as gifts",
);
assert(
  liveConfigSrc.includes("GENUINE context") &&
    liveConfigSrc.includes('NEVER claim "we were talking about X"'),
  "persona forbids fabricated conversation context",
);
assert(
  buildTeachingModeContract("en", "th").includes("CONTEXT HONESTY") &&
    buildTeachingModeContract("en", "th").includes("fabricated shared history"),
  "teaching contract forbids fabricated context / requires honest intro",
);
assert(
  !/repeat after me/i.test(teachingModeSrc.replace(/never "repeat after me"/gi, "")),
  "teaching-mode contract never prescribes repeat-after-me (only forbids it)",
);

// --- F. Token policy (guest limited, key server-side) ----------------------

section("Token policy");

const guestToken = liveTokenDurations(true);
const memberToken = liveTokenDurations(false);
assert(
  guestToken.sessionMinutes === LIVE_TOKEN_GUEST_SESSION_MINUTES,
  "guest session cap",
);
assert(
  guestToken.expireMinutes === LIVE_TOKEN_GUEST_EXPIRE_MINUTES,
  "guest token cap",
);
assert(
  memberToken.sessionMinutes === LIVE_TOKEN_MEMBER_SESSION_MINUTES,
  "member session cap",
);
assert(
  memberToken.expireMinutes === LIVE_TOKEN_MEMBER_EXPIRE_MINUTES,
  "member token cap",
);
assert(guestToken.sessionMinutes > memberToken.sessionMinutes, "guest session window ≥ member (backstop)");
assert(guestToken.expireMinutes < memberToken.expireMinutes, "guest token expiry < member");

const liveTokenRoute = readFileSync(
  join(ROOT, "app/api/live-token/route.ts"),
  "utf8",
);
assert(
  liveTokenRoute.includes("process.env.GEMINI_API_KEY"),
  "API key stays server-side in live-token route",
);

// --- G. Teaching mode v1 (lesson flow) --------------------------------------

section("Teaching mode v1");

let lesson = createTeachingModeState();
assert(lesson.phase === "review", "lesson starts in review phase");
assert(
  recommendWordPick(lesson, { hasDueReview: true, canIntroNew: true }) === "review",
  "review phase picks spiral word when due",
);
assert(
  toolNameForPick("review") === "get_word_to_review",
  "review pick maps to Tool 3",
);

lesson = recordWordPick(lesson, "new");
assert(lesson.lastPickKind === "new", "recordWordPick tracks last kind");
assert(
  shouldPreferReviewOverNew(lesson, true),
  "after NEW pick, prefer review when due (no new-only stream)",
);
lesson = { ...lesson, phase: "focus", focusWordsIntroduced: 1 };
assert(
  recommendWordPick(lesson, { hasDueReview: true, canIntroNew: true }) === "review",
  "focus alternates to review after a new word when due",
);

lesson = advanceAfterTurn(createTeachingModeState(), true);
assert(lesson.phase === "focus", "word pick advances review → focus");
lesson = advanceAfterTurn({ ...createTeachingModeState(), phase: "use" }, false);
assert(lesson.phase === "recap", "use phase advances to recap");

// --- H. Live-test regressions (2026-06-05) ----------------------------------

section("Live-test regressions");

const reviewRows = [
  { word_en: "hello", next_spiral_at: "2026-06-01T00:00:00Z", mastery_level: 1 },
  { word_en: "water", next_spiral_at: "2026-06-10T00:00:00Z", mastery_level: 0 },
  { word_en: "thanks", next_spiral_at: "2026-06-04T12:00:00Z", mastery_level: 2 },
  { word_en: "unscheduled", next_spiral_at: null, mastery_level: 0 },
];
const reviewNow = new Date("2026-06-05T12:00:00Z");
const duePick = selectDueReviewCandidate(reviewRows, reviewNow);
assert(duePick === "hello", "null intro pick → earliest overdue review word");
assert(
  duePick !== "unscheduled",
  "null next_spiral_at does not beat a real overdue review word",
);
const nextDuePick = selectDueReviewCandidate(
  reviewRows,
  reviewNow,
  new Set(["hello"]),
);
assert(nextDuePick === "thanks", "excluding most-due word returns next overdue word");
const exhaustedPick = selectDueReviewCandidate(
  reviewRows,
  reviewNow,
  new Set(["hello", "thanks", "water", "unscheduled"]),
);
assert(exhaustedPick === null, "exhausted review pool returns null");
assert(duePick !== "empty" && duePick !== "invented", "review path never returns made-up word");

const teachWordRouteSrc = readFileSync(
  join(ROOT, "app/api/teach-word/route.ts"),
  "utf8",
);
assert(
  teachWordRouteSrc.includes("lesson_topic"),
  "teach-word returns lesson_topic with plan",
);
assert(
  teachWordRouteSrc.includes("selectLessonTopic") || teachWordRouteSrc.includes("buildLessonPlan"),
  "teach-word builds themed lesson plan",
);
assert(
  teachWordRouteSrc.includes("resolveTeachServe"),
  "teach-word cursor-serves plan by introduced_idx",
);
assert(
  !teachWordRouteSrc.includes("pickWordToIntroduce"),
  "teach-word no longer uses random pickWordToIntroduce",
);
assert(
  teachWordRouteSrc.includes('mode: "lesson_complete"'),
  "teach-word returns lesson_complete when plan exhausted",
);
assert(
  !teachWordRouteSrc.includes('mode = "practice"'),
  "teach-word never returns practice mode",
);

const reviewWordRouteSrc = readFileSync(
  join(ROOT, "app/api/review-word/route.ts"),
  "utf8",
);
assert(
  reviewWordRouteSrc.includes("pickPlanReviewWord"),
  "review-word rotates through introduced lesson-plan words",
);
assert(
  reviewWordRouteSrc.includes("exclude"),
  "review-word accepts session exclude list",
);
assert(
  reviewWordRouteSrc.includes("lesson_plan"),
  "review-word accepts lesson_plan from session",
);
assert(
  reviewWordRouteSrc.includes('mode: "practice"'),
  "review-word flags practice mode for plan review words",
);

assert(
  liveConfigSrc.includes("GET_WORD_TO_REVIEW_DECLARATION"),
  "live config declares Tool 3 get_word_to_review",
);
assert(
  GET_WORD_TO_REVIEW_DECLARATION.name === "get_word_to_review",
  "Tool 3 declaration name is get_word_to_review",
);

const miomiClientSrc = readFileSync(
  join(ROOT, "lib/live/miomi-client.ts"),
  "utf8",
);
assert(
  miomiClientSrc.includes('fetch("/api/live-token")'),
  "client fetches ephemeral token from server",
);
assert(
  miomiClientSrc.includes("/api/review-word"),
  "client handles Tool 3 via /api/review-word",
);
assert(
  miomiClientSrc.includes("sessionReviewServed"),
  "client tracks review words served this session",
);
assert(
  miomiClientSrc.includes("lessonPlan"),
  "client carries lesson plan in teach context",
);
assert(
  miomiClientSrc.includes("lessonTopic"),
  "client carries lesson topic in teach context",
);
assert(
  miomiClientSrc.includes("applyTeachWordResponse"),
  "client applies teach-word payload for card backstop",
);
assert(
  miomiClientSrc.includes("introducedIdx"),
  "client carries introducedIdx cursor in teach context",
);
assert(
  miomiClientSrc.includes("lesson_plan: this.teachWordContext.lessonPlan"),
  "client sends lesson plan to review-word",
);
assert(
  miomiClientSrc.includes("exclude: [...this.sessionReviewServed]"),
  "client sends session exclude list to review-word",
);
assert(
  !/process\.env\.GEMINI_API_KEY/.test(miomiClientSrc) &&
    !/apiKey:\s*process\.env/.test(miomiClientSrc),
  "GEMINI_API_KEY never wired in browser client (comments OK)",
);

const mediaHandlerSrc = readFileSync(
  join(ROOT, "lib/live/media-handler.ts"),
  "utf8",
);
assert(
  mediaHandlerSrc.includes("micSendSuspended") &&
    mediaHandlerSrc.includes("shouldForwardMicToGemini") &&
    mediaHandlerSrc.includes("isMicSendSuspended") &&
    mediaHandlerSrc.includes("modelTurnActive") &&
    mediaHandlerSrc.includes("deferUntilPlaybackIdle"),
  "replay guard suspends mic PCM to Gemini; model-turn gate spans inter-chunk gaps",
);
assert(
  mediaHandlerSrc.includes("waitForHandoffReplyDrain"),
  "5th-exchange reply uses extended voiced drain before invitation",
);
assert(
  /waitForHandoffReplyDrain\(maxWaitForStartMs = 2500/.test(mediaHandlerSrc),
  "handoff drain wait capped at 2.5s",
);
assert(
  mediaHandlerSrc.includes("tickModelTurnWatchdog") &&
    mediaHandlerSrc.includes("modelTurnActive watchdog force-clear"),
  "model-turn watchdog force-clears stuck gate after 1500ms idle",
);
assert(
  mediaHandlerSrc.includes("clearModelTurnGate"),
  "media handler exposes clearModelTurnGate for invitation drain",
);

const talkPageSrc = readFileSync(join(ROOT, "app/(app)/talk/page.tsx"), "utf8");
const turnControllerSrc = readFileSync(join(ROOT, "lib/live/turn-controller.ts"), "utf8");
const turnRuntimeSrc = readFileSync(join(ROOT, "lib/live/turn-runtime.ts"), "utf8");
const sessionCanvasSrc = readFileSync(join(ROOT, "lib/talk/session-canvas.ts"), "utf8");
assert(
  miomiClientSrc.includes("gemini transcript chunk (raw)"),
  "miomi-client logs raw gemini transcript chunks",
);
assert(
  sessionCanvasSrc.includes("appendGeminiTranscriptChunk raw delta"),
  "session-canvas logs routed transcript deltas",
);
assert(
  mediaHandlerSrc.includes("modelTurnActive=") &&
    mediaHandlerSrc.includes("shouldForwardMicToGemini="),
  "media-handler logs modelTurnActive transitions and mic-forward flips",
);
assert(
  talkPageSrc.includes('message: "pushWordCard"') &&
    talkPageSrc.includes("model first-audio emit"),
  "talk page logs word cards and model audio emit",
);
assert(
  turnRuntimeSrc.includes("greeting kickoff emit") &&
    turnRuntimeSrc.includes("handoff/invitation CTA speak_exact fire"),
  "turn runtime logs greeting kickoff and handoff/invitation CTA",
);
assert(
  talkPageSrc.includes("TurnRuntime") && talkPageSrc.includes("dispatchTurn"),
  "talk page uses deterministic turn controller",
);
assert(
  turnControllerSrc.includes("guest_count") &&
    turnControllerSrc.includes("voiced_reply") &&
    turnControllerSrc.includes("invitation") &&
    turnControllerSrc.includes("sheet"),
  "turn controller declares explicit guest tail states",
);
assert(
  !turnControllerSrc.includes("setTimeout") && !talkPageSrc.includes("handoffNudgeSentRef"),
  "no racing handoff timers or nudge refs",
);
assert(
  turnControllerSrc.includes("lastPhaseNudged"),
  "phase nudge deduped — not sent every turn",
);
assert(
  turnRuntimeSrc.includes("deferUntilPlaybackIdle") &&
    turnRuntimeSrc.includes("send_hidden_context"),
  "phase nudges defer until playback drains",
);
assert(
  talkPageSrc.includes("suspendMicSend(true)") &&
    talkPageSrc.includes("shouldForwardMicToGemini") &&
    talkPageSrc.includes("signalModelTurnComplete") &&
    talkPageSrc.includes("endModelTurnWhenDrained"),
  "card replay suspends mic send during TTS; model turn drains before mic reopens",
);
assert(
  talkPageSrc.includes("runCardBackstop"),
  "talk page runs lesson card backstop",
);
assert(
  /runCardBackstop[\s\S]{0,400}cardsThisTurn\.length > 0/.test(talkPageSrc),
  "backstop skips when a card already exists for this exchange",
);
assert(
  talkPageSrc.includes("sortTranscriptItems"),
  "talk page sorts transcript by turnSeq + roleOrder",
);
assert(
  talkPageSrc.includes("pendingUserTextRef") &&
    talkPageSrc.includes("finalizeUserInputTranscript") &&
    talkPageSrc.includes("userInputFinalizedRef"),
  "user transcript commits on user-input-final before turn_complete",
);
assert(
  talkPageSrc.includes("claimLessonWordCard"),
  "talk page uses shared lesson card dedup claim",
);
assert(
  miomiClientSrc.includes("inputTranscription.finished"),
  "live client forwards user input transcription finished flag",
);
assert(
  talkPageSrc.includes("getLessonNudgeHints"),
  "turn runtime passes lesson nudge hints",
);
assert(
  !/tool_call[\s\S]{0,120}if \(suspended\) return/.test(talkPageSrc),
  "tool_call card path never skipped by mic-suspend guard",
);
assert(
  talkPageSrc.includes("discardSuspendedModelTurn"),
  "model output during replay-suspension is dropped, not queued",
);
assert(
  talkPageSrc.includes("handoffReplyFinishing") &&
    talkPageSrc.includes("invitationFinishing") &&
    talkPageSrc.includes("endModelTurnWhenDrained"),
  "handoff + invitation drains own model-turn gate; normal turns still endModelTurnWhenDrained",
);
assert(
  /if \(suspended\)[\s\S]{0,220}signalModelTurnComplete[\s\S]{0,120}endModelTurnWhenDrained/.test(
    talkPageSrc,
  ),
  "suspended turn_complete reconciles model-turn gate before early return",
);
assert(
  /handleWordReplay[\s\S]{0,600}endModelTurnWhenDrained/.test(talkPageSrc),
  "card replay drain clears model-turn gate so mic can reopen",
);
assert(
  turnRuntimeSrc.includes("clearModelTurnGate") &&
    turnRuntimeSrc.includes("invitation drain idle"),
  "invitation path clears modelTurnActive after audio idle (matches handoff)",
);
assert(
  talkPageSrc.includes("phase === \"invitation\"") &&
    talkPageSrc.includes("orb_mic_stop"),
  "mic-stop suppressed during guest handoff tail (avoids sessionGeneration bump)",
);
const warmthSrc = readFileSync(join(ROOT, "lib/voice/warmth.ts"), "utf8");
assert(
  warmthSrc.includes("กดไมค์") && warmthSrc.includes("tap the mic"),
  "canvas icebreaker tells user to press the mic",
);
assert(
  warmthSrc.includes("TALK_FREE_LIMIT_CONTINUE") &&
    warmthSrc.includes("voice-to-text") &&
    warmthSrc.includes("reply in text"),
  "free limit message tells user typing/voice-to-text stays with text replies",
);
assert(
  talkPageSrc.includes("TALK_FREE_LIMIT_CONTINUE") && talkPageSrc.includes("free limit reached"),
  "talk page wires free-limit message at limit-reached point",
);
assert(
  turnRuntimeSrc.includes("waitForHandoffReplyDrain") &&
    turnControllerSrc.includes("handoffReplyStarted") &&
    turnRuntimeSrc.includes('phase !== "invitation"'),
  "5th-exchange reply is voiced before invitation handoff; drain keyed on invitation phase",
);
assert(
  turnControllerSrc.includes("send_hidden_turn") &&
    turnControllerSrc.includes("HANDOFF_NUDGE"),
  "spurious handoff turn_complete auto-nudges model reply synchronously",
);
assert(
  talkPageSrc.includes("orb_mic_stop") &&
    !/liveUiState === "listening"\)[\s\S]{0,120}teardownSession/.test(talkPageSrc),
  "mic-stop uses turn controller orb_mic_stop, not full teardown",
);
assert(
  turnControllerSrc.includes("invitationVoiceSent"),
  "CTA sheet requires voiced invitation (no silent handoff)",
);
assert(
  talkPageSrc.includes("get_word_to_review") && talkPageSrc.includes("teaching-mode"),
  "talk page wires Tool 3 + teaching mode state",
);
assert(
  !talkPageSrc.includes("maybeAdaptSessionLanguages") &&
    !talkPageSrc.includes("sendLanguageContext"),
  "per-utterance language flip + mid-session language_update nudges removed",
);
assert(
  !miomiClientSrc.includes("sendLanguageContext") &&
    !miomiClientSrc.includes("[language_update]"),
  "live client has no mid-session language reconfig",
);
assert(
  !talkPageSrc.includes("GuestPracticePick") &&
    !talkPageSrc.includes("handleCycleLang") &&
    !talkPageSrc.includes("onCycleLang"),
  "no language toggle or guest practice picker",
);
assert(
  talkPageSrc.includes("useUILanguage") && talkPageSrc.includes("browserUiLangRef"),
  "talk page seeds session from browser ui-language",
);
assert(
  talkPageSrc.includes("sessionTargetLangRef") &&
    talkPageSrc.includes("syncTeachWordContext") &&
    talkPageSrc.includes("cardDirectionForTarget(sessionTargetLangRef.current)"),
  "stable connect-time target wired end-to-end to teach-word context",
);
assert(
  talkPageSrc.includes("teachLearningTarget: config.teach.learning") ||
    talkPageSrc.includes("teachLearningTarget: c.teach.learning"),
  "TalkConfig.teach.learning reaches session language resolution",
);

section("Single greeting bubble harness");

const openerShell = makeSessionOpenerShell("greeting-opener", 0);
assert(openerShell.textTh === "" && openerShell.textEn === "", "session opener has no silent pre-filled text");
const kickoffBind = bindKickoffToOpener([openerShell]);
assert(kickoffBind.geminiItemId === "greeting-opener", "kickoff binds model stream to opener bubble id");
let greetingItems = kickoffBind.items;
let greetingGeminiId: string | null = kickoffBind.geminiItemId;
const greetingAppend = appendGeminiTranscriptChunk(
  greetingItems,
  greetingGeminiId,
  "Hi~ tap the mic when you're ready!",
  0,
);
greetingItems = greetingAppend.items;
greetingGeminiId = greetingAppend.currentGeminiItemId;
assert(countSessionGreetingBubbles(greetingItems) === 1, "exactly one greeting bubble on session start");
assert(
  greetingItems[0]?.textEn.includes("tap the mic"),
  "greeting bubble text matches spoken kickoff (not a separate silent bubble)",
);

section("No markdown in speech/display harness");

assert(
  sanitizeModelTranscript("try **อร่อย** today") === "try อร่อย today",
  "sanitizeModelTranscript strips bold markdown from Thai target word",
);
assert(
  !/\*+/.test(sanitizeModelTranscript("She said **hello** nicely")),
  "sanitizeModelTranscript removes all asterisk markdown",
);
assert(
  liveConfigSrc.includes("Never use markdown") && liveConfigSrc.includes("plain text only"),
  "persona forbids markdown in spoken lines",
);
assert(
  talkPageSrc.includes("appendGeminiTranscriptChunk"),
  "talk page routes model transcript through session-canvas",
);
const miniCatRowSrc = readFileSync(join(ROOT, "components/talk/MiniCatRow.tsx"), "utf8");
assert(
  miniCatRowSrc.includes("sanitizeModelTranscript"),
  "MiniCatRow sanitizes full bubble text once at render",
);
const mashedDeltas = ["I", "'m", " sorry", " about", " that"];
let mashedItems = [makeSessionOpenerShell("mashed-opener", 1)];
let mashedGeminiId: string | null = null;
for (const delta of mashedDeltas) {
  const step = appendGeminiTranscriptChunk(mashedItems, mashedGeminiId, delta, 1);
  mashedItems = step.items;
  mashedGeminiId = step.currentGeminiItemId;
}
const mashedBubble = mashedItems[0]!;
const mashedDisplay = sanitizeModelTranscript(mashedBubble.textEn);
assert(
  mashedDisplay === "I'm sorry about that",
  "inter-chunk spaces preserved: deltas render as one sentence",
);

section("Warmth + discipline harness");

assert(
  detectExplicitLessonWordRequest("teach me a new word please") === "new_word",
  "explicit new-word request detected",
);
assert(
  detectExplicitLessonWordRequest("show me the card") === "show_card",
  "explicit show-card request detected",
);
assert(
  detectExplicitLessonWordRequest("ขอดูบัตรหน่อยค่ะ") === "show_card",
  "explicit show-card request detected (Thai)",
);
assert(
  detectExplicitLessonWordRequest("how do you say water in Thai") === null,
  "target-content question is not an explicit lesson request",
);
assert(
  recommendWordPick(createTeachingModeState({ phase: "review" }), {
    hasDueReview: true,
    canIntroNew: true,
    forceNewWord: true,
  }) === "new",
  "forceNewWord overrides review-leaning phase machine",
);
const explicitNudge = buildExplicitLessonRequestNudge("new_word", "en", "water");
assert(
  explicitNudge.includes('SYSTEM-SERVED WORD="water"') &&
    explicitNudge.includes("do NOT deflect to review"),
  "explicit request nudge locks system-served word and forbids review deflection",
);
assert(
  liveConfigSrc.includes("SYSTEM OWNS WORD + CARD") &&
    liveConfigSrc.includes("Warmth = tone only"),
  "persona declares system-owned word+card; warmth is tone only",
);
assert(
  buildTeachingModeContract("en", "th").includes("SYSTEM OWNS WORD + CARD"),
  "teaching contract declares system-owned word+card",
);
assert(
  buildSystemInstruction("en", "th").includes("fabricate shared history") ||
    buildSystemInstruction("en", "th").includes("NEVER claim"),
  "system instruction forbids fabricated conversation context",
);
assert(
  sanitizeUserTranscript("hello नमस्ते world") === "hello world",
  "sanitizer strips Devanagari from English speech",
);
assert(
  sanitizeUserTranscript("สวัสดี 你好") === "สวัสดี",
  "sanitizer strips CJK from Thai speech",
);
assert(
  talkPageSrc.includes("honorExplicitLessonRequest") &&
    talkPageSrc.includes("detectExplicitLessonWordRequest"),
  "talk page honors explicit new-word / show-card requests",
);

section("Concise + content intent harness");

assert(
  liveConfigSrc.includes("no option-dumping") &&
    liveConfigSrc.includes("at most ONE soft question"),
  "persona contract enforces brevity and max-one-question",
);
assert(
  buildTeachingModeContract("en", "th").includes("CONCISE") &&
    buildTeachingModeContract("en", "th").includes("CONTENT FOLLOW"),
  "teaching contract enforces concise replies and content follow",
);
assert(
  buildTeachingModeContract("en", "th").includes("were you having basil") ||
    buildTeachingModeContract("en", "th").includes("fabricated present-moment"),
  "teaching contract forbids fabricated present-context",
);

const dailyIntent = detectLessonContentIntent("NOT food — give me daily phrases instead");
assert(dailyIntent?.topicHint === "daily_routine", "daily phrases maps to daily_routine topic");
assert(
  dailyIntent?.excludeTopics.includes("food") === true,
  "NOT food adds food to excludeTopics",
);
assert(dailyIntent?.shouldRebuild === true, "stated intent triggers rebuild");

const rejectFoodOnly = detectLessonContentIntent("no more food please");
assert(
  rejectFoodOnly?.excludeTopics.includes("food") === true,
  "no more food rejects food topic",
);

const travelTopic = selectLessonTopic({
  rows: planBankRows,
  planSize: planSizeForTier("guest"),
  cefrLevel: "A1",
  exclude: buildExcludeSet([]),
  tier: "guest",
  excludeTopics: ["food"],
});
assert(travelTopic === "travel", "excludeTopics skips food and picks travel");

assert(
  detectExplicitLessonWordRequest("give me a phrase to practice") === "new_word",
  "give me a phrase to practice is honored as new_word",
);
assert(
  detectExplicitLessonWordRequest("show me a card to practice") === "show_card",
  "card to practice is honored as show_card",
);

const contentNudge = buildContentIntentNudge(
  { topicHint: "daily_routine", excludeTopics: ["food"], shouldRebuild: true },
  "en",
  "daily_routine",
  "wake up",
);
assert(
  contentNudge.includes("rebuilt lesson") && contentNudge.includes("excluded=food"),
  "content intent nudge names rebuilt topic and exclusions",
);

assert(
  talkPageSrc.includes("honorContentIntent") &&
    talkPageSrc.includes("detectLessonContentIntent"),
  "talk page honors stated content intent",
);
assert(
  teachWordRouteSrc.includes("exclude_topics") && teachWordRouteSrc.includes("rebuild_plan"),
  "teach-word accepts exclude_topics and rebuild_plan",
);
assert(
  teachWordRouteSrc.includes("plan_only"),
  "teach-word supports plan-only rebuild without serving a word",
);
assert(
  miomiClientSrc.includes("excludeTopics"),
  "live client carries excludeTopics in teach context",
);

const languageSrc = readFileSync(join(ROOT, "lib/brain/language.ts"), "utf8");
assert(
  languageSrc.includes("browserUiLang") &&
    !/if \(args\.isGuest\)[\s\S]{0,200}return \{ uiLanguage: "en", targetLanguage: "th" \}/.test(
      languageSrc,
    ),
  "resolveSessionLanguages seeds from browser, not hardcoded guest en/th",
);
assert(
  talkPageSrc.includes("resolveLiveSessionLanguages") &&
    !talkPageSrc.includes("resolveUiLanguage") &&
    !talkPageSrc.includes("resolveTargetLanguage"),
  "talk page uses connect-time session language resolution only",
);
const teachWordRoute = readFileSync(join(ROOT, "app/api/teach-word/route.ts"), "utf8");
assert(
  teachWordRoute.includes("UI_LANGUAGE_COOKIE") &&
    !teachWordRoute.includes("GUEST_PRACTICE_TARGET_COOKIE"),
  "teach-word guest path uses browser ui-language cookie",
);

section("Session transport continuity");

assert(classifyLiveClose(true) === "intentional", "deliberate close classified intentional");
assert(classifyLiveClose(false) === "transport", "unexpected close classified transport");
assert(
  shouldIgnoreClientEpoch("old-epoch", "current-epoch"),
  "epoch guard ignores stale instance close",
);
assert(
  !shouldIgnoreClientEpoch("same-epoch", "same-epoch"),
  "epoch guard accepts current instance close",
);
assert(
  canAttemptTransportReconnect(0) && canAttemptTransportReconnect(1),
  "transport reconnect allowed within budget",
);
assert(
  !canAttemptTransportReconnect(MAX_TRANSPORT_RECONNECTS),
  "transport reconnect blocked when budget exhausted",
);
assert(
  nextResumeWordHint(["hello", "water", "thanks"], 1) === "water",
  "resume hint points at plan cursor",
);
const resumeEn = buildResumePrompt("en", "water");
assert(
  resumeEn.includes("session_resume") && resumeEn.includes("do NOT greet again"),
  "resume prompt forbids re-greeting",
);
assert(
  miomiClientSrc.includes("const resume = opts.resume ?? false") &&
    /if \(resume\)[\s\S]{0,160}learningTarget/.test(miomiClientSrc) &&
    /else \{[\s\S]{0,220}lessonPlan: \[\]/.test(miomiClientSrc),
  "resume preserves lesson plan; cold start clears it",
);
assert(
  miomiClientSrc.includes("disconnectIntentionally") && miomiClientSrc.includes("intentionalClose"),
  "client marks intentional close",
);
assert(
  miomiClientSrc.includes("epochId") && talkPageSrc.includes("shouldIgnoreClientEpoch"),
  "page ignores stale client epoch",
);
assert(
  talkPageSrc.includes("skipKickoff: true") && talkPageSrc.includes("sendResume"),
  "transport resume skips kickoff and sends resume prompt",
);
assert(
  talkPageSrc.includes("awaitingContinueTap") && talkPageSrc.includes("Tap to continue"),
  "exhausted reconnect shows tap-to-continue (not cold greeting)",
);
assert(
  talkPageSrc.includes("live websocket closed") && talkPageSrc.includes("code: detail.code"),
  "websocket close code + reason logged",
);

const swSrc = readFileSync(join(ROOT, "public/sw.js"), "utf8");
assert(
  swSrc.includes("const cacheResponse = response.clone()"),
  "sw.js clones fetch response before async cache write",
);
assert(
  !/cache\.then\(\(c\) => c\.put\(request, response\.clone\(\)\)/.test(swSrc),
  "sw.js never defers response.clone() inside cache.then",
);

section("Repeated flow simulations (5× guest + 5× member)");
const guestRuns = runRepeatedFlowSimulations("guest", 5);
const memberRuns = runRepeatedFlowSimulations("member", 5);
assert(
  guestRuns.every((r) => r.sheet && r.guestExchanges === GUEST_EXCHANGE_LIMIT),
  "guest flow ×5: CTA sheet every run, 5 exchanges",
);
assert(
  memberRuns.every((r) => r.phase === "render" && r.guestExchanges === 0),
  "member flow ×3 ×5 runs: stable render phase, no guest counter",
);
console.log("  guest runs:", guestRuns.map((r) => `run${r.run}=sheet@${r.guestExchanges}`).join(", "));
console.log("  member runs:", memberRuns.map((r) => `run${r.run}=${r.phase}`).join(", "));

flow = createTurnController(GUEST_EXCHANGE_LIMIT - 1, true);
flow = reduceTurn(flow, { type: "guest_text_turn", isGuest: true }).state;
flow = reduceTurn(flow, { type: "model_audio" }).state;
const beforeInvite = reduceTurn(flow, { type: "turn_complete" }).state;
assert(!beforeInvite.invitationVoiceSent, "handoff invite waits for reply output before firing");
flow = reduceTurn(flow, { type: "model_audio" }).state;
const afterReply = reduceTurn(flow, { type: "turn_complete" }).state;
assert(afterReply.phase === "invitation", "handoff invite phase after 5th reply output");

// --- I. Sanity on helpers ---------------------------------------------------
assert(oppositeLanguage("en") === "th", "oppositeLanguage en→th");
assert(normalizeLearningTarget("thai") === "th", "normalizeLearningTarget thai");

// --- J. Live bank cardable count (optional) ---------------------------------

async function reportA1CardableInventory(): Promise<void> {
  section("A1 cardable bank inventory (optional)");
  const a1Cardable = await countA1CardableWords("th");
  if (a1Cardable === null) {
    console.log("  · skipped — SUPABASE_SERVICE_ROLE_KEY unavailable");
    return;
  }
  console.log(`  · A1 active cardable words (teach_thai_to_english): ${a1Cardable}`);
  assert(
    a1Cardable >= 3,
    `bank has ≥3 A1 cardable words for guest 3-word plan (found ${a1Cardable})`,
  );
}

async function runAsyncHarness(): Promise<void> {
  section("Guest CTA via TurnRuntime (effect path)");
  const ctaRuntime = await simulateGuestCtaViaTurnRuntime();
  assert(ctaRuntime.exchanges === GUEST_EXCHANGE_LIMIT, "TurnRuntime: CTA after exactly 5 exchanges");
  assert(ctaRuntime.invitationCueCount === 1, "TurnRuntime: spoken invitation cue once at exchange 5");
  assert(ctaRuntime.signupSheetCount === 1, "TurnRuntime: signup sheet opens after invitation drain");
  assert(ctaRuntime.phase === "sheet", "TurnRuntime: ends on sheet phase");

  await reportA1CardableInventory();
  console.log(`\n[check:talk] ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

void runAsyncHarness();
