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

const TEXT_ENGINE_RULES = `
TEXT ENGINE RULES (this room runs on written replies read aloud in her real voice):
- Everything you write is spoken by TTS exactly as written: plain text only — no emoji, no stage directions, no markdown, nothing in brackets except the machine tags on the final line.
- SPOKEN THAI IS ALWAYS THAI SCRIPT — never write Thai words in Latin letters inside a sentence. Romanization appears ONLY as a separate slow sound-out in plain lowercase syllables with spaces (no IPA, no tone marks).
- One language per sentence. Punctuation is emotion: at most ONE exclamation mark per reply, and none inside taught Thai.
- Keep every reply SHORT — one to three sentences of your own plus the teaching itself. The learner must speak far more than you; end on ONE clear prompt and wait.`;

/** The session contract, adapted for the text engine. */
export function buildSessionTurnPrompt(args: {
  ui: "th" | "en";
  target: "th" | "en";
  level: CefrLevel;
  session: SessionPlanContext;
}): string {
  const base = buildSessionSystemInstruction(args.ui, args.target, args.level, args.session, null);
  // Swap the Live-only "silent tool" paragraph for the tag protocol. If the
  // source line ever gets reworded, the fallback still appends the protocol —
  // the room NEVER runs without a way to move the board.
  const swapped = base.replace(/- BOOKKEEPING IS SILENT:[^\n]*\n?/, `${TAG_PROTOCOL_LINE}\n`);
  const withProtocol = swapped.includes("PROGRESS TAGS") ? swapped : `${base}\n${TAG_PROTOCOL_LINE}`;
  return `${withProtocol}\n${TEXT_ENGINE_RULES}`;
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
