"use client";

import Image from "next/image";
import { motion } from "framer-motion";

type InvitationVariant = "pro" | "pro_yearly";

interface Benefit {
  th: string;
  en: string;
}

interface MiomiInvitationCardProps {
  variant: InvitationVariant;
  benefits: Benefit[];
  price: { thb: number; period: "month" | "year" };
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

const VARIANT_CONFIG = {
  pro: {
    header: "MIOMI PRO",
    primaryCta: "ปลดล็อกเลย",
    secondaryCta: "ดูเพิ่ม",
  },
  pro_yearly: {
    header: "MIOMI PRO · รายปี",
    primaryCta: "เลือกรายปี",
    secondaryCta: "รายเดือนต่อ",
  },
};

export function MiomiInvitationCard({
  variant,
  benefits,
  price,
  onPrimaryAction,
  onSecondaryAction,
}: MiomiInvitationCardProps) {
  const config = VARIANT_CONFIG[variant];
  const periodLabel = price.period === "month" ? "/ เดือน" : "/ ปี";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid #EDE8E0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(26,26,24,0.04)",
        overflow: "hidden",
        position: "relative",
        margin: "4px 0",
      }}
    >
      {/* Pink gradient left bar — 4px, thicker than content cards */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "4px" }}
        transition={{ duration: 0.24, delay: 0.20, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          background: "linear-gradient(180deg, #F9A8D4 0%, #DB2777 100%)",
          borderRadius: "4px 0 0 4px",
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        style={{ padding: "14px 14px 14px 20px" }}
      >
        {/* Header */}
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 10px",
          }}
        >
          {config.header}
        </p>

        {/* Miomi image + title row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.32, type: "spring", stiffness: 280, damping: 13 }}
            style={{ flexShrink: 0 }}
          >
            <Image
              src="/miomi/head-happy.png"
              alt="Miomi"
              width={64}
              height={64}
              style={{ objectFit: "contain", width: "64px", height: "64px" }}
            />
          </motion.div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "#1A1A18",
              margin: "0 0 2px",
              lineHeight: 1.4,
            }}>
              {variant === "pro" ? "สิ่งที่หนูทำได้เพิ่ม" : "ฟรี 2 เดือน เมื่อจ่ายรายปี"}
            </p>
            <p style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "11px",
              color: "#9A8B73",
              margin: 0,
            }}>
              {variant === "pro" ? "What I can do more" : "2 months free, paid yearly"}
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div style={{ marginBottom: "12px" }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ marginBottom: i < benefits.length - 1 ? "8px" : 0 }}>
              <p style={{
                fontFamily: "'Kanit', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: "#1A1A18",
                margin: "0 0 1px",
              }}>
                {b.th}
              </p>
              <p style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "11px",
                color: "#9A8B73",
                margin: 0,
              }}>
                {b.en}
              </p>
            </div>
          ))}
        </div>

        {/* Price */}
        <p style={{
          fontFamily: "'Kanit', sans-serif",
          fontSize: "15px",
          fontWeight: 500,
          color: "#1A1A18",
          margin: "0 0 12px",
        }}>
          {price.thb.toLocaleString()} บาท {periodLabel}
          {variant === "pro_yearly" && (
            <span style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "11px",
              color: "#9A8B73",
              marginLeft: "6px",
            }}>
              (เฉลี่ย 249 บาท / เดือน)
            </span>
          )}
        </p>

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={onPrimaryAction}
            style={{
              height: "44px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
              border: "none",
              padding: "0 20px",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "#FFFFFF",
              cursor: "pointer",
              boxShadow: "0 4px 12px -4px rgba(219,39,119,0.35)",
              flexShrink: 0,
            }}
          >
            {config.primaryCta}
          </button>
          <button
            type="button"
            onClick={onSecondaryAction}
            style={{
              background: "none",
              border: "none",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#DB2777",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {config.secondaryCta}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
