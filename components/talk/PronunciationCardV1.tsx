"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Mic } from "lucide-react";
import { speak, type TtsLang } from "@/lib/voice/tts";

export interface PronunciationLessonPayload {
  word: string;
  word_th: string;
  syllables: string[];
  ipa: string | null;
  meaning_en: string;
  meaning_th: string;
  example_th: string | null;
  example_en: string | null;
}

interface PronunciationCardV1Props {
  lesson: PronunciationLessonPayload;
  uiLang: "th" | "en";
  heardText?: string | null;
  onTrySpeak?: () => void;
}

const SPEEDS: { label: string; rate: number }[] = [
  { label: "Slow", rate: 0.55 },
  { label: "Medium", rate: 0.75 },
  { label: "Normal", rate: 0.93 },
];

export function PronunciationCardV1({
  lesson,
  uiLang,
  heardText,
  onTrySpeak,
}: PronunciationCardV1Props) {
  const [activeSyllable, setActiveSyllable] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const speakWord = async (rate: number) => {
    if (playing) return;
    setPlaying(true);
    const text = lesson.word_th || lesson.word;
    const lang: TtsLang = /[\u0E00-\u0E7F]/.test(text) ? "th" : "en";
    await speak(text, lang, {
      onEnd: () => setPlaying(false),
      onError: () => setPlaying(false),
    }, { speakingRate: rate });
  };

  const playSyllableSequence = async () => {
    if (playing) return;
    setPlaying(true);
    const lang: TtsLang = /[\u0E00-\u0E7F]/.test(lesson.word_th) ? "th" : "en";
    for (let i = 0; i < lesson.syllables.length; i++) {
      setActiveSyllable(i);
      await new Promise<void>((resolve) => {
        void speak(lesson.syllables[i], lang, {
          onEnd: () => resolve(),
          onError: () => resolve(),
        }, { speakingRate: 0.75 });
      });
      await new Promise((r) => setTimeout(r, 200));
    }
    setActiveSyllable(null);
    setPlaying(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid #E8E5DF",
        borderRadius: "16px",
        boxShadow: "0 2px 8px rgba(26,26,24,0.05)",
        position: "relative",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "4px" }}
        transition={{ duration: 0.24, delay: 0.2 }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          background: "linear-gradient(180deg, #E8C77A 0%, #C9A96E 100%)",
          borderRadius: "4px 0 0 4px",
        }}
      />

      <div style={{ padding: "20px 20px 20px 24px" }}>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#C9A96E",
            margin: "0 0 10px",
          }}
        >
          {uiLang === "en" ? "Pronunciation" : "ฝึกออกเสียง"}
        </p>

        <p
          style={{
            fontFamily: "'Sarabun', sans-serif",
            fontSize: "clamp(28px, 8vw, 36px)",
            fontWeight: 600,
            color: "#1A1A18",
            lineHeight: 1.1,
            margin: "0 0 6px",
          }}
        >
          {lesson.word_th || lesson.word}
        </p>

        {lesson.ipa && (
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              fontStyle: "italic",
              color: "#9A8B73",
              margin: "0 0 12px",
            }}
          >
            {lesson.ipa}
          </p>
        )}

        <p
          style={{
            fontFamily: uiLang === "en" ? "'Quicksand', sans-serif" : "'Sarabun', sans-serif",
            fontSize: "14px",
            color: "#1A1A18",
            margin: "0 0 14px",
          }}
        >
          {uiLang === "en" ? lesson.meaning_en : lesson.meaning_th}
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "6px",
            marginBottom: "14px",
          }}
        >
          {lesson.syllables.map((syl, i) => (
            <motion.span
              key={`${syl}-${i}`}
              animate={
                activeSyllable === i
                  ? { scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ duration: 0.6, repeat: activeSyllable === i ? Infinity : 0 }}
              style={{
                fontFamily: "'Sarabun', sans-serif",
                fontSize: "18px",
                fontWeight: 500,
                color: activeSyllable === i ? "#C9A96E" : "#1A1A18",
                padding: "4px 8px",
                borderRadius: "8px",
                background: activeSyllable === i ? "rgba(232,199,122,0.2)" : "transparent",
              }}
            >
              {syl}
              {i < lesson.syllables.length - 1 && (
                <span style={{ color: "#C4BDB5", marginLeft: "4px" }}>·</span>
              )}
            </motion.span>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
          {SPEEDS.map(({ label, rate }) => (
            <button
              key={label}
              type="button"
              disabled={playing}
              onClick={() => void speakWord(rate)}
              style={{
                flex: 1,
                minWidth: "72px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid #E8E5DF",
                background: "#FAFAF6",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "#9A8B73",
                cursor: playing ? "default" : "pointer",
              }}
            >
              <Volume2
                style={{ width: "14px", height: "14px", display: "inline", verticalAlign: "middle", marginRight: "4px" }}
                strokeWidth={1.75}
              />
              {label}
            </button>
          ))}
          <button
            type="button"
            disabled={playing}
            onClick={() => void playSyllableSequence()}
            style={{
              flex: 1,
              minWidth: "100px",
              height: "36px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#FFFFFF",
              cursor: playing ? "default" : "pointer",
            }}
          >
            {uiLang === "en" ? "Syllables" : "ทีละพยางค์"}
          </button>
        </div>

        <motion.button
          type="button"
          onClick={onTrySpeak}
          whileTap={{ scale: 0.98 }}
          style={{
            width: "100%",
            height: "44px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(232,199,122,0.25) 0%, rgba(201,169,110,0.15) 100%)",
            border: "1px solid rgba(201,169,110,0.35)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: heardText ? "10px" : 0,
          }}
        >
          <Mic style={{ width: "16px", height: "16px", color: "#C9A96E" }} strokeWidth={2} />
          <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A1A18" }}>
            {uiLang === "en" ? "Try saying it~" : "ลองพูดให้หนูฟังนะคะ~"}
          </span>
        </motion.button>

        {heardText && (
          <p
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "13px",
              color: "#9A8B73",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {uiLang === "en" ? `I heard you say: ${heardText}` : `หนูได้ยินว่า: ${heardText}`}
          </p>
        )}
      </div>
    </motion.div>
  );
}
