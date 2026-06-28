// COMPREHENSION ROUTER — the "understand the context, THEN route" brain.
//
// One cheap, fast classification call that reads the recent conversation + the
// user's latest message and returns a routing decision. It replaces the old
// regex intent-guessing for the two decisions that actually matter per turn:
//
//   1. real   — is this a genuine message, or STT noise / a stray fragment /
//               just a name with no request? If not real, the caller should
//               gently re-prompt and NOT teach. (This is the input guard.)
//   2. route  — can a canned library line genuinely serve this turn, or does it
//               need the full model? BIASED HARD TOWARD "model": library only
//               for trivially formulaic turns (bare greeting / acknowledgement).
//               When in doubt → model. Intelligence is the default; canned is
//               the exception we must justify.
//   3. teach  — is this a moment to introduce a word/phrase (the user is
//               practicing, asking what something means, or clearly wants to
//               learn), or just to talk? Teaching is OFF by default and only
//               turns on for a genuine signal — no more card-every-turn.
//
// The point: the decision between cheap-and-canned vs. real-and-thinking is
// finally made by something that reads meaning, not keywords.

import { getAIResponse } from "@/lib/ai/router";
import { log, logError } from "@/lib/debug/log";

type Msg = { role: "user" | "assistant"; content: string };

export interface RouteDecision {
  real: boolean; // genuine message vs noise/fragment/just-a-name
  route: "model" | "library"; // who answers — biased to model
  teach: boolean; // introduce a word/phrase this turn?
  reason: string; // short tag for logs/debugging
}

// Safe default if the classifier is unavailable or returns garbage: treat the
// turn as real, send it to the MODEL, and do NOT teach. Failing toward the
// model is the whole point — we never silently fall back to canned/teaching.
const FALLBACK: RouteDecision = { real: true, route: "model", teach: false, reason: "fallback" };

const ROUTER_SYSTEM = `You are the routing brain for Miomi, a warm bilingual Thai-English language companion in a voice/text chat. You do NOT reply to the user. You read the latest user message in context and output ONE compact JSON object deciding how the turn should be handled.

Decide three things:
1. "real": true if the message is a genuine attempt to communicate. false if it is clearly speech-to-text noise, an environment sound transcribed into a fragment, an empty/meaningless utterance, or just the user's own name / a single stray syllable with no request or content. When false, Miomi should gently say she didn't catch it rather than inventing a response.
2. "route": "library" ONLY if the turn is trivially formulaic and a fixed canned line would be just as good as a thoughtful one — a bare greeting ("hi", "สวัสดี"), a simple acknowledgement ("ok", "thanks", "ได้เลย"), or pure small-talk pleasantry with no real content or question. Otherwise "model". If there is ANY real content, question, request, feeling, story, or thing to understand → "model". When unsure → "model".
3. "teach": true ONLY when the user EXPLICITLY asks to learn or practice right now — e.g. "teach me…", "how do I say…", "what does X mean", "give me a word/phrase for…", "let's practice", or they say a target-language word/phrase clearly trying it out. Default to FALSE. If they are just chatting, telling a story, mentioning what they did, answering your question, or making small talk, teach is FALSE — even when they mention a topic you COULD teach about ("we had chocolate" is NOT a request to learn the word for chocolate; "I met my friends" is NOT a request for friendship vocabulary). Do not look for excuses to teach. When unsure → FALSE.

Output ONLY the JSON, nothing else. Example: {"real": true, "route": "model", "teach": false}`;

/**
 * Classify the current turn. Cheap and fast; biased toward the model and away
 * from teaching. Never throws — returns FALLBACK on any error.
 */
export async function routeTurn(messages: Msg[], userInput: string): Promise<RouteDecision> {
  // Cheap pre-checks first — don't spend a call on the obvious cases.
  const trimmed = userInput.trim();
  if (trimmed.length === 0) {
    return { real: false, route: "model", teach: false, reason: "empty" };
  }

  // Build a tiny context: the last few turns + the message to classify. Keep it
  // small — this call must stay cheap.
  const recent = messages.slice(-4);
  const transcript = recent
    .map((m) => `${m.role === "user" ? "User" : "Miomi"}: ${m.content}`)
    .join("\n");
  const prompt = `Recent conversation:\n${transcript || "(none)"}\n\nClassify the latest User message. Output only JSON.`;

  try {
    const { content } = await getAIResponse([{ role: "user", content: prompt }], ROUTER_SYSTEM);
    const decision = parseDecision(content);
    log("comprehension-router", "decision", {
      input: trimmed.slice(0, 60),
      real: decision.real,
      route: decision.route,
      teach: decision.teach,
    });
    return decision;
  } catch (err) {
    logError("comprehension-router", "classify failed — defaulting to model", err);
    return FALLBACK;
  }
}

/** Parse the model's JSON, tolerating code fences / stray prose. Bias to model on doubt. */
function parseDecision(raw: string): RouteDecision {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return FALLBACK;

  try {
    const obj = JSON.parse(cleaned.slice(start, end + 1)) as Partial<Record<string, unknown>>;
    const real = obj.real !== false; // default true unless explicitly false
    const route = obj.route === "library" ? "library" : "model"; // default model
    const teach = obj.teach === true; // default false unless explicitly true
    return { real, route, teach, reason: "classified" };
  } catch {
    return FALLBACK;
  }
}
