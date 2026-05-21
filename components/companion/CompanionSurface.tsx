"use client";

/**
 * CompanionSurface — mobile bottom sheet + desktop right panel.
 * MIOMIKA.md §2.5 (Tap behavior mobile/desktop).
 *
 * Phase 1 scope: the surface itself, with a warm Miomi greeting and a
 * "Continue in deep-focus mode" CTA that promotes the conversation to /talk.
 * Full conversation wiring (mic + text → engine → message stream) lives in
 * Phase 3 — for now the sheet announces its presence and bridges to /talk
 * where the existing engine already runs.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Maximize2, X } from "lucide-react";
import { useCompanion } from "@/components/companion/CompanionStateContext";

export function CompanionSurface() {
  const { isOpen, close } = useCompanion();
  const startYRef = useRef<number | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);

  // Esc closes on desktop; tap-outside via backdrop click.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  // Swipe-to-dismiss on mobile (touch only).
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
      {/* Backdrop — opacity 0.4, taps dismiss (§2.5) */}
      <button
        type="button"
        aria-label="ปิด"
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

      {/* MOBILE bottom sheet — 64svh, slides up 320ms */}
      <div
        ref={dragRef}
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
          animation: "miomi-companion-rise 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="md:hidden"
      >
        <style>{`
          @keyframes miomi-companion-rise {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
          @keyframes miomi-companion-slide-in {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "10px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#E8E5DF" }} />
        </div>

        <CompanionInner onClose={close} />
      </div>

      {/* DESKTOP right side panel — 380px, slides in from right */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Miomi"
        className="hidden md:flex"
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
          flexDirection: "column",
          animation: "miomi-companion-slide-in 320ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <CompanionInner onClose={close} />
      </div>
    </>
  );
}

function CompanionInner({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Header */}
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
            aria-label="ขยายเต็มจอ — Open in deep-focus"
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
            <Maximize2 style={{ width: "16px", height: "16px" }} strokeWidth={2} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
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
            <X style={{ width: "18px", height: "18px" }} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* Stage — 96px head per §2.5 */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "8px",
        }}
      >
        <Image
          src="/miomi/head-happy.png"
          alt="Miomi"
          width={96}
          height={96}
          priority={false}
          style={{ width: "96px", height: "96px", objectFit: "contain" }}
        />
      </div>

      {/* Greeting */}
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
          อยู่ตรงนี้กับคุณค่า~
        </p>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "12px",
            color: "#9A8B73",
            marginTop: "4px",
          }}
        >
          I&apos;m here with you — what should we do today?
        </p>
      </div>

      {/* Conversation canvas placeholder. Phase 3 wires real messages here. */}
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
            อยากเรียนคำใหม่ หรืออยากให้หนูช่วยอะไรคะ?
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "11px",
              color: "#9A8B73",
              lineHeight: 1.5,
            }}
          >
            Want to learn a new word — or something else?
          </p>
        </div>
      </div>

      {/* Promote to /talk — full mic/voice experience lives there */}
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
          คุยแบบเต็มจอ · Open in deep-focus mode
        </Link>
      </div>
    </>
  );
}
