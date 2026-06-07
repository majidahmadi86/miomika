import { GUEST_EXCHANGE_LIMIT } from "@/lib/ai/limits";
import { TurnRuntime } from "@/lib/live/turn-runtime";
import type { MiomiLiveClient } from "@/lib/live/miomi-client";
import type { MediaHandler } from "@/lib/live/media-handler";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Exercises TurnRuntime guest tail — invitation cue + signup sheet (no string grep). */
export async function simulateGuestCtaViaTurnRuntime(): Promise<{
  invitationCueCount: number;
  signupSheetCount: number;
  exchanges: number;
  phase: string;
}> {
  let invitationCueCount = 0;
  let signupSheetCount = 0;

  const mockClient = {
    sendKickoff: () => {},
    sendHiddenContext: () => {},
    sendHiddenTurn: () => {},
    sendSpeakExact: () => {
      invitationCueCount += 1;
    },
    isConnected: () => true,
  } as unknown as MiomiLiveClient;

  const mockMedia = {
    deferUntilPlaybackIdle: (fn: () => void) => {
      fn();
    },
    waitForHandoffReplyDrain: async () => {},
    waitForTurnAudioThenIdle: async () => {},
    signalModelTurnComplete: () => {},
    endModelTurnWhenDrained: async () => {},
    clearModelTurnGate: () => {},
    isMicSendSuspended: () => false,
  } as unknown as MediaHandler;

  const runtime = new TurnRuntime(
    {
      getClient: () => mockClient,
      getMedia: () => mockMedia,
      getUiLang: () => "en",
      isGuest: () => true,
      isMounted: () => true,
      onLiveUi: () => {},
      onAwaitingMic: () => {},
      onGuestExchanges: () => {},
      onOpenGuestSheet: () => {
        signupSheetCount += 1;
      },
      onTeardown: () => {},
      onResetTranscriptIds: () => {},
      onKickoffCanvas: () => {},
      onStartMic: async () => {},
      onStopMic: () => {},
    },
    0,
    true,
  );

  runtime.dispatch({ type: "session_connect_start" });
  runtime.dispatch({ type: "session_connected", isGuest: true, guestExchanges: 0 });
  runtime.dispatch({ type: "kickoff_complete" });

  for (let i = 0; i < GUEST_EXCHANGE_LIMIT - 1; i += 1) {
    runtime.dispatch({ type: "guest_text_turn", isGuest: true });
    runtime.dispatch({ type: "model_audio" });
    runtime.dispatch({ type: "turn_complete" });
  }

  runtime.dispatch({ type: "guest_text_turn", isGuest: true });
  runtime.dispatch({ type: "model_audio" });
  runtime.dispatch({ type: "turn_complete" });
  await tick();

  runtime.dispatch({ type: "model_audio" });
  runtime.dispatch({ type: "turn_complete" });
  await tick();

  return {
    invitationCueCount,
    signupSheetCount,
    exchanges: runtime.state.guestExchanges,
    phase: runtime.state.phase,
  };
}
