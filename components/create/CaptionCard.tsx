"use client";

import { Copy, RefreshCw, Bookmark } from "lucide-react";
import { motion } from "framer-motion";

type Platform = "Instagram" | "TikTok" | "Facebook" | "YouTube" | "LINE OA" | "general";

interface CaptionCardProps {
  platform: Platform;
  caption: {
    body: string;
    hashtags?: string[];
    hook?: string;
  };
  onCopy: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}

export function CaptionCard({ platform, caption, onCopy, onRegenerate, onSave }: CaptionCardProps) {
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
      {/* Coral left bar */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "3px" }}
        transition={{ duration: 0.24, delay: 0.20, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          background: "#FF8A80",
          borderRadius: "3px 0 0 3px",
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, delay: 0.08 }}
        style={{ padding: "14px 14px 14px 18px" }}
      >
        {/* Header */}
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#FF8A80",
            }}
          >
            {platform}
          </span>
        </div>

        {/* Hook if present */}
        {caption.hook && (
          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "13px",
              fontWeight: 600,
              color: "#1A1A18",
              lineHeight: 1.5,
              margin: "0 0 6px",
              borderBottom: "1px solid #F5F0EB",
              paddingBottom: "6px",
            }}
          >
            {caption.hook}
          </p>
        )}

        {/* Caption body */}
        <p
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1A1A18",
            lineHeight: 1.65,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {caption.body}
        </p>

        {/* Hashtags */}
        {caption.hashtags && caption.hashtags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px",
              marginTop: "8px",
            }}
          >
            {caption.hashtags.map((tag, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#9A8B73",
                  background: "#F5F0EB",
                  borderRadius: "4px",
                  padding: "1px 6px",
                }}
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
            paddingTop: "10px",
            borderTop: "1px solid #F5F0EB",
          }}
        >
          {[
            { icon: Copy, label: "คัดลอก", onClick: onCopy },
            { icon: RefreshCw, label: "ทำใหม่", onClick: onRegenerate },
            { icon: Bookmark, label: "บันทึก", onClick: onSave },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                height: "32px",
                background: "transparent",
                border: "1px solid #EDE8E0",
                borderRadius: "8px",
                padding: "0 10px",
                cursor: "pointer",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                color: "#9A8B73",
                transition: "background 0.15s ease",
              }}
            >
              <Icon style={{ width: "13px", height: "13px" }} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
