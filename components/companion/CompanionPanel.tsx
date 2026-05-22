"use client";

/**
 * CompanionPanel — DESKTOP-only right side panel (min-width 768px).
 *
 * Mutually exclusive with CompanionSheet. See MIOMIKA.md §8 Phase 2
 * (Companion sheet vs panel viewport bug).
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Maximize2, X } from "lucide-react";
import { useCompanionStore } from "@/lib/companion/store";
import { useIsDesktop } from "@/lib/hooks/use-media-query";
import { useUILanguage } from "@/lib/i18n/client";
import { tr } from "@/lib/i18n/strings";

export function CompanionPanel() {
  const isDesktop = useIsDesktop();
  const isOpen = useCompanionStore((s) => s.isOpen);
  const close = useCompanionStore((s) => s.close);
  const lang = useUILanguage();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isDesktop || !isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes miomi-panel-slide-in {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Miomi"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 80,
          width: "380px",
          background: "#FFFFFF",
          borderLeft: "1px solid #EDE8E0",
          boxShadow: "-12px 0 32px rgba(26,26,24,0.08)",
          display: "flex",
          flexDirection: "column",
          animation: "miomi-panel-slide-in 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
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
              onClick={close}
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
              onClick={close}
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
            onClick={close}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "48px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
              color: "#FFFFFF",
              fontFamily: "'Kanit', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              boxShadow: "0 4px 16px -4px rgba(201,169,110,0.40)",
            }}
          >
            {tr("companion_open_in_talk", lang)}
          </Link>
        </div>
      </div>
    </>
  );
}
