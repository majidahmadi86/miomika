// Per-call AI usage + cost ledger. One AsyncLocalStorage context per request
// tags every LLM/TTS/STT call with its function + user, accumulates records,
// flushes ONE batch insert at request end. Never throws into callers.
import { AsyncLocalStorage } from "node:async_hooks";
import { createServiceClient } from "@/lib/supabase/service";

export type UsageProvider = "groq" | "gemini" | "google_tts" | "groq_whisper";
export type UsageKind = "llm" | "tts" | "stt";

// PUBLIC LIST PRICES (USD), verified Jun 2026 — confirm against your billing.
// LLM = $/1M tokens (in/out). TTS = $/1M chars. STT = $/hour.
const PRICING: Record<string, { inPerM?: number; outPerM?: number; perMChars?: number; perHour?: number }> = {
  "groq:llama-3.3-70b-versatile": { inPerM: 0.59, outPerM: 0.79 },
  "gemini:gemini-2.5-flash": { inPerM: 0.30, outPerM: 2.50 },
  "groq_whisper:whisper-large-v3-turbo": { perHour: 0.04 },
  "google_tts:chirp3-hd": { perMChars: 16.0 }, // TODO confirm region price
};

function costFor(provider: UsageProvider, model: string, u: { promptTokens?: number; completionTokens?: number; chars?: number; audioSeconds?: number }): number {
  const p = PRICING[`${provider}:${model}`];
  if (!p) return 0;
  let c = 0;
  if (p.inPerM) c += ((u.promptTokens ?? 0) / 1_000_000) * p.inPerM;
  if (p.outPerM) c += ((u.completionTokens ?? 0) / 1_000_000) * p.outPerM;
  if (p.perMChars) c += ((u.chars ?? 0) / 1_000_000) * p.perMChars;
  if (p.perHour) c += ((u.audioSeconds ?? 0) / 3600) * p.perHour;
  return c;
}

type Row = { provider: UsageProvider; kind: UsageKind; model: string; prompt_tokens: number; completion_tokens: number; total_tokens: number; chars: number; audio_seconds: number; est_cost_usd: number; latency_ms: number | null; ok: boolean; meta: Record<string, unknown> | null };
type Ctx = { fn: string; userId: string | null; requestId: string; rows: Row[] };

const als = new AsyncLocalStorage<Ctx>();

export function recordUsage(rec: {
  provider: UsageProvider; kind?: UsageKind; model: string;
  promptTokens?: number; completionTokens?: number; chars?: number; audioSeconds?: number;
  latencyMs?: number; ok?: boolean; meta?: Record<string, unknown>;
}): void {
  const ctx = als.getStore();
  if (!ctx) return; // not inside a tracked request — no-op
  const prompt = rec.promptTokens ?? 0;
  const completion = rec.completionTokens ?? 0;
  ctx.rows.push({
    provider: rec.provider,
    kind: rec.kind ?? "llm",
    model: rec.model,
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: prompt + completion,
    chars: rec.chars ?? 0,
    audio_seconds: rec.audioSeconds ?? 0,
    est_cost_usd: costFor(rec.provider, rec.model, { promptTokens: prompt, completionTokens: completion, chars: rec.chars, audioSeconds: rec.audioSeconds }),
    latency_ms: rec.latencyMs ?? null,
    ok: rec.ok ?? true,
    meta: rec.meta ?? null,
  });
}

export async function withUsage<T>(fn: string, userId: string | null, run: () => Promise<T>): Promise<T> {
  const ctx: Ctx = { fn, userId, requestId: crypto.randomUUID(), rows: [] };
  try {
    return await als.run(ctx, run);
  } finally {
    await flush(ctx);
  }
}

async function flush(ctx: Ctx): Promise<void> {
  if (!ctx.rows.length) return;
  try {
    const supabase = await createServiceClient();
    await supabase.from("llm_usage").insert(
      ctx.rows.map((r) => ({
        user_id: ctx.userId, fn: ctx.fn, request_id: ctx.requestId,
        provider: r.provider, kind: r.kind, model: r.model,
        prompt_tokens: r.prompt_tokens, completion_tokens: r.completion_tokens, total_tokens: r.total_tokens,
        chars: r.chars, audio_seconds: r.audio_seconds, est_cost_usd: r.est_cost_usd,
        latency_ms: r.latency_ms, ok: r.ok, meta: r.meta,
      })),
    );
  } catch { /* best-effort — never affect the user request */ }
}
