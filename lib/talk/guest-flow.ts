import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";

/** Deterministic guest exchange counter + handoff sequencing (mirrors /talk page). */

export type GuestFlowFlags = {
  exchanges: number;
  locked: boolean;
  handoffTurn: boolean;
  invitationPending: boolean;
  userExchangeCounted: boolean;
  invitationCueCount: number;
  signupSheetCount: number;
  wordCardsOnHandoffTurn: number;
};

export function createGuestFlowState(exchanges = 0): GuestFlowFlags {
  return {
    exchanges,
    locked: exchanges >= GUEST_EXCHANGE_LIMIT,
    handoffTurn: false,
    invitationPending: false,
    userExchangeCounted: false,
    invitationCueCount: 0,
    signupSheetCount: 0,
    wordCardsOnHandoffTurn: 0,
  };
}

/** First user transcript chunk of a turn — mirrors beginGuestExchange(). */
export function beginGuestExchange(state: GuestFlowFlags): GuestFlowFlags {
  if (state.locked || state.exchanges >= GUEST_EXCHANGE_LIMIT) return state;
  if (state.userExchangeCounted) return state;

  const next: GuestFlowFlags = { ...state, userExchangeCounted: true };
  if (next.exchanges === GUEST_EXCHANGE_LIMIT - 1) {
    next.handoffTurn = true;
  }
  next.exchanges += 1;
  next.locked = next.exchanges >= GUEST_EXCHANGE_LIMIT;
  return next;
}

/** Model turn_complete after kickoff greeting — awaitingMic, no exchange counted. */
export function onKickoffTurnComplete(state: GuestFlowFlags): GuestFlowFlags {
  return { ...state, userExchangeCounted: false };
}

/** Model turn_complete after handoff reply — invitation cue fires once, no extra word card. */
export function onHandoffTurnComplete(state: GuestFlowFlags): GuestFlowFlags {
  if (!state.handoffTurn) return state;
  return {
    ...state,
    handoffTurn: false,
    invitationPending: true,
    invitationCueCount: state.invitationCueCount + 1,
    userExchangeCounted: false,
  };
}

/** Invitation audio drained — sheet opens once, session tears down. */
export function onInvitationDrained(state: GuestFlowFlags): GuestFlowFlags {
  if (!state.invitationPending) return state;
  return {
    ...state,
    invitationPending: false,
    signupSheetCount: state.signupSheetCount + 1,
    userExchangeCounted: false,
  };
}

/** Tool call during handoff turn — card suppressed (no surprise 6th word). */
export function onWordCardDuringHandoff(state: GuestFlowFlags): GuestFlowFlags {
  if (!state.handoffTurn) return state;
  return { ...state, wordCardsOnHandoffTurn: state.wordCardsOnHandoffTurn + 1 };
}

/** Mic orb stop — must not trigger handoff invite or signup sheet. */
export function onMicStop(state: GuestFlowFlags): GuestFlowFlags {
  return {
    ...state,
    handoffTurn: false,
    invitationPending: false,
  };
}

/** Simulate five full user turns through handoff + invite + sheet. */
export function simulateGuestFiveTurnFlow(): GuestFlowFlags {
  let state = createGuestFlowState(0);
  for (let i = 0; i < GUEST_EXCHANGE_LIMIT; i += 1) {
    state = beginGuestExchange(state);
    state = { ...state, userExchangeCounted: false };
  }
  state = onHandoffTurnComplete(state);
  state = onInvitationDrained(state);
  return state;
}
