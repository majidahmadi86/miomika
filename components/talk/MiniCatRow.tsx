"use client";

import Image from "next/image";
import { sanitizeModelTranscript } from "@/lib/live/transcript";

interface MiniCatRowProps {
  textTh: string;
  textEn: string;
  uiLang: "th" | "en";
  state?: "idle" | "speaking";
}

export function MiniCatRow({ textTh, textEn, uiLang, state = "idle" }: MiniCatRowProps) {
  const displayTh = sanitizeModelTranscript(textTh);
  const displayEn = sanitizeModelTranscript(textEn);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          animation: "catBreath 3.4s ease-in-out infinite",
        }}
      >
        <Image src="/characters/miomi/head/idle.png" alt="Miomi" width={42} height={42} style={{ borderRadius: "50%" }} />
        {state === "speaking" && (
          <span
            style={{
              position: "absolute",
              inset: "-3px",
              borderRadius: "50%",
              border: "1.5px solid rgba(241,156,196,0.5)",
              animation: "ringBreathe 2.4s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <div
        style={{
          flex: 1,
          background: "#FFFFFF",
          border: "0.5px solid #EDE8E0",
          borderRadius: "4px 18px 18px 18px",
          padding: "10px 13px",
          boxShadow: "0 1px 2px rgba(26,26,24,0.03)",
        }}
      >
        <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13.5px", color: "#1A1A18", lineHeight: 1.5, margin: 0 }}>
          {[displayEn, displayTh].filter(Boolean).join(" ") || (uiLang === "en" ? displayEn : displayTh)}
        </p>
      </div>
      <style>{`
        @keyframes catBreath { 0%,100% { transform:scale(1); } 50% { transform:scale(1.02); } }
        @keyframes ringBreathe { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.05); opacity:0.8; } }
      `}</style>
    </div>
  );
}
