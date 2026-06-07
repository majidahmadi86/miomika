import { logEvent } from "@/lib/debug/event-bus";
import {
  newGeminiTranscriptItem,
  routeGeminiTranscriptChunk,
} from "@/lib/live/transcript-routing";
import { TRANSCRIPT_GEMINI_ORDER } from "@/lib/live/transcript-order";

export type SessionMiniCatItem = {
  id: string;
  kind: "mini_cat";
  textTh: string;
  textEn: string;
  turnSeq: number;
  roleOrder: number;
};

/** Empty shell — spoken greeting fills this bubble; no silent pre-text. */
export function makeSessionOpenerShell(
  id = crypto.randomUUID(),
  turnSeq = 0,
): SessionMiniCatItem {
  return {
    id,
    kind: "mini_cat",
    textTh: "",
    textEn: "",
    turnSeq,
    roleOrder: TRANSCRIPT_GEMINI_ORDER,
  };
}

/** Kickoff binds model output to the lone opener bubble (never a second greeting). */
export function bindKickoffToOpener(
  items: SessionMiniCatItem[],
): { items: SessionMiniCatItem[]; geminiItemId: string | null } {
  if (items.length === 1 && items[0]?.kind === "mini_cat") {
    const opener = items[0];
    return {
      items: [{ ...opener, textTh: "", textEn: "" }],
      geminiItemId: opener.id,
    };
  }
  return { items, geminiItemId: null };
}

function isEmptyMiniCat(item: SessionMiniCatItem): boolean {
  return !item.textTh.trim() && !item.textEn.trim();
}

/** Append one model chunk — reuses opener when kickoff ref not yet set. */
export function appendGeminiTranscriptChunk(
  items: SessionMiniCatItem[],
  currentGeminiItemId: string | null,
  chunk: string,
  turnSeq: number,
): { items: SessionMiniCatItem[]; currentGeminiItemId: string } {
  if (!chunk) {
    return {
      items,
      currentGeminiItemId: currentGeminiItemId ?? items.find((i) => i.kind === "mini_cat")?.id ?? "",
    };
  }

  logEvent({
    kind: "engine",
    level: "info",
    message: "appendGeminiTranscriptChunk raw delta",
    data: { chunk },
  });

  if (currentGeminiItemId) {
    return {
      items: items.map((item) => {
        if (item.id !== currentGeminiItemId || item.kind !== "mini_cat") return item;
        return { ...item, ...routeGeminiTranscriptChunk(item, chunk) };
      }),
      currentGeminiItemId,
    };
  }

  const loneOpener =
    items.length === 1 && items[0]?.kind === "mini_cat" && isEmptyMiniCat(items[0])
      ? items[0]
      : null;
  if (loneOpener) {
    const routed = newGeminiTranscriptItem(chunk);
    return {
      items: [{ ...loneOpener, ...routed }],
      currentGeminiItemId: loneOpener.id,
    };
  }

  const id = crypto.randomUUID();
  const routed = newGeminiTranscriptItem(chunk);
  return {
    items: [
      ...items,
      {
        id,
        kind: "mini_cat",
        textTh: routed.textTh,
        textEn: routed.textEn,
        turnSeq,
        roleOrder: TRANSCRIPT_GEMINI_ORDER,
      },
    ],
    currentGeminiItemId: id,
  };
}

/** Session-start greeting bubbles — must be exactly one at turnSeq 0. */
export function countSessionGreetingBubbles(items: SessionMiniCatItem[]): number {
  return items.filter((item) => item.kind === "mini_cat" && item.turnSeq === 0).length;
}
