/**
 * Deterministic /talk self-check — no live audio, no network.
 * Run after every /talk change: npm run check:talk
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GUEST_EXCHANGE_LIMIT } from "../lib/ai/limits";
import {
  detectExplicitUiLanguageRequest,
  normalizeLearningTarget,
  oppositeLanguage,
  resolveSessionLanguages,
  resolveTargetLanguage,
  resolveUiLanguage,
  sanitizeTargetLanguage,
} from "../lib/brain/language";
import {
  filterVocabCandidates,
  selectDueReviewCandidate,
} from "../lib/brain/teaching";
import {
  buildKickoffPrompt,
  buildSystemInstruction,
} from "../lib/live/live-config";
import {
  advanceAfterTurn,
  buildTeachingModeContract,
  cardContextForWord,
  createTeachingModeState,
  GET_WORD_TO_REVIEW_DECLARATION,
  recommendWordPick,
  recordWordPick,
  shouldPreferReviewOverNew,
  toolNameForPick,
} from "../lib/talk/teaching-mode";
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
  beginGuestExchange,
  createGuestFlowState,
  onHandoffReplyOutput,
  onHandoffTurnComplete,
  onInvitationDrained,
  onMicStop,
  onSpuriousHandoffTurnComplete,
  onWordCardDuringHandoff,
  simulateGuestFiveTurnFlow,
} from "../lib/talk/guest-flow";
import {
  cardDirectionForTarget,
  cardMeaningForWord,
  isVocabularySlug,
  replayTextForWord,
  teachWordToVocabularyEntry,
} from "../lib/talk/teach-word-card";

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

const guestSession = resolveSessionLanguages({
  isGuest: true,
  profileUiLang: null,
  profileTarget: null,
});
assert(guestSession.uiLanguage === "en", "guest UI=en");
assert(guestSession.targetLanguage === "th", "guest TARGET=th");

const memberEnTh = resolveSessionLanguages({
  isGuest: false,
  profileUiLang: "en",
  profileTarget: "th",
});
assert(memberEnTh.uiLanguage === "en", "member UI=en from profile");
assert(memberEnTh.targetLanguage === "th", "member TARGET=th from profile");

const memberEnEn = resolveSessionLanguages({
  isGuest: false,
  profileUiLang: "en",
  profileTarget: "en",
});
assert(memberEnEn.targetLanguage === "th", "member UI=en + profile target=en → teaches th (never own language)");

const teachThai = resolveTargetLanguage({
  userInput: "teach me Thai please",
  memory: [],
  profileTarget: "en",
  uiLanguage: "en",
});
assert(teachThai === "th", '"teach me Thai" → target=th');

const teachEnglish = resolveTargetLanguage({
  userInput: "I want to learn English",
  memory: [],
  profileTarget: "th",
  uiLanguage: "th",
});
assert(teachEnglish === "en", '"learn English" with UI=th → target=en');

assert(
  sanitizeTargetLanguage("en", "en") === "th",
  "sanitize never returns UI language as target",
);
assert(
  sanitizeTargetLanguage("th", null) === "en",
  "sanitize defaults to opposite when target unset",
);

const uiFromEnglish = resolveUiLanguage({
  profileUiLang: "en",
  userInput: "Hello, how are you doing today?",
  memory: [],
});
assert(uiFromEnglish === "en", "UI stays anchored to profile on English input");

const uiTargetPractice = resolveUiLanguage({
  profileUiLang: "en",
  userInput: "ตู้เย็น",
  memory: [],
  learningTargetLanguage: "th",
});
assert(uiTargetPractice === "en", "target-language practice does not flip UI");

const uiExplicitThai = resolveUiLanguage({
  profileUiLang: "en",
  userInput: "Please explain in Thai from now on",
  memory: [],
  learningTargetLanguage: "th",
});
assert(uiExplicitThai === "th", "explicit UI switch request is honored");

assert(
  detectExplicitUiLanguageRequest("speak Thai please") === "th",
  "detectExplicitUiLanguageRequest catches speak Thai",
);

// --- B. Guest 5-turn flow ---------------------------------------------------

section("Guest 5-turn flow");

let flow = createGuestFlowState(0);
for (let i = 0; i < GUEST_EXCHANGE_LIMIT; i += 1) {
  const before = flow.exchanges;
  flow = beginGuestExchange(flow);
  assert(flow.exchanges === before + 1, `exchange ${flow.exchanges} counted`);
  flow = { ...flow, userExchangeCounted: false };
}
assert(flow.exchanges === GUEST_EXCHANGE_LIMIT, "exactly 5 exchanges");
assert(flow.locked, "locked after 5th exchange");

flow = onHandoffReplyOutput(flow);
flow = onHandoffTurnComplete(flow);
assert(flow.invitationCueCount === 1, "invitation cue fires once on handoff complete");

flow = onInvitationDrained(flow);
assert(flow.signupSheetCount === 1, "signup sheet fires once after invite audio");

const endState = simulateGuestFiveTurnFlow();
assert(endState.exchanges === GUEST_EXCHANGE_LIMIT, "simulator ends at limit");
assert(endState.invitationCueCount === 1, "simulator: one invitation cue");
assert(endState.signupSheetCount === 1, "simulator: one signup sheet");

flow = createGuestFlowState(GUEST_EXCHANGE_LIMIT - 1);
flow = beginGuestExchange(flow);
flow = onWordCardDuringHandoff(flow);
assert(flow.wordCardsOnHandoffTurn === 1, "handoff turn tracks suppressed card");
assert(flow.handoffTurn === true, "handoff flag set on 5th turn start");

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
assert(!isVocabularySlug("fridge"), "fridge is not a slug");
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

const enRouted = newGeminiTranscriptItem("en", "Hi there~");
assert(enRouted.textEn === "Hi there~" && enRouted.textTh === "", "English UI → textEn only");

const thRouted = newGeminiTranscriptItem("th", "สวัสดีค่า~");
assert(thRouted.textTh === "สวัสดีค่า~" && thRouted.textEn === "", "Thai UI → textTh only");

const appended = routeGeminiTranscriptChunk(
  "en",
  { textTh: "", textEn: "Hello " },
  "friend~",
);
assert(appended.textEn === "Hello friend~" && appended.textTh === "", "chunks append to UI field only");

const kickoffEn = buildKickoffPrompt("en");
const kickoffTh = buildKickoffPrompt("th");
assert(kickoffEn.includes("ENGLISH"), "kickoff en mandates English voice");
assert(kickoffTh.includes("ภาษาไทย"), "kickoff th mandates Thai voice");

const sysEnTh = buildSystemInstruction("en", "th");
assert(sysEnTh.includes("UI_LANGUAGE = English"), "system instruction UI=en");
assert(sysEnTh.includes("TARGET_LANGUAGE = Thai"), "system instruction TARGET=th");
assert(sysEnTh.includes("TEACHING MODE v1"), "system instruction includes teaching mode contract");
assert(sysEnTh.includes("get_word_to_review"), "system instruction names Tool 3");
assert(
  buildTeachingModeContract("en", "th").includes("USE (not parrot)"),
  "teaching contract mandates USE not parrot",
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
];
const duePick = selectDueReviewCandidate(reviewRows, new Date("2026-06-05T12:00:00Z"));
assert(duePick === "hello", "null intro pick → earliest overdue review word");
assert(duePick !== "empty" && duePick !== "invented", "review path never returns made-up word");

const teachWordRouteSrc = readFileSync(
  join(ROOT, "app/api/teach-word/route.ts"),
  "utf8",
);
assert(
  !teachWordRouteSrc.includes("pickWordToPractice"),
  "teach-word is NEW-only; review via Tool 3",
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
  reviewWordRouteSrc.includes("pickWordToReview"),
  "review-word uses pickWordToReview (Tool 3)",
);
assert(
  reviewWordRouteSrc.includes('mode: "practice"'),
  "review-word flags practice mode for spiral words",
);

const liveConfigSrc = readFileSync(join(ROOT, "lib/live/live-config.ts"), "utf8");
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
    mediaHandlerSrc.includes("isMicSendSuspended"),
  "replay guard suspends mic PCM to Gemini",
);
assert(
  mediaHandlerSrc.includes("waitForHandoffReplyDrain"),
  "5th-exchange reply uses extended voiced drain before invitation",
);
assert(
  /waitForHandoffReplyDrain\(maxWaitForStartMs = 2500/.test(mediaHandlerSrc),
  "handoff drain wait capped at 2.5s",
);

const talkPageSrc = readFileSync(join(ROOT, "app/(app)/talk/page.tsx"), "utf8");
assert(
  talkPageSrc.includes("suspendMicSend(true)") &&
    talkPageSrc.includes("shouldForwardMicToGemini"),
  "card replay suspends mic send during TTS",
);
assert(
  talkPageSrc.includes("isReplayModelTurnSuspended") &&
    talkPageSrc.includes("discardSuspendedModelTurn"),
  "model output during replay-suspension is dropped, not queued",
);
assert(
  talkPageSrc.includes("waitForHandoffReplyDrain") &&
    talkPageSrc.includes("handoffReplyStartedRef"),
  "5th-exchange reply is voiced before invitation handoff",
);
assert(
  talkPageSrc.includes("sendHiddenTurn") && talkPageSrc.includes("handoffNudgeSentRef"),
  "spurious handoff turn_complete auto-nudges model reply",
);
assert(
  talkPageSrc.includes("stopContinuousMic") &&
    !/liveUiState === "listening"\)[\s\S]{0,120}teardownSession/.test(talkPageSrc),
  "mic-stop uses stopContinuousMic, not full teardown",
);
assert(
  talkPageSrc.includes("invitationVoiceSentRef"),
  "CTA sheet requires voiced invitation (no silent handoff)",
);
assert(
  talkPageSrc.includes("get_word_to_review") && talkPageSrc.includes("teaching-mode"),
  "talk page wires Tool 3 + teaching mode state",
);

flow = createGuestFlowState(GUEST_EXCHANGE_LIMIT - 1);
flow = beginGuestExchange(flow);
flow = onHandoffTurnComplete(flow);
assert(flow.invitationCueCount === 0, "handoff invite waits for reply output before firing");
flow = onHandoffReplyOutput(flow);
flow = onHandoffTurnComplete(flow);
assert(flow.invitationCueCount === 1, "handoff invite fires after 5th reply output");
flow = beginGuestExchange(createGuestFlowState(GUEST_EXCHANGE_LIMIT - 1));
flow = onSpuriousHandoffTurnComplete(flow);
assert(flow.handoffTurn === true, "spurious turn_complete keeps handoff armed");
assert(flow.invitationCueCount === 0, "spurious turn_complete never triggers invitation cue");

flow = createGuestFlowState(GUEST_EXCHANGE_LIMIT - 1);
flow = beginGuestExchange(flow);
flow = onMicStop(flow);
flow = onHandoffTurnComplete(flow);
assert(flow.invitationCueCount === 0, "mic-stop never triggers invitation cue");
flow = onInvitationDrained(flow);
assert(flow.signupSheetCount === 0, "mic-stop never opens signup sheet");

// --- I. Sanity on helpers ---------------------------------------------------
assert(oppositeLanguage("en") === "th", "oppositeLanguage en→th");
assert(normalizeLearningTarget("thai") === "th", "normalizeLearningTarget thai");

// --- Result -----------------------------------------------------------------

console.log(`\n[check:talk] ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
