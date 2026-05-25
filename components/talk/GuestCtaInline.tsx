"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface GuestCtaInlineProps {
  uiLang: "th" | "en";
  onDismiss: () => void;
}

export function GuestCtaInline({ uiLang, onDismiss }: GuestCtaInlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, #FFF8F2 0%, #FFEFE0 100%)",
        border: "0.5px solid rgba(232,199,122,0.4)",
        borderRadius: "16px",
        padding: "14px 16px",
        boxShadow: "0 2px 10px rgba(201,169,110,0.1)",
      }}
    >
      <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#3D352B", margin: "0 0 4px" }}>
        {uiLang === "en" ? "I want to remember you~" : "หนูอยากจำคุณได้ค่า~"}
      </p>
      <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "12px", color: "#9A8B73", margin: "0 0 12px", lineHeight: 1.5 }}>
        {uiLang === "en"
          ? "Sign up free — keep talking, save your progress, never start over"
          : "สมัครฟรีค่า — คุยกับหนูต่อได้ บันทึกความก้าวหน้า ไม่ต้องเริ่มใหม่"}
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <Link
          href="/signup"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "40px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
            fontFamily: "'Kanit', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "#FFFFFF",
            textDecoration: "none",
          }}
        >
          {uiLang === "en" ? "Stay with me ✦" : "อยู่กับหนูค่า ✦"}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            height: "40px",
            padding: "0 14px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.7)",
            border: "0.5px solid #EDE8E0",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "#9A8B73",
            cursor: "pointer",
          }}
        >
          {uiLang === "en" ? "Later" : "ภายหลัง"}
        </button>
      </div>
    </motion.div>
  );
}
