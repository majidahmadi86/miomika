"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INTROS: { th: string; en: string }[] = [
  { th: "มิโอมิยังจำได้นะคะ", en: "Miomi still remembers" },
  { th: "หนูนึกถึงเรื่องนี้อยู่เลยค่ะ", en: "I was just thinking about this" },
  { th: "เรื่องที่หนูจำเกี่ยวกับคุณได้", en: "Something I remember about you" },
  { th: "หนูสงสัยอยู่ว่าตอนนี้เป็นยังไงบ้าง", en: "I wonder how this is going" },
  { th: "หนูเก็บเรื่องนี้ไว้ในใจนะคะ", en: "I'm keeping this close" },
];

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RemembersCard({ lang }: { lang: "th" | "en" }) {
  const router = useRouter();
  const [memories, setMemories] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [introIdx, setIntroIdx] = useState(0);
  const [shown, setShown] = useState(true);
  const idxRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("user_memories")
          .select("content")
          .order("created_at", { ascending: false })
          .limit(12);
        if (cancelled || error || !data) return;
        const list = shuffle(data.map((r) => humanize(String(r.content).trim())).filter(Boolean));
        if (list.length) {
          setMemories(list);
          setIntroIdx(Math.floor(Math.random() * INTROS.length));
        }
      } catch {
        /* best-effort — show nothing on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (memories.length === 0) return;
    const tick = window.setInterval(() => {
      setShown(false);
      window.setTimeout(() => {
        const next = (idxRef.current + 1) % memories.length;
        idxRef.current = next;
        setIdx(next);
        setIntroIdx((p) => (p + 1) % INTROS.length);
        setShown(true);
      }, 450);
    }, 10000);
    return () => window.clearInterval(tick);
  }, [memories.length]);

  if (memories.length === 0) return null;

  const fact = memories[idx] ?? memories[0];
  const intro = INTROS[introIdx] ?? INTROS[0];

  const openChat = () => {
    try {
      window.sessionStorage.setItem("miomika.talk.seed", fact);
    } catch {
      /* non-fatal */
    }
    router.push("/talk");
  };

  return (
    <button
      type="button"
      onClick={openChat}
      aria-label={lang === "th" ? "คุยกับมิโอมิเรื่องนี้" : "Chat with Miomi about this"}
      className="rounded-card border border-line bg-surface p-4 shadow-card"
      style={{ position: "relative", overflow: "hidden", width: "100%", display: "block", textAlign: "left", cursor: "pointer", appearance: "none" }}
    >
      <div className="flex items-start gap-2.5" style={{ opacity: shown ? 1 : 0, transition: "opacity .45s ease" }}>
        <span aria-hidden="true" style={{ marginTop: "1px", display: "inline-flex", flex: "0 0 auto", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: 9999, background: "#EEEAF7" }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#7C6BA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 10a4 4 0 0 1 8 0c0 1.6-1 3-2.2 3.6V15a1.8 1.8 0 0 1-3.6 0v-1.4C9 13 8 11.6 8 10z" />
            <circle cx="6.5" cy="18" r="1" />
            <circle cx="9" cy="20.5" r="0.7" />
          </svg>
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="text-[11.5px] font-semibold" style={{ fontFamily: "'Quicksand', sans-serif", color: "#7C6BA8" }}>{lang === "th" ? intro.th : intro.en}</p>
          <p className="mt-0.5 text-[13.5px]" style={{ fontFamily: "'Quicksand', sans-serif", color: "#2A2622" }}>{fact}</p>
        </div>
        <span aria-hidden="true" style={{ marginTop: "2px", flex: "0 0 auto", color: "#C9BEDF" }}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </div>
    </button>
  );
}
