/**
 * Confident Speaking room brain for the TURN engine (STT → text model → Chirp3 TTS).
 *
 * The full session contract already exists in lib/live/live-config.ts
 * (buildSessionSystemInstruction) and is engine-agnostic EXCEPT for one thing:
 * on Gemini Live the progress board is driven by a silent function tool
 * (report_stage). A plain text model has no tools — so here that one paragraph
 * is swapped for a MACHINE TAG protocol ([[STAGE:]], [[EARN:]], [[NOTE:]],
 * [[HINT:]]) that the route parses out of the reply and strips before the
 * learner sees a word. Everything else — scene, stages, objectives, the
 * 10-minute TIME ARC, the talk ratio, the honesty laws — is reused verbatim,
 * so a room feels identical on either engine; only the bill changes.
 */

import { buildSessionSystemInstruction, type SessionPlanContext, type SessionStagePlan } from "@/lib/live/live-config";
import type { CefrLevel } from "@/lib/talk/teaching-mode";

const TAG_PROTOCOL_LINE =
  "- PROGRESS TAGS (machine-only, invisible): at the very END of your reply, on ONE separate final line, append every tag that applies to THIS turn: [[STAGE:stage_id]] the moment you enter a stage; [[EARN:objective_index]] ONLY when the learner genuinely earned that objective out loud (0-based number); [[NOTE:glow|text]] and [[NOTE:grow|text]] as you close the session (two glow, one grow, in your closing turns); [[HINT:phrase]] for every new phrase you teach beyond the helper list. The system strips these tags before the learner sees anything — NEVER mention them, never read them aloud, never explain them, never put them anywhere except that final line.";

const TTS_SOUND_OUT_LINE =
  "- SAY THE SOUNDS, UNASKED: for every Thai phrase, say it once naturally, then once again SLOWLY as Thai script with a space between each syllable (for example: ขอ โทษ ครับ) — Thai script is the ONLY thing your voice reads correctly. NEVER speak romanization: any Latin-letter rendering of Thai in your reply gets SPELLED OUT letter by letter by the voice engine and sounds broken. Romanization already appears on the learner's hint drawer and cards — point them there: tap the speaker on the phrase to hear it perfectly, as many times as they like. Do not pronounce a word two different ways; if you slip, correct once and move on.";

const TEXT_ENGINE_RULES = `
TEXT ENGINE RULES (this room runs on written replies read aloud in her real voice):
- Everything you write is spoken by TTS exactly as written: plain text only — no emoji, no stage directions, no markdown, nothing in brackets except the machine tags on the final line.
- SPOKEN THAI IS ALWAYS THAI SCRIPT — never write a Thai word in Latin letters anywhere in your reply, not in parentheses, not as a sound-out. The voice engine SPELLS Latin renderings of Thai letter by letter — it sounds broken and confuses the learner. Romanization lives on their hint drawer and cards, never in your speech.
- One language per sentence. Punctuation is emotion: at most ONE exclamation mark per reply, and none inside taught Thai.
- Keep every reply SHORT — one to three sentences of your own plus the teaching itself. The learner must speak far more than you; end on ONE clear prompt and wait.
- STOP AT THE HANDOFF: your reply ENDS the moment you hand the learner the floor. NEVER write their answer for them, NEVER react to an attempt that has not happened yet ("That was excellent" before they spoke is forbidden), never stack a second task after the first. One prompt, then silence — their turn.
- THAI PARTICLES: ค่ะ ครับ คะ นะคะ belong ONLY at the very end of a fully THAI sentence. NEVER attach one to an English sentence and never drop single Thai words into the middle of English — an English sentence starts and ends in English. Every stray language flip is a voice-engine switch that makes you sound broken and slow.
- FORBIDDEN CHARACTERS in your speech: quotation marks, parentheses, brackets, colons, semicolons, ellipses and dashes. Each one makes your voice stop and restart unnaturally. Introduce a phrase plainly as its own sentence. Say it like this. ขอโทษครับ. Never wrap it in quotes.`;

/** The session contract, adapted for the text engine. */
export function buildSessionTurnPrompt(args: {
  ui: "th" | "en";
  target: "th" | "en";
  level: CefrLevel;
  session: SessionPlanContext;
  /** The stage the SYSTEM currently shows — anchors a text model that has no memory of its own board. */
  currentStageId?: string | null;
}): string {
  const base = buildSessionSystemInstruction(args.ui, args.target, args.level, args.session, null);
  // Swap the Live-only "silent tool" paragraph for the tag protocol. If the
  // source line ever gets reworded, the fallback still appends the protocol —
  // the room NEVER runs without a way to move the board.
  let adapted = base.replace(/- BOOKKEEPING IS SILENT:[^\n]*\n?/, `${TAG_PROTOCOL_LINE}\n`);
  if (!adapted.includes("PROGRESS TAGS")) adapted = `${base}\n${TAG_PROTOCOL_LINE}`;
  // Swap the native-audio sound-out law (romanized syllables) for the TTS-safe
  // one (slow THAI-SCRIPT syllables) — Chirp3 spells Latin renderings of Thai
  // letter by letter, which is exactly the "she spells the phonetics" bug.
  const soundSwapped = adapted.replace(/- SAY THE SOUNDS, UNASKED:[^\n]*\n?/, `${TTS_SOUND_OUT_LINE}\n`);
  if (soundSwapped.includes("Thai script is the ONLY thing")) adapted = soundSwapped;
  else adapted = `${adapted}\n${TTS_SOUND_OUT_LINE}`;
  const stage = args.currentStageId
    ? args.session.stages.find((st) => st.id === args.currentStageId)
    : null;
  const stageAnchor = stage
    ? `\nCURRENT STAGE (system truth, trust it over your own memory): you are in "${stage.title}" [${stage.id}]. Stages only ever move FORWARD — never announce, restart, or return to an earlier stage (never "let's do our warm-up" after the warm-up is done).`
    : "";
  return `${adapted}\n${TEXT_ENGINE_RULES}${stageAnchor}`;
}

export type RoomTagEvent = {
  event: "stage" | "objective" | "note" | "hint";
  stage_id?: string;
  objective_index?: number;
  note_kind?: "glow" | "grow";
  note?: string;
};

/** Pull the machine tags out of a reply; return the clean spoken text + events. */
export function parseRoomTags(text: string): { clean: string; events: RoomTagEvent[] } {
  const events: RoomTagEvent[] = [];
  const clean = text
    .replace(/\[\[\s*(STAGE|EARN|NOTE|HINT)\s*:\s*([^\]]*?)\s*\]\]/gi, (_m, kind: string, payload: string) => {
      const k = kind.toUpperCase();
      if (k === "STAGE" && payload.trim()) {
        events.push({ event: "stage", stage_id: payload.trim().toLowerCase() });
      } else if (k === "EARN") {
        const n = parseInt(payload, 10);
        if (Number.isFinite(n)) events.push({ event: "objective", objective_index: n });
      } else if (k === "NOTE") {
        const bar = payload.indexOf("|");
        const kindPart = (bar >= 0 ? payload.slice(0, bar) : "glow").trim().toLowerCase();
        const note = (bar >= 0 ? payload.slice(bar + 1) : payload).trim();
        if (note) events.push({ event: "note", note_kind: kindPart === "grow" ? "grow" : "glow", note });
      } else if (k === "HINT" && payload.trim()) {
        events.push({ event: "hint", note: payload.trim() });
      }
      return "";
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, events };
}

/** Size-capped validation of the client-echoed plan (originally server-issued). */
export function sanitizeRoomPlan(raw: unknown): SessionPlanContext | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");
  const title = str(r.title, 120);
  const scene = str(r.scene, 600);
  const miomiRole = str(r.miomiRole, 200);
  const register = str(r.register, 30) || "everyday";
  const objectives = Array.isArray(r.objectives)
    ? r.objectives.filter((o): o is string => typeof o === "string").slice(0, 3).map((o) => o.slice(0, 200))
    : [];
  const stages: SessionStagePlan[] = Array.isArray(r.stages)
    ? r.stages
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .slice(0, 8)
        .map((s) => ({
          id: str(s.id, 40),
          title: str(s.title, 120),
          activity: str(s.activity, 120),
          guidance: str(s.guidance, 400),
        }))
        .filter((s) => s.id && s.title)
    : [];
  const phrases = Array.isArray(r.phrases)
    ? r.phrases
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .slice(0, 12)
        .map((p) => ({
          en: str(p.en, 200),
          th: str(p.th, 200),
          romanization: typeof p.romanization === "string" ? p.romanization.slice(0, 200) : null,
        }))
    : [];
  if (!title || !scene || !stages.length || !objectives.length) return null;
  return {
    title,
    scene,
    miomiRole,
    register,
    objectives,
    stages,
    phrases,
    paceSlow: r.paceSlow === true ? true : r.paceSlow === false ? false : undefined,
  };
}
