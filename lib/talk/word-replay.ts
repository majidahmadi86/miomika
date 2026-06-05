import type { VocabularyEntry } from "@/components/talk/WordCardV3";
import { speak, unlockTtsPlayback } from "@/lib/voice/tts";
import { replayTextForWord } from "@/lib/talk/teach-word-card";

/** Cached Chirp3-HD replay via /api/talk/speak — free, not a Live turn. */
export async function replayWordAudio(
  word: VocabularyEntry,
  targetLanguage: "th" | "en" | null,
): Promise<void> {
  unlockTtsPlayback();
  const { text, lang } = replayTextForWord(word, targetLanguage);
  if (!text.trim()) return;
  await speak(text, lang);
}
