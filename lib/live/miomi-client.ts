"use client";

import { GoogleGenAI } from "@google/genai";
import {
  LIVE_MODEL,
  LIVE_VOICE,
  buildKickoffPrompt,
  buildLiveConfig,
} from "@/lib/live/live-config";

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
  | { type: "user"; text: string }
  | { type: "gemini"; text: string }
  | { type: "turn_complete" }
  | { type: "tool_call"; name: string; args: Record<string, unknown>; result: unknown };

export type LiveClientCallbacks = {
  onOpen?: () => void;
  onMessage?: (msg: LiveClientMessage) => void;
  onClose?: (detail: { code: number | null; reason: string; wasClean: boolean | null }) => void;
  onError?: (detail: { error: string; code: number | null; reason: string }) => void;
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

export class MiomiLiveClient {
  private session: LiveSession | null = null;
  private connected = false;

  constructor(private callbacks: LiveClientCallbacks) {}

  async connect(voice: string = LIVE_VOICE): Promise<void> {
    const tokenRes = await fetch("/api/live-token");
    if (!tokenRes.ok) {
      const err = (await tokenRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error ?? `Token fetch failed (${tokenRes.status})`);
    }
    const { token } = (await tokenRes.json()) as { token?: string };
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

    this.session = (await ai.live.connect({
      model: LIVE_MODEL,
      config: buildLiveConfig(voice),
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
            error: msg,
            code: e?.code ?? null,
            reason: e?.reason ?? "",
          });
        },
        onclose: (e: { code?: number; reason?: string; wasClean?: boolean }) => {
          this.connected = false;
          const detail = {
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

    if (sc?.inputTranscription?.text) {
      this.callbacks.onMessage?.({ type: "user", text: sc.inputTranscription.text });
    }
    if (sc?.outputTranscription?.text) {
      this.callbacks.onMessage?.({ type: "gemini", text: sc.outputTranscription.text });
    }
    if (sc?.turnComplete) {
      this.callbacks.onMessage?.({ type: "turn_complete" });
    }

    const toolCall = message.toolCall;
    if (toolCall?.functionCalls?.length) {
      await this.handleToolCall(toolCall);
    }
  }

  private async handleToolCall(toolCall: {
    functionCalls?: { id?: string; name: string; args?: Record<string, unknown> }[];
  }): Promise<void> {
    const functionResponses: { id?: string; name: string; response: unknown }[] = [];

    for (const fc of toolCall.functionCalls ?? []) {
      let response: unknown = { ok: false, error: "unknown tool" };

      if (fc.name === "teach_word") {
        try {
          const word = (fc.args?.word ?? fc.args?.Word ?? "") as string;
          const resp = await fetch("/api/teach-word", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ word }),
          });
          if (!resp.ok) {
            const err = (await resp.json().catch(() => ({}))) as { error?: string };
            response = { ok: false, error: err.error ?? `teach-word failed (${resp.status})` };
          } else {
            response = await resp.json();
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
  sendKickoff(lang: "th" | "en"): void {
    if (!this.session || !this.connected) return;
    this.session.sendClientContent({
      turns: [{ role: "user", parts: [{ text: buildKickoffPrompt(lang) }] }],
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

  isConnected(): boolean {
    return this.connected;
  }
}
