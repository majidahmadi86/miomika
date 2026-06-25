"use client";

import { GoogleGenAI } from "@google/genai";
import {
  LIVE_MODEL,
  LIVE_VOICE,
  buildKickoffPrompt,
  buildSessionKickoffPrompt,
  buildRoomPacePrompt,
  buildSessionResumePrompt,
  buildLiveConfig,
  buildSessionLiveConfig,
  buildResumePrompt,
  type SessionPlanContext,
} from "@/lib/live/live-config";
import { type MemberContextBundle } from "@/lib/live/member-context";
import type { TalkMode } from "@/lib/talk/modes";
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
  | { type: "go_away" }
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
  /** Fired when the route reports the member hit their per-day chat cap (turn-based engine only). */
  onLimitReached?: () => void;
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
  resumeHandle?: string | null;
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
  private voiceBudget: { usedSeconds: number; budgetSeconds: number } | null = null;
  // Gemini session-resumption handle — lets a reconnect resume the SAME server
  // session (no context re-billing, no lost state). Valid 2h after termination.
  private resumeHandle: string | null = null;

  constructor(private callbacks: LiveClientCallbacks) {
    this.epochId = createLiveClientEpoch();
  }

  getMemberContext(): MemberContextBundle | null {
    return this.memberContext;
  }
  getVoiceBudget(): { usedSeconds: number; budgetSeconds: number } | null {
    return this.voiceBudget;
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

  /** Drop the stored resume handle so the NEXT connect starts a fresh server
   *  session that honors the rebuilt contract (e.g. a new pace setting). Used by
   *  the pace toggle, which deliberately wants the new contract, not a resume. */
  clearResumeHandle(): void {
    this.resumeHandle = null;
  }

  getSessionSnapshot(): LiveSessionSnapshot {
    return {
      resumeHandle: this.resumeHandle,
      teachWord: { ...this.teachWordContext, sessionIntroduced: [...this.teachWordContext.sessionIntroduced] },
      reviewServed: [...this.sessionReviewServed],
    };
  }

  restoreSessionSnapshot(snapshot: LiveSessionSnapshot): void {
    if (snapshot.resumeHandle) this.resumeHandle = snapshot.resumeHandle;
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
    mode?: TalkMode;
    /** CEFR teaching level — only used by teach mode. */
    level?: "A1" | "A2" | "B1" | "B2" | "C1";
    /** Speaking Room: when present, the session brain runs instead of mode. */
    session?: SessionPlanContext;
  }): Promise<void> {
    const voice = opts.voice ?? LIVE_VOICE;
    const uiLanguage = opts.uiLanguage ?? "en";
    const targetLanguage = opts.targetLanguage ?? "th";
    const resume = opts.resume ?? false;
    const mode = opts.mode ?? "teach";
    const level = opts.level ?? "A1";

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
      reason?: string;
      voiceBudget?: { usedSeconds: number; budgetSeconds: number } | null;
    };
    const { token, memberContext } = tokenPayload;
    this.memberContext = memberContext ?? null;
    this.voiceBudget = tokenPayload.voiceBudget ?? null;
    if (tokenPayload.reason === "voice_exhausted") {
      const e = new Error("voice_exhausted");
      (e as Error & { code?: string }).code = "voice_exhausted";
      throw e;
    }
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

    const baseConfig = opts.session
      ? buildSessionLiveConfig(voice, uiLanguage, targetLanguage, level, opts.session, this.memberContext)
      : buildLiveConfig(voice, uiLanguage, targetLanguage, this.memberContext, mode, level);
    this.session = (await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        ...baseConfig,
        // Resume the same server session across WebSocket resets (~10 min) instead
        // of re-billing the full system instruction on every reconnect.
        sessionResumption: this.resumeHandle ? { handle: this.resumeHandle } : {},
        // Sliding-window compression: keeps the session under the 15-min audio cap
        // and stops context (and cost) growing unbounded on long sessions.
        contextWindowCompression: { slidingWindow: {} },
      },
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
    // Store the rolling resumption handle — used to resume on the next connect.
    if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate?.newHandle) {
      this.resumeHandle = message.sessionResumptionUpdate.newHandle as string;
    }
    // GoAway: server will close this connection soon. Surface it so the page can
    // resume seamlessly BEFORE the cut, not after a dead-air gap.
    if (message.goAway) {
      this.callbacks.onMessage?.({ type: "go_away" });
    }
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
      } else if (fc.name === "report_stage") {
        // Speaking Room: pure local relay — the room UI owns the board.
        response = { ok: true };
        this.callbacks.onMessage?.({
          type: "tool_call",
          name: fc.name,
          args: fc.args ?? {},
          result: response,
        });
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
    seedTopic: string | null = null,
  ): void {
    if (!this.session || !this.connected) return;
    const text =
      seedTopic && seedTopic.trim()
        ? `[kickoff] They just tapped a memory on their home screen because they want to talk about THIS: "${seedTopic.trim()}". Open by warmly, naturally bringing it up — like it's been on your mind too — in ONE short, breezy, curious line in the user's language, a touch cheeky, inviting them to tell you more. Do NOT introduce yourself or say your name. No emojis. Do NOT be formal.`
        : buildKickoffPrompt(lang, audience, this.memberContext);
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
      turnComplete: true,
    });
  }

  /** Speaking Room: open the session in tutor voice — replaces the companion kickoff. */
  sendSessionKickoff(lang: "th" | "en"): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: buildSessionKickoffPrompt(lang) }],
        },
      ],
      turnComplete: true,
    });
  }

  /** Speaking Room: learner taps Slow~/Normal — silent pace instruction, never shown. */
  sendRoomPace(lang: "th" | "en", slow: boolean): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: buildRoomPacePrompt(lang, slow) }],
        },
      ],
      // turnComplete:false — pace is CONTEXT, not a message: she must never
      // start a new turn (or interrupt her current one) because of a tap.
      turnComplete: false,
    });
  }

  /** Speaking Room: warm one-time heads-up that the 10-min session is nearly done.
   *  Spoken naturally; she wraps the current point and moves toward the exit ticket. */
  sendRoomWrapUp(lang: "th" | "en"): void {
    if (!this.session || !this.connected) return;
    const text = lang === "th"
      ? "[room_wrapup] เหลือเวลาอีกประมาณสองนาทีในห้องนี้ — ค่อยๆ พาผู้เรียนไปปิดท้าย: สรุปสั้นๆ อบอุ่น ทำ exit ticket แล้วบอกลาอย่างอบอุ่น ห้ามเริ่มหัวข้อใหม่"
      : "[room_wrapup] About two minutes left in this room — gently guide toward closing now: a short warm recap, do the exit ticket, then a warm goodbye. Do NOT start anything new.";
    this.session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  }

  /** Speaking Room: change delivery pace on the LIVE session in place — no reconnect.
   *  Live cannot change audio waveform speed, so this asks for slower DELIVERY:
   *  shorter chunks, clearer enunciation, small pauses between phrases. */
  sendPaceChange(lang: "th" | "en", slow: boolean): void {
    if (!this.session || !this.connected) return;
    const text = slow
      ? (lang === "th"
          ? "[pace_slow] ผู้เรียนกดช้า — พูดช้าลงและชัดขึ้น ประโยคสั้นๆ เว้นจังหวะเล็กน้อยระหว่างวลี ออกเสียงทีละพยางค์ชัดเจน ไปต่อจากตรงที่ค้างไว้ ห้ามทักทายใหม่ ห้ามเริ่มใหม่"
          : "[pace_slow] The learner tapped SLOW — speak more slowly and clearly from now on: shorter chunks, crisp enunciation, a small pause between phrases, syllables clear. Continue from where you are — do NOT greet or restart.")
      : (lang === "th"
          ? "[pace_normal] ผู้เรียนกดปกติ — กลับมาพูดด้วยจังหวะธรรมชาติ ไปต่อจากตรงที่ค้างไว้ ห้ามทักทายใหม่"
          : "[pace_normal] The learner tapped NORMAL — return to a natural pace. Continue from where you are — do NOT greet or restart.");
    this.session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  }

  /** Speaking Room: every objective earned + exit reached. ONE warm closing line —
   *  a specific compliment + goodbye. No new questions, no more teaching, no recap loop. */
  sendLessonComplete(lang: "th" | "en"): void {
    if (!this.session || !this.connected) return;
    const text = lang === "th"
      ? "[lesson_complete] ผู้เรียนทำครบทุกเป้าหมายแล้ว — พูดปิดท้ายอบอุ่นสั้นๆ หนึ่งครั้ง ชมสิ่งที่เขาทำได้จริงแล้วบอกลา ห้ามถามคำถามใหม่ ห้ามสอนเพิ่ม ห้ามชวนทำต่อ"
      : "[lesson_complete] The learner earned every objective — give ONE short warm closing: a specific compliment on what they did, then goodbye. Do NOT ask a new question, do NOT teach more, do NOT invite another round.";
    this.session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  }

  /** Speaking Room: the 10-min cap is reached. ONE short warm goodbye, then voice ends. */
  sendRoomTimeUp(lang: "th" | "en"): void {
    if (!this.session || !this.connected) return;
    const text = lang === "th"
      ? "[room_timeup] ครบเวลาของห้องนี้แล้ว — พูดปิดท้ายอบอุ่นสั้นๆ หนึ่งประโยค ชมเขาแล้วบอกลา ห้ามถามคำถามใหม่ ห้ามสอนเพิ่ม"
      : "[room_timeup] Time is up for this room — say ONE short warm closing line: a quick compliment and goodbye. Do NOT ask any new question, do NOT teach anything more.";
    this.session.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
  }

  /** Speaking Room: after a transport drop, resume the SAME session at the same stage. */
  sendSessionResume(lang: "th" | "en", stageId: string): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: buildSessionResumePrompt(lang, stageId) }],
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
