"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, type CSSProperties, type FormEvent } from "react";
import type { RangePreset } from "@/lib/admin/time-range";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "custom", label: "Custom" },
];

function toDateInput(isoOrEmpty: string): string {
  if (!isoOrEmpty) return "";
  const d = new Date(isoOrEmpty);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function RangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get("range") || "7d").toLowerCase() as RangePreset;
  const active: RangePreset = PRESETS.some((p) => p.id === current) ? current : "7d";

  const [from, setFrom] = useState(toDateInput(sp.get("from") ?? ""));
  const [to, setTo] = useState(toDateInput(sp.get("to") ?? ""));

  const navigate = useCallback(
    (preset: RangePreset, customFrom?: string, customTo?: string) => {
      const next = new URLSearchParams(sp.toString());
      // Drop stale custom bounds when switching to a preset.
      next.delete("from");
      next.delete("to");
      if (preset === "custom") {
        next.set("range", "custom");
        if (customFrom) next.set("from", customFrom);
        if (customTo) next.set("to", customTo);
      } else {
        next.set("range", preset);
      }
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, sp],
  );

  function onCustomSubmit(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    navigate("custom", from, to);
  }

  const seg: CSSProperties = {
    display: "inline-flex",
    border: "0.5px solid #EDE8E0",
    borderRadius: 8,
    overflow: "hidden",
    background: "#FBFAF6",
  };
  const btn = (on: boolean): CSSProperties => ({
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: on ? 700 : 500,
    fontFamily: "inherit",
    border: "none",
    cursor: "pointer",
    background: on ? "#EAF6F1" : "transparent",
    color: on ? "#1F7A68" : "#6b675f",
    borderRight: "0.5px solid #EDE8E0",
  });
  const input: CSSProperties = {
    padding: "4px 8px",
    border: "0.5px solid #D9D3C8",
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "inherit",
    background: "#fff",
    color: "#2A2A28",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={seg} role="group" aria-label="Time range">
        {PRESETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            style={{ ...btn(active === p.id), borderRight: i === PRESETS.length - 1 ? "none" : btn(false).borderRight }}
            onClick={() => {
              if (p.id === "custom") {
                navigate("custom", from || undefined, to || undefined);
              } else {
                navigate(p.id);
              }
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <form onSubmit={onCustomSubmit} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={input} aria-label="From date" />
          <span style={{ fontSize: 11, color: "#9A8B73" }}>·</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={input} aria-label="To date" />
          <button
            type="submit"
            style={{
              padding: "4px 10px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "inherit",
              border: "0.5px solid #C9E5DC",
              background: "#EAF6F1",
              color: "#1F7A68",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
