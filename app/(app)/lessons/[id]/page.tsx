"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, MessagesSquare, Gamepad2, Target, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { WordRow, fromLessonWord } from "@/components/word/WordCard";
import { useParams, useRouter } from "next/navigation";
import { detectLang, speak } from "@/lib/voice/tts";
import { sfxAlmost, sfxGold, sfxPop, sfxSilver, sfxSuccess, sfxWrong } from "@/lib/sound/sfx";

type WordItem = {
  word_en: string; word_th: string;
  emoji?: string | null;
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

/* Real Miomi only — never drawn stand-ins. */
const HEAD_IDLE = "/miomi/head-idle.png";
const HEAD_HAPPY = "/miomi/head-happy.png";
const HEAD_THINKING = "/miomi/head-thinking.png";
const CELEBRATION = "/characters/miomi/companion/companion-celebration.png";

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
  CORAL_DEEP = "#C56A5E",
  LAV = "#C4B5FD", LAV_SOFT = "#F1EEFE", LAV_DEEP = "#6D5BBF",
  PEACH = "#FDBA74", PEACH_SOFT = "#FEF1E3", PEACH_DEEP = "#B06A28",
  PINK = "#F9A8D4", PINK_SOFT = "#FDEAF4", PINK_DEEP = "#C2497E",
  MINT = "#A7F3D0", MINT_SOFT = "#EBFBF4", MINT_DEEP = "#3E7A66";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;
const thai = { fontFamily: "'Sarabun', sans-serif" } as const;
const PASS_RATIO = 2 / 3;

// Masterclass section header: a tinted icon tile anchors the title + subtitle so the
// label reads as intentional, never bare text floating on the background.
function SectionIntro({ icon: Icon, title, subtitle, bg, fg }: { icon: LucideIcon; title: ReactNode; subtitle?: ReactNode; bg: string; fg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "0 0 16px" }}>
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: 12, flex: "0 0 40px", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 21, height: 21, color: fg }} strokeWidth={2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "1px 0 3px" }}>{title}</h3>
        {subtitle ? <p style={{ ...font, fontSize: 13, color: MUTED, lineHeight: 1.45, margin: 0 }}>{subtitle}</p> : null}
      </span>
    </div>
  );
}

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
/* Checkpoint option identity — Thai letter badges in rotating PAL colors. */
const OPT_MARKS = [
  { t: "ก", bg: "#FDEAF4", fg: "#C2497E" },
  { t: "ข", bg: "#F1EEFE", fg: "#6D5BBF" },
  { t: "ค", bg: "#EBFBF4", fg: "#3E7A66" },
  { t: "ง", bg: "#FEF1E3", fg: "#B06A28" },
];

/* DESIGN POLICY: every sound button is top-right of its block, same glyph, soft circle. */
function SoundBtn({ onClick, bg, color, size = 32 }: { onClick: () => void; bg: string; color: string; size?: number }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label="Play sound"
      style={{
        width: size, height: size, borderRadius: "50%", border: "none", background: bg,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: `0 0 ${size}px`,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6.5 8.5H4v7h2.5L11 19z" fill={color} stroke="none" />
        <path d="M14.5 9.2a4 4 0 0 1 0 5.6" />
        <path d="M17 7a7 7 0 0 1 0 10" />
      </svg>
    </button>
  );
}

/* SEMANTIC OR ABSENT: the word's own emoji from the verified bank, else the word itself. */
function WordTile({ w, target, soft }: { w: WordItem; target: string; soft: string }) {
  const t = targetText(w, target);
  const glyph = /[\u0E00-\u0E7F]/.test(t) && t.length <= 4 ? t : t.charAt(0).toUpperCase();
  return (
    <span style={{
      width: 50, height: 50, borderRadius: 12, background: soft, flex: "0 0 50px",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      {w.emoji ? (
        <span style={{ fontSize: 27, lineHeight: 1 }}>{w.emoji}</span>
      ) : (
        <span style={{ ...(glyph.length > 1 ? thai : font), fontSize: glyph.length > 1 ? 17 : 22, fontWeight: 700, color: INK }}>{glyph}</span>
      )}
    </span>
  );
}

export default function LessonPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [games, setGames] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<{ kind: "gold" | "silver" | "almost"; score: number; total: number } | null>(null);
  const [attempt, setAttempt] = useState(1);

  const load = useCallback(async (keepPosition = false) => {
    if (!id) return;
    try {
      const r = await fetch(`/api/lessons/${id}`);
      const j = (await r.json()) as { lesson?: Lesson | null };
      if (!j.lesson) { setMissing(true); return; }
      setLesson(j.lesson);
      if (keepPosition) return; // content refresh only — keep the learner exactly where they are
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

  const extend = useCallback(async (): Promise<number> => {
    if (!id) return 0;
    try {
      const r = await fetch(`/api/lessons/${id}/extend`, { method: "POST" });
      const j = (await r.json()) as { ok?: boolean; added?: number; addedPhrases?: number };
      const total = (j.added ?? 0) + (j.addedPhrases ?? 0);
      if (j.ok && total > 0) { await load(true); return total; }
      return 0;
    } catch { return 0; }
  }, [id, load]);

  const go = useCallback((n: number) => {
    setStep(n);
    setMaxVisited((m) => {
      const mv = Math.max(m, Math.min(n, 4));
      patch({ step: mv });
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
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "transparent" }}>
      <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "22px 18px 96px" }}>
        <div style={{ maxWidth: 768, margin: "0 auto", width: "100%" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => { if (step > 0 && step < 5) go(step - 1); else router.push("/lessons"); }}
            aria-label={step > 0 && step < 5 ? "Back one step" : "Back to lessons"}
            style={{
              width: 34, height: 34, borderRadius: "50%", border: `1px solid ${BORDER}`,
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 34px",
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
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
        {step === 1 ? <WordsStep words={words} target={target} say={say} onExtend={extend} onNext={() => go(2)} /> : null}
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
            key={attempt}
            phrases={phrases} candos={candos} level={lesson.cefr_level} target={target} say={say}
            onDone={(score, total) => {
              const passed = total > 0 && score / total >= PASS_RATIO;
              if (passed) {
                patch({ checkpoint: { score, total }, completed_at: new Date().toISOString(), step: 5 });
                setResult({ kind: score === total ? "gold" : "silver", score, total });
              } else {
                patch({ checkpoint: { score, total } });
                setResult({ kind: "almost", score, total });
              }
              setStep(5);
            }}
          />
        ) : null}
        {step === 5 ? (
          result?.kind === "almost" ? (
            <AlmostStep
              score={result.score} total={result.total} say={say}
              onReviewWords={() => go(1)}
              onReviewPhrases={() => go(2)}
              onRetry={() => { setAttempt((a) => a + 1); setResult(null); setStep(4); }}
            />
          ) : (
            <RecapStep lesson={lesson} words={words} phrases={phrases} candos={candos} result={result} say={say} onRetry={() => { setAttempt((a) => a + 1); setResult(null); setStep(4); }} onReview={() => { setResult(null); setStep(0); setMaxVisited(4); }} />
          )
        ) : null}
        </div>
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

function MiomiBubble({ head, text }: { head: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
      <span style={{ width: 38, height: 38, borderRadius: "50%", background: PINK_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 38px", overflow: "hidden" }}>
        <Image src={head} alt="Miomi" width={34} height={34} style={{ objectFit: "contain" }} />
      </span>
      <p style={{ ...font, fontSize: 13.5, lineHeight: 1.5, color: INK, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: "4px 16px 16px 16px", padding: "10px 13px", boxShadow: CARD_SHADOW, margin: 0 }}>
        {text}
      </p>
    </div>
  );
}

function IntroStep({ lesson, review, onNext }: { lesson: Lesson; review: boolean; onNext: () => void }) {
  const w = lesson.content?.words?.length ?? 0;
  const p = lesson.content?.phrases?.length ?? 0;
  return (
    <div>
      <MiomiBubble
        head={HEAD_HAPPY}
        text={review
          ? "Welcome back — wander anywhere on the trail. Reviewing is how it sticks~"
          : `${w} words, ${p} phrases, games for your voice, ears and hands — then show me at the ${lesson.cefr_level} checkpoint. เมี้ยว~`}
      />
      <SectionIntro icon={Target} bg={MINT_SOFT} fg={MINT_DEEP}
        title="What this lesson covers"
        subtitle="Words you will actually say, phrases that do the talking, and proof of what you can do by the end."
      />
      <PrimaryBtn label={review ? "Walk the trail again" : "Start lesson"} onClick={onNext} />
    </div>
  );
}

function WordsStep({ words, target, say, onExtend, onNext }: { words: WordItem[]; target: string; say: (t: string) => void; onExtend: () => Promise<number>; onNext: () => void }) {
  const [extState, setExtState] = useState<"idle" | "busy" | "done" | "none">("idle");
  return (
    <div>
      <SectionIntro icon={BookOpen} bg={TEAL_SOFT} fg={TEAL_DEEP}
        title={`${words.length} words to know`}
        subtitle="Tap any sound — hear Miomi, then say it."
      />
      {words.map((w, i) => (
        <WordRow key={i} word={fromLessonWord(w)} target={target === "en" ? "en" : "th"} onSpeak={(t) => say(t)} defaultOpen={i === 0} />
      ))}
      {extState !== "done" ? (
        <button
          onClick={async () => {
            if (extState === "busy") return;
            setExtState("busy");
            const added = await onExtend().catch(() => 0);
            setExtState(added > 0 ? "done" : "none");
          }}
          style={{ ...font, width: "100%", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "1.5px dashed #CBE5D9", borderRadius: 14, background: "#EBFBF4", color: "#3E7A66", padding: 12, margin: "4px 0 14px" }}
        >
          {extState === "busy" ? "Miomi is choosing more — every word gets checked…" : extState === "none" ? "Miomi could not verify more right now — try again later" : "Need more? Miomi adds words for this topic"}
        </button>
      ) : (
        <p style={{ ...font, fontSize: 12, fontWeight: 700, color: "#3E7A66", textAlign: "center", margin: "4px 0 14px" }}>Added — chosen for this topic, verified before shown.</p>
      )}
      <PrimaryBtn label="Got them — phrases next" onClick={onNext} />
    </div>
  );
}

function PhrasesStep({ phrases, target, say, onNext }: { phrases: PhraseItem[]; target: string; say: (t: string) => void; onNext: () => void }) {
  return (
    <div>
      <SectionIntro icon={MessagesSquare} bg={PINK_SOFT} fg={PINK_DEEP}
        title={`${phrases.length} phrases that talk`}
        subtitle="Complete things you can say today — your new words are hiding inside."
      />
      {phrases.map((p, i) => (
        <div key={i} style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PINK}`, borderRadius: 14, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 10 }}>
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <SoundBtn onClick={() => say(target === "en" ? p.en : p.th)} bg={PINK_SOFT} color={PINK_DEEP} />
          </span>
          <div style={{ ...(target === "en" ? font : thai), fontSize: 17.5, fontWeight: 600, color: INK_STRONG, lineHeight: 1.5, paddingRight: 40 }}>{target === "en" ? p.en : p.th}</div>
          {p.romanization && target !== "en" ? <div style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED, marginTop: 5, letterSpacing: ".02em" }}>{p.romanization}</div> : null}
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
    // DIRECTION-TRUE: the blank lives in the language being learned.
    const fillable = words.find((w) => w.example_th && w.example_en && (target === "en" ? w.example_en.includes(w.word_en) : w.example_th.includes(w.word_th)));
    if (fillable && words.length >= 3) a.push("fill");
    return a;
  }, [words, phrases, target]);
  const [tab, setTab] = useState(available[0] ?? "say");
  const allDone = available.every((k) => games[k]);
  const sayPhrase = useMemo(() => shuffle(phrases)[0] ?? phrases[0]!, [phrases]);
  const handleDone = (key: string) => {
    sfxSuccess();
    onGameDone(key);
    // "Say it" ends in a review state (compare Miomi vs you, or re-record) the learner
    // should stay in — don't auto-jump to the next game and yank them out of it.
    if (key === "say") return;
    const rest = available.filter((k) => k !== key && !games[k]);
    if (rest.length) setTimeout(() => setTab(rest[0]!), 900);
  };
  const META: Record<string, { label: string; edge: string; soft: string; deep: string }> = {
    say: { label: "Say it", edge: PINK, soft: PINK_SOFT, deep: PINK_DEEP },
    match: { label: "Match", edge: LAV, soft: LAV_SOFT, deep: LAV_DEEP },
    listen: { label: "Listen", edge: MINT, soft: MINT_SOFT, deep: MINT_DEEP },
    fill: { label: "Fill in", edge: PEACH, soft: PEACH_SOFT, deep: PEACH_DEEP },
  };
  return (
    <div>
      <SectionIntro icon={Gamepad2} bg={LAV_SOFT} fg={LAV_DEEP}
        title={`Play it ${available.length} ways`}
        subtitle="Voice, memory, ears, context — finish every game to unlock the checkpoint."
      />
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
      {tab === "say" ? <SayGame phrase={sayPhrase} target={target} say={say} done={!!games.say} onDone={() => handleDone("say")} /> : null}
      {tab === "match" ? <MatchGame words={words} target={target} say={say} done={!!games.match} onDone={() => handleDone("match")} /> : null}
      {tab === "listen" ? <ListenGame words={words} target={target} soft={MINT_SOFT} say={say} done={!!games.listen} onDone={() => handleDone("listen")} /> : null}
      {tab === "fill" ? <FillGame words={words} target={target} say={say} done={!!games.fill} onDone={() => handleDone("fill")} /> : null}
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
      <div style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PINK}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14 }}>
        <span style={{ position: "absolute", top: 10, right: 10 }}>
          <SoundBtn onClick={() => say(text)} bg={PINK_SOFT} color={PINK_DEEP} />
        </span>
        <div style={{ ...thai, fontSize: 20, fontWeight: 600, color: INK_STRONG, paddingRight: 36 }}>{text}</div>
        {phrase.romanization && target !== "en" ? <div style={{ ...font, fontSize: 12.5, fontWeight: 700, color: MUTED, marginTop: 7, letterSpacing: ".02em" }}>{phrase.romanization}</div> : null}
      </div>

      <button
        onClick={recState === "recording" ? stopRec : () => void startRec()}
        aria-label={recState === "recording" ? "Stop recording" : "Record your voice"}
        style={{
          width: 88, height: 88, borderRadius: "50%", cursor: "pointer",
          border: `1px solid ${recState === "recording" ? PINK : BORDER}`,
          margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center",
          background: "#fff", boxShadow: recState === "recording" ? `0 0 0 6px ${PINK_SOFT}` : CARD_SHADOW,
          transition: "box-shadow .2s ease", overflow: "hidden",
        }}
      >
        {recState === "recording" ? (
          <Image src={HEAD_HAPPY} alt="Miomi is listening" width={80} height={80} style={{ objectFit: "contain" }} />
        ) : (
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" />
          </svg>
        )}
      </button>

      {recState === "idle" ? (
        <p style={{ ...font, fontSize: 13, fontWeight: 700, color: MUTED, lineHeight: 1.5, margin: 0 }}>
          Hear Miomi, then tap the mic and say it — really out loud.<br />
          Then play both back and compare, ear to ear — your own ear is the best judge.
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

function MatchGame({ words, target, say, done, onDone }: { words: WordItem[]; target: string; say: (t: string) => void; done: boolean; onDone: () => void }) {
  const pairs = useMemo(() => shuffle(words).slice(0, 4), [words]);
  const cells = useMemo(() => shuffle(pairs.flatMap((w, i) => [
    { t: targetText(w, target), k: i, isThai: target !== "en", tgt: true },
    { t: target === "en" ? w.word_th : w.word_en, k: i, isThai: target === "en", tgt: false },
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
      sfxPop();
      const next = new Set(paired); next.add(cell.k);
      setPaired(next); setSel(null);
      if (next.size === pairs.length) onDone();
    } else {
      sfxWrong();
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
            <div key={idx} role="button" tabIndex={0}
              onClick={() => !isPaired && pick(idx)}
              onKeyDown={(e) => { if (!isPaired && (e.key === "Enter" || e.key === " ")) pick(idx); }}
              style={{
                ...(c.isThai ? thai : font), fontSize: 14.5, fontWeight: 600, cursor: isPaired ? "default" : "pointer",
                background: isPaired ? TEAL_SOFT : sel === idx ? LAV_SOFT : "#fff",
                border: `1px solid ${isPaired ? TEAL : shakeIdx === idx ? CORAL : sel === idx ? LAV : BORDER}`,
                borderRadius: 13, padding: "12px 8px", boxShadow: CARD_SHADOW,
                color: isPaired ? TEAL_DEEP : INK_STRONG, textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
              <span>{c.t}</span>
              {c.tgt ? <SoundBtn onClick={() => say(c.t)} bg={LAV_SOFT} color={LAV_DEEP} size={24} /> : null}
            </div>
          );
        })}
      </div>
      <p style={{ ...font, fontSize: 12.5, fontWeight: 700, textAlign: "center", color: done || paired.size === pairs.length ? TEAL_DEEP : MUTED, margin: 0 }}>
        {done || paired.size === pairs.length ? "All paired — your memory has them now." : "Pair each word with its meaning."}
      </p>
    </div>
  );
}

function ListenGame({ words, target, soft, say, done, onDone }: { words: WordItem[]; target: string; soft: string; say: (t: string) => void; done: boolean; onDone: () => void }) {
  const pool = useMemo(() => shuffle(words).slice(0, 3), [words]);
  const answer = pool[0]!;
  const options = useMemo(() => shuffle(pool), [pool]);
  const [played, setPlayed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <SoundBtn onClick={() => { say(targetText(answer, target)); setPlayed(true); setMsg("Which one did you hear?"); }} bg={MINT_SOFT} color={MINT_DEEP} size={64} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 12 }}>
        {options.map((w, i) => (
          <button key={i} onClick={() => {
            if (done) return;
            if (!played) { setMsg("Play it first — train those ears."); return; }
            if (w.word_en === answer.word_en) { setMsg("Your ears caught it."); onDone(); }
            else { sfxWrong(); setWrongIdx(i); setMsg("Listen once more."); setTimeout(() => setWrongIdx(null), 600); }
          }} style={{
            ...(target === "en" ? thai : font), fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "12px 6px",
            background: done && w.word_en === answer.word_en ? TEAL_SOFT : wrongIdx === i ? CORAL_SOFT : "#fff",
            border: `1px solid ${done && w.word_en === answer.word_en ? TEAL : wrongIdx === i ? CORAL : BORDER}`,
            borderRadius: 14, boxShadow: CARD_SHADOW, color: INK_STRONG,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <WordTile w={w} target={target} soft={soft} />
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

function FillGame({ words, target, say, done, onDone }: { words: WordItem[]; target: string; say: (t: string) => void; done: boolean; onDone: () => void }) {
  const pick = useMemo(
    () => shuffle(words.filter((w) => w.example_th && w.example_en && (target === "en" ? w.example_en!.includes(w.word_en) : w.example_th!.includes(w.word_th))))[0] ?? null,
    [words, target],
  );
  const options = useMemo(() => {
    if (!pick) return [];
    const others = shuffle(words.filter((w) => w.word_en !== pick.word_en)).slice(0, 2);
    return shuffle([pick, ...others]);
  }, [pick, words]);
  const [msg, setMsg] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  if (!pick) return null;
  const ex = (target === "en" ? pick.example_en : pick.example_th)!;
  const hint = target === "en" ? pick.example_th : pick.example_en;
  const blanked = ex.replace(target === "en" ? pick.word_en : pick.word_th, " ____ ");
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${PEACH}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14, lineHeight: 1.7 }}>
        {done ? (
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <SoundBtn onClick={() => say(ex)} bg={PEACH_SOFT} color={PEACH_DEEP} size={28} />
          </span>
        ) : null}
        <div style={{ ...(target === "en" ? thai : font), fontSize: 13.5, color: MUTED }}>“{hint}”</div>
        <div style={{ ...(target === "en" ? font : thai), fontSize: 17, fontWeight: 600, color: INK_STRONG, marginTop: 8 }}>{done ? ex : blanked}</div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {options.map((w) => (
          <div key={w.word_en} role="button" tabIndex={0}
            onClick={() => {
              if (done) return;
              if (w.word_en === pick.word_en) { setMsg("Perfect fit."); onDone(); }
              else { sfxWrong(); setWrong(w.word_en); setMsg("Real word — wrong slot."); setTimeout(() => setWrong(null), 600); }
            }}
            onKeyDown={(e) => { if (!done && (e.key === "Enter" || e.key === " ")) (e.target as HTMLElement).click(); }}
            style={{
              ...(target === "en" ? font : thai), fontSize: 16, fontWeight: 600, cursor: "pointer", padding: "9px 14px",
              background: done && w.word_en === pick.word_en ? TEAL_SOFT : wrong === w.word_en ? CORAL_SOFT : "#fff",
              border: `1px solid ${done && w.word_en === pick.word_en ? TEAL : wrong === w.word_en ? CORAL : BORDER}`,
              borderRadius: 12, boxShadow: CARD_SHADOW, color: INK_STRONG,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
            <span>{target === "en" ? w.word_en : w.word_th}</span>
            <SoundBtn onClick={() => say(target === "en" ? w.word_en : w.word_th)} bg={PEACH_SOFT} color={PEACH_DEEP} size={24} />
          </div>
        ))}
      </div>
      <p style={{ ...font, fontSize: 12.5, fontWeight: 700, color: done ? TEAL_DEEP : MUTED, margin: 0, minHeight: 18 }}>
        {done ? "Perfect fit." : msg ?? "Which word completes the sentence?"}
      </p>
    </div>
  );
}

function CheckpointStep({ phrases, candos, level, target, say, onDone }: { phrases: PhraseItem[]; candos: Cando[]; level: string; target: string; say: (t: string) => void; onDone: (score: number, total: number) => void }) {
  const questions = useMemo(() => {
    const pool = phrases.slice(0, 8);
    const numberFree = pool.filter((p) => !HAS_DIGIT.test(p.en) && !HAS_DIGIT.test(p.th));
    const qPool = numberFree.length >= 3 ? numberFree : pool;
    // LEVEL-SCALED + DIRECTION-TRUE: A1 = 3x3; A2 = 4x4; B1+ adds reversed questions —
    // and the whole thing derives from learning_target, so Thai learners and English learners both get a true test.
    const rank = Math.max(0, ["A1", "A2", "B1", "B2", "C1"].indexOf(level.toUpperCase()));
    const qCount = Math.min(3 + Math.min(rank, 2), qPool.length);
    const optCount = Math.min(rank >= 1 ? 4 : 3, pool.length);
    const tgt = (x: { en: string; th: string }) => (target === "en" ? x.en : x.th);
    const sup = (x: { en: string; th: string }) => (target === "en" ? x.th : x.en);
    return shuffle(qPool).slice(0, qCount).map((p, i) => {
      const reversed = rank >= 2 && i % 2 === 1;
      const others = shuffle(pool.filter((x) => x.th !== p.th)).slice(0, Math.max(optCount - 1, 1));
      const cando = candos[i % Math.max(candos.length, 1)]?.label ?? null;
      const right = reversed ? sup(p) : tgt(p);
      const options = shuffle([right, ...others.map((x) => (reversed ? sup(x) : tgt(x)))]);
      const qThai = reversed ? target === "th" : target === "en";
      const optThai = reversed ? target === "en" : target === "th";
      return { reversed, q: reversed ? tgt(p) : sup(p), right, options, cando, qThai, optThai };
    });
  }, [phrases, candos, level, target]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = questions[idx];
  if (!q) return null;
  const answer = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const right = opt === q.right;
    if (right) sfxPop(); else sfxWrong();
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
                background: i < idx ? LAV_DEEP : i === idx ? PINK_DEEP : "#fff",
                border: `1.5px solid ${i < idx ? LAV_DEEP : i === idx ? PINK_DEEP : "#D8D0F2"}`,
              }} />
            ))}
          </span>
        </div>
        <p style={{ ...font, fontSize: 12.5, color: "#7E6FA8", margin: "5px 0 0", lineHeight: 1.45 }}>
          Listen to each answer before you choose — your ears know.
        </p>
      </div>
      {q.cando ? (
        <span style={{ ...font, display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: LAV_SOFT, color: LAV_DEEP, borderRadius: 99, padding: "4px 11px", marginBottom: 10 }}>
          {level} · {q.cando}
        </span>
      ) : null}
      <div style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${LAV}`, borderRadius: 16, boxShadow: CARD_SHADOW, padding: "15px 16px", marginBottom: 12 }}>
        {q.reversed ? (
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <SoundBtn onClick={() => say(q.q)} bg={LAV_SOFT} color={LAV_DEEP} size={28} />
          </span>
        ) : null}
        <p style={{ ...font, fontSize: 12, fontWeight: 700, color: MUTED, margin: 0 }}>{q.reversed ? "What does this mean?" : "How do you say:"}</p>
        <p style={{ ...(q.qThai ? thai : font), fontSize: q.qThai ? 17 : 16, fontWeight: q.qThai ? 600 : 700, color: INK_STRONG, margin: "5px 0 0", lineHeight: 1.5, paddingRight: q.reversed ? 36 : 0 }}>
          “{q.q}”
        </p>
      </div>
      {q.options.map((opt, oi) => {
        const isRight = picked && opt === q.right;
        const isWrong = picked === opt && opt !== q.right;
        const mark = OPT_MARKS[oi % OPT_MARKS.length]!;
        return (
          <div
            key={opt}
            role="button"
            tabIndex={0}
            onClick={() => answer(opt)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") answer(opt); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              cursor: picked ? "default" : "pointer", background: isRight ? TEAL_SOFT : isWrong ? CORAL_SOFT : "#fff",
              border: `1px solid ${isRight ? TEAL : isWrong ? CORAL : BORDER}`, borderRadius: 14,
              padding: "12px 12px 12px 12px", marginBottom: 9, boxShadow: CARD_SHADOW,
              transition: "all .15s ease",
            }}
          >
            <span style={{ ...thai, width: 26, height: 26, borderRadius: "50%", background: mark.bg, color: mark.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flex: "0 0 26px" }}>{mark.t}</span>
            <span style={{ ...(q.optThai ? thai : font), fontSize: q.optThai ? 15 : 13.5, fontWeight: 600, color: INK_STRONG, flex: 1, textAlign: "left" }}>{opt}</span>
            {!q.reversed ? <SoundBtn onClick={() => say(opt)} bg={PINK_SOFT} color={PINK_DEEP} size={28} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function AlmostStep({ score, total, say, onReviewWords, onReviewPhrases, onRetry }: { score: number; total: number; say: (t: string) => void; onReviewWords: () => void; onReviewPhrases: () => void; onRetry: () => void }) {
  useEffect(() => {
    sfxAlmost();
    const t = window.setTimeout(() => {
      say("Almost there! One more look and it is yours — I believe in you.");
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <div style={{ textAlign: "center", padding: "8px 0 14px" }}>
        <span style={{ display: "inline-flex", width: 84, height: 84, borderRadius: "50%", background: PEACH_SOFT, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 10 }}>
          <Image src={HEAD_THINKING} alt="Miomi" width={74} height={74} style={{ objectFit: "contain" }} />
        </span>
        <h3 style={{ ...font, fontSize: 20, color: INK_STRONG, margin: 0 }}>Almost there</h3>
        <p style={{ ...font, fontSize: 13, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
          {score} of {total} this time — no gold yet, and that is honest. One more look and it is yours.
        </p>
      </div>
      <div style={{ background: CORAL_SOFT, border: `1px solid ${CORAL}`, borderRadius: 16, padding: "13px 15px", marginBottom: 14 }}>
        <p style={{ ...font, fontSize: 12.5, fontWeight: 600, color: CORAL_DEEP, margin: 0, lineHeight: 1.5 }}>
          Miomi’s tip: replay the phrase sounds before retrying — your ears will recognize the right answer before your eyes do.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={onReviewWords} style={{ ...font, flex: 1, fontSize: 12.5, fontWeight: 700, padding: "11px 8px", borderRadius: 99, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, cursor: "pointer" }}>Review words</button>
        <button onClick={onReviewPhrases} style={{ ...font, flex: 1, fontSize: 12.5, fontWeight: 700, padding: "11px 8px", borderRadius: 99, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, cursor: "pointer" }}>Review phrases</button>
      </div>
      <PrimaryBtn label="Try the checkpoint again" onClick={onRetry} />
    </div>
  );
}

function RecapStep({ lesson, words, phrases, candos, result, say, onRetry, onReview }: { lesson: Lesson; words: WordItem[]; phrases: PhraseItem[]; candos: Cando[]; result: { kind?: "gold" | "silver" | "almost"; score: number; total: number } | null; say: (t: string) => void; onRetry: () => void; onReview: () => void }) {
  const cp = result ?? lesson.progress?.checkpoint ?? null;
  const gold = cp ? cp.score === cp.total : true;
  useEffect(() => {
    // Fanfare first, then Miomi's voice — a celebration you can hear.
    if (gold) sfxGold(); else sfxSilver();
    const t = window.setTimeout(() => {
      say(gold ? "Amazing! You did it — a golden moment!" : "You passed! One step from gold — so proud of you!");
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <style>{`
        @keyframes lesson-pop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes lesson-confetti { 0% { transform: translateY(0) scale(1); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-46px) scale(.5); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .lesson-pop, .lesson-confetti { animation: none !important } }
      `}</style>
      <div style={{ textAlign: "center", padding: "4px 0 14px" }}>
        <div className="lesson-pop" style={{ position: "relative", display: "inline-block", marginBottom: 8, animation: "lesson-pop .6s cubic-bezier(.34,1.56,.64,1)" }}>
          {(gold ? [
            { l: "6%", t: "12%", c: "#F9A8D4", d: "0s" },
            { l: "88%", t: "20%", c: "#C4B5FD", d: ".3s" },
            { l: "14%", t: "72%", c: "#E8C77A", d: ".6s" },
            { l: "80%", t: "66%", c: "#A7F3D0", d: ".9s" },
            { l: "50%", t: "2%", c: "#FCA5A5", d: "1.2s" },
            { l: "96%", t: "44%", c: "#FDBA74", d: "1.5s" },
            { l: "28%", t: "0%", c: "#E8C77A", d: ".4s" },
            { l: "66%", t: "84%", c: "#F472B6", d: ".8s" },
            { l: "2%", t: "48%", c: "#34D399", d: "1.3s" },
          ] : [
            { l: "10%", t: "16%", c: "#C4B5FD", d: "0s" },
            { l: "84%", t: "24%", c: "#A7F3D0", d: ".5s" },
            { l: "50%", t: "4%", c: "#FBCFD8", d: "1s" },
          ]).map((p, i) => (
            <span key={i} className="lesson-confetti" style={{ position: "absolute", left: p.l, top: p.t, width: 7, height: 7, borderRadius: "50%", background: p.c, animation: "lesson-confetti 1.8s ease-out infinite", animationDelay: p.d }} />
          ))}
          <Image src={CELEBRATION} alt="Miomi celebrating" width={132} height={132} style={{ objectFit: "contain" }} />
          <span style={{
            position: "absolute", right: -4, bottom: 6, width: 34, height: 34, borderRadius: "50%",
            background: gold ? "linear-gradient(135deg,#E8C77A,#C9A96E)" : "linear-gradient(135deg,#E3E7ED,#AAB4C0)",
            boxShadow: gold ? "0 4px 14px rgba(201,169,110,.5), 0 0 0 5px rgba(232,199,122,.18)" : "0 4px 14px rgba(150,160,175,.45), 0 0 0 5px rgba(190,200,212,.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3z" /></svg>
          </span>
        </div>
        <h3 style={{ ...font, fontSize: 20, color: INK_STRONG, margin: 0 }}>
          A <span style={{ color: gold ? "#A8853F" : "#6E7B8A", fontWeight: 700 }}>{gold ? "golden" : "silver"}</span> moment
        </h3>
        <p style={{ ...font, fontSize: 13, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
          {gold ? "Perfect score — earned, not given." : "Passed with a slip — gold is one retry away."}
        </p>
      </div>
      <MiomiBubble head={HEAD_HAPPY} text={gold ? "You did it — เมี้ยว~ Now go say these out in the real world." : "So close to gold — เมี้ยว~ One more run and it shines."} />
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
      {!gold ? (
        <button onClick={onRetry} style={{ ...font, display: "block", width: "100%", textAlign: "center", fontSize: 13.5, fontWeight: 700, padding: "13px 22px", borderRadius: 99, background: "linear-gradient(135deg,#E8C77A,#C9A96E)", border: "none", color: "#fff", cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 14px rgba(201,169,110,.4)" }}>
          Retry for gold
        </button>
      ) : null}
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
