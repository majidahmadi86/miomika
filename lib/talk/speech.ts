import { speak, unlockTtsPlayback } from "@/lib/voice/tts";

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeech() {
  if (typeof window === "undefined") return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function speakText(text: string, lang: "th-TH" | "en-US" = "th-TH"): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(); return; }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Find best voice
    const voices = window.speechSynthesis.getVoices();
    const langVoices = voices.filter(v => v.lang.startsWith(lang.split("-")[0] ?? ""));
    const femaleVoice = langVoices.find(v => /female|woman|girl/i.test(v.name));
    if (femaleVoice) utterance.voice = femaleVoice;
    else if (langVoices[0]) utterance.voice = langVoices[0];

    utterance.onend = () => { currentUtterance = null; resolve(); };
    utterance.onerror = () => { currentUtterance = null; resolve(); };
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function playWordAudio(
  audioKey: string | null | undefined,
  word: string,
  lang: "th-TH" | "en-US"
): Promise<void> {
  // Phase 3: one-voice policy — same cached Chirp3-HD server voice as every
  // other surface (lib/voice/tts speak + tts_cache). Browser speechSynthesis
  // is gone here: desktop browsers often ship NO Thai voice, which made Thai
  // examples silently voiceless, and when a voice existed it wasn't Leda.
  unlockTtsPlayback();
  return speak(word, lang === "th-TH" ? "th" : "en");
}
