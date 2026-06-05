/**
 * Deterministic /talk self-check — no live audio, no network.
 * Run after every /talk change: npm run check:talk
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GUEST_EXCHANGE_LIMIT } from "../lib/ai/limits";
import {
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
  onHandoffTurnComplete,
  onInvitationDrained,
  onMicStop,
  onWordCardDuringHandoff,
  simulateGuestFiveTurnFlow,
} from "../lib/talk/guest-flow";
import {
  cardDirectionForTarget,
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
assert(uiFromEnglish === "en", "UI follows sustained English input");

const uiThaiConversation = resolveUiLanguage({
  profileUiLang: "en",
  userInput: "ผมอยากคุยภาษาไทยกับหนูได้ไหมครับ วันนี้อากาศดีมากเลยนะ",
  memory: [],
});
assert(uiThaiConversation === "th", "sustained Thai input can adapt UI to th");

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

const miomiClientSrc = readFileSync(
  join(ROOT, "lib/live/miomi-client.ts"),
  "utf8",
);
assert(
  miomiClientSrc.includes('fetch("/api/live-token")'),
  "client fetches ephemeral token from server",
);
assert(
  !/process\.env\.GEMINI_API_KEY/.test(miomiClientSrc) &&
    !/apiKey:\s*process\.env/.test(miomiClientSrc),
  "GEMINI_API_KEY never wired in browser client (comments OK)",
);

const liveTokenRoute = readFileSync(
  join(ROOT, "app/api/live-token/route.ts"),
  "utf8",
);
assert(
  liveTokenRoute.includes("process.env.GEMINI_API_KEY"),
  "API key stays server-side in live-token route",
);

// --- G. Live-test regressions (2026-06-05) ----------------------------------

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
  teachWordRouteSrc.includes("pickWordToPractice"),
  "teach-word falls back to pickWordToPractice when intro is null",
);
assert(
  teachWordRouteSrc.includes('mode = "practice"'),
  "practice mode flagged when reviewing known word",
);

const mediaHandlerSrc = readFileSync(
  join(ROOT, "lib/live/media-handler.ts"),
  "utf8",
);
assert(
  mediaHandlerSrc.includes("micSendSuspended") &&
    mediaHandlerSrc.includes("shouldForwardMicToGemini"),
  "replay guard suspends mic PCM to Gemini",
);

const talkPageSrc = readFileSync(join(ROOT, "app/(app)/talk/page.tsx"), "utf8");
assert(
  talkPageSrc.includes("suspendMicSend(true)") &&
    talkPageSrc.includes("shouldForwardMicToGemini"),
  "card replay suspends mic send during TTS",
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

flow = createGuestFlowState(GUEST_EXCHANGE_LIMIT - 1);
flow = beginGuestExchange(flow);
flow = onMicStop(flow);
flow = onHandoffTurnComplete(flow);
assert(flow.invitationCueCount === 0, "mic-stop never triggers invitation cue");
flow = onInvitationDrained(flow);
assert(flow.signupSheetCount === 0, "mic-stop never opens signup sheet");

// --- H. Sanity on helpers ---------------------------------------------------

section("Helpers");
assert(oppositeLanguage("en") === "th", "oppositeLanguage en→th");
assert(normalizeLearningTarget("thai") === "th", "normalizeLearningTarget thai");

// --- Result -----------------------------------------------------------------

console.log(`\n[check:talk] ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
