"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type GuestPracticePickProps = {
  suggested: "th" | "en";
  onPick: (target: "th" | "en") => void;
};

export function GuestPracticePick({ suggested, onPick }: GuestPracticePickProps) {
  const promptEn = "What would you like to practice with me?";
  const promptTh = "อยากฝึกภาษาอะไรกับหนูคะ?";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(254, 252, 247, 0.92)",
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
        style={{
          width: "100%",
          maxWidth: "340px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <Image
            src="/characters/miomi/head/happy.png"
            alt=""
            width={96}
            height={96}
            priority
          />
        </div>
        <p
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "20px",
            fontWeight: 600,
            color: "#1A1A18",
            margin: "0 0 6px",
            lineHeight: 1.35,
          }}
        >
          {promptEn}
        </p>
        <p
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "14px",
            fontWeight: 400,
            color: "#9A8B73",
            margin: "0 0 24px",
            lineHeight: 1.4,
          }}
        >
          {promptTh}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <PracticeButton
            label="Thai · ภาษาไทย"
            highlighted={suggested === "th"}
            onClick={() => onPick("th")}
          />
          <PracticeButton
            label="English · ภาษาอังกฤษ"
            highlighted={suggested === "en"}
            onClick={() => onPick("en")}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function PracticeButton({
  label,
  highlighted,
  onClick,
}: {
  label: string;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: "52px",
        borderRadius: "999px",
        border: highlighted ? "none" : "1.5px solid #EDE8E0",
        background: highlighted
          ? "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)"
          : "#FFFFFF",
        color: highlighted ? "#FFFFFF" : "#3D352B",
        fontFamily: "'Kanit', sans-serif",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        boxShadow: highlighted
          ? "0 6px 20px -4px rgba(52,169,143,0.45)"
          : "0 2px 10px rgba(26,26,24,0.04)",
      }}
    >
      {label}
    </button>
  );
}
