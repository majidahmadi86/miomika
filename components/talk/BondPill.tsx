"use client";

import { Heart } from "lucide-react";
import { deriveBond } from "@/lib/companion/bond";

export function BondPill({ points, uiLang }: { points: number; uiLang: "th" | "en" }) {
  const bond = deriveBond(points);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 11px 5px 10px",
        background: "rgba(255,255,255,0.85)",
        border: "0.5px solid #EDE8E0",
        borderRadius: "999px",
      }}
      aria-label={`${bond.hearts} hearts with Miomi`}
    >
      <Heart size={14} color="#E06B9A" fill="#F9C2DC" strokeWidth={2} />
      <span style={{ fontFamily: uiLang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif", fontSize: "12px", fontWeight: 600, color: "#993556" }}>
        {bond.hearts}
      </span>
      <span style={{ width: "30px", height: "4px", background: "#F3E6EC", borderRadius: "999px", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.round(bond.heartPct * 100)}%`, background: "#D4537E", borderRadius: "999px", transition: "width 0.5s ease-out" }} />
      </span>
    </div>
  );
}
