"use client";

// /learn — the Learn surface (Curriculum milestone).
// B2 SHELL: level rail + header card + five surfaces (Course, Speak, Tests,
// Reading, Fun). Panes are wired in later steps; this page is NOT nav-linked
// until the build is complete.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Flame, ShieldCheck, Lock, Medal } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

type LessonListItem = {
  id: string;
  status: string;
  progress: { checkpoint?: { score: number; total: number } };
};

const LADDER = ["A1", "A2", "B1", "B2", "C1"] as const;
const SURFACES = ["Course", "Speak", "Tests", "Reading", "Fun"] as const;
type Surface = (typeof SURFACES)[number];

const INK_STRONG = "#3C352B";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;

const STAT_STYLES = [
  { bg: "#F1EEFE", fg: "#6D5BBF" }, // level
  { bg: "#FEEFEF", fg: "#C56A5E" }, // streak
  { bg: "#F7F0E2", fg: "#A8853F" }, // gold
  { bg: "#F0F2F5", fg: "#5F6B79" }, // silver
] as const;

export default function LearnPage() {
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const [myLevel, setMyLevel] = useState<string>("A1");
  const [goldCount, setGoldCount] = useState(0);
  const [silverCount, setSilverCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [surface, setSurface] = useState<Surface>("Course");

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/lessons");
      const j = (await r.json()) as { lessons?: LessonListItem[]; cefrLevel?: string | null };
      const lessons = Array.isArray(j.lessons) ? j.lessons : [];
      let gold = 0;
      let silver = 0;
      for (const l of lessons) {
        if (l.status !== "completed") continue;
        const cp = l.progress?.checkpoint;
        if (cp && cp.score === cp.total) gold += 1;
        else silver += 1;
      }
      setGoldCount(gold);
      setSilverCount(silver);
      if (j.cefrLevel && (LADDER as readonly string[]).includes(j.cefrLevel.toUpperCase())) {
        setMyLevel(j.cefrLevel.toUpperCase());
      }
    } catch {
      /* shell stays at defaults */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || isGuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set only after await, matching the app's existing pattern
    void refresh();
  }, [authReady, isGuest, refresh]);

  const myRank = Math.max(0, (LADDER as readonly string[]).indexOf(myLevel));
  const targetName = profile?.learning_target_language === "en" ? "English" : "Thai";

  const stats = [
    { n: myLevel, l: "Level", icon: ShieldCheck },
    { n: String(profile?.streak ?? 0), l: "Day streak", icon: Flame },
    { n: String(goldCount), l: "Gold", icon: Medal },
    { n: String(silverCount), l: "Silver", icon: Medal },
  ];

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#FAFAF6" }}>
      <AmbientBackground mode="ambient" />
      <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "22px 18px 96px" }}>

        {/* Level rail — display; the journey follows the learner's own level (+1 max). */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LADDER.map((lv, i) => {
            const done = i < myRank;
            const active = i === myRank;
            const open = i === myRank + 1;
            const locked = !done && !active && !open;
            return (
              <span key={lv} style={{
                ...font, display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 99,
                border: active ? "1px solid transparent" : `1px solid ${done ? "#E8C77A" : BORDER}`,
                background: active ? CTA : "#FFFFFF",
                color: active ? "#fff" : done ? "#A8853F" : open ? INK_STRONG : MUTED,
                opacity: locked ? 0.45 : 1,
              }}>
                {lv}
                {locked ? <Lock style={{ width: 10, height: 10 }} aria-hidden /> : null}
              </span>
            );
          })}
        </div>

        {/* Header card */}
        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "14px 15px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 46px", overflow: "hidden" }}>
              <Image src="/miomi/head-happy.png" alt="Miomi" width={40} height={40} style={{ objectFit: "contain" }} />
            </span>
            <div>
              <h1 style={{ ...font, fontSize: 17, fontWeight: 700, color: INK_STRONG, margin: 0, lineHeight: 1.2 }}>
                Your {targetName} path
              </h1>
              <p style={{ ...font, fontSize: 12, fontWeight: 600, color: MUTED, margin: "2px 0 0" }}>
                Planned by Miomi, walked together
              </p>
            </div>
          </div>
          {authReady && !isGuest ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {stats.map((s, i) => {
                const st = STAT_STYLES[i]!;
                const Icon = s.icon;
                return (
                  <div key={s.l} style={{ flex: 1, background: st.bg, borderRadius: 12, padding: "9px 4px", textAlign: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Icon style={{ width: 13, height: 13, color: st.fg }} strokeWidth={2.4} aria-hidden />
                      <b style={{ ...font, fontSize: 15, color: st.fg }}>{s.n}</b>
                    </span>
                    <span style={{ ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: st.fg, opacity: 0.75, display: "block", marginTop: 2 }}>{s.l}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Surfaces */}
        <div style={{ display: "flex", background: "#F1ECE3", borderRadius: 14, padding: 4, gap: 4, marginBottom: 16 }}>
          {SURFACES.map((s) => (
            <button key={s} onClick={() => setSurface(s)} style={{
              ...font, flex: 1, fontSize: 12, fontWeight: 700, padding: "8px 0",
              borderRadius: 10, border: "none", cursor: "pointer",
              background: surface === s ? "#FFFFFF" : "transparent",
              color: surface === s ? INK_STRONG : MUTED,
              boxShadow: surface === s ? "0 2px 6px rgba(74,65,54,.08)" : "none",
            }}>{s}</button>
          ))}
        </div>

        {!authReady || (!isGuest && !loaded) ? (
          <p style={{ ...font, fontSize: 13, color: MUTED }}>Loading…</p>
        ) : isGuest ? (
          <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 22, textAlign: "center" }}>
            <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              Your learning path lives in your Miomika account
            </p>
            <p style={{ ...font, fontSize: 12.5, color: MUTED, margin: "8px 0 16px", lineHeight: 1.5 }}>
              Sign up free and Miomi plans your whole journey — level by level, yours.
            </p>
            <Link href="/signup" style={{
              ...font, display: "inline-block", fontSize: 14, fontWeight: 700,
              padding: "12px 26px", borderRadius: 99, background: CTA, color: "#fff",
              textDecoration: "none", boxShadow: "0 4px 16px -4px rgba(52,169,143,0.40)",
            }}>
              Sign up free
            </Link>
          </div>
        ) : (
          <div style={{ background: "#FFFFFF", border: `1.5px dashed ${BORDER}`, borderRadius: 18, padding: 22, textAlign: "center" }}>
            <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              {surface === "Course" ? "Your journey is being laid out here" : `${surface} is being built here`}
            </p>
            <p style={{ ...font, fontSize: 12, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
              Step by step — Miomi first, always.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
