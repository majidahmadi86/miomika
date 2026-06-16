import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-[760px] px-5 py-10 md:px-8 md:py-14">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/me" className="text-[13px] font-medium text-accent">← Back to Miomika</Link>
          <span className="text-[15px] font-semibold" style={{ color: "var(--mk-earned)", fontFamily: "'Quicksand', sans-serif" }}>miomika</span>
        </div>
        {children}
      </div>
    </div>
  );
}
