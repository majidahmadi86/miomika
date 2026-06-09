"use client";

/* eslint-disable react-hooks/static-components */

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Mic, BookmarkCheck } from "lucide-react";
import { getIconForCategory } from "@/lib/talk/imageCategoryMap";
import { cardMeaningForWord } from "@/lib/talk/teach-word-card";
import { playWordAudio } from "@/lib/talk/speech";

export interface VocabularyEntry {
  id: string;
  word_en: string;
  word_th: string;
  th_romanization?: string;
  en_ipa?: string;
  miomi_note_th?: string;
  miomi_note_en?: string;
  example_en?: string;
  example_th?: string;
  example_context?: string;
  cultural_warning?: string;
  use_when?: string;
  emoji?: string;
  image_category?: string;
  audio_key_th?: string;
  audio_key_en?: string;
  cefr_level?: string;
  register?: string;
}

export type WordCardSaveState = "saved" | "guest_prompt";

interface WordCardV3Props {
  word: VocabularyEntry;
  direction: "th_to_en" | "en_to_th";
  onPronunciationCheck?: (word: VocabularyEntry) => void;
  onReplayAudio?: () => void | Promise<void>;
  saveState?: WordCardSaveState;
  onSaveTap?: () => void;
}

const FONT_LATIN = "'Quicksand', sans-serif";
const FONT_THAI = "'Sarabun', sans-serif";
const INK = "#1A1A18";
const MUTE = "#9A8B73";
const GOLD = "#C9A96E";
const LINE = "#E8E5DF";

export function WordCardV3({
  word,
  direction,
  onPronunciationCheck,
  onReplayAudio,
  saveState,
  onSaveTap,
}: WordCardV3Props) {
  const [expanded, setExpanded] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const isThaiLearner = direction === "th_to_en";
  const primaryWord = isThaiLearner ? word.word_en : word.word_th;
  const pronunciation = isThaiLearner ? word.en_ipa : word.th_romanization;
  const meaningWord = cardMeaningForWord(word, direction);
  const audioLang = isThaiLearner ? "en-US" : "th-TH";
  const audioKey = isThaiLearner ? word.audio_key_en : word.audio_key_th;

  const primaryFont = isThaiLearner ? FONT_LATIN : FONT_THAI;
  const meaningFont = isThaiLearner ? FONT_THAI : FONT_LATIN;
  const uiFont = isThaiLearner ? FONT_THAI : FONT_LATIN;

  const IconComponent = getIconForCategory(word.image_category);
  const glyphText =
    /[\u0E00-\u0E7F]/.test(primaryWord) && primaryWord.length <= 4
      ? primaryWord
      : primaryWord.charAt(0).toUpperCase();

  const handleAudio = async () => {
    if (audioPlaying) return;
    setAudioPlaying(true);
    if (onReplayAudio) {
      await onReplayAudio();
    } else {
      await playWordAudio(audioKey, primaryWord, audioLang);
    }
    setAudioPlaying(false);
  };

  const hasNote = !!(word.miomi_note_th || word.miomi_note_en);
  const hasExample = !!(word.example_en || word.example_th);
  const hasExtras = hasNote || hasExample || !!word.use_when || !!word.cultural_warning || !!word.example_context;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: `1px solid ${LINE}`,
        borderLeft: `3px solid ${GOLD}`,
        borderRadius: "14px",
        boxShadow: "0 1px 6px rgba(26,26,24,0.05)",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", minHeight: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {word.cefr_level && (
              <span style={{ fontFamily: FONT_LATIN, fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: GOLD }}>
                {word.cefr_level}
              </span>
            )}
            {word.register && (
              <span style={{ fontFamily: FONT_LATIN, fontSize: "10px", color: MUTE }}>· {word.register}</span>
            )}
          </div>
          <motion.button
            type="button"
            onClick={handleAudio}
            whileTap={{ scale: 0.9 }}
            animate={audioPlaying ? { scale: [1, 1.12, 1] } : {}}
            transition={{ duration: 0.24 }}
            aria-label="Play audio"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
          >
            <Volume2 style={{ width: "18px", height: "18px", color: audioPlaying ? GOLD : "#C4BDB5" }} strokeWidth={1.75} />
          </motion.button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "52px", height: "52px", flexShrink: 0, background: "#FAFAF6", border: `1px solid ${LINE}`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {IconComponent ? (
              <IconComponent style={{ width: "26px", height: "26px", color: MUTE }} strokeWidth={1.5} />
            ) : (
              <span style={{ fontFamily: primaryFont, fontSize: glyphText.length > 1 ? "20px" : "26px", fontWeight: 600, color: MUTE, lineHeight: 1 }}>
                {glyphText}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: primaryFont, fontSize: "22px", fontWeight: 600, color: INK, lineHeight: 1.15, margin: 0 }}>
              {primaryWord}
            </p>
            {pronunciation && (
              <p style={{ fontFamily: FONT_LATIN, fontSize: "12.5px", color: MUTE, margin: "1px 0 0" }}>
                {pronunciation}
              </p>
            )}
            {meaningWord && (
              <p style={{ fontFamily: meaningFont, fontSize: "14px", fontWeight: 500, color: INK, margin: "3px 0 0" }}>
                {meaningWord}
              </p>
            )}
          </div>
        </div>

        {hasExtras && (
          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${LINE}`, display: "flex", flexDirection: "column", gap: "8px" }}>
            {hasNote && (
              <div>
                {word.miomi_note_th && (
                  <p style={{ fontFamily: FONT_THAI, fontSize: "13px", fontWeight: 500, color: INK, lineHeight: 1.45, margin: 0 }}>{word.miomi_note_th}</p>
                )}
                {word.miomi_note_en && (
                  <p style={{ fontFamily: FONT_LATIN, fontSize: "12px", color: MUTE, margin: "2px 0 0" }}>{word.miomi_note_en}</p>
                )}
              </div>
            )}
            {hasExample && (
              <div>
                {word.example_en && (
                  <p style={{ fontFamily: FONT_LATIN, fontSize: "13px", fontStyle: "italic", color: INK, margin: 0 }}>&ldquo;{word.example_en}&rdquo;</p>
                )}
                {word.example_th && (
                  <p style={{ fontFamily: FONT_THAI, fontSize: "13px", color: MUTE, margin: "2px 0 0" }}>&ldquo;{word.example_th}&rdquo;</p>
                )}
              </div>
            )}
            {word.use_when && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <Lightbulb style={{ width: "13px", height: "13px", color: GOLD, flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
                <p style={{ fontFamily: uiFont, fontSize: "12px", color: MUTE, margin: 0 }}>{word.use_when}</p>
              </div>
            )}
            {word.cultural_warning && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <AlertCircle style={{ width: "13px", height: "13px", color: "#FF8A80", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
                <p style={{ fontFamily: uiFont, fontSize: "12px", color: INK, margin: 0 }}>{word.cultural_warning}</p>
              </div>
            )}
            {word.example_context && (
              <div>
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: uiFont, fontSize: "12px", fontWeight: 500, color: GOLD }}
                >
                  {expanded ? (
                    <>
                      <ChevronUp style={{ width: "14px", height: "14px" }} strokeWidth={2} />
                      {isThaiLearner ? "ซ่อน" : "Less"}
                    </>
                  ) : (
                    <>
                      <ChevronDown style={{ width: "14px", height: "14px" }} strokeWidth={2} />
                      {isThaiLearner ? "ตัวอย่างเพิ่ม" : "More"}
                    </>
                  )}
                </button>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{ fontFamily: uiFont, fontSize: "12px", color: MUTE, margin: "6px 0 0" }}
                  >
                    {word.example_context}
                  </motion.p>
                )}
              </div>
            )}
          </div>
        )}

        {(saveState || onPronunciationCheck) && (
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {saveState &&
              (saveState === "saved" ? (
                <div style={{ width: "100%", height: "42px", borderRadius: "11px", background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <BookmarkCheck style={{ width: "16px", height: "16px", color: GOLD }} strokeWidth={2} />
                  <span style={{ fontFamily: uiFont, fontSize: "14px", fontWeight: 500, color: GOLD }}>{isThaiLearner ? "บันทึกแล้วค่า~" : "Saved~"}</span>
                </div>
              ) : (
                <motion.button type="button" onClick={onSaveTap} whileTap={{ scale: 0.98 }} style={{ width: "100%", height: "42px", borderRadius: "11px", background: "#FFFFFF", border: `1.5px solid ${GOLD}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <BookmarkCheck style={{ width: "16px", height: "16px", color: GOLD }} strokeWidth={2} />
                  <span style={{ fontFamily: uiFont, fontSize: "14px", fontWeight: 500, color: GOLD }}>{isThaiLearner ? "สมัครเพื่อบันทึกคำศัพท์" : "Sign up to save your words"}</span>
                </motion.button>
              ))}
            {onPronunciationCheck && (
              <motion.button type="button" onClick={() => onPronunciationCheck(word)} whileTap={{ scale: 0.98 }} style={{ width: "100%", height: "42px", borderRadius: "11px", background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Mic style={{ width: "16px", height: "16px", color: "#FFFFFF" }} strokeWidth={2} />
                <span style={{ fontFamily: uiFont, fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>{isThaiLearner ? "ลองพูดดูค่า~" : "Try saying this~"}</span>
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
