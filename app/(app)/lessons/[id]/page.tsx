"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const TOPIC_HEX: Record<string, string> = {
  peach: "#FDBA74", pink: "#F9A8D4", lavender: "#C4B5FD",
  mint: "#A7F3D0", teal: "#7DD3C0", coral: "#FCA5A5",
};
const INK = "#4A4136", INK_STRONG = "#3C352B", MUTED = "#9A8B73",
  BORDER = "#EDE8E0", TEAL = "#7DD3C0", TEAL_DEEP = "#3E9C82",
  TEAL_SOFT = "#E9F8F4", CORAL_SOFT = "#FEEFEF", CORAL = "#FCA5A5",
  LAV_SOFT = "#F1EEFE";
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

export default function LessonPlayerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [missing, setMissing] = useState(false);
  const [step, setStep] = useState(0);
  const [games, setGames] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/lessons/${id}`);
      const j = (await r.json()) as { lesson?: Lesson | null };
      if (!j.lesson) { setMissing(true); return; }
      setLesson(j.lesson);
      setGames(j.lesson.progress?.games ?? {});
      setStep(Math.min(j.lesson.progress?.step ?? 0, 3));
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
    patch({ step: Math.min(n, 5) });
  }, [patch]);

  const words = useMemo(() => lesson?.content?.words ?? [], [lesson]);
  const phrases = useMemo(() => lesson?.content?.phrases ?? [], [lesson]);
  const candos = useMemo(() => lesson?.content?.candos ?? [], [lesson]);
  const target = lesson?.learning_target ?? "th";
  const edge = TOPIC_HEX[lesson?.color ?? "peach"] ?? TOPIC_HEX.peach;

  const say = useCallback((text: string) => {
    try { void speak(text, detectLang(text)); } catch { /* audio is best-effort */ }
  }, []);

  if (missing) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAFAF6", gap: 12 }}>
        <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG }}>This lesson isn&apos;t here.</p>
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
          {TRAIL.map((_, i) => (
            <span key={i} style={{ display: "contents" }}>
              <span style={{
                width: 11, height: 11, borderRadius: "50%", flex: "0 0 11px",
                background: i < trailPos || step === 5 ? TEAL : i === trailPos && step < 5 ? edge : "#fff",
                border: `2px solid ${i < trailPos || step === 5 ? TEAL : i === trailPos && step < 5 ? edge : BORDER}`,
                transform: i === trailPos && step < 5 ? "scale(1.25)" : "none",
                transition: "all .25s ease",
              }} />
              {i < TRAIL.length - 1 ? (
                <span style={{ flex: 1, borderTop: `2px dotted ${i < trailPos || step === 5 ? TEAL : "#E0D8C8"}`, margin: "0 3px" }} />
              ) : null}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "0 0 18px" }}>
          {TRAIL.map((t) => (
            <span key={t} style={{ ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#C4BDB5" }}>{t}</span>
          ))}
        </div>

        {step === 0 ? <IntroStep lesson={lesson} onNext={() => go(1)} /> : null}
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
        {step === 5 ? <RecapStep lesson={lesson} words={words} phrases={phrases} candos={candos} /> : null}
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

function AudioBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Play sound" style={{
      position: "absolute", top: 9, right: 9, width: 30, height: 30, borderRadius: "50%",
      border: `1px solid ${BORDER}`, background: "#fff", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg viewBox="0 0 24 24" width="13" height="13" fill={INK}><path d="M6 9v6h4l5 4V5l-5 4H6z" /></svg>
    </button>
  );
}

function IntroStep({ lesson, onNext }: { lesson: Lesson; onNext: () => void }) {
  const w = lesson.content?.words?.length ?? 0;
  const p = lesson.content?.phrases?.length ?? 0;
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>What this lesson covers</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>
        {w} words you&apos;ll actually say, {p} phrases that do the talking, games with your voice, ears and hands, and a {lesson.cefr_level} checkpoint to make it stick.
      </p>
      <PrimaryBtn label="Start lesson" onClick={onNext} />
    </div>
  );
}

function WordsStep({ words, target, say, onNext }: { words: WordItem[]; target: string; say: (t: string) => void; onNext: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>{words.length} words to know</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Tap the sound on each — hear it, then say it.</p>
      {words.map((w, i) => (
        <div key={i} style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${TOPIC_HEX.peach}`, borderRadius: 14, boxShadow: CARD_SHADOW, padding: "12px 13px", marginBottom: 10 }}>
          <AudioBtn onClick={() => say(targetText(w, target))} />
          <div style={{ ...thai, fontSize: 20, fontWeight: 600, color: INK_STRONG }}>{targetText(w, target)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4, flexWrap: "wrap" }}>
            {w.cefr_level ? <span style={{ ...font, fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: LAV_SOFT, color: "#6D5BBF" }}>{w.cefr_level}</span> : null}
            {(target === "en" ? w.ipa : w.romanization) ? (
              <span style={{ ...font, fontSize: 11.5, fontWeight: 700, background: "#FAFAF6", border: `1px solid ${BORDER}`, borderRadius: 99, padding: "2px 8px", color: MUTED }}>
                {target === "en" ? w.ipa : w.romanization}
              </span>
            ) : null}
            <span style={{ ...font, fontSize: 12.5, color: MUTED, fontWeight: 600 }}>{target === "en" ? w.word_th : w.word_en}</span>
          </div>
          {w.example_th && w.example_en ? (
            <div style={{ background: "#FAFAF6", borderRadius: 10, padding: "9px 11px", marginTop: 11, fontSize: 12.5, lineHeight: 1.5, color: INK }}>
              <span style={font}>&quot;{w.example_en}&quot;</span><br />
              <span style={{ ...thai, color: MUTED }}>&quot;{w.example_th}&quot;</span>
            </div>
          ) : null}
          {w.meanings?.length ? (
            <>
              <button onClick={() => setOpen(open === i ? null : i)} style={{ ...font, fontSize: 11, fontWeight: 700, color: "#6D5BBF", background: "none", border: "none", cursor: "pointer", padding: "7px 0 0" }}>
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
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Each one is a complete thing you can say today. Hear your new words hiding inside.</p>
      {phrases.map((p, i) => (
        <div key={i} style={{ position: "relative", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `3px solid ${TOPIC_HEX.peach}`, borderRadius: 14, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 10 }}>
          <AudioBtn onClick={() => say(target === "en" ? p.en : p.th)} />
          <div style={{ ...thai, fontSize: 17.5, fontWeight: 600, color: INK_STRONG, lineHeight: 1.5, paddingRight: 34 }}>{target === "en" ? p.en : p.th}</div>
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
  const LABELS: Record<string, string> = { say: "Say it", match: "Match", listen: "Listen", fill: "Fill in" };
  return (
    <div>
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>Play it {available.length} ways</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Finish every game to unlock the checkpoint.</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${available.length}, 1fr)`, gap: 6, marginBottom: 16 }}>
        {available.map((k) => (
          <button key={k} onClick={() => setTab(k)} style={{
            ...font, fontSize: 10.5, fontWeight: 700, padding: "9px 2px", borderRadius: 12, cursor: "pointer",
            border: `1px solid ${games[k] ? TEAL : tab === k ? TOPIC_HEX.peach : BORDER}`,
            background: games[k] ? TEAL_SOFT : tab === k ? "#FEF1E3" : "#fff",
            color: games[k] ? TEAL_DEEP : tab === k ? "#B06A28" : MUTED,
          }}>{LABELS[k]}</button>
        ))}
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
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14 }}>
        <div style={{ ...thai, fontSize: 20, fontWeight: 600, color: INK_STRONG }}>{text}</div>
        {phrase.romanization && target !== "en" ? <div style={{ ...font, fontSize: 12.5, fontWeight: 700, color: MUTED, marginTop: 7 }}>{phrase.romanization}</div> : null}
      </div>
      <button onClick={() => say(text)} style={{
        width: 84, height: 84, borderRadius: "50%", border: `1px solid ${BORDER}`, cursor: "pointer",
        margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff", boxShadow: CARD_SHADOW,
      }} aria-label="Hear Miomi say it">
        <svg viewBox="0 0 24 24" width="30" height="30" fill={INK}><path d="M6 9v6h4l5 4V5l-5 4H6z" /></svg>
      </button>
      <p style={{ ...font, fontSize: 13, fontWeight: 700, color: MUTED, lineHeight: 1.4, margin: "0 0 12px" }}>
        {done ? "Said and done — lovely." : "Hear it, then say it out loud — really out loud. Miomi starts grading your sound in a coming update."}
      </p>
      {!done ? (
        <button onClick={onDone} style={{
          ...font, fontSize: 13, fontWeight: 700, padding: "11px 24px", borderRadius: 99,
          border: "none", cursor: "pointer", background: CTA, color: "#fff", boxShadow: CTA_SHADOW,
        }}>I said it aloud</button>
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
    if (paired.has(cell.k) && [...paired].length) { /* allow only unpaired */ }
    if (sel === null) { setSel(idx); return; }
    if (sel === idx) { setSel(null); return; }
    const other = cells[sel]!;
    if (other.k === cell.k && sel !== idx) {
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
              border: `1px solid ${isPaired ? TEAL : shakeIdx === idx ? CORAL : sel === idx ? "#C4B5FD" : BORDER}`,
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
        width: 64, height: 64, borderRadius: "50%", border: "1px solid #C4B5FD", cursor: "pointer",
        margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", background: LAV_SOFT,
      }} aria-label="Play the word">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="#6D5BBF"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 9, marginBottom: 12 }}>
        {options.map((w, i) => (
          <button key={i} onClick={() => {
            if (done) return;
            if (!played) { setMsg("Play it first — train those ears."); return; }
            if (w.word_en === answer.word_en) { setMsg("Your ears caught it."); onDone(); }
            else { setWrongIdx(i); setMsg("Listen once more."); setTimeout(() => setWrongIdx(null), 600); }
          }} style={{
            ...font, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "14px 6px",
            background: done && w.word_en === answer.word_en ? TEAL_SOFT : wrongIdx === i ? CORAL_SOFT : "#fff",
            border: `1px solid ${done && w.word_en === answer.word_en ? TEAL : wrongIdx === i ? CORAL : BORDER}`,
            borderRadius: 14, boxShadow: CARD_SHADOW, color: INK_STRONG,
          }}>{target === "en" ? w.word_th : w.word_en}</button>
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
      <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 18, marginBottom: 14, lineHeight: 1.7 }}>
        <div style={{ ...font, fontSize: 13.5, color: MUTED }}>&quot;{pick.example_en}&quot;</div>
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
    return shuffle(pool).slice(0, Math.min(3, pool.length)).map((p, i) => {
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
      <h3 style={{ ...font, fontSize: 19, fontWeight: 700, color: INK_STRONG, margin: "0 0 4px" }}>{level} Checkpoint</h3>
      <p style={{ ...font, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: "0 0 16px" }}>Not a grade — proof of what you can now do.</p>
      {q.cando ? (
        <span style={{ ...font, display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", background: LAV_SOFT, color: "#6D5BBF", borderRadius: 99, padding: "3px 10px", marginBottom: 9 }}>
          {level} · {q.cando}
        </span>
      ) : null}
      <p style={{ ...font, fontSize: 16, fontWeight: 700, color: INK_STRONG, margin: "0 0 14px", lineHeight: 1.45 }}>
        Question {idx + 1} of {questions.length} — how do you say: &quot;{q.q}&quot;
      </p>
      {q.options.map((opt) => {
        const isRight = picked && opt === q.right;
        const isWrong = picked === opt && opt !== q.right;
        return (
          <button key={opt} onClick={() => answer(opt)} disabled={!!picked} style={{
            ...thai, width: "100%", textAlign: "left", fontSize: 15, fontWeight: 600,
            cursor: picked ? "default" : "pointer", background: isRight ? TEAL_SOFT : isWrong ? CORAL_SOFT : "#fff",
            border: `1px solid ${isRight ? TEAL : isWrong ? CORAL : BORDER}`, borderRadius: 14,
            padding: "13px 15px", marginBottom: 9, boxShadow: CARD_SHADOW, color: INK_STRONG,
          }}>{opt}</button>
        );
      })}
    </div>
  );
}

function RecapStep({ lesson, words, phrases, candos }: { lesson: Lesson; words: WordItem[]; phrases: PhraseItem[]; candos: Cando[] }) {
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
      <Link href="/lessons" style={{
        ...font, display: "block", textAlign: "center", fontSize: 14.5, fontWeight: 700,
        padding: "14px 22px", borderRadius: 99, background: CTA, color: "#fff",
        textDecoration: "none", boxShadow: CTA_SHADOW,
      }}>Back to my lessons</Link>
    </div>
  );
}
