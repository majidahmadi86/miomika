"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Hand, Heart, Mic, Sparkles, Zap } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { MiomiAlive } from "@/components/miomi/MiomiAlive";
import { MiomiBubble } from "@/components/miomi/MiomiBubble";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useProfile } from "@/lib/auth/use-profile";
import { useSessionState } from "@/lib/ai/use-session-state";
import { useHomeWhisper } from "@/lib/guidance/use-home-whisper";
import { useUILanguage } from "@/lib/i18n/client";
import { home } from "@/lib/voice/warmth";
import { speak } from "@/lib/voice/tts";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";

function daysSinceSignup(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

function GlassChip({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const shell: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid #EDE8E0",
    borderRadius: 999,
    padding: "4px 10px",
    boxShadow: CARD_SHADOW,
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        style={{ ...shell, cursor: "pointer", padding: "4px 10px" }}
      >
        {children}
      </button>
    );
  }

  return <div style={shell}>{children}</div>;
}

function chipValue(raw: number | undefined): number {
  return Math.round(raw ?? 100);
}

export default function HomePage() {
  const router = useRouter();
  const uiLang = useUILanguage();
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const session = useSessionState();
  const whisper = useHomeWhisper();

  const [miomiSize, setMiomiSize] = useState(280);
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleAutoHideMs, setBubbleAutoHideMs] = useState(4000);
  const greetedRef = useRef(false);

  const streakDays = profile?.streak ?? session.streak_days ?? 0;
  const heartFuel = session.fuel.heart;
  const zapFuel = session.fuel.zap;
  const brainFuel = session.fuel.brain;
  const isFirstDay = daysSinceSignup(profile?.onboarding_completed_at ?? null) === 0;

  useEffect(() => {
    const update = () => setMiomiSize(window.innerWidth >= 400 ? 320 : 280);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maybeSpeak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem("miomika.tts_on") !== "1") return;
      void speak(text, uiLang, { onEnd: () => {}, onError: () => {} });
    },
    [uiLang],
  );

  const showBubble = useCallback(
    (text: string, hideMs: number, speakIt = true) => {
      setBubbleText(text);
      setBubbleAutoHideMs(hideMs);
      setBubbleVisible(true);
      if (speakIt) maybeSpeak(text);
    },
    [maybeSpeak],
  );

  useEffect(() => {
    if (!authReady || greetedRef.current || isGuest || !profile) return;
    const id = window.setTimeout(() => {
      greetedRef.current = true;
      const text = home.greeting.pick(uiLang, {
        streakDays,
        lastSeenAt: profile.last_seen_at ?? null,
        isFirstDay,
      });
      setBubbleText(text);
      setBubbleAutoHideMs(4000);
      setBubbleVisible(true);
    }, 800);
    return () => window.clearTimeout(id);
  }, [authReady, isGuest, profile, uiLang, streakDays, isFirstDay]);

  const handleTap = useCallback(() => {
    if (isGuest) return;
    showBubble(home.react.tap(uiLang), 3200);
  }, [isGuest, showBubble, uiLang]);

  const handleDragEnd = useCallback(() => {
    if (isGuest) return;
    showBubble(home.react.drag(uiLang), 3200);
  }, [isGuest, showBubble, uiLang]);

  const handleFuelTap = useCallback(() => {
    if (isGuest) return;
    const low =
      chipValue(heartFuel) < 25 ||
      chipValue(zapFuel) < 25 ||
      chipValue(brainFuel) < 25;
    showBubble(low ? home.react.lowFuel(uiLang) : home.react.tap(uiLang), 3200);
  }, [brainFuel, heartFuel, isGuest, showBubble, uiLang, zapFuel]);

  const handleWhisperTap = useCallback(() => {
    if (!whisper) return;
    router.push(whisper.href);
  }, [router, whisper]);

  return (
    <>
      <WelcomeScreen />
      <div
        style={{
          minHeight: "100svh",
          height: "100svh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
        }}
      >
        <style>{`
          @keyframes miomi-mic-pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
          .miomi-mic-pulse {
            animation: miomi-mic-pulse 2.4s ease-in-out infinite;
          }
        `}</style>

        {/* Region 1 — Sky */}
        <div
          style={{
            height: 56,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 48 }}>
            {!isGuest && streakDays >= 2 ? (
              <GlassChip>
                <Flame size={14} strokeWidth={2} color="#C9A96E" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: 13,
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {streakDays}
                </span>
              </GlassChip>
            ) : null}
          </div>

          {authReady && isGuest ? (
            <Link
              href="/signup"
              style={{
                flex: 1,
                marginLeft: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <GlassChip>
                <span
                  style={{
                    fontFamily: "'Kanit', 'Quicksand', sans-serif",
                    fontSize: 13,
                    lineHeight: "18px",
                    fontWeight: 500,
                    color: "#1A1A18",
                  }}
                >
                  {home.guest.pill(uiLang)}
                </span>
              </GlassChip>
            </Link>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <GlassChip onClick={handleFuelTap} ariaLabel="Heart fuel">
                <Heart size={14} strokeWidth={2} color="#DB2777" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: 13,
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {chipValue(heartFuel)}
                </span>
              </GlassChip>
              <GlassChip onClick={handleFuelTap} ariaLabel="Zap fuel">
                <Zap size={14} strokeWidth={2} color="#C9A96E" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: 13,
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {chipValue(zapFuel)}
                </span>
              </GlassChip>
              <GlassChip onClick={handleFuelTap} ariaLabel="Brain fuel">
                <Sparkles size={14} strokeWidth={2} color="#7DD3C0" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: 13,
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {chipValue(brainFuel)}
                </span>
              </GlassChip>
            </div>
          )}
        </div>

        {/* Region 2 — Stage */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "visible",
            minHeight: 0,
          }}
        >
          <div style={{ position: "relative" }}>
            <MiomiAlive
              size={miomiSize}
              onTap={handleTap}
              onDragEnd={handleDragEnd}
            />
            {!isGuest ? (
              <MiomiBubble
                text={bubbleText}
                visible={bubbleVisible}
                autoHideMs={bubbleAutoHideMs}
                offsetSide="right"
                onHide={() => setBubbleVisible(false)}
              />
            ) : null}
          </div>
        </div>

        {/* Region 3 — Whisper */}
        {whisper ? (
          <div
            style={{
              margin: "0 24px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={handleWhisperTap}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                maxWidth: 280,
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(237, 232, 224, 0.6)",
                borderRadius: 12,
                boxShadow: CARD_SHADOW,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Hand size={18} strokeWidth={1.75} color="#C9A96E" />
              <span
                style={{
                  fontFamily: "'Kanit', 'Quicksand', sans-serif",
                  fontSize: 14,
                  lineHeight: "20px",
                  fontWeight: 600,
                  color: "#1A1A18",
                }}
              >
                {whisper.text}
              </span>
            </button>
          </div>
        ) : null}

        {/* Region 4 — Mic hint */}
        <div
          style={{
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              pointerEvents: "none",
            }}
          >
            <Mic
              size={14}
              color="#9A8B73"
              strokeWidth={1.75}
              className="miomi-mic-pulse"
            />
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: 12,
                lineHeight: "16px",
                fontWeight: 500,
                color: "#9A8B73",
              }}
            >
              {home.mic.hint(uiLang)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
