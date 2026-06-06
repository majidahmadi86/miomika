/** Stable transcript ordering — user bubble above model reply for the same turn. */

export const TRANSCRIPT_USER_ORDER = 0;
export const TRANSCRIPT_GEMINI_ORDER = 1;
export const TRANSCRIPT_CARD_ORDER = 2;

export type TranscriptOrdered = {
  turnSeq: number;
  roleOrder: number;
  id: string;
};

export function transcriptSortKey(item: TranscriptOrdered): number {
  return item.turnSeq * 10 + item.roleOrder;
}

export function sortTranscriptItems<T extends TranscriptOrdered>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = transcriptSortKey(a) - transcriptSortKey(b);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}
