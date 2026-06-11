"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

type LessonListItem = {
  id: string;
  title_en: string;
  title_th: string | null;
  topic: string;
  color: string;
  cefr_level: string;
  learning_target: string;
  status: string;
  position: number;
  words_count: number;
  phrases_count: number;
  has_checkpoint: boolean;
  progress: { step?: number; completed_at?: string | null };
};

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
const INK = "#4A4136";
const INK_STRONG = "#3C352B";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";

function pctFor(l: LessonListItem): number {
  if (l.status === "completed") return 100;
  const step = typeof l.progress?.step === "number" ? l.progress.step : 0;
  return Math.min(95, Math.round((step / 5) * 100));
}

function YarnRing({ pct, edge, done }: { pct: number; edge: string; done: boolean }) {
  const dash = 113;
  const offset = dash - (dash * pct) / 100;
  return (
    <div style={{ position: "relative", width: 46, height: 46, flex: "0 0 46px" }}>
      <svg viewBox="0 0 46 46" style={{ width: 46, height: 46, transform: "rotate(-90deg)" }}>
        <circle cx="23" cy="23" r="18" fill="none" stroke={BORDER} strokeWidth="4" />
        <circle
          cx="23" cy="23" r="18" fill="none"
          stroke={done ? "#7DD3C0" : edge}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={dash} strokeDashoffset={offset}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, fontWeight: 700, color: MUTED,
        fontFamily: "'Quicksand', sans-serif",
      }}>
        {done ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#3E9C82" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-10" /></svg>
        ) : (
          `${pct}%`
        )}
      </span>
    </div>
  );
}

function GoldStar() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 18, height: 18, borderRadius: "50%",
      background: "linear-gradient(135deg,#E8C77A,#C9A96E)",
      boxShadow: "0 2px 6px rgba(201,169,110,.4)", marginRight: 6,
    }}>
      <svg viewBox="0 0 24 24" width="10" height="10" fill="#fff"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3z" /></svg>
    </span>
  );
}

export default function LessonsPage() {
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const [lessons, setLessons] = useState<LessonListItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [planLevel, setPlanLevel] = useState<string>("auto");
  const [planTarget, setPlanTarget] = useState<string>("auto");
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const planRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/lessons");
      const j = (await r.json()) as { lessons?: LessonListItem[] };
      setLessons(Array.isArray(j.lessons) ? j.lessons : []);
    } catch {
      setLessons([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || isGuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set only after await, matching the app's existing pattern
    void refresh();
  }, [authReady, isGuest, refresh]);

  const generate = useCallback(async (topicOverride?: string) => {
    if (generating) return;
    setGenerating(true);
    setGenMsg("Miomi is planning your lesson — every word gets checked, give her a moment…");
    try {
      const r = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: (topicOverride ?? topic).trim() || undefined,
          level: planLevel === "auto" ? undefined : planLevel,
          target: planTarget === "auto" ? undefined : planTarget,
        }),
      });
      const j = (await r.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        setGenMsg(null);
        setTopic("");
        setAskOpen(false);
        await refresh();
      } else {
        setGenMsg("Miomi couldn't finish planning that one — try once more, or a different topic.");
      }
    } catch {
      setGenMsg("Something slipped — try once more.");
    } finally {
      setGenerating(false);
    }
  }, [generating, topic, planLevel, planTarget, refresh]);

  const doneCount = lessons.filter((l) => l.status === "completed").length;
  const learningCount = lessons.filter((l) => l.status === "in_progress").length;
  const font = { fontFamily: "'Quicksand', sans-serif" } as const;

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#FAFAF6" }}>
      <AmbientBackground mode="ambient" />
      <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "22px 18px 96px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ ...font, fontSize: 23, fontWeight: 700, color: INK_STRONG, margin: 0 }}>Lessons</h1>
          {authReady && !isGuest ? (
            <button onClick={() => { setAskOpen(true); setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); }} style={{
              ...font, fontSize: 12.5, fontWeight: 700, padding: "9px 16px", borderRadius: 99,
              border: "none", cursor: "pointer", background: CTA, color: "#fff", boxShadow: CTA_SHADOW,
            }}>+ Plan a lesson</button>
          ) : null}
        </div>
        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "14px 15px", margin: "10px 0 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 42, height: 42, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 42px", overflow: "hidden" }}>
              <Image src="/miomi/head-idle.png" alt="Miomi" width={38} height={38} style={{ objectFit: "contain" }} />
            </span>
            <p style={{ ...font, flex: 1, fontSize: 13.5, fontWeight: 700, color: INK_STRONG, margin: 0, lineHeight: 1.4 }}>
              {profile?.display_name ? `Hi ${profile.display_name}~` : "Hi~"} pick a lesson — I will walk it with you.
            </p>
            {profile?.level ? (
              <span style={{ ...font, fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#F1EEFE", color: "#6D5BBF", flex: "0 0 auto" }}>Lv.{profile.level}</span>
            ) : null}
          </div>
          {authReady && !isGuest ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {[
                { n: String(profile?.streak ?? 0), l: "Day streak", bg: "#FEEFEF", fg: "#C56A5E" },
                { n: String(profile?.miomi_stars ?? 0), l: "Miomi stars", bg: "#F7F0E2", fg: "#A8853F" },
                { n: String(doneCount), l: "Completed", bg: "#E9F8F4", fg: "#3E9C82" },
                { n: String(learningCount), l: "Learning", bg: "#F1EEFE", fg: "#6D5BBF" },
              ].map((s) => (
                <div key={s.l} style={{ flex: 1, background: s.bg, borderRadius: 12, padding: "9px 4px", textAlign: "center" }}>
                  <b style={{ ...font, fontSize: 16, display: "block", color: s.fg }}>{s.n}</b>
                  <span style={{ ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: s.fg, opacity: 0.75 }}>{s.l}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {!authReady || (!isGuest && !loaded) ? (
          <p style={{ ...font, fontSize: 13, color: MUTED }}>Loading…</p>
        ) : isGuest ? (
          <div style={{
            background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18,
            boxShadow: CARD_SHADOW, padding: 22, textAlign: "center",
          }}>
            <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              Lessons live in your Miomika account
            </p>
            <p style={{ ...font, fontSize: 12.5, color: MUTED, margin: "8px 0 16px", lineHeight: 1.5 }}>
              Sign up free and Miomi plans real lessons for you — saved, tracked, yours.
            </p>
            <Link href="/signup" style={{
              ...font, display: "inline-block", fontSize: 14, fontWeight: 700,
              padding: "12px 26px", borderRadius: 99, background: CTA, color: "#fff",
              textDecoration: "none", boxShadow: CTA_SHADOW,
            }}>
              Sign up free
            </Link>
          </div>
        ) : (
          <>
            {lessons.map((l) => {
              const tc = TOPIC_HEX[l.color] ?? TOPIC_HEX.peach;
              const done = l.status === "completed";
              const inProgress = l.status === "in_progress";
              const pct = pctFor(l);
              const stepNow = done ? 5 : Math.min(typeof l.progress?.step === "number" ? l.progress.step : 0, 5);
              return (
                <div key={l.id} style={{
                  position: "relative", background: "#FFFFFF", border: `1px solid ${BORDER}`,
                  borderRadius: 18, boxShadow: CARD_SHADOW, padding: 16, marginBottom: 12, overflow: "hidden",
                }}>
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: tc.edge }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <div style={{ ...font, fontSize: 15.5, fontWeight: 700, color: INK_STRONG }}>{l.title_en}</div>
                      {l.title_th ? (
                        <div style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 13.5, color: MUTED, marginTop: 2 }}>{l.title_th}</div>
                      ) : null}
                    </div>
                    <YarnRing pct={pct} edge={tc.edge} done={done} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                    {([
                      { t: l.learning_target === "en" ? "English" : "Thai", bg: "#E9F8F4", fg: "#3E9C82" },
                      { t: l.topic, bg: tc.soft, fg: TOPIC_DEEP[l.color] ?? TOPIC_DEEP.peach },
                      { t: `${l.words_count} words`, bg: "#FFFFFF", fg: MUTED, bd: BORDER },
                      { t: `${l.phrases_count} phrases`, bg: "#FFFFFF", fg: MUTED, bd: BORDER },
                      ...(l.has_checkpoint ? [{ t: "Checkpoint", bg: "#FDEAF4", fg: "#C2497E" }] : []),
                      { t: l.cefr_level, bg: "#F1EEFE", fg: "#6D5BBF" },
                    ] as Array<{ t: string; bg: string; fg: string; bd?: string }>).map((chip) => (
                      <span key={chip.t} style={{
                        ...font, fontSize: 11, fontWeight: 700, padding: "4px 10px",
                        borderRadius: 99, background: chip.bg, color: chip.fg,
                        border: chip.bd ? `1px solid ${chip.bd}` : "none",
                      }}>{chip.t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ ...font, display: "inline-flex", alignItems: "center", fontSize: 10.5, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: done ? "#3E9C82" : MUTED }}>
                        {done ? (<><GoldStar />Completed</>) : inProgress ? "In progress" : "Up next"}
                      </span>
                      <span style={{ display: "flex", gap: 4, alignItems: "center" }} aria-label={`Step ${Math.min(stepNow + 1, 5)} of 5`}>
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span key={i} style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: done || i < stepNow ? "#7DD3C0" : "#FFFFFF",
                            border: `1.5px solid ${done || i < stepNow ? "#7DD3C0" : i === stepNow && inProgress ? tc.edge : BORDER}`,
                          }} />
                        ))}
                      </span>
                    </span>
                    <Link href={`/lessons/${l.id}`} style={{
                      ...font, fontSize: 12.5, fontWeight: 700, padding: "9px 18px",
                      borderRadius: 99, textDecoration: "none",
                      ...(done
                        ? { border: `1px solid ${BORDER}`, color: MUTED, background: "transparent" }
                        : { border: "none", color: "#fff", background: CTA, boxShadow: CTA_SHADOW }),
                    }}>
                      {done ? "Review" : inProgress ? "Continue" : "Start"}
                    </Link>
                  </div>
                </div>
              );
            })}

            <div ref={planRef} style={{
              border: "1.5px dashed #D9EBE4", borderRadius: 18, padding: 16, textAlign: "center",
              background: "linear-gradient(135deg,#E9F8F4,#F1EEFE)", marginTop: lessons.length ? 6 : 0,
            }}>
              <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
                {lessons.length ? "+ Ask Miomi for a lesson on anything" : "Ask Miomi to plan your first lesson"}
              </p>
              <p style={{ ...font, fontSize: 12, color: MUTED, margin: "4px 0 0", lineHeight: 1.5 }}>
                A topic, a situation, even grammar — she plans it, you learn it.
              </p>
              {askOpen || !lessons.length ? (
                <div style={{ marginTop: 12 }}>
                  {!lessons.length ? (
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
                      {["Greetings", "Ordering food", "Taxis & directions", "Numbers & prices"].map((s) => (
                        <button key={s} onClick={() => { setTopic(s); void generate(s); }} disabled={generating} style={{
                          ...font, fontSize: 11.5, fontWeight: 700, padding: "7px 13px", borderRadius: 99, cursor: "pointer",
                          border: "1px solid #F9A8D4", background: "#FDEAF4", color: "#C2497E",
                        }}>{s}</button>
                      ))}
                    </div>
                  ) : null}
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (optional) — e.g. taxis, feelings, past tense"
                    disabled={generating}
                    style={{
                      ...font, width: "100%", fontSize: 13.5, padding: "11px 14px",
                      borderRadius: 12, border: `1px solid ${BORDER}`, color: INK,
                      background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                    {["auto", "A1", "A2", "B1", "B2", "C1"].map((lv) => (
                      <button key={lv} onClick={() => setPlanLevel(lv)} disabled={generating} style={{
                        ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99, cursor: "pointer",
                        border: `1px solid ${planLevel === lv ? "#C4B5FD" : BORDER}`,
                        background: planLevel === lv ? "#F1EEFE" : "#FFFFFF",
                        color: planLevel === lv ? "#6D5BBF" : MUTED,
                      }}>{lv === "auto" ? "My level" : lv}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
                    {[
                      { v: "auto", t: "My language" },
                      { v: "th", t: "Thai" },
                      { v: "en", t: "English" },
                    ].map((o) => (
                      <button key={o.v} onClick={() => setPlanTarget(o.v)} disabled={generating} style={{
                        ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99, cursor: "pointer",
                        border: `1px solid ${planTarget === o.v ? "#7DD3C0" : BORDER}`,
                        background: planTarget === o.v ? "#E9F8F4" : "#FFFFFF",
                        color: planTarget === o.v ? "#3E9C82" : MUTED,
                      }}>{o.t}</button>
                    ))}
                  </div>
                  <button
                    onClick={() => void generate()}
                    disabled={generating}
                    style={{
                      ...font, width: "100%", marginTop: 10, fontSize: 14, fontWeight: 700,
                      padding: "13px 20px", borderRadius: 99, border: "none", cursor: generating ? "default" : "pointer",
                      background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: generating ? 0.7 : 1,
                    }}
                  >
                    {generating ? "Miomi is planning…" : "Plan my lesson"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAskOpen(true)}
                  style={{
                    ...font, marginTop: 12, fontSize: 13, fontWeight: 700, padding: "10px 22px",
                    borderRadius: 99, border: "none", cursor: "pointer",
                    background: CTA, color: "#fff", boxShadow: CTA_SHADOW,
                  }}
                >
                  Plan a lesson
                </button>
              )}
              {genMsg ? (
                <p style={{ ...font, fontSize: 12, color: MUTED, margin: "10px 0 0", lineHeight: 1.5 }}>{genMsg}</p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
