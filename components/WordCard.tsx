// components/WordCard.tsx
// Distinct visual moment — NOT a chat bubble.
// Appears at exchange 3, 6, and after user uses word correctly.
// Usage: <WordCard word={wordData} variant="intro" | "celebration" />

"use client";

import { useState } from "react";
import type { SessionVocabWord } from "@/lib/ai/vocabulary";

type WordCardVariant = "intro" | "celebration";

type WordCardProps = {
  word: SessionVocabWord;
  variant?: WordCardVariant;
};

const CEFR_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: "#E8F5E9", text: "#2E7D32" },
  A2: { bg: "#E3F2FD", text: "#1565C0" },
  B1: { bg: "#FFF3E0", text: "#E65100" },
  B2: { bg: "#FCE4EC", text: "#880E4F" },
  C1: { bg: "#EDE7F6", text: "#4527A0" },
  C2: { bg: "#F3E5F5", text: "#6A1B9A" },
};

export function WordCard({ word, variant = "intro" }: WordCardProps) {
  const [revealed, setRevealed] = useState(false);
  const cefrStyle = CEFR_COLORS[word.cefrLevel] ?? CEFR_COLORS["A2"]!;
  const isCelebration = variant === "celebration";

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: isCelebration ? "1.5px solid #C9A96E" : "1.5px solid #E8E5DF",
        borderRadius: "16px",
        padding: "16px 18px",
        margin: "8px 0",
        boxShadow: isCelebration
          ? "0 4px 20px rgba(201,169,110,0.18)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
        maxWidth: "340px",
        width: "100%",
        transition: "all 0.3s ease",
      }}
    >
      {/* CEFR badge — top right */}
      <span
        style={{
          position: "absolute",
          top: "12px",
          right: "14px",
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          padding: "2px 7px",
          borderRadius: "999px",
          background: cefrStyle.bg,
          color: cefrStyle.text,
        }}
      >
        {word.cefrLevel}
      </span>

      {/* Celebration glow strip */}
      {isCelebration && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #E8C77A, #C9A96E, #E8C77A)",
            borderRadius: "16px 16px 0 0",
          }}
        />
      )}

      {/* Main content row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Target-script glyph placeholder until real images land */}
        <div
          style={{
            width: "52px",
            height: "52px",
            flexShrink: 0,
            marginTop: "2px",
            background: "#FAFAF6",
            border: "1px solid #E8E5DF",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "22px",
              fontWeight: 600,
              color: "#9A8B73",
              lineHeight: 1,
            }}
          >
            {word.word.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* English word — large */}
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1A1A18",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {word.word}
          </div>

          {/* Thai translation */}
          <div
            style={{
              fontSize: "15px",
              color: "#6B7280",
              marginTop: "2px",
              fontWeight: 500,
            }}
          >
            {word.thai}
          </div>

          {/* Pronunciation hint */}
          {word.pronunciationHint && (
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                marginTop: "2px",
                fontStyle: "italic",
                letterSpacing: "0.01em",
              }}
            >
              {word.pronunciationHint}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "#F3F4F6",
          margin: "12px 0 10px",
        }}
      />

      {/* Example sentence — tap to reveal if intro, always shown if celebration */}
      {(isCelebration || revealed) ? (
        <div>
          <div
            style={{
              fontSize: "13px",
              color: "#374151",
              lineHeight: 1.6,
            }}
          >
            {word.exampleTh}
          </div>
          {word.exampleEn && (
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                marginTop: "3px",
                lineHeight: 1.5,
              }}
            >
              {word.exampleEn}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: "12px",
            color: "#9CA3AF",
            letterSpacing: "0.03em",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "10px" }}>▶</span>
          ดูตัวอย่างประโยค
        </button>
      )}

      {/* Cultural warning — only if present */}
      {word.culturalWarning && (
        <div
          style={{
            marginTop: "10px",
            padding: "7px 10px",
            background: "#FFF9C4",
            borderRadius: "8px",
            fontSize: "11px",
            color: "#856404",
            lineHeight: 1.5,
          }}
        >
          {word.culturalWarning}
        </div>
      )}
    </div>
  );
}

// ─── WORD CARD MESSAGE TYPE ───────────────────────────────────────────────────
// Add this to ThreadMessage union in create/page.tsx

export type WordCardMessage = {
  id: string;
  type: "word_card";
  variant: WordCardVariant;
  word: SessionVocabWord;
  timestamp: Date;
};
