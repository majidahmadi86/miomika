"use client";

import { GoogleGenAI } from "@google/genai";
import {
  LIVE_MODEL,
  LIVE_VOICE,
  buildKickoffPrompt,
  buildLiveConfig,
  buildResumePrompt,
} from "@/lib/live/live-config";
import { type MemberContextBundle } from "@/lib/live/member-context";
import { logEvent } from "@/lib/debug/event-bus";
import { createLiveClientEpoch } from "@/lib/live/session-continuity";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export type LiveClientMessage =
  | { type: "interrupted" }
  | { type: "audio"; data: ArrayBuffer }
  | { type: "user"; text: string; finished?: boolean }
  | { type: "gemini"; text: string }
  | { type: "turn_complete" }
  | { type: "tool_call"; name: string; args: Record<string, unknown>; result: unknown };

export type LiveClientCloseDetail = {
  epochId: string;
  intentionalClose: boolean;
  code: number | null;
  reason: string;
  wasClean: boolean | null;
};

export type LiveClientErrorDetail = {
  epochId: string;
  error: string;
  code: number | null;
  reason: string;
};

export type LiveClientCallbacks = {
  onOpen?: () => void;
  onMessage?: (msg: LiveClientMessage) => void;
  onClose?: (detail: LiveClientCloseDetail) => void;
  onError?: (detail: LiveClientErrorDetail) => void;
  onStatus?: (msg: { status: string; voice?: string; model?: string; code?: number | null; reason?: string }) => void;
};

type LiveSession = {
  close: () => void;
  sendRealtimeInput: (input: { audio: { data: string; mimeType: string } }) => void;
  sendClientContent: (input: {
    turns: { role: string; parts: { text: string }[] }[];
    turnComplete: boolean;
  }) => void;
  sendToolResponse: (input: { functionResponses: { id?: string; name: string; response: unknown }[] }) => Promise<void>;
};

export type TeachWordContext = {
  learningTarget: "th" | "en";
  sessionIntroduced: string[];
  lessonPlan: string[];
  introducedIdx: number;
  lessonTopic: string | null;
  topicHint: string | null;
  excludeTopics: string[];
};

export type LiveSessionSnapshot = {
  teachWord: TeachWordContext;
  reviewServed: string[];
};

export class MiomiLiveClient {
  readonly epochId: string;
  private session: LiveSession | null = null;
  private connected = false;
  private intentionalClose = false;
  private sessionReviewServed = new Set<string>();
  private teachWordContext: TeachWordContext = {
    learningTarget: "th",
    sessionIntroduced: [],
    lessonPlan: [],
    introducedIdx: 0,
    lessonTopic: null,
    topicHint: null,
    excludeTopics: [],
  };
  private memberContext: MemberContextBundle | null = null;

  constructor(private callbacks: LiveClientCallbacks) {
    this.epochId = createLiveClientEpoch();
  }

  getMemberContext(): MemberContextBundle | null {
    return this.memberContext;
  }

  setTeachWordContext(
    ctx: Partial<TeachWordContext> & Pick<TeachWordContext, "learningTarget" | "sessionIntroduced">,
  ): void {
    this.teachWordContext = {
      ...this.teachWordContext,
      ...ctx,
    };
  }

  applyTeachWordResponse(payload: {
    lesson_plan?: string[];
    lesson_topic?: string | null;
    introduced_idx?: number;
    word_en?: string;
  }): void {
    if (Array.isArray(payload.lesson_plan) && payload.lesson_plan.length > 0) {
      this.teachWordContext.lessonPlan = payload.lesson_plan;
    }
    if (payload.lesson_topic !== undefined) {
      this.teachWordContext.lessonTopic = payload.lesson_topic;
    }
    if (typeof payload.introduced_idx === "number") {
      this.teachWordContext.introducedIdx = payload.introduced_idx;
    } else if (payload.word_en) {
      this.teachWordContext.introducedIdx += 1;
    }
  }

  getSessionSnapshot(): LiveSessionSnapshot {
    return {
      teachWord: { ...this.teachWordContext, sessionIntroduced: [...this.teachWordContext.sessionIntroduced] },
      reviewServed: [...this.sessionReviewServed],
    };
  }

  restoreSessionSnapshot(snapshot: LiveSessionSnapshot): void {
    this.teachWordContext = {
      ...snapshot.teachWord,
      sessionIntroduced: [...snapshot.teachWord.sessionIntroduced],
      lessonPlan: [...snapshot.teachWord.lessonPlan],
    };
    this.sessionReviewServed = new Set(snapshot.reviewServed);
  }

  async connect(opts: {
    voice?: string;
    uiLanguage: "th" | "en";
    targetLanguage: "th" | "en";
    resume?: boolean;
  }): Promise<void> {
    const voice = opts.voice ?? LIVE_VOICE;
    const uiLanguage = opts.uiLanguage ?? "en";
    const targetLanguage = opts.targetLanguage ?? "th";
    const resume = opts.resume ?? false;

    if (resume) {
      this.teachWordContext = {
        ...this.teachWordContext,
        learningTarget: targetLanguage,
      };
    } else {
      this.teachWordContext = {
        learningTarget: targetLanguage,
        sessionIntroduced: this.teachWordContext.sessionIntroduced,
        lessonPlan: [],
        introducedIdx: 0,
        lessonTopic: null,
        topicHint: null,
        excludeTopics: [],
      };
      this.sessionReviewServed.clear();
    }

    this.intentionalClose = false;

    const tokenRes = await fetch("/api/live-token");
    if (!tokenRes.ok) {
      const err = (await tokenRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Token fetch failed (${tokenRes.status})`);
    }
    const tokenPayload = (await tokenRes.json()) as {
      token?: string;
      memberContext?: MemberContextBundle | null;
    };
    const { token, memberContext } = tokenPayload;
    this.memberContext = memberContext ?? null;
    if (!token) throw new Error("No ephemeral token in /api/live-token response");

    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    let resolveOpen: (() => void) | undefined;
    let rejectOpen: ((err: Error) => void) | undefined;
    const openPromise = new Promise<void>((resolve, reject) => {
      resolveOpen = resolve;
      rejectOpen = reject;
    });

    const boundEpoch = this.epochId;

    this.session = (await ai.live.connect({
      model: LIVE_MODEL,
      config: buildLiveConfig(voice, uiLanguage, targetLanguage, this.memberContext),
      callbacks: {
        onopen: () => {
          this.connected = true;
          resolveOpen?.();
          this.callbacks.onOpen?.();
          this.callbacks.onStatus?.({ status: "connected", voice, model: LIVE_MODEL });
        },
        onmessage: async (message) => {
          try {
            await this.handleMessage(message);
          } catch {
            /* tool / parse errors must never break the audio loop */
          }
        },
        onerror: (e: { message?: string; code?: number; reason?: string }) => {
          const msg = e?.message ?? String(e);
          rejectOpen?.(new Error(msg));
          this.callbacks.onError?.({
            epochId: boundEpoch,
            error: msg,
            code: e?.code ?? null,
            reason: e?.reason ?? "",
          });
        },
        onclose: (e: { code?: number; reason?: string; wasClean?: boolean }) => {
          this.connected = false;
          const detail: LiveClientCloseDetail = {
            epochId: boundEpoch,
            intentionalClose: this.intentionalClose,
            code: e?.code ?? null,
            reason: e?.reason ?? "",
            wasClean: e?.wasClean ?? null,
          };
          this.callbacks.onStatus?.({
            status: "disconnected",
            code: detail.code,
            reason: detail.reason,
          });
          this.callbacks.onClose?.(detail);
        },
      },
    })) as unknown as LiveSession;

    await openPromise;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Live SDK message shape is loosely typed
  private async handleMessage(message: any): Promise<void> {
    const sc = message.serverContent;

    if (sc?.interrupted) {
      this.callbacks.onMessage?.({ type: "interrupted" });
      return;
    }

    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.callbacks.onMessage?.({
            type: "audio",
            data: base64ToArrayBuffer(part.inlineData.data),
          });
        }
      }
    }

    if (sc?.inputTranscription) {
      const text = sc.inputTranscription.text ?? "";
      const finished = sc.inputTranscription.finished === true;
      if (text || finished) {
        this.callbacks.onMessage?.({ type: "user", text, finished });
      }
    }
    if (sc?.outputTranscription?.text) {
      const rawText = sc.outputTranscription.text;
      logEvent({
        kind: "engine",
        level: "info",
        message: "gemini transcript chunk (raw)",
        data: { text: rawText },
      });
      this.callbacks.onMessage?.({ type: "gemini", text: rawText });
    }
    if (sc?.turnComplete) {
      this.callbacks.onMessage?.({ type: "turn_complete" });
    }

    const toolCall = message.toolCall;
    if (toolCall?.functionCalls?.length) {
      await this.handleToolCall(toolCall);
    }
  }

  /** LOCKED 2026-06-05 — always sendToolResponse; never throw (guest teach-word must not break audio). */
  private async handleToolCall(toolCall: {
    functionCalls?: { id?: string; name: string; args?: Record<string, unknown> }[];
  }): Promise<void> {
    const functionResponses: { id?: string; name: string; response: unknown }[] = [];

    for (const fc of toolCall.functionCalls ?? []) {
      let response: unknown = { ok: false, error: "unknown tool" };

      if (fc.name === "get_word_to_teach") {
        try {
          const topicHint = (fc.args?.topic_hint ??
            fc.args?.topicHint ??
            this.teachWordContext.topicHint ??
            "") as string;
          const chosenWord = (fc.args?.word ?? fc.args?.word_en ?? "") as string;
          const body: Record<string, unknown> = {
            topic_hint: topicHint || undefined,
            learning_target: this.teachWordContext.learningTarget,
            session_introduced: this.teachWordContext.sessionIntroduced,
          };
          if (chosenWord.trim()) {
            body.word = chosenWord.trim();
          }
          if (this.teachWordContext.excludeTopics.length > 0) {
            body.exclude_topics = this.teachWordContext.excludeTopics;
          }
          if (this.teachWordContext.lessonPlan.length > 0) {
            body.lesson_plan = this.teachWordContext.lessonPlan;
            body.introduced_idx = this.teachWordContext.introducedIdx;
          }
          const resp = await fetch("/api/teach-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!resp.ok) {
            const err = (await resp.json().catch(() => ({}))) as { error?: string };
            response = { ok: false, error: err.error ?? `teach-word failed (${resp.status})` };
          } else {
            response = await resp.json();
            const payload = response as {
              lesson_plan?: string[];
              lesson_topic?: string | null;
              introduced_idx?: number;
              word_en?: string;
            };
            this.applyTeachWordResponse(payload);
            this.callbacks.onMessage?.({
              type: "tool_call",
              name: fc.name,
              args: fc.args ?? {},
              result: response,
            });
          }
        } catch (err) {
          response = { ok: false, error: String(err) };
        }
      } else if (fc.name === "get_word_to_review") {
        try {
          const resp = await fetch("/api/review-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              learning_target: this.teachWordContext.learningTarget,
              lesson_plan: this.teachWordContext.lessonPlan,
              introduced_idx: this.teachWordContext.introducedIdx,
              exclude: [...this.sessionReviewServed],
            }),
          });
          if (!resp.ok) {
            const err = (await resp.json().catch(() => ({}))) as { error?: string };
            response = { ok: false, error: err.error ?? `review-word failed (${resp.status})` };
          } else {
            response = await resp.json();
            const pickedEn = (response as { word_en?: string }).word_en?.trim();
            if (pickedEn) {
              this.sessionReviewServed.add(pickedEn.toLowerCase());
            }
            this.callbacks.onMessage?.({
              type: "tool_call",
              name: fc.name,
              args: fc.args ?? {},
              result: response,
            });
          }
        } catch (err) {
          response = { ok: false, error: String(err) };
        }
      }

      functionResponses.push({
        id: fc.id,
        name: fc.name,
        response,
      });
    }

    if (functionResponses.length > 0 && this.session) {
      try {
        await this.session.sendToolResponse({ functionResponses });
      } catch {
        /* Gemini must always get a best-effort ack; never throw upstream */
      }
    }
  }

  sendAudio(pcmBuffer: ArrayBuffer): void {
    if (!this.session || !this.connected) return;
    this.session.sendRealtimeInput({
      audio: {
        data: arrayBufferToBase64(pcmBuffer),
        mimeType: "audio/pcm;rate=16000",
      },
    });
  }

  sendText(text: string): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  /** Trigger Miomi's opening greeting on connect — not shown as user speech. */
  sendKickoff(
    lang: "th" | "en",
    audience: "first_time" | "returning" = "first_time",
  ): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: buildKickoffPrompt(lang, audience, this.memberContext) }],
        },
      ],
      turnComplete: true,
    });
  }

  /** Mid-lesson resume after transport drop — not shown as user speech. */
  sendResume(lang: "th" | "en", nextWord: string | null): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: buildResumePrompt(lang, nextWord) }] }],
      turnComplete: true,
    });
  }

  /** Inject guest handoff context mid-session — invisible to the transcript UI. */
  sendHiddenContext(text: string): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: false,
    });
  }

  /** Hidden prompt that completes a turn — e.g. resume a stalled handoff reply. */
  sendHiddenTurn(text: string): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    });
  }

  /** Speak an exact phrase aloud (invitation cue) — not shown as user speech. */
  sendSpeakExact(text: string): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: `[Speak exactly this one line aloud, nothing else: "${text}"]` }],
        },
      ],
      turnComplete: true,
    });
  }

  disconnect(): void {
    this.connected = false;
    try {
      this.session?.close();
    } catch {
      /* ignore */
    }
    this.session = null;
  }

  /** Deliberate teardown — classifies onClose as intentional (invitation, unmount). */
  disconnectIntentionally(): void {
    this.intentionalClose = true;
    this.disconnect();
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export { createLiveClientEpoch };
