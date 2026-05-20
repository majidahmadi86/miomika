"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false }
);

type WelcomeScreenProps = {
  onComplete: () => void;
};

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 950);
    const t3 = setTimeout(() => setPhase(3), 4200);
    const t4 = setTimeout(() => {
      localStorage.setItem("miomika-welcomed-v1", "1");
      onComplete();
    }, 4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

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
          transform: phase >= 1
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
            fontFamily: "'Kanit', sans-serif",
            fontSize: "20px",
            fontWeight: 500,
            color: "#1A1A18",
            letterSpacing: "0.02em",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          ยินดีต้อนรับนะคะ~
          <br />
          หนูรอคุณอยู่ค่า
        </p>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "11px",
            fontWeight: 600,
            color: "#C4BDB5",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginTop: "8px",
            margin: "8px 0 0",
          }}
        >
          Welcome · I&apos;ve been waiting
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
            fontSize: "15px",
            fontWeight: 700,
            color: "#F9A8D4",
            letterSpacing: "0.18em",
          }}
        >
          miomi
        </span>
        <span
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "11px",
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
