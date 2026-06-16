import Link from "next/link";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

export default async function HelpLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const lang = store.get("ui-language")?.value === "th" ? "th" : "en";
  const back = lang === "th" ? "← กลับไปที่ Miomika" : "← Back to Miomika";
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto w-full max-w-[760px] px-5 py-10 md:px-8 md:py-14">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/me" className="text-[13px] font-medium text-accent">{back}</Link>
          <span className="text-[15px] font-semibold" style={{ color: "var(--mk-earned)", fontFamily: "'Quicksand', sans-serif" }}>miomika</span>
        </div>
        {children}
      </div>
    </div>
  );
}
