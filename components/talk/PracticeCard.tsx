"use client";

import { useState } from "react";
import { Edit3, Volume2, Mic, Copy, ArrowRight, Check } from "lucide-react";
import type { VocabularyEntry } from "@/components/talk/WordCardV3";

interface PracticeCardProps {
  word: VocabularyEntry;
  position: number;
  total: number;
  topic?: string;
  uiLang: "th" | "en";
  onHear: () => void;
  onSpeak: () => void;
  onCopy: () => void;
  onNext: () => void;
  onEdit?: () => void;
}

export function PracticeCard({
  word,
  position,
  total,
  topic,
  uiLang,
  onHear,
  onSpeak,
  onCopy,
  onNext,
  onEdit,
}: PracticeCardProps) {
  const [userAttempt, setUserAttempt] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct">("none");

  const pronunciation = word.th_romanization ?? word.en_ipa ?? word.word_en;
  const meaning = uiLang === "en"
    ? (word.miomi_note_en ?? word.word_en)
    : (word.miomi_note_th ?? word.word_th);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #FFFCF7 0%, #FFF6E8 100%)",
        border: "0.5px solid rgba(110,205,184,0.4)",
        borderRadius: "18px",
        padding: "14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            color: "#34A98F",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {uiLang === "en"
            ? `Word ${position} of ${total}${topic ? ` · ${topic}` : ""}`
            : `คำที่ ${position} จาก ${total}${topic ? ` · ${topic}` : ""}`}
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            style={{ background: "transparent", border: "none", color: "#9A8B73", cursor: "pointer", padding: "2px" }}
          >
            <Edit3 size={13} strokeWidth={2} />
          </button>
        )}
      </div>

      <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "28px", color: "#1A1A18", margin: 0, lineHeight: 1.1 }}>
        {word.word_th}
      </p>
      {pronunciation && (
        <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12.5px", color: "#9A8B73", fontStyle: "italic", margin: "2px 0 6px" }}>
          {pronunciation}
        </p>
      )}
      <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12.5px", color: "#3D352B", lineHeight: 1.5, margin: "0 0 10px" }}>
        {meaning}
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.75)",
          border: "0.5px solid rgba(110,205,184,0.3)",
          borderRadius: "12px",
          padding: "10px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "10px",
            fontWeight: 600,
            color: "#9A8B73",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            display: "block",
            marginBottom: "5px",
          }}
        >
          {uiLang === "en" ? "Your turn" : "ลองดูค่า~"}
        </span>
        <input
          type="text"
          value={userAttempt}
          onChange={(e) => {
            const v = e.target.value;
            setUserAttempt(v);
            if (v.trim().toLowerCase() === pronunciation.toLowerCase()) {
              setFeedback("correct");
            } else {
              setFeedback("none");
            }
          }}
          placeholder={uiLang === "en" ? "Type or say it…" : "พิมพ์หรือพูดได้เลย…"}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "13px",
            color: "#1A1A18",
            width: "100%",
            padding: "2px 0",
          }}
        />
        {feedback === "correct" && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
            <Check size={14} color="#7DD3C0" strokeWidth={2.5} />
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", color: "#7DD3C0", fontWeight: 600 }}>
              {uiLang === "en" ? "Perfect ✦ +5" : "เก่งมาก ✦ +5"}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "5px" }}>
        <ActionButton Icon={Volume2} label={uiLang === "en" ? "Hear" : "ฟัง"} onClick={onHear} />
        <ActionButton Icon={Mic} label={uiLang === "en" ? "Say it" : "พูด"} onClick={onSpeak} />
        <ActionButton Icon={Copy} label={uiLang === "en" ? "Copy" : "คัดลอก"} onClick={onCopy} />
        <ActionButton Icon={ArrowRight} label={uiLang === "en" ? "Next" : "ต่อ"} onClick={onNext} primary />
      </div>
    </div>
  );
}

function ActionButton({
  Icon,
  label,
  onClick,
  primary = false,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: primary
          ? "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)"
          : "rgba(255,255,255,0.7)",
        border: primary ? "none" : "0.5px solid rgba(52,169,143,0.3)",
        borderRadius: "999px",
        padding: "7px 4px",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: "10.5px",
        color: primary ? "#FFFFFF" : "#34A98F",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
      }}
    >
      <Icon size={13} strokeWidth={2} />
      {label}
    </button>
  );
}
