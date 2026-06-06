/**
 * Deterministic /talk live turn controller — single state machine for the full turn lifecycle.
 * Replaces scattered refs/timers/flags in talk/page.tsx.
 */

import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import { GUEST_INVITATION_CUE, LAST_TURN_HANDOFF } from "@/lib/live/live-config";
import {
  advanceAfterTurn,
  buildPhaseNudge,
  createTeachingModeState,
  type TeachingModeState,
} from "@/lib/talk/teaching-mode";

/** Explicit phases — guest tail is a sub-chain, not parallel timers. */
export type TurnPhase =
  | "idle"
  | "connecting"
  | "kickoff"
  | "awaiting_mic"
  | "listening"
  | "user_turn"
  | "model_response"
  | "render"
  | "guest_count"
  | "handoff"
  | "voiced_reply"
  | "invitation"
  | "sheet"
  | "error";

export type LiveUiPhase = "idle" | "connecting" | "listening" | "speaking" | "error";

export type TurnTimingMark =
  | "session_connect_start"
  | "session_connect_end"
  | "kickoff_sent"
  | "user_turn_start"
  | "model_audio_first"
  | "turn_complete"
  | "tool_result"
  | "render_commit"
  | "handoff_context_sent"
  | "handoff_nudge_sent"
  | "invitation_sent"
  | "sheet_open";

export type TurnSideEffect =
  | { type: "set_live_ui"; ui: LiveUiPhase }
  | { type: "set_awaiting_mic"; value: boolean }
  | { type: "send_kickoff"; lang: "th" | "en" }
  | { type: "send_hidden_context"; text: string }
  | { type: "send_hidden_turn"; text: string }
  | { type: "send_speak_exact"; text: string }
  | { type: "start_continuous_mic" }
  | { type: "stop_continuous_mic" }
  | { type: "reset_transcript_ids" }
  | { type: "clear_user_exchange_counted" }
  | { type: "open_guest_sheet"; reason: "talk" | "save" }
  | { type: "teardown_session" }
  | { type: "wait_handoff_drain" }
  | { type: "wait_invitation_drain" }
  | { type: "log_timing"; mark: TurnTimingMark; deltaMs?: number };

export type TurnControllerState = {
  phase: TurnPhase;
  sessionActive: boolean;
  sessionGeneration: number;
  awaitingMic: boolean;
  /** Guest exchange counter (mirrors localStorage). */
  guestExchanges: number;
  guestLocked: boolean;
  /** True once per user turn — prevents double-counting transcript chunks. */
  userExchangeCounted: boolean;
  /** Armed on exchange 4→5 (LAST_TURN_HANDOFF). */
  handoffArmed: boolean;
  handoffReplyStarted: boolean;
  invitationPending: boolean;
  invitationVoiceSent: boolean;
  pendingHandoffContext: boolean;
  kickoffPending: boolean;
  micSuspended: boolean;
  teaching: TeachingModeState;
  wordPickThisTurn: boolean;
  lastPhaseNudged: string | null;
  timings: Partial<Record<TurnTimingMark, number>>;
  currentTurnStart: number | null;
};

export type TurnEvent =
  | { type: "session_connect_start" }
  | { type: "session_connected"; isGuest: boolean; guestExchanges: number; skipKickoff?: boolean }
  | { type: "session_teardown" }
  | { type: "kickoff_complete" }
  | { type: "orb_mic_start" }
  | { type: "orb_mic_stop" }
  | { type: "user_transcript"; text: string; isFirstChunk: boolean; isGuest: boolean }
  | { type: "model_audio" }
  | { type: "model_transcript"; text: string }
  | { type: "turn_complete" }
  | { type: "interrupted" }
  | { type: "tool_result"; name: string; hadCard: boolean }
  | { type: "replay_suspend"; suspended: boolean }
  | { type: "playback_idle"; context: "handoff" | "invitation" }
  | { type: "guest_text_turn"; isGuest: boolean };

export type TurnReduceResult = {
  state: TurnControllerState;
  effects: TurnSideEffect[];
};

const HANDOFF_NUDGE =
  "[handoff_reply] Deliver your warm open-loop answer now — one or two short sentences only.";

export function createTurnController(
  guestExchanges = 0,
  isGuest = true,
): TurnControllerState {
  return {
    phase: "idle",
    sessionActive: false,
    sessionGeneration: 0,
    awaitingMic: false,
    guestExchanges,
    guestLocked: isGuest && guestExchanges >= GUEST_EXCHANGE_LIMIT,
    userExchangeCounted: false,
    handoffArmed: false,
    handoffReplyStarted: false,
    invitationPending: false,
    invitationVoiceSent: false,
    pendingHandoffContext: false,
    kickoffPending: false,
    micSuspended: false,
    teaching: createTeachingModeState(),
    wordPickThisTurn: false,
    lastPhaseNudged: null,
    timings: {},
    currentTurnStart: null,
  };
}

function markTiming(
  state: TurnControllerState,
  mark: TurnTimingMark,
  effects: TurnSideEffect[],
): TurnControllerState {
  const now = Date.now();
  let deltaMs: number | undefined;
  if (mark === "user_turn_start") {
    deltaMs = undefined;
  } else if (mark === "model_audio_first") {
    const anchor = state.timings.user_turn_start ?? state.currentTurnStart;
    deltaMs = anchor != null ? now - anchor : undefined;
  } else {
    const prev = state.timings[mark];
    deltaMs =
      prev != null
        ? now - prev
        : state.currentTurnStart != null
          ? now - state.currentTurnStart
          : undefined;
  }
  effects.push({ type: "log_timing", mark, deltaMs });
  return {
    ...state,
    timings: { ...state.timings, [mark]: now },
  };
}

function bumpGeneration(state: TurnControllerState): TurnControllerState {
  return { ...state, sessionGeneration: state.sessionGeneration + 1 };
}

function clearExchangeCounted(state: TurnControllerState): TurnControllerState {
  return { ...state, userExchangeCounted: false };
}

function maybeSendPhaseNudge(
  state: TurnControllerState,
  uiLang: "th" | "en",
  isGuest: boolean,
  effects: TurnSideEffect[],
): TurnControllerState {
  const nudge = buildPhaseNudge(state.teaching, uiLang, {
    hasDueReview: !isGuest,
    canIntroNew: true,
  });
  const key = `${state.teaching.phase}:${state.teaching.lessonNumber}`;
  if (state.lastPhaseNudged === key) return state;
  effects.push({ type: "send_hidden_context", text: nudge });
  return { ...state, lastPhaseNudged: key };
}

function beginUserExchange(
  state: TurnControllerState,
  isGuest: boolean,
  effects: TurnSideEffect[],
): TurnControllerState {
  if (!isGuest || state.guestLocked) return state;
  if (state.guestExchanges >= GUEST_EXCHANGE_LIMIT) return state;
  if (state.userExchangeCounted) return state;

  const turnStart = Date.now();
  const turnTimings = { ...state.timings };
  delete turnTimings.model_audio_first;
  let next: TurnControllerState = {
    ...state,
    userExchangeCounted: true,
    phase: "user_turn",
    currentTurnStart: turnStart,
    timings: turnTimings,
  };
  next = markTiming(next, "user_turn_start", effects);

  if (next.guestExchanges === GUEST_EXCHANGE_LIMIT - 1) {
    next = {
      ...next,
      handoffArmed: true,
      handoffReplyStarted: false,
      phase: "guest_count",
    };
    if (next.sessionActive) {
      effects.push({ type: "send_hidden_context", text: LAST_TURN_HANDOFF });
      next = markTiming(next, "handoff_context_sent", effects);
    } else {
      next = { ...next, pendingHandoffContext: true };
    }
  }

  next = {
    ...next,
    guestExchanges: next.guestExchanges + 1,
    guestLocked: next.guestExchanges + 1 >= GUEST_EXCHANGE_LIMIT,
  };
  return next;
}

function onModelOutput(
  state: TurnControllerState,
  effects: TurnSideEffect[],
  opts: { captureFirstAudio?: boolean } = {},
): TurnControllerState {
  let next = state;
  if (state.handoffArmed && !state.handoffReplyStarted) {
    next = { ...next, handoffReplyStarted: true, phase: "voiced_reply" };
  } else if (state.phase === "user_turn" || state.phase === "guest_count" || state.phase === "handoff") {
    next = { ...next, phase: "model_response" };
  } else if (state.phase === "kickoff" || state.phase === "invitation") {
    next = { ...next, phase: "model_response" };
  }
  const captureFirstAudio = opts.captureFirstAudio ?? false;
  if (
    captureFirstAudio &&
    state.currentTurnStart != null &&
    state.timings.user_turn_start != null &&
    state.timings.model_audio_first == null
  ) {
    next = markTiming(next, "model_audio_first", effects);
  }
  effects.push({ type: "set_live_ui", ui: "speaking" });
  return next;
}

function finishNormalTurn(
  state: TurnControllerState,
  uiLang: "th" | "en",
  isGuest: boolean,
  effects: TurnSideEffect[],
): TurnControllerState {
  const teaching = advanceAfterTurn(state.teaching, state.wordPickThisTurn);
  let next: TurnControllerState = {
    ...state,
    teaching,
    wordPickThisTurn: false,
    phase: state.sessionActive ? "listening" : "idle",
    currentTurnStart: null,
  };
  next = markTiming(next, "turn_complete", effects);
  next = maybeSendPhaseNudge(next, uiLang, isGuest, effects);
  effects.push({ type: "reset_transcript_ids" });
  effects.push({ type: "clear_user_exchange_counted" });
  next = clearExchangeCounted(next);
  effects.push({ type: "set_live_ui", ui: next.sessionActive ? "listening" : "idle" });
  return next;
}

export type TurnContext = {
  uiLang: "th" | "en";
  isGuest: boolean;
};

/** Pure reducer — context carries UI lang + guest flag for nudges and CTA. */
export function reduceTurn(
  state: TurnControllerState,
  event: TurnEvent,
  ctx: TurnContext = { uiLang: "en", isGuest: true },
): TurnReduceResult {
  const { uiLang, isGuest } = ctx;
  const effects: TurnSideEffect[] = [];
  let next = state;

  switch (event.type) {
    case "session_connect_start": {
      next = { ...next, phase: "connecting", sessionActive: false };
      next = markTiming(next, "session_connect_start", effects);
      effects.push({ type: "set_live_ui", ui: "connecting" });
      break;
    }

    case "session_connected": {
      next = {
        ...next,
        phase: "kickoff",
        sessionActive: true,
        guestExchanges: event.guestExchanges,
        guestLocked: event.isGuest && event.guestExchanges >= GUEST_EXCHANGE_LIMIT,
      };
      next = markTiming(next, "session_connect_end", effects);
      if (next.pendingHandoffContext) {
        effects.push({ type: "send_hidden_context", text: LAST_TURN_HANDOFF });
        next = { ...next, pendingHandoffContext: false, handoffArmed: true, phase: "handoff" };
        next = markTiming(next, "handoff_context_sent", effects);
        effects.push({ type: "start_continuous_mic" });
      } else if (event.skipKickoff) {
        effects.push({ type: "start_continuous_mic" });
        next = { ...next, phase: "listening" };
      } else {
        effects.push({ type: "send_kickoff", lang: uiLang });
        next = { ...next, kickoffPending: true, phase: "kickoff" };
        effects.push({ type: "set_live_ui", ui: "speaking" });
        next = markTiming(next, "kickoff_sent", effects);
      }
      break;
    }

    case "session_teardown": {
      next = bumpGeneration(createTurnController(next.guestExchanges, next.guestLocked));
      effects.push({ type: "set_live_ui", ui: "idle" });
      effects.push({ type: "set_awaiting_mic", value: false });
      break;
    }

    case "kickoff_complete": {
      next = {
        ...next,
        kickoffPending: false,
        awaitingMic: true,
        phase: "awaiting_mic",
        userExchangeCounted: false,
      };
      effects.push({ type: "set_awaiting_mic", value: true });
      effects.push({ type: "set_live_ui", ui: "idle" });
      effects.push({ type: "reset_transcript_ids" });
      break;
    }

    case "orb_mic_start": {
      if (next.guestLocked) {
        effects.push({ type: "open_guest_sheet", reason: "talk" });
        break;
      }
      next = { ...next, awaitingMic: false, phase: "listening" };
      effects.push({ type: "set_awaiting_mic", value: false });
      effects.push({ type: "start_continuous_mic" });
      break;
    }

    case "orb_mic_stop": {
      next = bumpGeneration({
        ...next,
        handoffArmed: false,
        handoffReplyStarted: false,
        invitationPending: false,
        invitationVoiceSent: false,
        phase: "idle",
        awaitingMic: false,
      });
      effects.push({ type: "stop_continuous_mic" });
      effects.push({ type: "set_live_ui", ui: "idle" });
      break;
    }

    case "guest_text_turn":
    case "user_transcript": {
      if (next.micSuspended) break;
      if (event.type === "user_transcript" && !event.isFirstChunk) break;
      const isGuest = event.type === "user_transcript" ? event.isGuest : event.isGuest;
      if (isGuest && next.guestLocked) {
        effects.push({ type: "open_guest_sheet", reason: "talk" });
        break;
      }
      next = beginUserExchange(next, isGuest, effects);
      if (next.handoffArmed && next.phase === "guest_count") {
        next = { ...next, phase: "handoff" };
      }
      break;
    }

    case "model_audio": {
      if (next.micSuspended) break;
      next = onModelOutput(next, effects, { captureFirstAudio: true });
      break;
    }

    case "model_transcript": {
      if (next.micSuspended) break;
      next = onModelOutput(next, effects);
      break;
    }

    case "turn_complete": {
      if (next.micSuspended) {
        effects.push({ type: "reset_transcript_ids" });
        break;
      }
      next = markTiming(next, "turn_complete", effects);

      if (next.invitationPending) {
        if (!next.invitationVoiceSent) break;
        effects.push({ type: "wait_invitation_drain" });
        break;
      }

      if (next.kickoffPending && next.sessionActive) {
        next = {
          ...next,
          kickoffPending: false,
          awaitingMic: true,
          phase: "awaiting_mic",
          userExchangeCounted: false,
        };
        effects.push({ type: "set_awaiting_mic", value: true });
        effects.push({ type: "set_live_ui", ui: "idle" });
        effects.push({ type: "reset_transcript_ids" });
        break;
      }

      if (next.handoffArmed) {
        if (!next.handoffReplyStarted) {
          // Spurious turn_complete — nudge immediately (no 500ms timer race).
          if (!next.timings.handoff_nudge_sent) {
            effects.push({ type: "send_hidden_turn", text: HANDOFF_NUDGE });
            next = markTiming(next, "handoff_nudge_sent", effects);
          }
          effects.push({ type: "clear_user_exchange_counted" });
          next = clearExchangeCounted(next);
          effects.push({ type: "set_live_ui", ui: next.sessionActive ? "listening" : "idle" });
          break;
        }
        next = {
          ...next,
          handoffArmed: false,
          handoffReplyStarted: false,
          phase: "invitation",
        };
        effects.push({ type: "wait_handoff_drain" });
        break;
      }

      next = finishNormalTurn(next, uiLang, isGuest, effects);
      next = { ...next, phase: "render" };
      next = markTiming(next, "render_commit", effects);
      break;
    }

    case "playback_idle": {
      if (event.context === "handoff" && next.phase === "invitation") {
        const lang = uiLang;
        effects.push({ type: "send_speak_exact", text: GUEST_INVITATION_CUE[lang] });
        next = {
          ...next,
          invitationPending: true,
          invitationVoiceSent: true,
          phase: "invitation",
        };
        next = markTiming(next, "invitation_sent", effects);
      } else if (event.context === "invitation") {
        next = {
          ...next,
          phase: "sheet",
          invitationPending: false,
          invitationVoiceSent: false,
        };
        effects.push({ type: "teardown_session" });
        effects.push({ type: "open_guest_sheet", reason: "talk" });
        next = markTiming(next, "sheet_open", effects);
      }
      break;
    }

    case "interrupted": {
      effects.push({ type: "reset_transcript_ids" });
      effects.push({ type: "set_live_ui", ui: next.sessionActive ? "listening" : "idle" });
      next = { ...next, phase: next.sessionActive ? "listening" : "idle" };
      break;
    }

    case "tool_result": {
      if (next.micSuspended) break;
      next = markTiming(next, "tool_result", effects);
      if (next.handoffArmed) break;
      if (event.hadCard) {
        next = { ...next, wordPickThisTurn: true };
      }
      break;
    }

    case "replay_suspend": {
      next = { ...next, micSuspended: event.suspended };
      break;
    }

    default:
      break;
  }

  return { state: next, effects };
}

/** Format timing report for diagnosis (mic-stop proxy = user_turn_start). */
export function formatTurnTimingReport(state: TurnControllerState): string {
  const t = state.timings;
  const lines: string[] = [];
  const add = (label: string, mark: TurnTimingMark, base?: TurnTimingMark) => {
    const ts = t[mark];
    if (ts == null) return;
    const baseTs = base ? t[base] : state.currentTurnStart;
    const delta = baseTs != null ? ts - baseTs : 0;
    lines.push(`${label}: ${delta}ms (${mark})`);
  };
  add("connect", "session_connect_end", "session_connect_start");
  add("user_turn → first_audio", "model_audio_first", "user_turn_start");
  add("user_turn → turn_complete", "turn_complete", "user_turn_start");
  add("turn_complete → render", "render_commit", "turn_complete");
  add("handoff context → first_audio", "model_audio_first", "handoff_context_sent");
  add("handoff reply → invitation", "invitation_sent", "model_audio_first");
  add("invitation → sheet", "sheet_open", "invitation_sent");
  return lines.join("\n") || "no timings recorded";
}

const TURN_CTX: TurnContext = { uiLang: "en", isGuest: true };
const MEMBER_CTX: TurnContext = { uiLang: "en", isGuest: false };

function run(state: TurnControllerState, event: TurnEvent, ctx = TURN_CTX): TurnControllerState {
  return reduceTurn(state, event, ctx).state;
}

function runAll(
  state: TurnControllerState,
  events: TurnEvent[],
  ctx = TURN_CTX,
): TurnControllerState {
  return events.reduce((s, e) => run(s, e, ctx), state);
}

/** Simulate five guest turns + handoff + invite + sheet (deterministic, no network). */
export function simulateGuestFiveTurnFlowController(): TurnControllerState {
  let state = createTurnController(0, true);
  state = run(state, { type: "session_connect_start" });
  state = run(state, { type: "session_connected", isGuest: true, guestExchanges: 0 });
  state = run(state, { type: "kickoff_complete" });

  for (let i = 0; i < GUEST_EXCHANGE_LIMIT - 1; i += 1) {
    state = run(state, { type: "guest_text_turn", isGuest: true });
    state = run(state, { type: "model_audio" });
    state = run(state, { type: "turn_complete" });
  }

  // 5th exchange — handoff chain
  state = run(state, { type: "guest_text_turn", isGuest: true });
  state = run(state, { type: "model_audio" });
  state = run(state, { type: "turn_complete" });
  state = run(state, { type: "playback_idle", context: "handoff" });
  state = run(state, { type: "model_audio" });
  state = run(state, { type: "turn_complete" });
  state = run(state, { type: "playback_idle", context: "invitation" });
  return state;
}

/** Simulate member turn loop (no guest handoff). */
export function simulateMemberTurnLoop(turns = 3): TurnControllerState {
  let state = createTurnController(0, false);
  state = run(state, { type: "session_connect_start" }, MEMBER_CTX);
  state = run(
    state,
    { type: "session_connected", isGuest: false, guestExchanges: 0 },
    MEMBER_CTX,
  );
  state = run(state, { type: "kickoff_complete" }, MEMBER_CTX);
  state = run(state, { type: "orb_mic_start" }, MEMBER_CTX);

  for (let i = 0; i < turns; i += 1) {
    state = runAll(
      state,
      [
        { type: "guest_text_turn", isGuest: false },
        { type: "model_audio" },
        { type: "turn_complete" },
      ],
      MEMBER_CTX,
    );
  }
  return state;
}

/** Run guest or member flow N times — returns per-run phase snapshots for verification. */
export function runRepeatedFlowSimulations(
  kind: "guest" | "member",
  runs = 5,
): { run: number; phase: TurnPhase; guestExchanges: number; sheet: boolean }[] {
  const results: { run: number; phase: TurnPhase; guestExchanges: number; sheet: boolean }[] = [];
  for (let r = 1; r <= runs; r += 1) {
    const end =
      kind === "guest"
        ? simulateGuestFiveTurnFlowController()
        : simulateMemberTurnLoop(3);
    results.push({
      run: r,
      phase: end.phase,
      guestExchanges: end.guestExchanges,
      sheet: end.phase === "sheet",
    });
  }
  return results;
}
