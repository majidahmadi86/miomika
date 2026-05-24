"use client";

import { Heart, Zap, Brain } from "lucide-react";

interface FuelPillProps {
  heart: number;
  zap: number;
  brain: number;
}

export function FuelPill({ heart, zap, brain }: FuelPillProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        background: "rgba(255,255,255,0.85)",
        border: "0.5px solid #EDE8E0",
        borderRadius: "999px",
      }}
      aria-label={`Fuel: heart ${heart}, energy ${zap}, focus ${brain}`}
    >
      <FuelChip Icon={Heart} value={heart} color="#F9A8D4" />
      <Divider />
      <FuelChip Icon={Zap} value={zap} color="#C9A96E" />
      <Divider />
      <FuelChip Icon={Brain} value={brain} color="#7DD3C0" />
    </div>
  );
}

function FuelChip({
  Icon,
  value,
  color,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  value: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
      <Icon size={12} color={color} strokeWidth={2} />
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "10px",
          fontWeight: 600,
          color: "#1A1A18",
        }}
      >
        {Math.round(value)}
      </span>
    </div>
  );
}

function Divider() {
  return <span style={{ width: "1px", height: "10px", background: "#EDE8E0" }} />;
}
