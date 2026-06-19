"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { deriveBond, BOND_STAGES } from "@/lib/companion/bond";

const LAST_HEARTS_KEY = "miomika.bond.lastHearts";

function Sparkles() {
  const arr = [-34, -20, -7, 7, 20, 34];
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: "40px", height: 0, pointerEvents: "none" }}>
      {arr.map((dx, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `calc(50% + ${dx}px)`,
            top: 0,
            fontSize: `${14 + (i % 3)}px`,
            color: "#D4537E",
            opacity: 0,
            animation: "miomiBondSpark 1.05s ease forwards",
            animationDelay: `${1050 + i * 55}ms`,
          }}
        >
          {"\u2665"}
        </span>
      ))}
    </div>
  );
}

export function ClosenessCard({ points, lang, active = false }: { points: number; lang: "th" | "en"; active?: boolean }) {
  const bond = deriveBond(points);
  const stageLabel = lang === "en" ? bond.label.en : bond.label.th;
  const nextStage = bond.heartsToNext != null ? BOND_STAGES[bond.stageIndex + 1] : null;
  const nextLabel = nextStage ? (lang === "en" ? nextStage.en : nextStage.th) : null;
  const restPct = Math.round(bond.heartPct * 100);

  const teaser =
    bond.heartsToNext == null
      ? lang === "en"
        ? `${bond.hearts} hearts together — and counting`
        : `${bond.hearts} ดวงใจด้วยกันแล้ว~ และยังเพิ่มขึ้นเรื่อยๆ`
      : lang === "en"
        ? `next: ${nextLabel} · ${bond.heartsToNext} heart${bond.heartsToNext === 1 ? "" : "s"} to go`
        : `ต่อไป: ${nextLabel} · อีก ${bond.heartsToNext} ดวงใจ`;

  const [phase, setPhase] = useState<"idle" | "play" | "done">("idle");
  const [animName, setAnimName] = useState<"miomiBondReveal" | "miomiBondFill">("miomiBondFill");
  const [revealKey, setRevealKey] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const [forceDemo] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("bonddemo"),
  );
  const playedRef = useRef(false);
  const prevHeartsRef = useRef<number | null>(null);
  const initRef = useRef(false);

  // Safety: never stay stuck waiting if the visibility signal never arrives.
  useEffect(() => {
    const t = window.setTimeout(() => setFallbackReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  const gateOpen = active || forceDemo || fallbackReady;

  // Fire the reveal ONCE, only when home is actually visible. Depends solely on
  // gateOpen so a late profile/lang settle can't re-run and interrupt it.
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      try {
        prevHeartsRef.current = Number(window.localStorage.getItem(LAST_HEARTS_KEY) ?? "0");
      } catch {
        prevHeartsRef.current = 0;
      }
    }
    if (!gateOpen || playedRef.current) {
      if (!gateOpen) console.log("[ClosenessCard] waiting for home to be visible");
      return;
    }
    playedRef.current = true;

    const prev = prevHeartsRef.current ?? 0;
    const earned = bond.hearts > prev;
    const full = earned || restPct < 10;
    console.log("[ClosenessCard] reveal", { hearts: bond.hearts, restPct, earned, full });

    setAnimName(full ? "miomiBondReveal" : "miomiBondFill");
    setPhase("play");
    setRevealKey((k) => k + 1);

    const tCap = window.setTimeout(() => {
      if (earned) setCaption(lang === "en" ? "+1 heart · for showing up~" : "+1 ดวงใจ · ที่แวะมาหากันวันนี้~");
      else if (restPct < 10) setCaption(lang === "en" ? "this fills as we spend time~" : "เต็มขึ้นเรื่อยๆ เมื่อเราใช้เวลาด้วยกัน~");
    }, full ? 1150 : 850);
    const tDone = window.setTimeout(() => {
      setPhase("done");
      setCaption(null);
    }, 3600);

    prevHeartsRef.current = bond.hearts;
    try { window.localStorage.setItem(LAST_HEARTS_KEY, String(bond.hearts)); } catch { /* non-fatal */ }

    return () => {
      window.clearTimeout(tCap);
      window.clearTimeout(tDone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateOpen]);

  const playing = phase === "play";

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card" style={{ position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes miomiBondReveal { 0%{width:0%} 45%{width:100%} 70%{width:100%} 100%{width:var(--bond-rest,0%)} }
        @keyframes miomiBondFill { 0%{width:0%} 100%{width:var(--bond-rest,0%)} }
        @keyframes miomiBondSpark { 0%{opacity:0;transform:translateY(8px) scale(.4)} 25%{opacity:1} 100%{opacity:0;transform:translateY(-30px) scale(1.1)} }
        @keyframes miomiHeartPop { 0%{transform:scale(1)} 35%{transform:scale(1.42)} 100%{transform:scale(1)} }
      `}</style>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" style={{ color: "#E06B9A" }} fill="#F9C2DC" strokeWidth={2} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif", color: "#993556" }}>{stageLabel}</span>
        </span>
        <span
          className="flex items-center gap-1"
          style={{ color: "#993556", animation: playing ? "miomiHeartPop 0.6s ease 1.05s" : "none" }}
        >
          <Heart className="h-[15px] w-[15px]" style={{ color: "#E06B9A" }} fill="#F9C2DC" strokeWidth={2} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif" }}>{bond.hearts}</span>
        </span>
      </div>
      <div className="mt-3 h-[7px] overflow-hidden rounded-full" style={{ background: "#F3E6EC" }}>
        <div
          key={revealKey}
          style={{
            height: "100%",
            borderRadius: "9999px",
            background: "#D4537E",
            width: playing ? "0%" : `${restPct}%`,
            ["--bond-rest" as unknown as string]: `${restPct}%`,
            animation: playing ? `${animName} 2.2s cubic-bezier(.45,0,.2,1) forwards` : "none",
          }}
        />
      </div>
      {caption ? (
        <p className="mt-2 text-[11.5px] font-medium" style={{ color: "#993556" }}>{caption}</p>
      ) : (
        <p className="mt-2 text-[11.5px] text-ink-muted">{teaser}</p>
      )}
      {playing && <Sparkles key={`spark-${revealKey}`} />}
    </div>
  );
}
