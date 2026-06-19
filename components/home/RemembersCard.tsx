"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const INTROS: { th: string; en: string }[] = [
  { th: "มิโอมิยังจำได้นะคะ~", en: "Miomi remembers~" },
  { th: "หนูนึกถึงเรื่องนี้อยู่เลยค่ะ~", en: "I was just thinking about you~" },
  { th: "เรื่องที่หนูจำเกี่ยวกับคุณได้~", en: "Something I remember about you~" },
];

// Stored facts are third-person ("Has a dog named Coco"). Gently turn the common
// shapes into second person for a warmer read; fall back to the raw text otherwise.
function humanize(fact: string): string {
  const rules: [RegExp, string][] = [
    [/^is learning /i, "You're learning "],
    [/^has /i, "You have "],
    [/^have /i, "You have "],
    [/^wants to /i, "You want to "],
    [/^wants /i, "You want "],
    [/^works as /i, "You work as "],
    [/^works /i, "You work "],
    [/^lives in /i, "You live in "],
    [/^lives /i, "You live "],
    [/^loves /i, "You love "],
    [/^likes /i, "You like "],
    [/^enjoys /i, "You enjoy "],
    [/^is /i, "You're "],
  ];
  for (const [re, rep] of rules) {
    if (re.test(fact)) return fact.replace(re, rep);
  }
  return fact;
}

export function RemembersCard({ lang }: { lang: "th" | "en" }) {
  const [fact, setFact] = useState<string | null>(null);
  const [intro, setIntro] = useState<{ th: string; en: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_memories")
          .select("content")
          .order("created_at", { ascending: false })
          .limit(6);
        if (cancelled || error || !data || data.length === 0) return;
        const memories = data.map((r) => String(r.content)).filter(Boolean);
        if (!memories.length) return;
        const pick = memories[Math.floor(Math.random() * memories.length)];
        setFact(humanize(pick.trim()));
        setIntro(INTROS[Math.floor(Math.random() * INTROS.length)]);
      } catch {
        /* best-effort — show nothing on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fact || !intro) return null;

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card" style={{ position: "relative", overflow: "hidden" }}>
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          style={{ marginTop: "1px", display: "inline-flex", flex: "0 0 auto", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 9999, background: "#EEEAF7" }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#7C6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10a4 4 0 0 1 8 0c0 1.6-1 3-2.2 3.6V15a1.8 1.8 0 0 1-3.6 0v-1.4C9 13 8 11.6 8 10z" />
            <circle cx="6.5" cy="18" r="1" />
            <circle cx="9" cy="20.5" r="0.7" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <p className="text-[11.5px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif", color: "#7C6BA8" }}>
            {lang === "th" ? intro.th : intro.en}
          </p>
          <p className="mt-0.5 text-[13.5px]" style={{ fontFamily: "'Quicksand', sans-serif", color: "#2A2622" }}>
            {fact}
          </p>
        </div>
      </div>
    </div>
  );
}
