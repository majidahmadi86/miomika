"use client";

import Link from "next/link";
import { Gift } from "lucide-react";

const T = {
  th: { title: "ชวนเพื่อนมาด้วยกัน", pre: "คุณและเพื่อนได้เครดิต ", amount: "฿30", post: " ทั้งคู่", cta: "ชวนเลย" },
  en: { title: "Invite a friend", pre: "You both get ", amount: "฿30", post: " credit", cta: "Invite" },
};

export function InviteFriendCard({ lang }: { lang: "th" | "en" }) {
  const t = T[lang];
  return (
    <Link
      href="/invite"
      className="rounded-card border border-line bg-surface p-4 shadow-card block transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Gift className="h-4 w-4" style={{ color: "#2C8E76" }} strokeWidth={2} />
          <span className="text-[14px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif", color: "#1F7A68" }}>
            {t.title}
          </span>
        </span>
        <span className="text-[12.5px] font-semibold" style={{ color: "#2C8E76" }}>{t.cta} →</span>
      </div>
      <p className="mt-2 text-[11.5px] text-ink-muted">
        {t.pre}<span className="font-semibold text-earned-strong">{t.amount}</span>{t.post}
      </p>
    </Link>
  );
}
