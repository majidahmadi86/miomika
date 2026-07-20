"use client";

/* eslint-disable react-hooks/static-components */

import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, Lightbulb, AlertCircle, ChevronDown, ChevronUp, Mic, BookmarkCheck, Sparkles, CheckCircle2 } from "lucide-react";
import { getIconForCategory } from "@/lib/talk/imageCategoryMap";
import { cardMeaningForWord } from "@/lib/talk/teach-word-card";
import { playWordAudio } from "@/lib/talk/speech";
import { SayItCheck } from "@/components/word/SayItCheck";

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
  image_url?: string;
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
  /** Dashboard density: one-glance row card, no save pill (bank words are saved by definition). */
  compact?: boolean;
}

const FONT_LATIN = "'Quicksand', sans-serif";
const FONT_THAI = "'Sarabun', sans-serif";
const INK = "#1A1A18";
const MUTE = "#9A8B73";
const GOLD = "#34A98F";
const LINE = "#E8E5DF";
const CREAM = "#FAF6EC";

export function WordCardV3({
  word,
  direction,
  onPronunciationCheck,
  onReplayAudio,
  saveState,
  onSaveTap,
  compact,
}: WordCardV3Props) {
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [examplePlaying, setExamplePlaying] = useState(false);

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

  // Replay the example in the language being learned (matches the headword's audio).
  const exampleAudioText = isThaiLearner ? word.example_en : word.example_th;
  const handleExampleAudio = async () => {
    if (examplePlaying || !exampleAudioText) return;
    setExamplePlaying(true);
    await playWordAudio(undefined, exampleAudioText, audioLang);
    setExamplePlaying(false);
  };

  if (compact) {
    const compactMeaning = meaningWord && meaningWord.trim() !== primaryWord.trim() ? meaningWord : null;
    const exampleTranslation = (isThaiLearner ? word.example_th : word.example_en)?.trim() || null;
    const stripLabel = isThaiLearner ? "จำได้ไหมคะ แตะเพื่อดูคำตอบ" : "Do you remember? Tap to reveal";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: "100%", background: "#FFFFFF", border: "1px solid #DCEDE6", borderRadius: "16px", padding: "13px 15px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: word.image_url ? undefined : "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)" }}>
            {word.image_url ? (
              <div style={{ width: "100%", height: "100%", backgroundImage: `url(${word.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : (
              <span style={{ fontFamily: primaryFont, fontSize: glyphText.length > 1 ? "15px" : "18px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>{glyphText}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", minWidth: 0 }}>
              <span style={{ fontFamily: primaryFont, fontSize: "18px", fontWeight: 600, color: INK, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{primaryWord}</span>
              <motion.button
                type="button"
                onClick={handleAudio}
                whileTap={{ scale: 0.9 }}
                animate={audioPlaying ? { scale: [1, 1.12, 1] } : {}}
                transition={{ duration: 0.24 }}
                aria-label="Play audio"
                style={{ flexShrink: 0, width: "26px", height: "26px", borderRadius: "50%", background: "#E7F3EF", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Volume2 style={{ width: "14px", height: "14px", color: "#2C8E76" }} strokeWidth={1.9} />
              </motion.button>
            </div>
            {pronunciation && (
              <span style={{ display: "inline-block", marginTop: "3px", background: "#E7F3EF", color: "#1F7A68", borderRadius: "999px", padding: "2px 9px", fontFamily: FONT_LATIN, fontSize: "11px", fontWeight: 600, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pronunciation}</span>
            )}
          </div>
          {word.cefr_level && (
            <span style={{ flexShrink: 0, fontFamily: FONT_LATIN, fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "#B08A1E", background: "#FBF3DF", borderRadius: "6px", padding: "3px 7px" }}>{word.cefr_level}</span>
          )}
        </div>

        {!revealed ? (
          <motion.button
            type="button"
            onClick={() => setRevealed(true)}
            whileTap={{ scale: 0.98 }}
            style={{ width: "100%", marginTop: "11px", border: "1.5px dashed #E3D5B8", background: "#FCF8EE", borderRadius: "12px", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", cursor: "pointer", minHeight: "40px" }}
          >
            <Sparkles style={{ width: "15px", height: "15px", color: "#B08A1E", flexShrink: 0 }} strokeWidth={1.9} />
            <span style={{ fontFamily: uiFont, fontSize: "12.5px", fontWeight: 500, color: "#8A6D1F" }}>{stripLabel}</span>
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            {compactMeaning && (
              <div style={{ marginTop: "11px", display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                <CheckCircle2 style={{ width: "16px", height: "16px", color: "#2C8E76", flexShrink: 0 }} strokeWidth={1.9} />
                <span style={{ fontFamily: meaningFont, fontSize: "15px", fontWeight: 600, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{compactMeaning}</span>
              </div>
            )}
            {exampleAudioText && (
              <div style={{ marginTop: "8px", background: "#FCF8EE", borderRadius: "10px", padding: "8px 11px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <motion.button
                    type="button"
                    onClick={handleExampleAudio}
                    whileTap={{ scale: 0.9 }}
                    animate={examplePlaying ? { scale: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.24 }}
                    aria-label="Play example audio"
                    style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: "#F2E9D4", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Volume2 style={{ width: "12px", height: "12px", color: examplePlaying ? "#B08A1E" : "#C7B98F" }} strokeWidth={1.9} />
                  </motion.button>
                  <span style={{ fontFamily: isThaiLearner ? FONT_LATIN : FONT_THAI, fontSize: "12.5px", fontStyle: "italic", color: "#6B655B", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>&ldquo;{exampleAudioText}&rdquo;</span>
                </div>
                {exampleTranslation && (
                  <p style={{ fontFamily: isThaiLearner ? FONT_THAI : FONT_LATIN, fontSize: "11.5px", color: "#9A8B73", lineHeight: 1.4, margin: "4px 0 0 30px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exampleTranslation}</p>
                )}
              </div>
            )}
            {!compactMeaning && !exampleAudioText && (
              <p style={{ fontFamily: uiFont, fontSize: "12px", color: MUTE, margin: "11px 0 0" }}>{isThaiLearner ? "ยังไม่มีคำอธิบายเพิ่มเติมค่ะ" : "More details coming to this word soon."}</p>
            )}
            {onPronunciationCheck && !practicing && (
              <motion.button
                type="button"
                onClick={() => setPracticing(true)}
                whileTap={{ scale: 0.98 }}
                style={{ width: "100%", marginTop: "11px", height: "38px", borderRadius: "11px", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}
              >
                <Mic style={{ width: "15px", height: "15px", color: "#FFFFFF" }} strokeWidth={2} />
                <span style={{ fontFamily: uiFont, fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{isThaiLearner ? "ลองพูดดูค่า" : "Try saying this"}</span>
              </motion.button>
            )}
            {onPronunciationCheck && practicing && (
              <div style={{ marginTop: "11px" }}>
                <SayItCheck
                  text={isThaiLearner ? word.word_en : word.word_th}
                  lang={isThaiLearner ? "en" : "th"}
                  uiThai={isThaiLearner}
                  pron={isThaiLearner ? null : (word.th_romanization ?? null)}
                  wordEn={word.word_en}
                  autoStart
                  onMasteryAdvanced={() => onPronunciationCheck(word)}
                />
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  }

  const hasNote = !!(word.miomi_note_th || word.miomi_note_en);
  const hasExample = !!(word.example_en || word.example_th);
  const hasExtras = hasNote || hasExample || !!word.use_when || !!word.cultural_warning || !!word.example_context;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "relative",
        width: "100%",
        background: "#FFFFFF",
        border: `1px solid ${LINE}`,
        borderLeft: `3px solid ${GOLD}`,
        borderRadius: "14px",
        boxShadow: "0 3px 12px rgba(52,169,143,0.13)",
        overflow: "hidden",
        marginBottom: "8px",
      }}
    >
      <div style={{ padding: "11px 12px" }}>
        <motion.button
          type="button"
          onClick={handleAudio}
          whileTap={{ scale: 0.9 }}
          animate={audioPlaying ? { scale: [1, 1.12, 1] } : {}}
          transition={{ duration: 0.24 }}
          aria-label="Play audio"
          style={{
            position: "absolute", top: "9px", right: "10px",
            width: "28px", height: "28px", borderRadius: "50%",
            background: "rgba(52,169,143,0.10)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Volume2 style={{ width: "15px", height: "15px", color: audioPlaying ? GOLD : "#C4BDB5" }} strokeWidth={1.9} />
        </motion.button>

        <div style={{ display: "flex", gap: "11px", alignItems: "center" }}>
          <div style={{ width: "58px", height: "58px", flexShrink: 0, borderRadius: "12px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {word.image_url ? (
              <div style={{ width: "100%", height: "100%", backgroundImage: `url(${word.image_url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            ) : IconComponent ? (
              <div style={{ width: "100%", height: "100%", background: CREAM, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconComponent style={{ width: "28px", height: "28px", color: GOLD }} strokeWidth={1.6} />
              </div>
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: primaryFont, fontSize: glyphText.length > 1 ? "20px" : "26px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>{glyphText}</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingRight: "24px" }}>
            <p style={{ fontFamily: primaryFont, fontSize: "21px", fontWeight: 600, color: INK, lineHeight: 1.12, margin: 0 }}>{primaryWord}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "4px", flexWrap: "wrap" }}>
              {word.cefr_level && (
                <span style={{ fontFamily: FONT_LATIN, fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: GOLD }}>{word.cefr_level}</span>
              )}
              {pronunciation && (
                <span style={{ fontFamily: FONT_LATIN, fontSize: "11px", fontWeight: 600, color: GOLD, background: "rgba(52,169,143,0.10)", padding: "2px 9px", borderRadius: "14px" }}>{pronunciation}</span>
              )}
              {meaningWord && (
                <span style={{ fontFamily: meaningFont, fontSize: "13.5px", fontWeight: 500, color: INK }}>{meaningWord}</span>
              )}
            </div>
          </div>
        </div>

        {hasExtras && (
          <div style={{ marginTop: "9px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {hasExample && (
              <div style={{ background: CREAM, borderRadius: "10px", padding: "8px 11px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {word.example_en && (<p style={{ fontFamily: FONT_LATIN, fontSize: "12.5px", fontStyle: "italic", color: INK, lineHeight: 1.4, margin: 0 }}>&ldquo;{word.example_en}&rdquo;</p>)}
                  {word.example_th && (<p style={{ fontFamily: FONT_THAI, fontSize: "12px", color: MUTE, margin: "2px 0 0" }}>&ldquo;{word.example_th}&rdquo;</p>)}
                </div>
                {exampleAudioText && (
                  <motion.button
                    type="button"
                    onClick={handleExampleAudio}
                    whileTap={{ scale: 0.9 }}
                    animate={examplePlaying ? { scale: [1, 1.12, 1] } : {}}
                    transition={{ duration: 0.24 }}
                    aria-label="Play example audio"
                    style={{
                      flexShrink: 0, width: "24px", height: "24px", borderRadius: "50%",
                      background: "rgba(52,169,143,0.10)", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Volume2 style={{ width: "13px", height: "13px", color: examplePlaying ? GOLD : "#C4BDB5" }} strokeWidth={1.9} />
                  </motion.button>
                )}
              </div>
            )}
            {hasNote && (
              <div>
                {word.miomi_note_th && (<p style={{ fontFamily: FONT_THAI, fontSize: "12.5px", fontWeight: 500, color: INK, lineHeight: 1.45, margin: 0 }}>{word.miomi_note_th}</p>)}
                {word.miomi_note_en && (<p style={{ fontFamily: FONT_LATIN, fontSize: "11.5px", color: MUTE, margin: "2px 0 0" }}>{word.miomi_note_en}</p>)}
              </div>
            )}
            {word.use_when && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <Lightbulb style={{ width: "13px", height: "13px", color: GOLD, flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
                <p style={{ fontFamily: uiFont, fontSize: "11.5px", color: MUTE, margin: 0 }}>{word.use_when}</p>
              </div>
            )}
            {word.cultural_warning && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <AlertCircle style={{ width: "13px", height: "13px", color: "#FF8A80", flexShrink: 0, marginTop: "2px" }} strokeWidth={1.75} />
                <p style={{ fontFamily: uiFont, fontSize: "11.5px", color: INK, margin: 0 }}>{word.cultural_warning}</p>
              </div>
            )}
            {word.example_context && (
              <div>
                <button type="button" onClick={() => setExpanded((v) => !v)} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: uiFont, fontSize: "11.5px", fontWeight: 600, color: GOLD }}>
                  {expanded ? (
                    <>
                      <ChevronUp style={{ width: "13px", height: "13px" }} strokeWidth={2} />
                      {isThaiLearner ? "ซ่อน" : "Less"}
                    </>
                  ) : (
                    <>
                      <ChevronDown style={{ width: "13px", height: "13px" }} strokeWidth={2} />
                      {isThaiLearner ? "ตัวอย่างเพิ่ม" : "More"}
                    </>
                  )}
                </button>
                {expanded && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} style={{ fontFamily: uiFont, fontSize: "11.5px", color: MUTE, margin: "6px 0 0" }}>{word.example_context}</motion.p>
                )}
              </div>
            )}
          </div>
        )}

        {(saveState || onPronunciationCheck) && (
          <div style={{ marginTop: "9px", display: "flex", flexDirection: "column", gap: "7px" }}>
            {saveState &&
              (saveState === "saved" ? (
                <div style={{ width: "100%", height: "38px", borderRadius: "11px", background: "rgba(52,169,143,0.08)", border: "1px solid rgba(52,169,143,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                  <BookmarkCheck style={{ width: "15px", height: "15px", color: GOLD }} strokeWidth={2} />
                  <span style={{ fontFamily: uiFont, fontSize: "13px", fontWeight: 600, color: GOLD }}>{isThaiLearner ? "บันทึกแล้วค่า" : "Saved"}</span>
                </div>
              ) : (
                <motion.button type="button" onClick={onSaveTap} whileTap={{ scale: 0.98 }} style={{ width: "100%", height: "38px", borderRadius: "11px", background: "#FFFFFF", border: `1.5px solid ${GOLD}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                  <BookmarkCheck style={{ width: "15px", height: "15px", color: GOLD }} strokeWidth={2} />
                  <span style={{ fontFamily: uiFont, fontSize: "13px", fontWeight: 600, color: GOLD }}>{isThaiLearner ? "สมัครไว้ หนูจะเก็บคำให้นะคะ" : "Sign up — I'll keep your words"}</span>
                </motion.button>
              ))}
            {onPronunciationCheck && (
              <motion.button type="button" onClick={() => onPronunciationCheck(word)} whileTap={{ scale: 0.98 }} style={{ width: "100%", height: "38px", borderRadius: "11px", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                <Mic style={{ width: "15px", height: "15px", color: "#FFFFFF" }} strokeWidth={2} />
                <span style={{ fontFamily: uiFont, fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>{isThaiLearner ? "ลองพูดดูค่า" : "Try saying this"}</span>
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
