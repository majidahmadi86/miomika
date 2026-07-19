"use client";

/**
 * WelcomeScreen — self-gating splash. Renders nothing during SSR, decides
 * client-side whether to show based on profile state + localStorage flag.
 *
 * Block A1 of Phase 2 (MIOMIKA.md §8). The `mounted` state eliminates the
 * Phase-1 hydration mismatch that caused the welcome screen to double-show
 * on mobile.
 *
 * On dismiss:
 *   - localStorage flag set immediately (survives reloads)
 *   - server action markWelcomeShown() writes users.welcome_shown_at for
 *     authenticated users
 *   - module-level guard prevents re-display within the SPA session
 *
 * The animation timeline (fade-in → text → fade-out) is preserved from
 * Phase 1 — only the gating logic changed.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useProfile } from "@/lib/auth/use-profile";
import { useUILanguage } from "@/lib/i18n/client";
import { useHasMounted } from "@/lib/hooks/use-media-query";
import {
  shouldShowWelcome,
  markWelcomeShownLocal,
  WELCOME_LOCAL_STORAGE_KEY,
} from "@/lib/welcome/show-welcome";
import { markWelcomeShown } from "@/lib/welcome/actions";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

let _welcomeShownInSession = false;

type WelcomeScreenProps = {
  /** Optional: called after the welcome animation completes. */
  onComplete?: () => void;
};

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const mounted = useHasMounted();
  const [shouldShow, setShouldShow] = useState(false);
  const [decided, setDecided] = useState(false);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  const { profile, authReady } = useProfile();
  const lang = useUILanguage();

  // Decide whether to show. Runs only after profile resolves so we don't
  // flash welcome to a returning Pro user. useHasMounted gates the mount
  // boundary via useSyncExternalStore (no setState-in-effect).
  //
  // The _welcomeShownInSession module guard is a one-way flip: once set, the
  // effect always early-returns. setShouldShow is therefore called at most
  // once per session — no need to clear it on re-renders.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authReady) return;

    if (_welcomeShownInSession) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDecided(true);
      onComplete?.();
      return;
    }

    const decision = shouldShowWelcome(profile, window.localStorage);
    _welcomeShownInSession = true;
    setDecided(true);
    if (decision) setShouldShow(true);
    else onComplete?.();
  }, [profile, authReady, onComplete]);

  useEffect(() => {
    if (!shouldShow) return;

    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => {
      setPhase(2);
      // Mark the splash as shown EARLY — while it's still solid on top — so the
      // Smart Guide's auto-show opens it UNDERNEATH and the splash fades straight
      // into the guide, with no bare-home flash between the two.
      markWelcomeShownLocal();
    }, 950);
    const t3 = setTimeout(() => setPhase(3), 2900);
    const t4 = setTimeout(() => {
      void markWelcomeShown();
      setShouldShow(false);
      onComplete?.();
    }, 4200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [shouldShow, onComplete]);

  // SSR: render nothing to avoid hydration mismatch.
  // SSR + pre-decision: paint the brand moment IMMEDIATELY from server HTML —
  // the cat is this page's LCP element, so it must never wait for the bundle,
  // auth, or any state flag (PageSpeed campaign Stage A, 7/19: FCP 1.4s but
  // LCP 11.7s because the hero was JS-hostage behind a null SSR + cream gate).
  // The blank cream overlay becomes a branded one: same blocking role, but
  // with Miomi already there via a pure-CSS entrance. After mount, returning
  // users (local flag) skip straight to home exactly as before.
  if (!mounted || !decided) {
    if (mounted) {
      let alreadyWelcomed = false;
      try {
        alreadyWelcomed = !!localStorage.getItem(WELCOME_LOCAL_STORAGE_KEY);
      } catch {
        // private mode — keep the branded gate
      }
      if (alreadyWelcomed) return null;
    }
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#FAFAF6",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ animation: "mkWelcomeIn 0.7s ease both" }}>
          <Image
            src="/miomi/happy.png"
            alt="Miomi"
            width={210}
            height={210}
            priority
            fetchPriority="high"
            quality={65}
            style={{ objectFit: "contain" }}
          />
        </div>
        <style>{`@keyframes mkWelcomeIn { from { opacity: 0; transform: scale(0.92) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
      </div>
    );
  }

  if (!shouldShow) return null;

  const heading =
    lang === "th"
      ? ["ยินดีต้อนรับนะคะ", "ดีใจที่ได้เจอกันค่า"]
      : ["Welcome", "so glad you're here"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FAFAF6",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: phase === 3 ? 0 : 1,
        transition: phase === 3 ? "opacity 0.6s ease" : "none",
        pointerEvents: phase === 3 ? "none" : "auto",
        overflow: "hidden",
      }}
    >
      <AmbientBackground mode="ambient" />

      <div
        style={{
          position: "absolute",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249,168,212,0.28) 0%, transparent 65%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 1.4s ease",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: phase >= 1 ? 1 : 0,
          transform:
            phase >= 1
              ? "scale(1) translateY(0px)"
              : "scale(0.86) translateY(20px)",
          transition: "opacity 1.0s ease, transform 1.0s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Image
          src="/miomi/happy.png"
          alt="Miomi"
          width={210}
          height={210}
          priority
          fetchPriority="high"
          quality={65}
          style={{ objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 3,
          marginTop: "28px",
          textAlign: "center",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0px)" : "translateY(10px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontFamily: lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif",
            fontSize: "20px",
            fontWeight: 500,
            color: "#1A1A18",
            letterSpacing: "0.02em",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {heading[0]}
          <br />
          {heading[1]}
        </p>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            color: "#C4BDB5",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            margin: "8px 0 0",
          }}
        >
          Welcome &middot; I&apos;ve been waiting
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: "28px",
          zIndex: 3,
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 1s ease 0.3s",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: "#C9A96E",
            letterSpacing: "0.18em",
          }}
        >
          miomi
        </span>
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            color: "#D4C4B8",
            letterSpacing: "0.24em",
          }}
        >
          ka
        </span>
      </div>
    </div>
  );
}
