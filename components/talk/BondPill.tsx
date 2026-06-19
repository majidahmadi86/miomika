"use client";

import { Heart } from "lucide-react";
import { deriveBond } from "@/lib/companion/bond";

export function BondPill({ points, uiLang }: { points: number; uiLang: "th" | "en" }) {
  const bond = deriveBond(points);
  const label = uiLang === "en" ? bond.label.en : bond.label.th;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "5px 12px 5px 10px",
        background: "rgba(255,255,255,0.85)",
        border: "0.5px solid #EDE8E0",
        borderRadius: "999px",
      }}
      aria-label={`Closeness with Miomi: ${label}, ${points} bond`}
    >
      <Heart size={13} color="#F19CC4" fill="#F9C2DC" strokeWidth={2} />
      <span style={{ fontFamily: uiLang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif", fontSize: "11px", fontWeight: 600, color: "#6B5E4E" }}>
        {label}
      </span>
      <span style={{ width: "34px", height: "4px", background: "#F3E6EC", borderRadius: "999px", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.round(bond.pctToNext * 100)}%`, background: "linear-gradient(90deg,#F9A8D4,#F178B6)", borderRadius: "999px", transition: "width 0.5s ease-out" }} />
      </span>
    </div>
  );
}
