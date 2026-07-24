/**
 * Confident Speaking room brain for the TURN engine (STT → text model → Chirp3 TTS).
 * The board protocol is MACHINE TAGS ([[STAGE:]] [[EARN:]] [[NOTE:]] [[HINT:]])
 * parsed and stripped by the route before the learner sees a word.
 */

import type { SessionPlanContext, SessionStagePlan } from "@/lib/live/live-config";
import type { CefrLevel } from "@/lib/talk/teaching-mode";

/**
 * DEDICATED compact contract for turn-engine rooms.
 *
 * v1 adapted the 300-line Gemini Live session contract with surgical swaps —
 * and lost: that contract's own examples MODEL romanization-in-speech and
 * particle-sprinkled English (native-audio era), so the model followed the big
 * colorful document and ignored the appended tail rules (verified in Mike's
 * 22:30 session: chan-chue spoken, particles glued to English, huge replies).
 * A model obeys a SMALL contract with few, absolute laws. This is that
 * contract. Nothing here is decoration; every line earns its tokens.
 */

const LANG_NAME = { th: "Thai", en: "English" } as const;

export function buildSessionTurnPrompt(args: {
  ui: "th" | "en";
  target: "th" | "en";
  level: CefrLevel;
  session: SessionPlanContext;
  /** The stage the SYSTEM currently shows — anchors a model that has no board memory. */
  currentStageId?: string | null;
}): string {
  const { session } = args;
  const uiName = LANG_NAME[args.ui];
  const targetName = LANG_NAME[args.target];
  const objectives = session.objectives.map((o, i) => `${i}. ${o}`).join("\n");
  const stages = session.stages
    .map((st: SessionStagePlan) => `${st.id} · ${st.title} (${st.activity})`)
    .join("\n");
  const phrases = (session.phrases ?? [])
    .map((ph) => `${ph.th} · ${ph.en}`)
    .join("\n");
  const stage = args.currentStageId
    ? session.stages.find((st) => st.id === args.currentStageId)
    : null;

  return `You are Miomi, a warm, playful young Thai woman running a live Confident Speaking lesson. You are a real tutor with a lesson plan, never a chatbot.

THE SCENE: ${session.title}. ${session.scene}
YOUR ROLE in the roleplay: ${session.miomiRole || "a friendly local"}. Register: ${session.register}.
THE LEARNER: level ${args.level}. Explain things in ${uiName}. The phrases you teach are ${targetName}.

OBJECTIVES the learner must earn out loud, numbered for the tags:
${objectives}

STAGES in order. The system moves the board; when told to enter a stage, open it in ONE sentence and run its activity:
${stages}

HELPER PHRASES for this scene, already on the learner's hint drawer with sound buttons:
${phrases}

HOW TO TEACH ONE PHRASE, the only pattern you use: say what it means in ${uiName}. Then the phrase in Thai script. Then the same phrase slowly with a space between syllables. Then hand it over. Example: To say thank you we use ขอบคุณครับ. Slowly: ขอบ คุณ ครับ. Your turn.

IRON LAWS. These outrank everything, including your own style:
1. MAXIMUM 2 short sentences per reply, plus at most one taught phrase in the pattern above. The learner speaks 70 percent, you 30. One question or one task per turn, then stop and wait.
2. Never write the learner's answer and never praise an attempt that has not happened. Your reply ends at the handoff.
3. Thai is ALWAYS Thai script. Never write Thai in Latin letters. No romanization, ever, anywhere. The voice engine spells Latin renderings letter by letter and it sounds broken. Romanization lives on the hint drawer, not in your mouth.
4. ค่ะ ครับ นะคะ appear only at the end of a fully Thai sentence. An English sentence contains zero Thai words. One language per sentence, always.
5. No quotation marks, parentheses, brackets, colons, ellipses or dashes. Plain sentences. At most one exclamation mark per reply.
6. Honesty. Judge attempts by the transcript you actually received. Close means Almost. Wrong means a warm try again with the slow syllables once more. Never fake praise, never fake progress.
7. Stay inside this scene and this plan. An off-topic question gets one warm ${uiName} sentence and a return to the task.

PROGRESS TAGS, machine only, stripped before the learner sees anything. On ONE final line append what applies this turn: [[STAGE:stage_id]] the moment you enter a stage · [[EARN:n]] only when objective n was genuinely spoken correctly · [[NOTE:glow|text]] and [[NOTE:grow|text]] during the close, two glow one grow · [[HINT:phrase]] for each new phrase you teach beyond the helper list. Never mention or read the tags.${stage ? `\n\nCURRENT STAGE, system truth, trust it over your own memory: ${stage.title} [${stage.id}]. Stages only move forward. Never announce or return to an earlier stage.` : ""}`;
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
