"use client";

// /learn — the Learn surface (Curriculum milestone).
// Course surface live: system-planned journey per level — units, lazy lesson
// building, checkpoints on the spine. Speak/Tests/Reading/Fun wire next.
// NOT nav-linked until the build is complete.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Flame, ShieldCheck, Lock, Medal } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

type LessonLite = {
  id: string;
  title_en: string;
  status: string;
  progress: { step?: number; checkpoint?: { score: number; total: number } };
};

type CurriculumUnit = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  lesson_titles: string[];
  lesson_ids: string[];
  status: string;
};

type CurriculumCheckpoint = { badge: string; after_unit: number; kind: "checkpoint" | "level_test" };

type CurriculumRow = {
  id: string;
  cefr_level: string;
  learning_target: string;
  status: string;
  plan: { units?: CurriculumUnit[]; checkpoints?: CurriculumCheckpoint[] };
  progress: Record<string, unknown>;
};

const LADDER = ["A1", "A2", "B1", "B2", "C1"] as const;
const SURFACES = ["Course", "Speak", "Tests", "Reading", "Fun"] as const;
type Surface = (typeof SURFACES)[number];

const TOPIC_HEX: Record<string, { edge: string; soft: string }> = {
  peach: { edge: "#FDBA74", soft: "#FEF1E3" },
  pink: { edge: "#F9A8D4", soft: "#FDEAF4" },
  lavender: { edge: "#C4B5FD", soft: "#F1EEFE" },
  mint: { edge: "#A7F3D0", soft: "#EBFBF4" },
  teal: { edge: "#7DD3C0", soft: "#E9F8F4" },
  coral: { edge: "#FCA5A5", soft: "#FEEFEF" },
};
const TOPIC_DEEP: Record<string, string> = {
  peach: "#B06A28", pink: "#C2497E", lavender: "#6D5BBF",
  mint: "#3E7A66", teal: "#3E9C82", coral: "#C56A5E",
};
const INK_STRONG = "#3C352B";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const GOLD_GRAD = "linear-gradient(135deg,#E8C77A,#C9A96E)";
const SILVER_GRAD = "linear-gradient(135deg,#E3E7ED,#AAB4C0)";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;

const STAT_STYLES = [
  { bg: "#F1EEFE", fg: "#6D5BBF" },
  { bg: "#FEEFEF", fg: "#C56A5E" },
  { bg: "#F7F0E2", fg: "#A8853F" },
  { bg: "#F0F2F5", fg: "#5F6B79" },
] as const;

function MedalDot({ gold }: { gold: boolean }) {
  return (
    <span style={{
      display: "inline-flex", width: 18, height: 18, borderRadius: "50%",
      background: gold ? GOLD_GRAD : SILVER_GRAD, flex: "0 0 18px",
      boxShadow: gold ? "0 2px 6px rgba(201,169,110,.4)" : "0 2px 6px rgba(150,160,175,.4)",
    }} />
  );
}

export default function LearnPage() {
  const router = useRouter();
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const [myLevel, setMyLevel] = useState<string>("A1");
  const [viewLevel, setViewLevel] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumRow | null>(null);
  const [lessonsById, setLessonsById] = useState<Map<string, LessonLite>>(new Map());
  const [goldCount, setGoldCount] = useState(0);
  const [silverCount, setSilverCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [surface, setSurface] = useState<Surface>("Course");
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [planning, setPlanning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const refresh = useCallback(async (levelAsk?: string) => {
    try {
      const q = levelAsk ? `?level=${encodeURIComponent(levelAsk)}` : "";
      const [curRes, lesRes] = await Promise.all([
        fetch(`/api/curriculum${q}`),
        fetch("/api/lessons"),
      ]);
      const curJson = (await curRes.json()) as { curriculum?: CurriculumRow | null; level?: string };
      const lesJson = (await lesRes.json()) as { lessons?: LessonLite[]; cefrLevel?: string | null };
      const lessons = Array.isArray(lesJson.lessons) ? lesJson.lessons : [];
      const map = new Map<string, LessonLite>();
      let gold = 0;
      let silver = 0;
      for (const l of lessons) {
        map.set(l.id, l);
        if (l.status !== "completed") continue;
        const cp = l.progress?.checkpoint;
        if (cp && cp.score === cp.total) gold += 1;
        else silver += 1;
      }
      setLessonsById(map);
      setGoldCount(gold);
      setSilverCount(silver);
      if (lesJson.cefrLevel && (LADDER as readonly string[]).includes(lesJson.cefrLevel.toUpperCase())) {
        setMyLevel(lesJson.cefrLevel.toUpperCase());
      }
      setCurriculum(curJson.curriculum ?? null);
      if (curJson.level) setViewLevel(curJson.level);
    } catch {
      setCurriculum(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || isGuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set only after await, matching the app's existing pattern
    void refresh();
  }, [authReady, isGuest, refresh]);

  const planJourney = useCallback(async () => {
    if (planning) return;
    setPlanning(true);
    setGenMsg("Miomi is planning your whole journey — give her a moment…");
    try {
      const r = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined }),
      });
      const j = (await r.json()) as { ok?: boolean };
      if (j.ok) {
        setGenMsg(null);
        await refresh(viewLevel ?? undefined);
      } else {
        setGenMsg("Miomi couldn't finish planning — try once more in a moment.");
      }
    } catch {
      setGenMsg("Something slipped — try once more.");
    } finally {
      setPlanning(false);
    }
  }, [planning, viewLevel, refresh]);

  const buildNextLesson = useCallback(async (unitPosition: number) => {
    if (building) return;
    setBuilding(true);
    setGenMsg("Miomi is planning your lesson — every word gets checked, give her a moment…");
    try {
      const r = await fetch("/api/curriculum/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined, unit_position: unitPosition }),
      });
      const j = (await r.json()) as { ok?: boolean; lessonId?: string };
      if (j.ok && j.lessonId) {
        setGenMsg(null);
        router.push(`/lessons/${j.lessonId}`);
      } else {
        setGenMsg("Miomi couldn't finish that one — try once more.");
      }
    } catch {
      setGenMsg("Something slipped — try once more.");
    } finally {
      setBuilding(false);
    }
  }, [building, viewLevel, router]);

  const myRank = Math.max(0, (LADDER as readonly string[]).indexOf(myLevel));
  const targetName = profile?.learning_target_language === "en" ? "English" : "Thai";
  const units = Array.isArray(curriculum?.plan?.units) ? curriculum.plan.units : [];
  const checkpoints = Array.isArray(curriculum?.plan?.checkpoints) ? curriculum.plan.checkpoints : [];

  const unitLessons = useCallback((u: CurriculumUnit): LessonLite[] =>
    (u.lesson_ids ?? []).map((id) => lessonsById.get(id)).filter(Boolean) as LessonLite[],
  [lessonsById]);
  const unitComplete = useCallback((u: CurriculumUnit): boolean => {
    const built = unitLessons(u);
    return (u.lesson_ids ?? []).length >= 4 && built.length >= 4 && built.every((l) => l.status === "completed");
  }, [unitLessons]);
  const unitAllGold = useCallback((u: CurriculumUnit): boolean =>
    unitLessons(u).every((l) => {
      const cp = l.progress?.checkpoint;
      return !!cp && cp.score === cp.total;
    }),
  [unitLessons]);
  const firstOpen = units.find((u) => !unitComplete(u))?.position ?? (units.length ? units.length + 1 : 0);
  const openUnit = expandedUnit ?? firstOpen;

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

        {/* Level rail — own level +1 is walkable; the rest waits. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LADDER.map((lv, i) => {
            const done = i < myRank;
            const isView = (viewLevel ?? myLevel) === lv;
            const open = i <= myRank + 1;
            return (
              <button key={lv} onClick={() => { if (!open) return; setViewLevel(lv); setExpandedUnit(null); void refresh(lv); }} style={{
                ...font, display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 99,
                border: isView ? "1px solid transparent" : `1px solid ${done ? "#E8C77A" : BORDER}`,
                background: isView ? CTA : "#FFFFFF",
                color: isView ? "#fff" : done ? "#A8853F" : open ? INK_STRONG : MUTED,
                opacity: open ? 1 : 0.45, cursor: open ? "pointer" : "default",
              }}>
                {lv}
                {!open ? <Lock style={{ width: 10, height: 10 }} aria-hidden /> : null}
              </button>
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
                Planned by Miomi — she walks every step with you~
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
              textDecoration: "none", boxShadow: CTA_SHADOW,
            }}>
              Sign up free
            </Link>
          </div>
        ) : surface !== "Course" ? (
          <div style={{ background: "#FFFFFF", border: `1.5px dashed ${BORDER}`, borderRadius: 18, padding: 22, textAlign: "center" }}>
            <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              {surface} is being built here
            </p>
            <p style={{ ...font, fontSize: 12, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
              Step by step — Miomi first, always.
            </p>
          </div>
        ) : !curriculum || !units.length ? (
          <div style={{
            border: "1.5px dashed #D9EBE4", borderRadius: 18, padding: 22, textAlign: "center",
            background: "linear-gradient(135deg,#E9F8F4,#F1EEFE)",
          }}>
            <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              Miomi plans your whole {viewLevel ?? myLevel} {targetName} journey
            </p>
            <p style={{ ...font, fontSize: 12, color: MUTED, margin: "6px 0 14px", lineHeight: 1.5 }}>
              8 units, 4 checkpoints — laid out around what you already know, built as you walk.
            </p>
            <button onClick={() => void planJourney()} disabled={planning} style={{
              ...font, fontSize: 14, fontWeight: 700, padding: "13px 26px", borderRadius: 99,
              border: "none", cursor: planning ? "default" : "pointer",
              background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: planning ? 0.7 : 1,
            }}>
              {planning ? "Miomi is planning…" : "Plan my journey"}
            </button>
            {genMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "10px 0 0" }}>{genMsg}</p> : null}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 10px" }}>
              <h2 style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
                {targetName} · {curriculum.cefr_level} journey
              </h2>
              <span style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                {units.length} units · {checkpoints.length} checkpoints
              </span>
            </div>
            <div style={{ borderLeft: `3px solid ${BORDER}`, marginLeft: 10, paddingLeft: 16 }}>
              {units.map((u) => {
                const tc = TOPIC_HEX[u.color] ?? TOPIC_HEX.peach;
                const deep = TOPIC_DEEP[u.color] ?? TOPIC_DEEP.peach;
                const built = unitLessons(u);
                const done = unitComplete(u);
                const allGold = done && unitAllGold(u);
                const isCurrent = u.position === firstOpen;
                const isFuture = u.position > firstOpen;
                const isOpen = u.position === openUnit;
                const cp = checkpoints.find((c) => c.after_unit === u.position);
                const cpReached = cp ? firstOpen > cp.after_unit : false;
                const firstNonGoldId = built.find((l) => {
                  const v = l.progress?.checkpoint;
                  return l.status === "completed" && !(v && v.score === v.total);
                })?.id;
                return (
                  <div key={u.position}>
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <span style={{
                        position: "absolute", left: -28.5, top: 14, width: 22, height: 22, borderRadius: "50%",
                        background: done ? (allGold ? GOLD_GRAD : SILVER_GRAD) : isCurrent ? CTA : "#FFFFFF",
                        border: done || isCurrent ? "2px solid transparent" : `2px solid ${BORDER}`,
                        boxShadow: isCurrent ? "0 0 0 4px rgba(52,169,143,.18)" : "none",
                        opacity: isFuture ? 0.6 : 1,
                      }} />
                      <div style={{
                        background: "#FFFFFF", border: `1px solid ${isCurrent ? "#7DD3C0" : BORDER}`,
                        borderRadius: 18, boxShadow: isCurrent ? "0 4px 14px rgba(52,169,143,.12)" : CARD_SHADOW,
                        overflow: "hidden", position: "relative",
                      }}>
                        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: tc.edge }} />
                        <button onClick={() => setExpandedUnit(isOpen ? -1 : u.position)} style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 13px 12px 16px",
                          background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                        }}>
                          <span style={{
                            ...font, width: 34, height: 34, borderRadius: 11, background: tc.soft, color: deep,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 700, flex: "0 0 34px",
                          }}>{u.position}</span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.title_en}</span>
                            <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>
                              {u.topic} · {built.length}/4 lessons{isCurrent ? " · You are here" : ""}
                            </span>
                          </span>
                          {done ? (
                            <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: allGold ? "#A8853F" : "#5F6B79", whiteSpace: "nowrap" }}>
                              <MedalDot gold={allGold} />{allGold ? "Gold" : "Silver"} · Completed
                            </span>
                          ) : (
                            <span style={{ ...font, fontSize: 11, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>
                              {isCurrent ? "" : "Up next"}
                            </span>
                          )}
                        </button>
                        {isOpen ? (
                          <div style={{ borderTop: `1px solid ${BORDER}`, padding: "4px 13px 12px 16px" }}>
                            {(u.lesson_titles ?? []).map((title, li) => {
                              const lesson = built[li];
                              if (lesson) {
                                const v = lesson.progress?.checkpoint;
                                const lGold = lesson.status === "completed" && !!v && v.score === v.total;
                                const lDone = lesson.status === "completed";
                                return (
                                  <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: li < 3 ? `1px solid ${BORDER}` : "none" }}>
                                    {lDone ? <MedalDot gold={lGold} /> : (
                                      <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #7DD3C0", flex: "0 0 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34A98F" }} />
                                      </span>
                                    )}
                                    <span style={{ flex: 1, minWidth: 0 }}>
                                      <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title_en}</span>
                                      <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                                        {lDone ? (lGold ? "Gold · Completed" : "Silver · Completed") : "In progress"}
                                      </span>
                                    </span>
                                    <Link href={`/lessons/${lesson.id}`} style={{
                                      ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99, textDecoration: "none",
                                      ...(lDone
                                        ? { border: `1px solid ${BORDER}`, color: MUTED, background: "transparent" }
                                        : { border: "none", color: "#fff", background: CTA, boxShadow: CTA_SHADOW }),
                                    }}>
                                      {lDone ? "Review" : "Continue"}
                                    </Link>
                                  </div>
                                );
                              }
                              const isNext = li === built.length && isCurrent;
                              return (
                                <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: li < 3 ? `1px solid ${BORDER}` : "none", opacity: isNext ? 1 : 0.5 }}>
                                  <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isNext ? "#7DD3C0" : BORDER}`, flex: "0 0 18px" }} />
                                  <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                                    <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>{isNext ? "Miomi builds it when you start" : "Up next"}</span>
                                  </span>
                                  {isNext ? (
                                    <button onClick={() => void buildNextLesson(u.position)} disabled={building} style={{
                                      ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                                      border: "none", cursor: building ? "default" : "pointer",
                                      background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: building ? 0.7 : 1,
                                    }}>
                                      {building ? "Planning…" : "Start"}
                                    </button>
                                  ) : null}
                                </div>
                              );
                            })}
                            {!allGold && done && firstNonGoldId ? (
                              <Link href={`/lessons/${firstNonGoldId}`} style={{ ...font, display: "inline-block", fontSize: 11.5, fontWeight: 700, color: "#3E9C82", textDecoration: "none", marginTop: 8 }}>
                                Retry for gold
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {cp ? (
                      <div style={{ position: "relative", marginBottom: 10 }}>
                        <span style={{
                          position: "absolute", left: -28.5, top: 14, width: 22, height: 22, borderRadius: "50%",
                          background: "#FFFFFF", border: `2px solid ${cpReached ? "#7DD3C0" : BORDER}`, opacity: cpReached ? 1 : 0.7,
                        }} />
                        <div style={{
                          display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF",
                          border: `1.5px ${cpReached ? "solid #7DD3C0" : `dashed ${BORDER}`}`, borderRadius: 18, padding: "11px 13px",
                        }}>
                          <span style={{
                            width: 34, height: 34, borderRadius: "50%", background: "#F1ECE3", color: MUTED,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "'Sarabun', sans-serif", fontSize: 16, fontWeight: 700, flex: "0 0 34px",
                          }}>{cp.badge}</span>
                          <span style={{ flex: 1 }}>
                            <span style={{ ...font, display: "block", fontSize: 13, fontWeight: 700, color: INK_STRONG }}>
                              {cp.kind === "level_test" ? `${curriculum.cefr_level} level test` : `Checkpoint ${cp.badge}`}
                            </span>
                            <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>
                              {cpReached ? "Miomi is preparing this — coming in an update" : `After unit ${cp.after_unit}`}
                            </span>
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Link href="/lessons" style={{
              display: "flex", alignItems: "center", gap: 11, textDecoration: "none",
              border: "1.5px dashed #D9EBE4", borderRadius: 18, padding: "13px 14px", marginTop: 14,
              background: "linear-gradient(135deg,#E9F8F4,#F1EEFE)",
            }}>
              <span style={{
                ...font, width: 34, height: 34, borderRadius: 11, background: CTA, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 19, fontWeight: 700, flex: "0 0 34px", boxShadow: CTA_SHADOW,
              }}>+</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG }}>Create your own lesson</span>
                <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
                  Any topic, your level — tell Miomi and she plans it just for you~
                </span>
              </span>
            </Link>
            <Link href="/talk" style={{
              display: "flex", alignItems: "center", gap: 11, textDecoration: "none",
              background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18,
              boxShadow: CARD_SHADOW, padding: "13px 14px", marginTop: 10,
            }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px", overflow: "hidden" }}>
                <Image src="/miomi/head-idle.png" alt="Miomi" width={30} height={30} style={{ objectFit: "contain" }} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG }}>Say it out loud with Miomi</span>
                <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
                  Everything you learn here, you two can chat about~
                </span>
              </span>
            </Link>
            {genMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "4px 0 0", textAlign: "center" }}>{genMsg}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
