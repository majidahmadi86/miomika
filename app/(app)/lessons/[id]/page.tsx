"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { detectLang, speak } from "@/lib/voice/tts";

type WordItem = {
  word_en: string; word_th: string;
  romanization: string | null; ipa: string | null;
  cefr_level: string | null;
  example_en: string | null; example_th: string | null;
  meanings?: Array<{ sense: string; example_en?: string; example_th?: string }>;
};
type PhraseItem = { en: string; th: string; romanization: string | null };
type Cando = { label: string; cefr: string; skill: string };
type Lesson = {
  id: string; title_en: string; title_th: string | null;
  topic: string; color: string; cefr_level: string; learning_target: string;
  status: string;
  content: { words?: WordItem[]; phrases?: PhraseItem[]; candos?: Cando[] };
  progress: { step?: number; games?: Record<string, boolean>; checkpoint?: { score: number; total: number }; completed_at?: string | null };
};

const TOPIC_HEX: Record<string, { edge: string; soft: string }> = {
  peach: { edge: "#FDBA74", soft: "#FEF1E3" },
  pink: { edge: "#F9A8D4", soft: "#FDEAF4" },
  lavender: { edge: "#C4B5FD", soft: "#F1EEFE" },
  mint: { edge: "#A7F3D0", soft: "#EBFBF4" },
  teal: { edge: "#7DD3C0", soft: "#E9F8F4" },
  coral: { edge: "#FCA5A5", soft: "#FEEFEF" },
};
const INK = "#4A4136", INK_STRONG = "#3C352B", MUTED = "#9A8B73",
  BORDER = "#EDE8E0", TEAL = "#7DD3C0", TEAL_DEEP = "#3E9C82",
  TEAL_SOFT = "#E9F8F4", CORAL_SOFT = "#FEEFEF", CORAL = "#FCA5A5",
  LAV = "#C4B5FD", LAV_SOFT = "#F1EEFE", LAV_DEEP = "#6D5BBF",
  PEACH = "#FDBA74", PEACH_SOFT = "#FEF1E3", PEACH_DEEP = "#B06A28",
  PINK = "#F9A8D4", PINK_SOFT = "#FDEAF4", PINK_DEEP = "#C2497E",
  MINT = "#A7F3D0", MINT_SOFT = "#EBFBF4", MINT_DEEP = "#3E7A66";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;
const thai = { fontFamily: "'Sarabun', sans-serif" } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
function targetText(it: { word_th: string; word_en: string }, target: string): string {
  return target === "en" ? it.word_en : it.word_th;
}
const HAS_DIGIT = /[0-9\u0E50-\u0E59]/;

/* Decorative doodle tiles — playful art until the illustration pipeline lands. */
const DOODLES: string[] = [
  '<path d="M12 4l2 4.4 4.8.5-3.6 3.2 1 4.7L12 14.4 7.8 16.8l1-4.7L5.2 8.9l4.8-.5z"/>',
  '<path d="M12 19s-6-3.8-6-8a3.4 3.4 0 0 1 6-2.2A3.4 3.4 0 0 1 18 11c0 4.2-6 8-6 8z"/>',
  '<path d="M6 16c0-6 5-10 12-10-1 7-5 11-10 11-1 0-2-.4-2-1z"/><path d="M6 16c2-3 5-5 8-6"/>',
  '<path d="M12 5l1.2 3.3L16.5 9.5l-3.3 1.2L12 14l-1.2-3.3L7.5 9.5l3.3-1.2z"/><path d="M17.5 14.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  '<path d="M7 17a3.5 3.5 0 0 1 .6-7A4.6 4.6 0 0 1 16.5 9 3.2 3.2 0 0 1 17 17z"/>',
  '<path d="M9 17.5V7l8-1.6V15"/><circle cx="7" cy="17.5" r="2"/><circle cx="15" cy="15.5" r="2"/>',
];
function Doodle({ i, color, soft }: { i: number; color: string; soft: string }) {
  return (
    <span style={{
      width: 44, height: 44, borderRadius: 12, background: soft, flex: "0 0 44px",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={color} strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: DOODLES[i % DOODLES.length]! }} />
    </span>
  );
}

function SoundBtn({ onClick, bg, color, size = 32 }: { onClick: () => void; bg: string; color: string; size?: number }) {
  return (
    <button onClick={onClick} aria-label="Play sound" style={{
      width: size, height: size, borderRadius: "50%", border: "none", background: bg,
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: `0 0 ${size}px`,
    }}>
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6.5 8.5H4v7h2.5L11 19z" fill={color} stroke="none" />
        <path d="M14.5 9.2a4 4 0 0 1 0 5.6" />
        <path d="M17 7a7 7 0 0 1 0 10" />
      </svg>
    </button>
  );
}

function MiomiHead({ size = 54, stroke = "#D4699B" }: { size?: number; stroke?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9 L5.5 4 L9.5 6.8" /><path d="M20 9 L18.5 4 L14.5 6.8" />
      <circle cx="12" cy="13" r="7.4" />
      <circle cx="9.4" cy="12" r="0.7" fill={stroke} /><circle cx="14.6" cy="12" r="0.7" fill={stroke} />
      <path d="M10.4 15.4 Q12 17 13.6 15.4" />
      <path d="M3.5 13.5 H6" /><path d="M18 13.5 H20.5" />
    </svg>
  );
}

export default function LessonPlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [games, setGames] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/lessons/${id}`);
      const j = (await r.json()) as { lesson?: Lesson | null };
      if (!j.lesson) { setMissing(true); return; }
      setLesson(j.lesson);
      setGames(j.lesson.progress?.games ?? {});
      const done = j.lesson.status === "completed";
      const saved = Math.min(j.lesson.progress?.step ?? 0, 4);
      setStep(done ? 0 : Math.min(saved, 3));
      setMaxVisited(done ? 4 : saved);
    } catch { setMissing(true); }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set only after await, matching the app's existing pattern
    void load();
  }, [load]);

  const patch = useCallback((progress: Record<string, unknown>) => {
    if (!id) return;
    void fetch(`/api/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    }).catch(() => {});
  }, [id]);

  const go = useCallback((n: number) => {
    setStep(n);
    setMaxVisited((m) => {
      const mv = Math.max(m, Math.min(n, 4));
      patch({ step: Math.max(Math.min(n, 5), mv) });
      return mv;
    });
  }, [patch]);

  const words = useMemo(() => lesson?.content?.words ?? [], [lesson]);
  const phrases = useMemo(() => lesson?.content?.phrases ?? [], [lesson]);
  const candos = useMemo(() => lesson?.content?.candos ?? [], [lesson]);
  const target = lesson?.learning_target ?? "th";
  const tcol = TOPIC_HEX[lesson?.color ?? "peach"] ?? TOPIC_HEX.peach;

  const say = useCallback((text: string) => {
    try { void speak(text, detectLang(text)); } catch { /* audio is best-effort */ }
  }, []);

  if (missing) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF6", gap: 12 }}>
        <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG }}>This lesson is not here.</p>
        <Link href="/lessons" style={{ ...font, fontSize: 13, fontWeight: 700, color: TEAL_DEEP, textDecoration: "none" }}>Back to lessons</Link>
      </div>
    );
  }
  if (!lesson) {
    return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF6" }}><p style={{ ...font, fontSize: 13, color: MUTED }}>Loading…</p></div>;
  }

  const TRAIL = ["Start", "Words", "Phrases", "Games", "Checkpoint"];
  const trailPos = Math.min(step, 4);

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#FAFAF6" }}>
      <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "22px 18px 96px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/lessons" aria-label="Back to lessons" style={{
            width: 34, height: 34, borderRadius: "50%", border: `1px solid ${BORDER}`,
            background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flex: "0 0 34px",
          }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <div>
            <div style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, lineHeight: 1.2 }}>{lesson.title_en}</div>
            <div style={{ ...font, fontSize: 11, fontWeight: 600, color: MUTED, marginTop: 1 }}>
              {lesson.cefr_level} · {target === "en" ? "English" : "Thai"} · {lesson.topic}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", margin: "16px 2px 4px" }}>
          {TRAIL.map((label, i) => {
            const reachable = i <= maxVisited || step === 5;
            return (
              <span key={label} style={{ display: "contents" }}>
                <button
                  onClick={() => reachable && step !== 5 && go(i)}
                  aria-label={`Go to ${label}`}
                  style={{
                    width: 13, height: 13, borderRadius: "50%", flex: "0 0 13px", padding: 0,
                    cursor: reachable && step !== 5 ? "pointer" : "default",
                    background: i < trailPos || step === 5 ? TEAL : i === trailPos && step < 5 ? tcol.edge : "#fff",
                    border: `2px solid ${i < trailPos || step === 5 ? TEAL : i === trailPos && step < 5 ? tcol.edge : reachable ? "#CFC8BC" : BORDER}`,
                    transform: i === trailPos && step < 5 ? "scale(1.25)" : "none",
                    transition: "all .25s ease",
                  }}
                />
                {i < TRAIL.length - 1 ? (
                  <span style={{ flex: 1, borderTop: `2px dotted ${i < trailPos || step === 5 ? TEAL : "#E0D8C8"}`, margin: "0 3px" }} />
                ) : null}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 6px" }}>
          {TRAIL.map((t) => (
            <span key={t} style={{ ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#C4BDB5" }}>{t}</span>
          ))}
        </div>
        {step > 0 && step < 5 ? (
          <button onClick={() => go(step - 1)} style={{ ...font, fontSize: 12, fontWeight: 700, color: MUTED, background: "none", border: "none", cursor: "pointer", padding: "4px 0 10px" }}>
            ← Back to {TRAIL[step - 1]}
          </button>
        ) : <span style={{ display: "block", height: 12 }} />}

        {step === 0 ? <IntroStep lesson={lesson} review={lesson.status === "completed"} onNext={() => go(1)} /> : null}
        {step === 1 ? <WordsStep words={words} target={target} say={say} onNext={() => go(2)} /> : null}
        {step === 2 ? <PhrasesStep phrases={phrases} target={target} say={say} onNext={() => go(3)} /> : null}
        {step === 3 ? (
          <GamesStep
            words={words} phrases={phrases} target={target} say={say}
            games={games}
            onGameDone={(key) => {
              setGames((g) => {
                const next = { ...g, [key]: true };
                patch({ games: next });
                return next;
              });
            }}
            onNext={() => go(4)}
          />
        ) : null}
        {step === 4 ? (
          <CheckpointStep
            phrases={phrases} candos={candos} level={lesson.cefr_level}
            onDone={(score, total) => {
              patch({ checkpoint: { score, total }, completed_at: new Date().toISOString(), step: 5 });
              setStep(5);
            }}
          />
        ) : null}
        {step === 5 ? <RecapStep lesson={lesson} words={words} phrases={phrases} candos={candos} onReview={() => { setStep(0); setMaxVisited(4); }} /> : null}
      </div>
    </div>
  );
}

function PrimaryBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...font, width: "100%", fontSize: 14.5, fontWeight: 700, padding: "14px 22px",
      borderRadius: 99, border: "none", cursor: disabled ? "default" : "pointer",
      background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: disabled ? 0.55 : 1,
    }}>{label}</button>
  );
}

function IntroStep({ lesson, review, onNext }: { lesson: Lesson; review: boolean; onNext: () => void }) {
  const w = lesson.content?.words?.length ?? 0;
  const p = lesson.content?.phrases?.length ?? 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: PINK_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 36px" }}>
          <MiomiHead size={24} />
        </span>
        <p style={{ ...font, fontSize: 13.5, lineHeight: 1.5, color: INK, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "4px 16px 16px 16px", padding: "10px 13px", boxShadow: CARD_SHADOW, margin: 0 }}>
          {review
            ? "Welcome back — wander anywhere on the trail. Reviewing is how it sticks~"
            : `${w} words, ${p} phrases, games for your voice, ears and hands — and a ${lesson.cefr_level} checkpoint at the end. เมี้ยว~`}
        </p>
      </div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>What this lesson covers</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>
        Words you will actually say, phrases that do the talking, and proof of what you can do by the end.
      </p>
      <PrimaryBtn label={review ? "Walk the trail again" : "Start lesson"} onClick={onNext} />
    </div>
  );
}

function WordsStep({ words, target, say, onNext }: { words: WordItem[]; target: string; say: (t: string) => void; onNext: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>{words.length} words to know</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Tap any sound — hear it, then say it.</p>
      {words.map((w, i) => (
        <div key={i} style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PEACH}`, borderRadius: 14, boxShadow: CARD_SHADOW, padding: "12px 13px", marginBottom: 10 }}>
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <SoundBtn onClick={() => say(targetText(w, target))} bg={PEACH_SOFT} color={PEACH_DEEP} />
          </span>
          <div style={{ display: "flex", gap: 12, alignItems: "center", paddingRight: 40 }}>
            <Doodle i={i} color={PEACH_DEEP} soft={PEACH_SOFT} />
            <div>
              <div style={{ ...thai, fontSize: 20, fontWeight: 600, color: INK_STRONG }}>{targetText(w, target)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, flexWrap: "wrap" }}>
                {w.cefr_level ? <span style={{ ...font, fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: LAV_SOFT, color: LAV_DEEP }}>{w.cefr_level}</span> : null}
                {(target === "en" ? w.ipa : w.romanization) ? (
                  <span style={{ ...font, fontSize: 11.5, fontWeight: 700, background: "#FAFAF6", border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 8px", color: MUTED }}>
                    {target === "en" ? w.ipa : w.romanization}
                  </span>
                ) : null}
                <span style={{ ...font, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{target === "en" ? w.word_th : w.word_en}</span>
              </div>
            </div>
          </div>
          {w.example_th && w.example_en ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FAFAF6", borderRadius: 10, padding: "9px 11px", marginTop: 11 }}>
              <SoundBtn onClick={() => say(target === "en" ? w.example_en! : w.example_th!)} bg="#fff" color={PEACH_DEEP} size={28} />
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: INK }}>
                <span style={font}>“{w.example_en}”</span><br />
                <span style={{ ...thai, color: MUTED }}>“{w.example_th}”</span>
              </span>
            </div>
          ) : null}
          {w.meanings?.length ? (
            <>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ ...font, fontSize: 11, fontWeight: 700, color: LAV_DEEP, background: "none", border: "none", cursor: "pointer", padding: "7px 0 0" }}>
                {open === i ? "Hide meanings" : "More meanings"}
              </button>
              {open === i ? (
                <div style={{ marginTop: 9, background: LAV_SOFT, borderRadius: 10, padding: "9px 11px" }}>
                  {w.meanings.map((m, k) => (
                    <p key={k} style={{ ...font, fontSize: 12.5, lineHeight: 1.5, color: INK, margin: k ? "8px 0 0" : 0 }}>
                      <b style={{ color: INK_STRONG }}>{m.sense}</b>
                      {m.example_en ? <><br />{m.example_en}</> : null}
                      {m.example_th ? <><br /><span style={{ ...thai, color: MUTED }}>{m.example_th}</span></> : null}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ))}
      <PrimaryBtn label="Got them — phrases next" onClick={onNext} />
    </div>
  );
}

function PhrasesStep({ phrases, target, say, onNext }: { phrases: PhraseItem[]; target: string; say: (t: string) => void; onNext: () => void }) {
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>{phrases.length} phrases that talk</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Complete things you can say today — your new words are hiding inside.</p>
      {phrases.map((p, i) => (
        <div key={i} style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PINK}`, borderRadius: 14, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 10 }}>
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <SoundBtn onClick={() => say(target === "en" ? p.en : p.th)} bg={PINK_SOFT} color={PINK_DEEP} />
          </span>
          <div style={{ ...thai, fontSize: 17.5, fontWeight: 600, color: INK_STRONG, lineHeight: 1.5, paddingRight: 40 }}>{target === "en" ? p.en : p.th}</div>
          {p.romanization && target !== "en" ? <div style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED, marginTop: 5 }}>{p.romanization}</div> : null}
          <div style={{ ...font, fontSize: 12.5, color: MUTED, marginTop: 5 }}>{target === "en" ? p.th : p.en}</div>
        </div>
      ))}
      <PrimaryBtn label="I can say these — games" onClick={onNext} />
    </div>
  );
}

function GamesStep(props: {
  words: WordItem[]; phrases: PhraseItem[]; target: string;
  say: (t: string) => void; games: Record<string, boolean>;
  onGameDone: (key: string) => void; onNext: () => void;
}) {
  const { words, phrases, target, say, games, onGameDone, onNext } = props;
  const available = useMemo(() => {
    const a: string[] = [];
    if (phrases.length > 0) a.push("say");
    if (words.length >= 3) a.push("match");
    if (words.length >= 3) a.push("listen");
    const fillable = words.find((w) => w.example_th && w.example_en && w.example_th.includes(w.word_th));
    if (fillable && words.length >= 3) a.push("fill");
    return a;
  }, [words, phrases]);
  const [tab, setTab] = useState(available[0] ?? "say");
  const allDone = available.every((k) => games[k]);
  const META: Record<string, { label: string; edge: string; soft: string; deep: string }> = {
    say: { label: "Say it", edge: PINK, soft: PINK_SOFT, deep: PINK_DEEP },
    match: { label: "Match", edge: LAV, soft: LAV_SOFT, deep: LAV_DEEP },
    listen: { label: "Listen", edge: MINT, soft: MINT_SOFT, deep: MINT_DEEP },
    fill: { label: "Fill in", edge: PEACH, soft: PEACH_SOFT, deep: PEACH_DEEP },
  };
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>Play it {available.length} ways</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Voice, memory, ears, context — finish every game to unlock the checkpoint.</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${available.length}, 1fr)`, gap: 6, marginBottom: 16 }}>
        {available.map((k) => {
          const m = META[k]!;
          const isDone = !!games[k];
          const isOn = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              ...font, fontSize: 10.5, fontWeight: 700, padding: "9px 2px", borderRadius: 12, cursor: "pointer",
              border: `1px solid ${isDone ? TEAL : isOn ? m.edge : BORDER}`,
              background: isDone ? TEAL_SOFT : isOn ? m.soft : "#fff",
              color: isDone ? TEAL_DEEP : isOn ? m.deep : MUTED,
            }}>{isDone ? "✓ " : ""}{m.label}</button>
          );
        })}
      </div>
      {tab === "say" ? <SayGame phrase={phrases[0]!} target={target} say={say} done={!!games.say} onDone={() => onGameDone("say")} /> : null}
      {tab === "match" ? <MatchGame words={words} target={target} done={!!games.match} onDone={() => onGameDone("match")} /> : null}
      {tab === "listen" ? <ListenGame words={words} target={target} say={say} done={!!games.listen} onDone={() => onGameDone("listen")} /> : null}
      {tab === "fill" ? <FillGame words={words} done={!!games.fill} onDone={() => onGameDone("fill")} /> : null}
      {allDone ? <div style={{ marginTop: 14 }}><PrimaryBtn label="All done — checkpoint" onClick={onNext} /></div> : null}
    </div>
  );
}

function SayGame({ phrase, target, say, done, onDone }: { phrase: PhraseItem; target: string; say: (t: string) => void; done: boolean; onDone: () => void }) {
  const text = target === "en" ? phrase.en : phrase.th;
  const [recState, setRecState] = useState<"idle" | "recording" | "review" | "nomic">("idle");
  const [myUrl, setMyUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    if (myUrl) URL.revokeObjectURL(myUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [myUrl]);

  const startRec = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setMyUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        stream.getTracks().forEach((t) => t.stop());
        setRecState("review");
        if (!done) onDone();
      };
      recRef.current = rec;
      rec.start();
      setRecState("recording");
      window.setTimeout(() => { if (recRef.current?.state === "recording") recRef.current.stop(); }, 8000);
    } catch {
      setRecState("nomic");
    }
  }, [done, onDone]);

  const stopRec = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PINK}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14 }}>
        <div style={{ ...thai, fontSize: 20, fontWeight: 600, color: INK_STRONG }}>{text}</div>
        {phrase.romanization && target !== "en" ? <div style={{ ...font, fontSize: 12.5, fontWeight: 700, color: MUTED, marginTop: 7 }}>{phrase.romanization}</div> : null}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <SoundBtn onClick={() => say(text)} bg={PINK_SOFT} color={PINK_DEEP} size={40} />
        </div>
      </div>

      <button
        onClick={recState === "recording" ? stopRec : () => void startRec()}
        aria-label={recState === "recording" ? "Stop recording" : "Record your voice"}
        style={{
          width: 84, height: 84, borderRadius: "50%", cursor: "pointer",
          border: `1px solid ${recState === "recording" ? PINK : BORDER}`,
          margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#fff", boxShadow: recState === "recording" ? `0 0 0 6px ${PINK_SOFT}` : CARD_SHADOW,
          transition: "box-shadow .2s ease",
        }}
      >
        {recState === "recording" ? (
          <MiomiHead size={54} />
        ) : (
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
          </svg>
        )}
      </button>

      {recState === "idle" ? (
        <p style={{ ...font, fontSize: 13, fontWeight: 700, color: MUTED, lineHeight: 1.5, margin: 0 }}>
          Hear Miomi, then tap the mic and say it — really out loud.<br />
          Record, then compare — Miomi starts grading your sound in a coming update.
        </p>
      ) : null}
      {recState === "recording" ? (
        <p style={{ ...font, fontSize: 13, fontWeight: 700, color: PINK_DEEP, margin: 0 }}>Miomi is listening… tap to stop.</p>
      ) : null}
      {recState === "review" && myUrl ? (
        <div>
          <p style={{ ...font, fontSize: 13, fontWeight: 700, color: TEAL_DEEP, margin: "0 0 10px" }}>Now compare, ear to ear:</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={() => say(text)} style={{ ...font, fontSize: 12.5, fontWeight: 700, padding: "10px 18px", borderRadius: 99, border: `1px solid ${PINK}`, background: PINK_SOFT, color: PINK_DEEP, cursor: "pointer" }}>Miomi</button>
            <button onClick={() => { void new Audio(myUrl).play().catch(() => {}); }} style={{ ...font, fontSize: 12.5, fontWeight: 700, padding: "10px 18px", borderRadius: 99, border: `1px solid ${TEAL}`, background: TEAL_SOFT, color: TEAL_DEEP, cursor: "pointer" }}>Me</button>
            <button onClick={() => void startRec()} style={{ ...font, fontSize: 12.5, fontWeight: 700, padding: "10px 18px", borderRadius: 99, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, cursor: "pointer" }}>Again</button>
          </div>
        </div>
      ) : null}
      {recState === "nomic" ? (
        <div>
          <p style={{ ...font, fontSize: 13, fontWeight: 700, color: MUTED, lineHeight: 1.5, margin: "0 0 10px" }}>
            No mic available — say it out loud anyway, brave and clear.
          </p>
          {!done ? (
            <button onClick={onDone} style={{ ...font, fontSize: 13, fontWeight: 700, padding: "11px 24px", borderRadius: 99, border: "none", cursor: "pointer", background: CTA, color: "#fff", boxShadow: CTA_SHADOW }}>I said it aloud</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MatchGame({ words, target, done, onDone }: { words: WordItem[]; target: string; done: boolean; onDone: () => void }) {
  const pairs = useMemo(() => words.slice(0, 4), [words]);
  const cells = useMemo(() => shuffle(pairs.flatMap((w, i) => [
    { t: targetText(w, target), k: i, isThai: target !== "en" },
    { t: target === "en" ? w.word_th : w.word_en, k: i, isThai: target === "en" },
  ])), [pairs, target]);
  const [sel, setSel] = useState<number | null>(null);
  const [paired, setPaired] = useState<Set<number>>(new Set());
  const [shakeIdx, setShakeIdx] = useState<number | null>(null);
  const pick = (idx: number) => {
    if (done) return;
    const cell = cells[idx]!;
    if (sel === null) { setSel(idx); return; }
    if (sel === idx) { setSel(null); return; }
    const other = cells[sel]!;
    if (other.k === cell.k) {
      const next = new Set(paired); next.add(cell.k);
      setPaired(next); setSel(null);
      if (next.size === pairs.length) onDone();
    } else {
      setShakeIdx(idx);
      setTimeout(() => setShakeIdx(null), 450);
      setSel(null);
    }
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 12 }}>
        {cells.map((c, idx) => {
          const isPaired = paired.has(c.k) || done;
          return (
            <button key={idx} onClick={() => !isPaired && pick(idx)} style={{
              ...(c.isThai ? thai : font), fontSize: 14.5, fontWeight: 600, cursor: isPaired ? "default" : "pointer",
              background: isPaired ? TEAL_SOFT : sel === idx ? LAV_SOFT : "#fff",
              border: `1px solid ${isPaired ? TEAL : shakeIdx === idx ? CORAL : sel === idx ? LAV : BORDER}`,
              borderRadius: 13, padding: "14px 8px", boxShadow: CARD_SHADOW,
              color: isPaired ? TEAL_DEEP : INK_STRONG, textAlign: "center",
            }}>{c.t}</button>
          );
        })}
      </div>
      <p style={{ ...font, fontSize: 12.5, fontWeight: 700, textAlign: "center", color: done || paired.size === pairs.length ? TEAL_DEEP : MUTED, margin: 0 }}>
        {done || paired.size === pairs.length ? "All paired — your memory has them now." : "Pair each word with its meaning."}
      </p>
    </div>
  );
}

function ListenGame({ words, target, say, done, onDone }: { words: WordItem[]; target: string; say: (t: string) => void; done: boolean; onDone: () => void }) {
  const pool = useMemo(() => shuffle(words).slice(0, 3), [words]);
  const answer = pool[0]!;
  const options = useMemo(() => shuffle(pool), [pool]);
  const [played, setPlayed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  return (
    <div style={{ textAlign: "center" }}>
      <button onClick={() => { say(targetText(answer, target)); setPlayed(true); setMsg("Which one did you hear?"); }} style={{
        width: 64, height: 64, borderRadius: "50%", border: `1px solid ${MINT}`, cursor: "pointer",
        margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", background: MINT_SOFT,
      }} aria-label="Play the word">
        <svg viewBox="0 0 24 24" width="24" height="24" fill={MINT_DEEP}><path d="M8 5v14l11-7z" /></svg>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 12 }}>
        {options.map((w, i) => (
          <button key={i} onClick={() => {
            if (done) return;
            if (!played) { setMsg("Play it first — train those ears."); return; }
            if (w.word_en === answer.word_en) { setMsg("Your ears caught it."); onDone(); }
            else { setWrongIdx(i); setMsg("Listen once more."); setTimeout(() => setWrongIdx(null), 600); }
          }} style={{
            ...font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "12px 6px",
            background: done && w.word_en === answer.word_en ? TEAL_SOFT : wrongIdx === i ? CORAL_SOFT : "#fff",
            border: `1px solid ${done && w.word_en === answer.word_en ? TEAL : wrongIdx === i ? CORAL : BORDER}`,
            borderRadius: 14, boxShadow: CARD_SHADOW, color: INK_STRONG,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <Doodle i={i + 1} color={MINT_DEEP} soft={MINT_SOFT} />
            {target === "en" ? w.word_th : w.word_en}
          </button>
        ))}
      </div>
      <p style={{ ...font, fontSize: 12.5, fontWeight: 700, color: done ? TEAL_DEEP : MUTED, margin: 0, minHeight: 18 }}>
        {done ? "Your ears caught it." : msg ?? "Tap play — then pick the meaning you heard."}
      </p>
    </div>
  );
}

function FillGame({ words, done, onDone }: { words: WordItem[]; done: boolean; onDone: () => void }) {
  const pick = useMemo(() => words.find((w) => w.example_th && w.example_en && w.example_th.includes(w.word_th)) ?? null, [words]);
  const options = useMemo(() => {
    if (!pick) return [];
    const others = shuffle(words.filter((w) => w.word_en !== pick.word_en)).slice(0, 2);
    return shuffle([pick, ...others]);
  }, [pick, words]);
  const [msg, setMsg] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  if (!pick) return null;
  const blanked = pick.example_th!.replace(pick.word_th, " ____ ");
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PEACH}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14, lineHeight: 1.7 }}>
        <div style={{ ...font, fontSize: 13.5, color: MUTED }}>“{pick.example_en}”</div>
        <div style={{ ...thai, fontSize: 17, fontWeight: 600, color: INK_STRONG, marginTop: 8 }}>{done ? pick.example_th : blanked}</div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {options.map((w) => (
          <button key={w.word_en} onClick={() => {
            if (done) return;
            if (w.word_en === pick.word_en) { setMsg("Perfect fit."); onDone(); }
            else { setWrong(w.word_en); setMsg("Real word — wrong slot."); setTimeout(() => setWrong(null), 600); }
          }} style={{
            ...thai, fontSize: 16, fontWeight: 600, cursor: "pointer", padding: "9px 16px",
            background: done && w.word_en === pick.word_en ? TEAL_SOFT : wrong === w.word_en ? CORAL_SOFT : "#fff",
            border: `1px solid ${done && w.word_en === pick.word_en ? TEAL : wrong === w.word_en ? CORAL : BORDER}`,
            borderRadius: 12, boxShadow: CARD_SHADOW, color: INK_STRONG,
          }}>{w.word_th}</button>
        ))}
      </div>
      <p style={{ ...font, fontSize: 12.5, fontWeight: 700, color: done ? TEAL_DEEP : MUTED, margin: 0, minHeight: 18 }}>
        {done ? "Perfect fit." : msg ?? "Which word completes the sentence?"}
      </p>
    </div>
  );
}

function CheckpointStep({ phrases, candos, level, onDone }: { phrases: PhraseItem[]; candos: Cando[]; level: string; onDone: (score: number, total: number) => void }) {
  const questions = useMemo(() => {
    const pool = phrases.slice(0, 5);
    // Digits give answers away — prefer number-free phrases when enough exist.
    const numberFree = pool.filter((p) => !HAS_DIGIT.test(p.en) && !HAS_DIGIT.test(p.th));
    const qPool = numberFree.length >= 3 ? numberFree : pool;
    return shuffle(qPool).slice(0, Math.min(3, qPool.length)).map((p, i) => {
      const others = shuffle(pool.filter((x) => x.th !== p.th)).slice(0, 2).map((x) => x.th);
      return { q: p.en, right: p.th, options: shuffle([p.th, ...others]), cando: candos[i]?.label ?? null };
    });
  }, [phrases, candos]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = questions[idx];
  if (!q) return null;
  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const right = opt === q.right;
    setTimeout(() => {
      const nextScore = score + (right ? 1 : 0);
      if (idx + 1 < questions.length) { setScore(nextScore); setIdx(idx + 1); setPicked(null); }
      else onDone(nextScore, questions.length);
    }, 900);
  };
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,#F1EEFE,#FDEAF4)", border: "1px solid #E2DBFA", borderRadius: 18, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ ...font, fontSize: 17, fontWeight: 700, color: INK_STRONG, margin: 0 }}>{level} Checkpoint</h3>
          <span style={{ display: "flex", gap: 5 }}>
            {questions.map((_, i) => (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < idx ? TEAL : i === idx ? LAV_DEEP : "#fff",
                border: `1.5px solid ${i < idx ? TEAL : i === idx ? LAV_DEEP : "#D8D0F2"}`,
              }} />
            ))}
          </span>
        </div>
        <p style={{ ...font, fontSize: 12.5, color: "#7E6FA8", margin: "5px 0 0", lineHeight: 1.45 }}>
          Not a grade — proof of what you can now do.
        </p>
      </div>
      {q.cando ? (
        <span style={{ ...font, display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: LAV_SOFT, color: LAV_DEEP, borderRadius: 99, padding: "4px 11px", marginBottom: 10 }}>
          {level} · {q.cando}
        </span>
      ) : null}
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: CARD_SHADOW, padding: "15px 16px", marginBottom: 12 }}>
        <p style={{ ...font, fontSize: 16, fontWeight: 700, color: INK_STRONG, margin: 0, lineHeight: 1.45 }}>
          How do you say: “{q.q}”
        </p>
      </div>
      {q.options.map((opt) => {
        const isRight = picked && opt === q.right;
        const isWrong = picked === opt && opt !== q.right;
        return (
          <button key={opt} onClick={() => answer(opt)} disabled={!!picked} style={{
            ...thai, width: "100%", textAlign: "left", fontSize: 15, fontWeight: 600,
            cursor: picked ? "default" : "pointer", background: isRight ? TEAL_SOFT : isWrong ? CORAL_SOFT : "#fff",
            border: `1px solid ${isRight ? TEAL : isWrong ? CORAL : BORDER}`, borderRadius: 14,
            padding: "13px 15px", marginBottom: 9, boxShadow: CARD_SHADOW, color: INK_STRONG,
            transition: "all .15s ease",
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

function RecapStep({ lesson, words, phrases, candos, onReview }: { lesson: Lesson; words: WordItem[]; phrases: PhraseItem[]; candos: Cando[]; onReview: () => void }) {
  const cp = lesson.progress?.checkpoint;
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div style={{
          width: 74, height: 74, borderRadius: "50%", margin: "0 auto 12px",
          background: "linear-gradient(135deg,#E8C77A,#C9A96E)",
          boxShadow: "0 6px 24px rgba(201,169,110,.5), 0 0 0 8px rgba(232,199,122,.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg viewBox="0 0 24 24" width="34" height="34" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3z" /></svg>
        </div>
        <h3 style={{ ...font, fontSize: 20, color: INK_STRONG, margin: 0 }}>A <span style={{ color: "#A8853F", fontWeight: 700 }}>golden</span> moment</h3>
        <p style={{ ...font, fontSize: 13, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>Lesson complete — these are things you can now do.</p>
      </div>
      {candos.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 13, padding: "11px 13px", marginBottom: 8, boxShadow: CARD_SHADOW }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: TEAL_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 24px" }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={TEAL_DEEP} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-10" /></svg>
          </span>
          <span style={{ ...font, fontSize: 12.5, fontWeight: 600, color: INK_STRONG }}>
            {c.label}
            <small style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: ".05em" }}>CEFR {c.cefr} · {c.skill}</small>
          </span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, margin: "12px 0 16px" }}>
        {[
          { b: String(words.length), s: "Words" },
          { b: String(phrases.length), s: "Phrases" },
          { b: cp ? `${cp.score}/${cp.total}` : "—", s: "Checkpoint" },
        ].map((st) => (
          <div key={st.s} style={{ flex: 1, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 8px", textAlign: "center", boxShadow: CARD_SHADOW }}>
            <b style={{ ...font, fontSize: 18, display: "block", color: INK_STRONG }}>{st.b}</b>
            <span style={{ ...font, fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED }}>{st.s}</span>
          </div>
        ))}
      </div>
      <button onClick={onReview} style={{ ...font, display: "block", width: "100%", textAlign: "center", fontSize: 13, fontWeight: 700, padding: "12px 22px", borderRadius: 99, background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, cursor: "pointer", marginBottom: 10 }}>
        Review this lesson
      </button>
      <Link href="/lessons" style={{
        ...font, display: "block", textAlign: "center", fontSize: 14.5, fontWeight: 700,
        padding: "14px 22px", borderRadius: 99, background: CTA, color: "#fff",
        textDecoration: "none", boxShadow: CTA_SHADOW,
      }}>Back to my lessons</Link>
    </div>
  );
}
