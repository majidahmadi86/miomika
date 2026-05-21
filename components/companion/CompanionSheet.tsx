"use client";

/**
 * CompanionSheet — MOBILE-only bottom sheet (max-width 767px).
 *
 * Gated by useIsMobile so it never renders on desktop. The desktop variant
 * lives in CompanionPanel.tsx. Both are mutually exclusive — see
 * MIOMIKA.md §8 Phase 2 (Companion sheet vs panel viewport bug).
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Maximize2, X } from "lucide-react";
import { useCompanionStore } from "@/lib/companion/store";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { useUILanguage } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/strings";

export function CompanionSheet() {
  const isMobile = useIsMobile();
  const isOpen = useCompanionStore((s) => s.isOpen);
  const close = useCompanionStore((s) => s.close);
  const lang = useUILanguage();
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isMobile || !isOpen) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startYRef.current = t ? t.clientY : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t || startYRef.current === null) return;
    const dy = t.clientY - startYRef.current;
    startYRef.current = null;
    if (dy > 80) close();
  };

  return (
    <>
      <style>{`
        @keyframes miomi-sheet-rise {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      <button
        type="button"
        aria-label={tr("companion_dismiss", lang)}
        onClick={close}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 70,
          background: "rgba(26,26,24,0.4)",
          border: 0,
          padding: 0,
          cursor: "pointer",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Miomi"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          height: "64svh",
          background: "#FFFFFF",
          borderTopLeftRadius: "28px",
          borderTopRightRadius: "28px",
          boxShadow: "0 -8px 40px rgba(26,26,24,0.15)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          display: "flex",
          flexDirection: "column",
          animation: "miomi-sheet-rise 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
        </div>
        <CompanionInner onClose={close} lang={lang} />
      </div>
    </>
  );
}

function CompanionInner({ onClose, lang }: { onClose: () => void; lang: "th" | "en" }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 8px",
        }}
      >
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            color: "#C4BDB5",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          Miomi
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <Link
            href="/talk"
            onClick={onClose}
            aria-label={tr("companion_open_fullscreen", lang)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              color: "#9A8B73",
              textDecoration: "none",
            }}
          >
            <Maximize2 style={{ width: "16px", height: "16px" }} strokeWidth={1.75} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={tr("companion_dismiss", lang)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              border: 0,
              background: "transparent",
              color: "#9A8B73",
              cursor: "pointer",
            }}
          >
            <X style={{ width: "18px", height: "18px" }} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", paddingTop: "8px" }}>
        <Image
          src="/characters/miomi/companion/companion-happy.png"
          alt="Miomi"
          width={96}
          height={96}
          priority={false}
          style={{ width: "96px", height: "96px", objectFit: "contain" }}
        />
      </div>

      <div style={{ textAlign: "center", padding: "12px 24px 0" }}>
        <p
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "16px",
            fontWeight: 500,
            color: "#1A1A18",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {lang === "th" ? "อยู่ตรงนี้กับคุณค่า~" : "I'm right here with you~"}
        </p>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "12px",
            color: "#9A8B73",
            marginTop: "4px",
          }}
        >
          {lang === "th"
            ? "อยากให้หนูช่วยอะไรคะ?"
            : "What should we do today?"}
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px 16px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            maxWidth: "85%",
            padding: "10px 14px",
            background: "#FAFAF6",
            border: "1px solid #EDE8E0",
            borderRadius: "4px 18px 18px 18px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: "'Kanit', sans-serif",
              fontSize: "14px",
              color: "#1A1A18",
              lineHeight: 1.55,
            }}
          >
            {lang === "th"
              ? "อยากเรียนคำใหม่ หรืออยากให้หนูช่วยอะไรคะ?"
              : "Want to learn a new word — or something else?"}
          </p>
        </div>
      </div>

      <div style={{ padding: "8px 16px 16px" }}>
        <Link
          href="/talk"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "48px",
            borderRadius: "999px",
            background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)",
            color: "#FFFFFF",
            fontFamily: "'Kanit', sans-serif",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            boxShadow: "0 4px 16px -4px rgba(219,39,119,0.40)",
          }}
        >
          {tr("companion_open_in_talk", lang)}
        </Link>
      </div>
    </>
  );
}
