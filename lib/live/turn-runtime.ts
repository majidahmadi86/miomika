/**
 * Bridges TurnController side effects to MiomiLiveClient + MediaHandler + React setters.
 */

import { logEvent } from "@/lib/debug/event-bus";
import type { MiomiLiveClient } from "@/lib/live/miomi-client";
import type { MediaHandler } from "@/lib/live/media-handler";
import {
  createTurnController,
  formatTurnTimingReport,
  reduceTurn,
  type LiveUiPhase,
  type TurnContext,
  type TurnControllerState,
  type TurnEvent,
  type TurnSideEffect,
} from "@/lib/live/turn-controller";

export type TurnRuntimeCallbacks = {
  onLiveUi: (ui: LiveUiPhase) => void;
  onAwaitingMic: (v: boolean) => void;
  onGuestExchanges: (n: number) => void;
  onOpenGuestSheet: (reason: "talk" | "save") => void;
  onTeardown: () => void;
  onResetTranscriptIds: () => void;
  onKickoffCanvas: () => void;
  onStartMic: () => Promise<void>;
  onStopMic: () => void;
  isMounted: () => boolean;
};

export type TurnRuntimeDeps = TurnRuntimeCallbacks & {
  getClient: () => MiomiLiveClient | null;
  getMedia: () => MediaHandler | null;
  getUiLang: () => "th" | "en";
  getKickoffAudience?: () => "first_time" | "returning";
  getLessonNudgeHints?: () => Pick<
    TurnContext,
    "nextPlannedWord" | "lessonTopic" | "lessonComplete"
  >;
  isGuest: () => boolean;
};

export class TurnRuntime {
  state: TurnControllerState;

  constructor(
    private deps: TurnRuntimeDeps,
    guestExchanges = 0,
    isGuest = true,
  ) {
    this.state = createTurnController(guestExchanges, isGuest);
  }

  reset(guestExchanges: number, isGuest: boolean): void {
    this.state = createTurnController(guestExchanges, isGuest);
  }

  ctx(): TurnContext {
    const lessonHints = this.deps.getLessonNudgeHints?.() ?? {};
    return {
      uiLang: this.deps.getUiLang(),
      isGuest: this.deps.isGuest(),
      ...lessonHints,
    };
  }

  dispatch(event: TurnEvent): TurnControllerState {
    const genBefore = this.state.sessionGeneration;
    const { state, effects } = reduceTurn(this.state, event, this.ctx());
    this.state = state;
    this.applyEffects(effects, genBefore);
    this.syncReact();
    return state;
  }

  private syncReact(): void {
    const s = this.state;
    this.deps.onGuestExchanges(s.guestExchanges);
    this.deps.onAwaitingMic(s.awaitingMic);
  }

  private applyEffects(effects: TurnSideEffect[], _genAtStart: number): void {
    const client = this.deps.getClient();
    const media = this.deps.getMedia();

    for (const effect of effects) {
      switch (effect.type) {
        case "set_live_ui":
          this.deps.onLiveUi(effect.ui);
          break;
        case "set_awaiting_mic":
          this.deps.onAwaitingMic(effect.value);
          break;
        case "send_kickoff":
          logEvent({ kind: "state", level: "info", message: "greeting kickoff emit", data: { lang: effect.lang } });
          this.deps.onKickoffCanvas();
          client?.sendKickoff(effect.lang, this.deps.getKickoffAudience?.() ?? "first_time");
          break;
        case "send_hidden_context":
          media?.deferUntilPlaybackIdle(() => client?.sendHiddenContext(effect.text));
          break;
        case "send_hidden_turn":
          client?.sendHiddenTurn(effect.text);
          break;
        case "send_speak_exact":
          logEvent({
            kind: "state",
            level: "info",
            message: "handoff/invitation CTA speak_exact fire",
            data: { text: effect.text.slice(0, 120) },
          });
          client?.sendSpeakExact(effect.text);
          break;
        case "start_continuous_mic":
          void this.deps.onStartMic();
          break;
        case "stop_continuous_mic":
          this.deps.onStopMic();
          break;
        case "reset_transcript_ids":
          this.deps.onResetTranscriptIds();
          break;
        case "clear_user_exchange_counted":
          this.state = { ...this.state, userExchangeCounted: false };
          break;
        case "open_guest_sheet":
          this.deps.onOpenGuestSheet(effect.reason);
          break;
        case "teardown_session":
          this.deps.onTeardown();
          break;
        case "wait_handoff_drain": {
          void (async () => {
            await media?.waitForHandoffReplyDrain();
            if (!this.deps.isMounted()) return;
            if (this.state.phase !== "invitation") return;
            this.dispatch({ type: "playback_idle", context: "handoff" });
          })();
          break;
        }
        case "wait_invitation_drain": {
          void (async () => {
            await media?.waitForTurnAudioThenIdle();
            if (!this.deps.isMounted()) return;
            if (!this.state.invitationPending) return;
            this.dispatch({ type: "playback_idle", context: "invitation" });
          })();
          break;
        }
        case "log_timing":
          logEvent({
            kind: "state",
            level: "info",
            message: `turn:${effect.mark}`,
            data: {
              deltaMs: effect.deltaMs ?? null,
              phase: this.state.phase,
              report: formatTurnTimingReport(this.state),
            },
          });
          break;
        default:
          break;
      }
    }
  }
}

export function isReplaySuspended(runtime: TurnRuntime, media: MediaHandler | null): boolean {
  return runtime.state.micSuspended || (media?.isMicSendSuspended() ?? false);
}
