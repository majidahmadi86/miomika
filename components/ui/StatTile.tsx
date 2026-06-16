"use client";
import type { ReactNode } from "react";

export function StatTile({
  icon,
  value,
  label,
  tone = "teal",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: "teal" | "gold";
}) {
  const circle =
    tone === "gold" ? "bg-earned-soft text-earned-strong" : "bg-accent-soft text-accent";
  const num = tone === "gold" ? "text-earned-strong" : "text-ink";
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] ${circle}`}>
        {icon}
      </div>
      <p
        className={`text-[27px] font-semibold leading-none tracking-tight ${num}`}
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[12.5px] font-medium text-ink-muted">{label}</p>
    </div>
  );
}
