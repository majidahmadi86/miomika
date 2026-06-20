"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Compact, UI-integrated memory line for the MOBILE home closeness card.
// Mirrors components/home/RemembersCard.tsx (desktop) data path, but renders as
// a second row INSIDE the closeness card rather than a separate surface, and is
// tilde-free (display copy). Tap stashes the fact and opens /talk warmly.

const REMEMBER_LABEL = { th: "หนูจำได้นะ", en: "I remember" };
const INVITE = {
  th: "เล่าเรื่องของคุณให้หนูฟังสิคะ เดี๋ยวหนูจำไว้ให้เอง",
  en: "Tell me about yourself — I'll remember",
};

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

export function MemoryLine({ lang }: { lang: "th" | "en" }) {
  const router = useRouter();
  const [memories, setMemories] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
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
        const list = shuffle(
          data.map((r) => humanize(String(r.content).trim())).filter(Boolean),
        );
        if (list.length) setMemories(list);
      } catch {
        /* best-effort — fall back to the invite */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (memories.length < 2) return;
    const tick = window.setInterval(() => {
      setShown(false);
      window.setTimeout(() => {
        const next = (idxRef.current + 1) % memories.length;
        idxRef.current = next;
        setIdx(next);
        setShown(true);
      }, 420);
    }, 11000);
    return () => window.clearInterval(tick);
  }, [memories.length]);

  const hasMemory = memories.length > 0;
  const fact = hasMemory ? memories[idx] ?? memories[0] : "";

  const handleTap = () => {
    if (hasMemory) {
      try {
        window.sessionStorage.setItem("miomika.talk.seed", fact);
      } catch {
        /* non-fatal */
      }
    }
    router.push("/talk");
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label={lang === "th" ? "คุยกับมิโอมิเรื่องนี้" : "Chat with Miomi about this"}
      style={{
        pointerEvents: "auto",
        width: "100%",
        marginTop: "9px",
        paddingTop: "9px",
        border: "none",
        borderTop: "1px solid rgba(232,229,223,0.7)",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        textAlign: "left",
        cursor: "pointer",
        appearance: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          width: 22,
          height: 22,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 9999,
          background: "#F5EEF6",
        }}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#A98BBE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 10a4 4 0 0 1 8 0c0 1.6-1 3-2.2 3.6V15a1.8 1.8 0 0 1-3.6 0v-1.4C9 13 8 11.6 8 10z" />
          <circle cx="6.5" cy="18" r="1" />
          <circle cx="9" cy="20.5" r="0.7" />
        </svg>
      </span>

      <span style={{ minWidth: 0, flex: 1, opacity: shown ? 1 : 0, transition: "opacity .42s ease" }}>
        {hasMemory ? (
          <>
            <span
              style={{
                display: "block",
                fontFamily: lang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
                fontSize: "10.5px",
                fontWeight: 600,
                color: "#A98BBE",
                lineHeight: 1.2,
              }}
            >
              {lang === "th" ? REMEMBER_LABEL.th : REMEMBER_LABEL.en}
            </span>
            <span
              style={{
                display: "block",
                marginTop: "1px",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "12.5px",
                fontWeight: 500,
                color: "#4A4038",
                lineHeight: 1.35,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fact}
            </span>
          </>
        ) : (
          <span
            style={{
              display: "block",
              fontFamily: lang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              color: "#9A8B73",
              lineHeight: 1.35,
            }}
          >
            {lang === "th" ? INVITE.th : INVITE.en}
          </span>
        )}
      </span>

      <span aria-hidden style={{ flex: "0 0 auto", color: "#CBBFD9" }}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
    </button>
  );
}
