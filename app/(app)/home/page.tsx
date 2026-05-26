"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, Hand, Heart, Mic, Sparkles, Zap } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { MiomiBubble } from "@/components/miomi/MiomiBubble";
import { MiomiStage, type MiomiMood } from "@/components/miomi/MiomiStage";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useProfile } from "@/lib/auth/use-profile";
import { useHomeWhisper } from "@/lib/guidance/use-home-whisper";
import { useSessionState } from "@/lib/ai/use-session-state";
import { useUILanguage } from "@/lib/i18n/client";
import { home } from "@/lib/voice/warmth";
import { speak } from "@/lib/voice/tts";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";

const GUEST_COUNTER_KEY = "miomika.guest_exchanges";

function readGuestExchanges(): number {
  if (typeof window === "undefined") return 0;
  const stored = window.localStorage.getItem(GUEST_COUNTER_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return !isNaN(parsed) && parsed > 0 ? parsed : 0;
}

function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

export default function HomePage() {
  const router = useRouter();
  const uiLang = useUILanguage();
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const session = useSessionState();
  const whisper = useHomeWhisper();

  const [bubbleText, setBubbleText] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [guestExchanges] = useState(readGuestExchanges);
  const greetedRef = useRef(false);
  const ttsMountedRef = useRef(true);

  const streakDays = profile?.streak ?? session.streak_days ?? 0;
  const heartFuel = session.fuel.heart ?? 0;
  const zapFuel = session.fuel.zap ?? 0;
  const brainFuel = session.fuel.brain ?? 0;
  const isFirstDay =
    daysSince(profile?.onboarding_completed_at ?? null) === 0 && streakDays === 0;

  /* eslint-disable react-hooks/purity -- time-relative mood derived from profile */
  const derivedMood: MiomiMood = useMemo(() => {
    if (isGuest && guestExchanges >= 4) return "low-fuel";
    if (profile?.last_seen_at) {
      const hours =
        (Date.now() - new Date(profile.last_seen_at).getTime()) / (1000 * 60 * 60);
      if (hours > 24) return "missing-user";
    }
    if (streakDays >= 7 && streakDays % 7 === 0) return "excited";
    return "idle";
  }, [isGuest, guestExchanges, profile?.last_seen_at, streakDays]);
  /* eslint-enable react-hooks/purity */

  const maybeSpeak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      if (window.localStorage.getItem("miomika.tts_on") !== "1") return;
      void speak(text, uiLang, {
        onEnd: () => {},
        onError: () => {},
      });
    },
    [uiLang],
  );

  useEffect(() => {
    ttsMountedRef.current = true;
    return () => {
      ttsMountedRef.current = false;
    };
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- session greeting on mount */
  useEffect(() => {
    if (!authReady || greetedRef.current) return;
    if (isGuest) return;
    greetedRef.current = true;
    const text = home.greeting.pick(uiLang, {
      streakDays,
      lastSeenAt: profile?.last_seen_at ?? null,
      isFirstDay,
    });
    setBubbleText(text);
    setBubbleVisible(true);
  }, [authReady, isGuest, uiLang, streakDays, profile?.last_seen_at, isFirstDay]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const showBubble = useCallback(
    (text: string, speakIt = true) => {
      setBubbleText(text);
      setBubbleVisible(true);
      if (speakIt) maybeSpeak(text);
    },
    [maybeSpeak],
  );

  const handleTap = useCallback(() => {
    if (isGuest) return;
    showBubble(home.react.tap(uiLang));
  }, [isGuest, showBubble, uiLang]);

  const handleDragEnd = useCallback(() => {
    if (isGuest) return;
    showBubble(home.react.drag(uiLang));
  }, [isGuest, showBubble, uiLang]);

  const handleFuelTap = useCallback(() => {
    if (isGuest) return;
    const low = heartFuel < 25 || zapFuel < 25 || brainFuel < 25;
    showBubble(low ? home.react.lowFuel(uiLang) : home.react.tap(uiLang));
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
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
          paddingBottom: "80px",
        }}
      >
        {/* Region 1 — Sky */}
        <div
          style={{
            height: "56px",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: "48px" }}>
            {!isGuest && streakDays >= 2 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Flame size={16} strokeWidth={2} color="#C9A96E" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "13px",
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {streakDays}
                </span>
              </div>
            ) : null}
          </div>

          {authReady && isGuest ? (
            <Link
              href="/signup"
              style={{
                flex: 1,
                margin: "0 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 16px",
                background: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(12px)",
                border: "1px solid #EDE8E0",
                borderRadius: "16px",
                boxShadow: CARD_SHADOW,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  fontFamily: "'Kanit', 'Quicksand', sans-serif",
                  fontSize: "13px",
                  lineHeight: "18px",
                  fontWeight: 500,
                  color: "#1A1A18",
                }}
              >
                {home.guest.pill(uiLang)}
              </span>
            </Link>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleFuelTap}
                aria-label="Heart fuel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Heart size={16} strokeWidth={2} color="#DB2777" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "13px",
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {Math.round(heartFuel)}
                </span>
              </button>
              <button
                type="button"
                onClick={handleFuelTap}
                aria-label="Zap fuel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Zap size={16} strokeWidth={2} color="#C9A96E" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "13px",
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {Math.round(zapFuel)}
                </span>
              </button>
              <button
                type="button"
                onClick={handleFuelTap}
                aria-label="Brain fuel"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <Sparkles size={16} strokeWidth={2} color="#7DD3C0" />
                <span
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "13px",
                    lineHeight: "18px",
                    fontWeight: 600,
                    color: "#1A1A18",
                  }}
                >
                  {Math.round(brainFuel)}
                </span>
              </button>
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
            minHeight: 0,
            maxHeight: "480px",
            height: "55svh",
          }}
        >
          <div style={{ position: "relative" }}>
            <MiomiStage
              size={280}
              mood={derivedMood}
              onTap={handleTap}
              onDragEnd={handleDragEnd}
            />
            {!isGuest ? (
              <MiomiBubble
                text={bubbleText}
                visible={bubbleVisible}
                position="top-right"
                autoHideMs={4000}
                onHide={() => setBubbleVisible(false)}
              />
            ) : null}
          </div>
        </div>

        {/* Region 3 — Whisper */}
        {whisper ? (
          <div
            style={{
              margin: "0 24px 16px",
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
                gap: "12px",
                maxWidth: "280px",
                width: "100%",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.7)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(237, 232, 224, 0.6)",
                borderRadius: "12px",
                boxShadow: CARD_SHADOW,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Hand size={18} strokeWidth={1.75} color="#C9A96E" />
              <span
                style={{
                  fontFamily: "'Kanit', 'Quicksand', sans-serif",
                  fontSize: "14px",
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
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          <Mic size={14} color="#9A8B73" strokeWidth={1.75} />
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              lineHeight: "16px",
              fontWeight: 500,
              color: "#9A8B73",
            }}
          >
            {home.mic.hint(uiLang)}
          </span>
        </div>
      </div>
    </>
  );
}
