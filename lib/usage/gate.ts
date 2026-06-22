// lib/usage/gate.ts
// The cost GATE — the single place every paid provider call (LLM / TTS / STT) is
// checked BEFORE it spends. It reads the running request cost and the user's
// daily cost (both tracked by the usage ledger) and refuses to cross the per-turn
// cap (COST_CAPS_USD) or the per-day cap (DAILY_COST_CAPS_USD) for the user's tier.
//
// EXTENSIBILITY: a new feature or add-on becomes cost-governed by doing ONE thing —
// calling assertBudget("its.name", est) (or metered) before its paid call, and
// optionally registering a default estimate in FEATURE_ESTIMATES below. There is no
// way to reach a paid provider that bypasses this, because the call functions
// (chat reply, card/lesson gen, phonetics, and future TTS/STT) all gate here.
import { budgetState } from "./ledger";
import { COST_CAPS_USD, DAILY_COST_CAPS_USD, DAILY_EXCHANGE_CAPS } from "@/lib/ai/limits";

export type BudgetScope = "turn" | "daily" | "exchanges";

export class BudgetExceededError extends Error {
  readonly scope: BudgetScope;
  readonly feature: string;
  constructor(scope: BudgetScope, feature: string) {
    super(`budget exceeded (${scope}) for "${feature}"`);
    this.name = "BudgetExceededError";
    this.scope = scope;
    this.feature = feature;
  }
}

type Tier = keyof typeof COST_CAPS_USD;

// Per-call cost estimate (USD) for the BEFORE-spend check. Registering a feature
// here is the ONLY step needed to make a new add-on cost-governed (or pass an
// explicit estimate to assertBudget). Tune these as real costs are observed in
// the usage dashboard.
export const FEATURE_ESTIMATES: Record<string, number> = {
  reply: 0.0030,               // a chat reply (Llama-3.3-70B)
  card: 0.0008,                // a generated word card
  phonetics: 0.0004,           // romanization / IPA
  lesson: 0.0030,              // a lesson item
  memory: 0.0004,              // memory extraction
  "example.phonetics": 0.0004, // FUTURE add-on — phonetics for a card's example (model)
  "example.audio": 0.0020,     // FUTURE add-on — audio for a card's example (TTS)
};

const DEFAULT_ESTIMATE_USD = 0.003;

function resolveTier(t: string | null): Tier | null {
  if (t === "guest" || t === "free" || t === "pro" || t === "pro_max") return t;
  return null;
}

/**
 * Gate a paid call BEFORE it runs. Throws BudgetExceededError if this call would
 * cross the per-turn cap or the per-day cap for the user's tier. No-op outside a
 * tracked request, or when the route hasn't opted into enforcement (no tier set) —
 * so enforcement rolls out route by route without breaking the rest.
 */
export function assertBudget(feature: string, estimateUsd?: number): void {
  const state = budgetState();
  if (!state) return;                  // not inside a tracked request
  const tier = resolveTier(state.tier);
  if (!tier) return;                   // route hasn't opted in yet
  // The user-facing free limit: count chat exchanges per day. Only "reply" counts
  // as an exchange (cards/phonetics are parts of one). +1 = this exchange.
  if (feature === "reply") {
    const exCap = DAILY_EXCHANGE_CAPS[tier];
    if (exCap != null && state.dailyExchanges + 1 > exCap) {
      throw new BudgetExceededError("exchanges", feature);
    }
  }
  // Safety net beneath the exchange limit: hard cost ceilings (per-turn + per-day).
  const est = estimateUsd ?? FEATURE_ESTIMATES[feature] ?? DEFAULT_ESTIMATE_USD;
  if (state.runningUsd + est > COST_CAPS_USD[tier]) {
    throw new BudgetExceededError("turn", feature);
  }
  if (state.dailySpentUsd + state.runningUsd + est > DAILY_COST_CAPS_USD[tier]) {
    throw new BudgetExceededError("daily", feature);
  }
}

/** assertBudget + run, in one call — for wrapping a paid call cleanly. */
export async function metered<T>(feature: string, run: () => Promise<T>, estimateUsd?: number): Promise<T> {
  assertBudget(feature, estimateUsd);
  return run();
}

/** Size-based estimate for an LLM call: prompt chars → ~tokens → USD (Groq 70B rates). */
export function estimateLlmUsd(promptChars: number, maxOutTokens: number): number {
  const inTokens = promptChars / 4;
  return (inTokens / 1_000_000) * 0.59 + (maxOutTokens / 1_000_000) * 0.79;
}
