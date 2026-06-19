"use client";

import { useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { deriveBond, BOND_STAGES } from "@/lib/companion/bond";

const DEMO_KEY = "miomika.bond.cardDemoSeen";
const LAST_HEARTS_KEY = "miomika.bond.lastHearts";

export function ClosenessCard({ points, lang }: { points: number; lang: "th" | "en" }) {
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

  const barRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const timers: number[] = [];
    const burst = (n: number) => {
      const host = burstRef.current;
      if (!host) return;
      for (let k = 0; k < n; k++) {
        const s = document.createElement("span");
        s.textContent = "\u2665";
        s.style.cssText = `position:absolute;left:${k * 8}px;bottom:0;font-size:13px;color:#D4537E;pointer-events:none;animation:miomiBondSpark .9s ease forwards;animation-delay:${k * 40}ms;`;
        host.appendChild(s);
        timers.push(window.setTimeout(() => s.remove(), 1000 + k * 40));
      }
    };
    const settle = () => { bar.style.transition = "width .5s ease"; bar.style.width = `${restPct}%`; };

    let demoSeen = false;
    let lastHearts = 0;
    try {
      demoSeen = window.localStorage.getItem(DEMO_KEY) === "1";
      lastHearts = Number(window.localStorage.getItem(LAST_HEARTS_KEY) ?? "0");
    } catch { /* non-fatal */ }

    if (!demoSeen && bond.hearts === 0) {
      bar.style.transition = "none"; bar.style.width = "0%";
      timers.push(window.setTimeout(() => { bar.style.transition = "width 1.2s ease"; bar.style.width = "100%"; }, 700));
      timers.push(window.setTimeout(() => burst(6), 1950));
      timers.push(window.setTimeout(settle, 2700));
      try { window.localStorage.setItem(DEMO_KEY, "1"); } catch { /* non-fatal */ }
    } else if (bond.hearts > lastHearts) {
      bar.style.transition = "none"; bar.style.width = "0%";
      timers.push(window.setTimeout(() => { bar.style.transition = "width .9s ease"; bar.style.width = "100%"; }, 350));
      timers.push(window.setTimeout(() => burst(5), 1300));
      timers.push(window.setTimeout(settle, 1900));
    } else {
      bar.style.transition = "none"; bar.style.width = "0%";
      timers.push(window.setTimeout(() => { bar.style.transition = "width .7s ease"; bar.style.width = `${restPct}%`; }, 250));
    }

    try { window.localStorage.setItem(LAST_HEARTS_KEY, String(bond.hearts)); } catch { /* non-fatal */ }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [bond.hearts, restPct]);

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card" style={{ position: "relative", overflow: "hidden" }}>
      <style>{`@keyframes miomiBondSpark{0%{opacity:0;transform:translateY(0) scale(.5)}30%{opacity:1}100%{opacity:0;transform:translateY(-22px) scale(1)}}`}</style>
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
        <div ref={barRef} className="h-full rounded-full" style={{ width: `${restPct}%`, background: "#D4537E" }} />
      </div>
      <p className="mt-2 text-[11.5px] text-ink-muted">{teaser}</p>
      <div ref={burstRef} aria-hidden="true" style={{ position: "absolute", right: "18px", top: "34px", width: 0, height: 0 }} />
    </div>
  );
}
