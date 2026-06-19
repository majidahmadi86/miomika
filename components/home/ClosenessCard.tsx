"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { deriveBond, BOND_STAGES } from "@/lib/companion/bond";

const LAST_HEARTS_KEY = "miomika.bond.lastHearts";

function Sparkles() {
  const arr = [-30, -18, -6, 6, 18, 30];
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "40px", width: 0, height: 0 }}>
      {arr.map((dx, i) => (
        <span key={i} style={{ position: "absolute", left: `${dx}px`, bottom: 0, fontSize: `${13 + (i % 3)}px`, color: "#D4537E", animation: "miomiBondSpark 1.1s ease forwards", animationDelay: `${i * 55}ms` }}>{"\u2665"}</span>
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

  const [barPct, setBarPct] = useState(0);
  const [barAnim, setBarAnim] = useState(false);
  const [sparkKey, setSparkKey] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const [fallbackReady, setFallbackReady] = useState(false);
  const playedRef = useRef(false);
  const prevHeartsRef = useRef<number | null>(null);
  const forceRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => setFallbackReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      try {
        prevHeartsRef.current = Number(window.localStorage.getItem(LAST_HEARTS_KEY) ?? "0");
        forceRef.current = window.location.search.includes("bonddemo");
      } catch {
        prevHeartsRef.current = 0;
      }
    }
    const gateOpen = active || forceRef.current || fallbackReady;
    if (!gateOpen) {
      console.log("[ClosenessCard] waiting for home to be visible");
      return;
    }

    const prev = prevHeartsRef.current ?? 0;
    const earned = bond.hearts > prev;
    const timers: number[] = [];
    const fire = () => setSparkKey((k) => k + 1);

    if (!playedRef.current) {
      playedRef.current = true;
      const full = earned || restPct < 10;
      console.log("[ClosenessCard] reveal", { hearts: bond.hearts, restPct, earned, full });
      setBarAnim(false); setBarPct(0);
      timers.push(window.setTimeout(() => { setBarAnim(true); setBarPct(full ? 100 : restPct); }, 500));
      timers.push(window.setTimeout(() => {
        fire();
        if (earned) setCaption(lang === "en" ? "+1 heart · for showing up~" : "+1 ดวงใจ · ที่แวะมาหากันวันนี้~");
        else if (restPct < 10) setCaption(lang === "en" ? "this fills as we spend time~" : "เต็มขึ้นเรื่อยๆ เมื่อเราใช้เวลาด้วยกัน~");
      }, 2100));
      if (full) timers.push(window.setTimeout(() => setBarPct(restPct), 2700));
      timers.push(window.setTimeout(() => setCaption(null), 4800));
    } else if (bond.hearts > prev) {
      console.log("[ClosenessCard] earn after reveal", { from: prev, to: bond.hearts });
      setBarAnim(false); setBarPct(0);
      timers.push(window.setTimeout(() => { setBarAnim(true); setBarPct(100); }, 300));
      timers.push(window.setTimeout(() => { fire(); setCaption(lang === "en" ? "+1 heart · for showing up~" : "+1 ดวงใจ · ที่แวะมาหากันวันนี้~"); }, 1900));
      timers.push(window.setTimeout(() => setBarPct(restPct), 2500));
      timers.push(window.setTimeout(() => setCaption(null), 4200));
    } else {
      setBarAnim(true); setBarPct(restPct);
    }

    prevHeartsRef.current = bond.hearts;
    try { window.localStorage.setItem(LAST_HEARTS_KEY, String(bond.hearts)); } catch { /* non-fatal */ }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [active, fallbackReady, bond.hearts, restPct, lang]);

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card" style={{ position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes miomiBondSpark{0%{opacity:0;transform:translateY(0) scale(.5)}30%{opacity:1}100%{opacity:0;transform:translateY(-26px) scale(1)}}`}</style>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" style={{ color: "#E06B9A" }} fill="#F9C2DC" strokeWidth={2} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif", color: "#993556" }}>{stageLabel}</span>
        </span>
        <span className="flex items-center gap-1" style={{ color: "#993556" }}>
          <Heart className="h-[15px] w-[15px]" style={{ color: "#E06B9A" }} fill="#F9C2DC" strokeWidth={2} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif" }}>{bond.hearts}</span>
        </span>
      </div>
      <div className="mt-3 h-[7px] overflow-hidden rounded-full" style={{ background: "#F3E6EC" }}>
        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: "#D4537E", transition: barAnim ? "width 1.4s ease" : "none" }} />
      </div>
      {caption ? (
        <p className="mt-2 text-[11.5px] font-medium" style={{ color: "#993556" }}>{caption}</p>
      ) : (
        <p className="mt-2 text-[11.5px] text-ink-muted">{teaser}</p>
      )}
      {sparkKey > 0 && <Sparkles key={sparkKey} />}
    </div>
  );
}
