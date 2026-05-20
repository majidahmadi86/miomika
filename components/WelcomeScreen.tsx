// components/WelcomeScreen.tsx
// Shows ONCE on first visit. localStorage flag: "miomika-welcomed-v1"
// Duration: 3 seconds then auto-transitions.
// Pure white. Miomi. One sentence. That is all.
//
// Usage in app/(app)/home/page.tsx:
//   import { WelcomeScreen } from "@/components/WelcomeScreen";
//   const [showWelcome, setShowWelcome] = useState(false);
//
//   useEffect(() => {
//     if (!localStorage.getItem("miomika-welcomed-v1")) {
//       setShowWelcome(true);
//     }
//   }, []);
//
//   if (showWelcome) {
//     return <WelcomeScreen onComplete={() => setShowWelcome(false)} />;
//   }

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type WelcomeScreenProps = {
  onComplete: () => void;
};

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  // Phase controls the animation sequence
  // 0 = invisible (mount frame)
  // 1 = Miomi appears
  // 2 = text fades in
  // 3 = everything fades out
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    // Frame 0 → 1: Miomi appears (80ms after mount)
    const t1 = setTimeout(() => setPhase(1), 80);
    // Frame 1 → 2: Text fades in (900ms after mount)
    const t2 = setTimeout(() => setPhase(2), 900);
    // Frame 2 → 3: Begin fade out (2800ms after mount)
    const t3 = setTimeout(() => setPhase(3), 2800);
    // Complete: call onComplete (3300ms after mount — after fade finishes)
    const t4 = setTimeout(() => {
      localStorage.setItem("miomika-welcomed-v1", "1");
      onComplete();
    }, 3300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: phase === 3 ? 0 : 1,
        transition: phase === 3 ? "opacity 0.5s ease" : "none",
        pointerEvents: "none",
      }}
    >
      {/* Warm glow behind Miomi */}
      <div
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(249,168,212,0.22) 0%, rgba(255,255,255,0) 70%)",
          transform: "translateY(-20px)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 1.2s ease",
        }}
      />

      {/* Miomi image */}
      <div
        style={{
          position: "relative",
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "scale(1) translateY(0px)" : "scale(0.88) translateY(16px)",
          transition: "opacity 0.9s ease, transform 0.9s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <Image
          src="/miomi/happy.png"
          alt="Miomi"
          width={200}
          height={200}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      {/* Text block */}
      <div
        style={{
          marginTop: "24px",
          textAlign: "center",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0px)" : "translateY(8px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
        }}
      >
        {/* Thai — primary */}
        <p
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#1A1A18",
            letterSpacing: "0.01em",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า
        </p>

        {/* English — secondary */}
        <p
          style={{
            fontSize: "13px",
            color: "#9CA3AF",
            marginTop: "6px",
            letterSpacing: "0.02em",
            margin: "6px 0 0",
          }}
        >
          Welcome~ I&apos;ve been waiting for you
        </p>
      </div>
    </div>
  );
}
