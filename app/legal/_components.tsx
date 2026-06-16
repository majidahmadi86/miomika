import type { ReactNode } from "react";

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mb-2 mt-8 text-[17px] font-semibold text-ink">{children}</h2>;
}
export function P({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-[14px] leading-relaxed text-ink-muted">{children}</p>;
}
export function LI({ children }: { children: ReactNode }) {
  return <li className="mb-1.5 ml-4 list-disc text-[14px] leading-relaxed text-ink-muted">{children}</li>;
}
export function Notice({ children }: { children: ReactNode }) {
  return <div className="mb-6 rounded-card border border-line bg-surface-2 p-4 text-[12px] leading-relaxed text-ink-subtle">{children}</div>;
}
export function DocTitle({ title, date }: { title: string; date: string }) {
  return (
    <>
      <h1 className="text-[26px] font-semibold text-ink">{title}</h1>
      <p className="mt-1 text-[13px] text-ink-subtle">{date}</p>
    </>
  );
}
