"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Mic } from "lucide-react";
import { getIconForCategory } from "@/lib/talk/imageCategoryMap";
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

interface WordCardV3Props {
  word: VocabularyEntry;
  direction: "th_to_en" | "en_to_th";
  onPronunciationCheck?: (word: VocabularyEntry) => void;
}

export function WordCardV3({ word, direction, onPronunciationCheck }: WordCardV3Props) {
  const [expanded, setExpanded] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const isThaiLearner = direction === "th_to_en";
  const primaryWord = isThaiLearner ? word.word_en : word.word_th;
  const pronunciation = isThaiLearner ? word.en_ipa : word.th_romanization;
  const meaningWord = isThaiLearner ? word.word_th : word.word_en;
  const audioLang = isThaiLearner ? "en-US" : "th-TH";
  const audioKey = isThaiLearner ? word.audio_key_en : word.audio_key_th;

  const IconComponent = getIconForCategory(word.image_category);

  const handleAudio = async () => {
    if (audioPlaying) return;
    setAudioPlaying(true);
    await playWordAudio(audioKey, primaryWord, audioLang);
    setAudioPlaying(false);
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
      {/* Gold left bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "4px" }}
        transition={{ duration: 0.24, delay: 0.20 }}
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          background: "#C9A96E",
          borderRadius: "4px 0 0 4px",
        }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        style={{ padding: "20px 20px 20px 24px" }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {word.cefr_level && (
              <span style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "10px", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#C9A96E",
              }}>
                {word.cefr_level}
              </span>
            )}
            {word.register && (
              <span style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "10px", color: "#9A8B73",
              }}>
                · {word.register}
              </span>
            )}
          </div>
          <motion.button
            type="button"
            onClick={handleAudio}
            whileTap={{ scale: 0.9 }}
            animate={audioPlaying ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.24 }}
            style={{
              background: "none", border: "none",
              cursor: "pointer", padding: "4px",
              display: "flex", alignItems: "center",
            }}
          >
            <Volume2
              style={{ width: "20px", height: "20px", color: audioPlaying ? "#DB2777" : "#C4BDB5" }}
              strokeWidth={1.75}
            />
          </motion.button>
        </div>

        {/* Image + word row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "14px" }}>
          {/* Image area */}
          <div style={{
            width: "80px", height: "80px", flexShrink: 0,
            background: "#FAFAF6", border: "1px solid #E8E5DF",
            borderRadius: "12px", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            {IconComponent ? (
              <IconComponent style={{ width: "40px", height: "40px", color: "#9A8B73" }} strokeWidth={1.5} />
            ) : word.emoji ? (
              <span style={{ fontSize: "40px", lineHeight: 1 }}>{word.emoji}</span>
            ) : (
              <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "28px", color: "#C4BDB5" }}>
                {primaryWord.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Word + pronunciation */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <motion.p
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, delay: 0.48 }}
              style={{
                fontFamily: isThaiLearner ? "'Quicksand', sans-serif" : "'Sarabun', sans-serif",
                fontSize: "clamp(20px, 6vw, 28px)",
                fontWeight: 600,
                color: "#1A1A18",
                lineHeight: 1.1,
                margin: "0 0 4px",
              }}
            >
              {primaryWord}
            </motion.p>
            {pronunciation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.20, delay: 0.56 }}
                style={{
                  fontFamily: isThaiLearner ? "monospace" : "'Sarabun', sans-serif",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "#9A8B73",
                  margin: 0,
                }}
              >
                {pronunciation}
              </motion.p>
            )}
          </div>
        </div>

        {/* Meaning */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.20, delay: 0.56 }}
          style={{
            fontFamily: isThaiLearner ? "'Sarabun', sans-serif" : "'Quicksand', sans-serif",
            fontSize: "16px", fontWeight: 500,
            color: "#1A1A18", margin: "0 0 14px",
          }}
        >
          {meaningWord}
        </motion.p>

        {/* Divider */}
        <div style={{ height: "1px", background: "#E8E5DF", margin: "0 0 14px" }} />

        {/* Miomi note */}
        {(word.miomi_note_th || word.miomi_note_en) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.20, delay: 0.64 }}
            style={{ marginBottom: "14px" }}
          >
            {word.miomi_note_th && (
              <p style={{ fontFamily: "'Sarabun', sans-serif", fontSize: "14px", fontWeight: 500, color: "#1A1A18", lineHeight: 1.5, margin: "0 0 4px" }}>
                {word.miomi_note_th}
              </p>
            )}
            {word.miomi_note_en && (
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12px", fontStyle: "italic", color: "#9A8B73", margin: 0 }}>
                {word.miomi_note_en}
              </p>
            )}
          </motion.div>
        )}

        {/* Divider */}
        <div style={{ height: "1px", background: "#E8E5DF", margin: "0 0 14px" }} />

        {/* Examples */}
        {(word.example_en || word.example_th) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.20, delay: 0.72 }}
            style={{ marginBottom: "14px" }}
          >
            {word.example_en && (
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "13px", fontStyle: "italic", color: "#1A1A18", margin: "0 0 4px" }}>
                "{word.example_en}"
              </p>
            )}
            {word.example_th && (
              <p style={{ fontFamily: "'Sarabun', sans-serif", fontSize: "13px", fontStyle: "italic", color: "#9A8B73", margin: 0 }}>
                "{word.example_th}"
              </p>
            )}
          </motion.div>
        )}

        {/* Use when */}
        {word.use_when && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.20, delay: 0.72 }}
            style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "10px" }}
          >
            <Lightbulb style={{ width: "14px", height: "14px", color: "#C9A96E", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "12px", fontStyle: "italic", color: "#9A8B73", margin: 0 }}>
              {word.use_when}
            </p>
          </motion.div>
        )}

        {/* Cultural warning */}
        {word.cultural_warning && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: "10px" }}>
            <AlertCircle style={{ width: "14px", height: "14px", color: "#FF8A80", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "12px", color: "#1A1A18", margin: 0 }}>
              {word.cultural_warning}
            </p>
          </div>
        )}

        {/* Expand toggle */}
        {word.example_context && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: "none", border: "none", cursor: "pointer",
              padding: "0 0 10px",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "12px", fontWeight: 500, color: "#DB2777",
            }}
          >
            {expanded
              ? <><ChevronUp style={{ width: "14px", height: "14px" }} />▼ ซ่อน</>
              : <><ChevronDown style={{ width: "14px", height: "14px" }} />▶ ตัวอย่างเพิ่ม</>
            }
          </button>
        )}

        {expanded && word.example_context && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.24 }}
            style={{ marginBottom: "10px" }}
          >
            <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "12px", color: "#9A8B73", margin: 0 }}>
              {word.example_context}
            </p>
          </motion.div>
        )}

        {/* Pronunciation check button */}
        {onPronunciationCheck && (
          <motion.button
            type="button"
            onClick={() => onPronunciationCheck(word)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.20, delay: 0.80 }}
            style={{
              width: "100%", height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: "8px",
            }}
          >
            <Mic style={{ width: "16px", height: "16px", color: "#FFFFFF" }} strokeWidth={2} />
            <span style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#FFFFFF" }}>
              {isThaiLearner ? "ลองพูดดูค่า~" : "Try saying this~"}
            </span>
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
