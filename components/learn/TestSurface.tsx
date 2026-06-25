"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Sparkles, Check, X, RotateCcw, Share2, ChevronRight } from "lucide-react";

// ── tokens (match app/(app)/learn/page.tsx) ───────────────────────────────────
const INK_STRONG = "#3C352B";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const OK = "#3E9C82";
const NO = "#C56A5E";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;

const LADDER = ["A1", "A2", "B1", "B2", "C1"] as const;

const LEVEL_TINT: Record<string, { bg: string; fg: string }> = {
  A1: { bg: "#EBFBF4", fg: "#3E7A66" },
  A2: { bg: "#E9F8F4", fg: "#3E9C82" },
  B1: { bg: "#F1EEFE", fg: "#6D5BBF" },
  B2: { bg: "#FDEAF4", fg: "#C2497E" },
  C1: { bg: "#F7F0E2", fg: "#A8853F" },
};

type TestQuestion = {
  show: string;
  romanization?: string;
  options: string[];
  correctIndex: number;
  level: string;
  concept: string;
  imageUrl?: string;
};
type Check = { level: string; score: number; total: number; created_at: string };
type Phase = "intro" | "loading" | "quiz" | "result";

const T = {
  en: {
    title: "Where's your level?",
    body: "A quick check — Miomi gives you words that climb in difficulty and finds where you are.",
    start: "Start the check",
    starting: "Miomi is preparing your check…",
    last: "Last check",
    retake: "Retake",
    question: "Question",
    next: "Next",
    see: "See my result",
    around: "You're around",
    right: "right",
    setLevel: "Set as my level",
    saved: "Saved — your lessons follow this now",
    share: "Share",
    fail: "Couldn't build the check just now — try again.",
    of: "of",
  },
  th: {
    title: "ระดับของคุณอยู่ตรงไหน?",
    body: "เช็กสั้นๆ — มิโอมิจะให้คำที่ยากขึ้นเรื่อยๆ แล้วหาระดับของคุณ",
    start: "เริ่มเช็กระดับ",
    starting: "มิโอมิกำลังเตรียมข้อสอบให้…",
    last: "เช็กล่าสุด",
    retake: "ทำใหม่",
    question: "ข้อ",
    next: "ต่อไป",
    see: "ดูผลของฉัน",
    around: "คุณอยู่ราวๆ",
    right: "ข้อที่ถูก",
    setLevel: "ตั้งเป็นระดับของฉัน",
    saved: "บันทึกแล้ว — บทเรียนจะอิงระดับนี้",
    share: "แชร์",
    fail: "สร้างข้อสอบไม่สำเร็จ ลองอีกครั้งนะ",
    of: "จาก",
  },
} as const;

function targetName(lt: string, ui: "th" | "en"): string {
  if (lt === "en") return ui === "th" ? "อังกฤษ" : "English";
  return ui === "th" ? "ไทย" : "Thai";
}

function estimate(qs: TestQuestion[], picked: number[]): { level: string; score: number } {
  let score = 0;
  const byLevel: Record<string, { ok: number; n: number }> = {};
  qs.forEach((q, i) => {
    const right = picked[i] === q.correctIndex;
    if (right) score++;
    const b = (byLevel[q.level] ??= { ok: 0, n: 0 });
    b.n++;
    if (right) b.ok++;
  });
  let level = "A1";
  for (const lv of LADDER) {
    const b = byLevel[lv];
    if (!b) continue;
    if (b.ok / b.n >= 0.6) level = lv;
    else break; // first level they don't clear stops the climb
  }
  return { level, score };
}

type CheckpointInfo = {
  level: string;
  badge: string;
  kind: "checkpoint" | "level_test";
  title: string;
  passPct?: number;
};

export default function TestSurface({
  uiLang = "en",
  mode = "placement",
  checkpoint,
  onDone,
}: {
  uiLang?: "th" | "en";
  mode?: "placement" | "checkpoint";
  checkpoint?: CheckpointInfo;
  onDone?: (advancedTo?: string) => void;
}) {
  const t = T[uiLang];
  const isCp = mode === "checkpoint" && !!checkpoint;
  const [phase, setPhase] = useState<Phase>(isCp ? "loading" : "intro");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [learningTarget, setLearningTarget] = useState(uiLang === "en" ? "th" : "en");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [history, setHistory] = useState<Check[]>([]);
  const [result, setResult] = useState<{ level: string; score: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isCp) return;
    let on = true;
    fetch("/api/test/result")
      .then((r) => r.json())
      .then((j) => {
        if (on && j?.ok && Array.isArray(j.checks)) setHistory(j.checks);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [isCp]);

  const start = useCallback(async () => {
    setFailed(false);
    setPhase("loading");
    try {
      const r =
        isCp && checkpoint
          ? await fetch("/api/curriculum/checkpoint", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ level: checkpoint.level, badge: checkpoint.badge }),
            })
          : await fetch("/api/test/level-check", { method: "POST" });
      const j = await r.json();
      if (j?.ok && Array.isArray(j.questions) && j.questions.length) {
        setQuestions(j.questions);
        if (typeof j.learningTarget === "string") setLearningTarget(j.learningTarget);
        setPicked(new Array(j.questions.length).fill(-1));
        setIdx(0);
        setRevealed(false);
        setResult(null);
        setSaved(false);
        setPhase("quiz");
      } else {
        setFailed(true);
        setPhase("intro");
      }
    } catch {
      setFailed(true);
      setPhase("intro");
    }
  }, [isCp, checkpoint]);

  // Checkpoint mode skips the placement intro and loads its curated questions immediately.
  useEffect(() => {
    if (!isCp) return;
    const id = setTimeout(() => {
      void start();
    }, 0);
    return () => clearTimeout(id);
  }, [isCp, start]);

  const pick = (oi: number) => {
    if (revealed) return;
    setPicked((p) => {
      const n = [...p];
      n[idx] = oi;
      return n;
    });
    setRevealed(true);
  };

  const next = () => {
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setRevealed(false);
      return;
    }
    if (isCp && checkpoint) {
      const score = questions.reduce((n, qq, i) => n + (picked[i] === qq.correctIndex ? 1 : 0), 0);
      const total = questions.length;
      const passed = score / Math.max(1, total) >= (checkpoint.passPct ?? 0.7);
      setResult({ level: checkpoint.level, score });
      setPhase("result");
      // Persist the attempt so cleared checkpoints stay marked on the path (separate from placement history).
      void fetch("/api/curriculum/checkpoint/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: checkpoint.level, badge: checkpoint.badge, score, total, passed }),
      }).catch(() => {});
      return;
    }
    const res = estimate(questions, picked);
    setResult(res);
    setPhase("result");
    void fetch("/api/test/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: res.level, score: res.score, total: questions.length }),
    }).catch(() => {});
  };

  // Level test passed → anchor the NEXT CEFR level via the existing result route
  // (updates profiles.cefr_level + logs the achievement), then hand control back.
  const finishLevelTest = async (nextLevel: string) => {
    if (!result || saved) return;
    setSaved(true);
    try {
      await fetch("/api/test/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: nextLevel,
          score: result.score,
          total: questions.length,
          setLevel: true,
        }),
      });
    } catch {
      /* best effort */
    }
    onDone?.(nextLevel);
  };

  const accept = async () => {
    if (!result || saved) return;
    setSaved(true);
    setHistory((h) => [
      { level: result.level, score: result.score, total: questions.length, created_at: new Date().toISOString() },
      ...h,
    ]);
    await fetch("/api/test/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: result.level,
        score: result.score,
        total: questions.length,
        setLevel: true,
      }),
    }).catch(() => {});
  };

  const share = async () => {
    if (!result) return;
    const tn = targetName(learningTarget, uiLang);
    const text =
      uiLang === "th"
        ? `ฉันอยู่ระดับ ${result.level} (${tn}) แล้ว — มาเรียนกับมิโอมิกัน!`
        : `I just reached ${result.level} ${tn} with Miomi — come learn with me!`;
    const url = typeof window !== "undefined" ? window.location.origin : "https://miomika.com";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Miomika", text, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      /* user dismissed */
    }
  };

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(uiLang === "th" ? "th-TH" : "en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const f = uiLang === "th"
    ? ({ ...font, fontFamily: "'Sarabun', sans-serif" } as const)
    : font;

  // ── CHECKPOINT: loading / failed ─────────────────────────────────────────────
  if (isCp && checkpoint && (phase === "loading" || phase === "intro")) {
    const cpTitle =
      checkpoint.kind === "level_test"
        ? uiLang === "th"
          ? `ทดสอบระดับ ${checkpoint.level}`
          : `${checkpoint.level} level test`
        : uiLang === "th"
          ? `เช็กพอยต์ ${checkpoint.badge}`
          : `Checkpoint ${checkpoint.badge}`;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: CARD_SHADOW, padding: "26px 22px", textAlign: "center" }}>
          <span style={{ width: 72, height: 72, borderRadius: "50%", background: "#E9F8F4", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/miomi/head-happy.png" alt="Miomi" width={62} height={62} style={{ objectFit: "contain" }} />
          </span>
          <h2 style={{ ...f, fontSize: 18, fontWeight: 700, color: INK_STRONG, margin: "12px 0 0" }}>{cpTitle}</h2>
          <p style={{ ...f, fontSize: 12.5, color: failed ? NO : MUTED, margin: "8px 0 0", fontWeight: failed ? 600 : 400, lineHeight: 1.5 }}>
            {failed
              ? uiLang === "th" ? "โหลดไม่สำเร็จ ลองอีกครั้งนะ" : "Couldn't load this — try again."
              : uiLang === "th" ? "กำลังเตรียมให้…" : "Getting it ready…"}
          </p>
          {failed ? (
            <div style={{ display: "flex", gap: 9, justifyContent: "center", marginTop: 18 }}>
              <button onClick={() => onDone?.()} style={{ ...font, fontSize: 13.5, fontWeight: 700, padding: "11px 18px", borderRadius: 99, border: `1px solid ${BORDER}`, background: "#FFFFFF", color: INK_STRONG, cursor: "pointer" }}>
                {uiLang === "th" ? "ปิด" : "Close"}
              </button>
              <button onClick={start} style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, padding: "11px 20px", borderRadius: 99, border: "none", background: CTA, color: "#fff", boxShadow: CTA_SHADOW, cursor: "pointer" }}>
                <RotateCcw style={{ width: 15, height: 15 }} strokeWidth={2.2} aria-hidden />
                {uiLang === "th" ? "ลองอีกครั้ง" : "Try again"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // ── CHECKPOINT: result ───────────────────────────────────────────────────────
  if (isCp && checkpoint && phase === "result" && result) {
    const total = questions.length;
    const pass = result.score / Math.max(1, total) >= (checkpoint.passPct ?? 0.7);
    const li = LADDER.indexOf(checkpoint.level as (typeof LADDER)[number]);
    const nextLevel = li >= 0 && li < LADDER.length - 1 ? LADDER[li + 1] : checkpoint.level;
    const canAdvance = checkpoint.kind === "level_test" && pass && nextLevel !== checkpoint.level;
    const tint = pass ? { bg: "#E9F8F4", fg: OK } : { bg: "#FBEEEC", fg: NO };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 20, boxShadow: CARD_SHADOW, padding: "26px 22px", textAlign: "center" }}>
          <span style={{ width: 72, height: 72, borderRadius: "50%", background: tint.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <Image src="/miomi/head-happy.png" alt="Miomi" width={62} height={62} style={{ objectFit: "contain" }} />
          </span>
          <div style={{ ...font, marginTop: 12, fontSize: 40, fontWeight: 700, color: tint.fg, lineHeight: 1 }}>
            {result.score}<span style={{ fontSize: 22, color: MUTED }}>/{total}</span>
          </div>
          <p style={{ ...f, fontSize: 13, fontWeight: 600, color: pass ? OK : MUTED, margin: "10px 0 0" }}>
            {canAdvance
              ? uiLang === "th" ? `ผ่านแล้ว! ปลดล็อกระดับ ${nextLevel}` : `Passed! ${nextLevel} unlocked`
              : pass
                ? uiLang === "th" ? "เยี่ยมมาก!" : "Nicely done!"
                : uiLang === "th" ? "ลองอีกครั้งได้เสมอนะ" : "Give it another go anytime"}
          </p>
          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            <button onClick={start} style={{ ...font, flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, padding: "11px 16px", borderRadius: 99, border: `1px solid ${BORDER}`, background: "#FFFFFF", color: INK_STRONG, cursor: "pointer" }}>
              <RotateCcw style={{ width: 15, height: 15 }} strokeWidth={2.2} aria-hidden />
              {uiLang === "th" ? "ทำใหม่" : "Retake"}
            </button>
            {canAdvance ? (
              <button onClick={() => void finishLevelTest(nextLevel)} disabled={saved} style={{ ...font, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 14, fontWeight: 700, padding: "11px 0", borderRadius: 99, border: "none", background: saved ? "#E9F8F4" : CTA, color: saved ? OK : "#fff", boxShadow: saved ? "none" : CTA_SHADOW, cursor: saved ? "default" : "pointer" }}>
                {uiLang === "th" ? `ไปต่อ ${nextLevel}` : `Continue to ${nextLevel}`}
                <ChevronRight style={{ width: 16, height: 16 }} strokeWidth={2.4} aria-hidden />
              </button>
            ) : (
              <button onClick={() => onDone?.()} style={{ ...font, flex: 1, fontSize: 14, fontWeight: 700, padding: "11px 0", borderRadius: 99, border: "none", background: CTA, color: "#fff", boxShadow: CTA_SHADOW, cursor: "pointer" }}>
                {uiLang === "th" ? "เสร็จแล้ว" : "Done"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── INTRO ───────────────────────────────────────────────────────────────────
  if (phase === "intro" || phase === "loading") {
    const loading = phase === "loading";
    const top = history[0];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            boxShadow: CARD_SHADOW,
            padding: "26px 22px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: "#E9F8F4",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image src="/miomi/head-happy.png" alt="Miomi" width={66} height={66} style={{ objectFit: "contain" }} />
          </span>
          <h2 style={{ ...f, fontSize: 18, fontWeight: 700, color: INK_STRONG, margin: "12px 0 0" }}>{t.title}</h2>
          <p style={{ ...f, fontSize: 12.5, color: MUTED, margin: "8px 0 0", lineHeight: 1.5 }}>
            {loading ? t.starting : t.body}
          </p>

          {!loading && top ? (
            <div
              style={{
                ...font,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 14,
                fontSize: 12,
                fontWeight: 700,
                color: LEVEL_TINT[top.level]?.fg ?? MUTED,
                background: LEVEL_TINT[top.level]?.bg ?? "#F1ECE3",
                borderRadius: 99,
                padding: "5px 12px",
              }}
            >
              {t.last}: {top.level}
            </div>
          ) : null}

          {failed ? (
            <p style={{ ...f, fontSize: 12, color: NO, fontWeight: 600, margin: "12px 0 0" }}>{t.fail}</p>
          ) : null}

          <button
            onClick={start}
            disabled={loading}
            style={{
              ...font,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
              fontSize: 14.5,
              fontWeight: 700,
              padding: "12px 28px",
              borderRadius: 99,
              border: "none",
              cursor: loading ? "default" : "pointer",
              background: CTA,
              color: "#fff",
              boxShadow: CTA_SHADOW,
              opacity: loading ? 0.7 : 1,
            }}
          >
            <Sparkles style={{ width: 16, height: 16 }} strokeWidth={2.4} aria-hidden />
            {loading ? t.starting : top ? t.retake : t.start}
          </button>
        </div>

        {!loading && history.length > 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              boxShadow: CARD_SHADOW,
              padding: "12px 14px",
            }}
          >
            {history.slice(0, 6).map((h, i) => (
              <div
                key={`${h.created_at}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  borderBottom: i < Math.min(history.length, 6) - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <span
                  style={{
                    ...font,
                    fontSize: 12,
                    fontWeight: 700,
                    color: LEVEL_TINT[h.level]?.fg ?? INK_STRONG,
                    background: LEVEL_TINT[h.level]?.bg ?? "#F1ECE3",
                    borderRadius: 8,
                    padding: "3px 9px",
                  }}
                >
                  {h.level}
                </span>
                <span style={{ ...f, fontSize: 11.5, color: MUTED, fontWeight: 600 }}>
                  {h.score}/{h.total} · {fmtDate(h.created_at)}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    const tint = LEVEL_TINT[result.level] ?? { bg: "#E9F8F4", fg: OK };
    const perLevel = LADDER.filter((lv) => questions.some((q) => q.level === lv)).map((lv) => {
      const items = questions.map((q, i) => ({ q, i })).filter((x) => x.q.level === lv);
      const ok = items.filter((x) => picked[x.i] === x.q.correctIndex).length;
      return { lv, ok, n: items.length };
    });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${BORDER}`,
            borderRadius: 20,
            boxShadow: CARD_SHADOW,
            padding: "26px 22px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              background: tint.bg,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image src="/miomi/head-happy.png" alt="Miomi" width={66} height={66} style={{ objectFit: "contain" }} />
          </span>
          <p style={{ ...f, fontSize: 13, fontWeight: 600, color: MUTED, margin: "12px 0 2px" }}>{t.around}</p>
          <div
            style={{
              ...font,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 8,
              fontSize: 40,
              fontWeight: 700,
              color: tint.fg,
              lineHeight: 1,
            }}
          >
            {result.level}
          </div>
          <p style={{ ...f, fontSize: 12.5, color: MUTED, margin: "8px 0 0", fontWeight: 600 }}>
            {result.score} {t.of} {questions.length} {t.right}
          </p>

          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
            {perLevel.map((p) => (
              <span
                key={p.lv}
                style={{
                  ...font,
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: LEVEL_TINT[p.lv]?.fg ?? MUTED,
                  background: LEVEL_TINT[p.lv]?.bg ?? "#F1ECE3",
                  borderRadius: 99,
                  padding: "4px 10px",
                }}
              >
                {p.lv} {p.ok}/{p.n}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            <button
              onClick={share}
              style={{
                ...font,
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13.5,
                fontWeight: 700,
                padding: "11px 16px",
                borderRadius: 99,
                border: `1px solid ${BORDER}`,
                background: "#FFFFFF",
                color: INK_STRONG,
                cursor: "pointer",
              }}
            >
              <Share2 style={{ width: 15, height: 15 }} strokeWidth={2.2} aria-hidden />
              {t.share}
            </button>
            <button
              onClick={accept}
              disabled={saved}
              style={{
                ...font,
                flex: 1,
                fontSize: 14,
                fontWeight: 700,
                padding: "11px 0",
                borderRadius: 99,
                border: "none",
                background: saved ? "#E9F8F4" : CTA,
                color: saved ? OK : "#fff",
                boxShadow: saved ? "none" : CTA_SHADOW,
                cursor: saved ? "default" : "pointer",
              }}
            >
              {saved ? t.saved : `${t.setLevel} (${result.level})`}
            </button>
          </div>
        </div>

        <button
          onClick={start}
          style={{
            ...font,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 700,
            color: MUTED,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          <RotateCcw style={{ width: 14, height: 14 }} strokeWidth={2.2} aria-hidden />
          {t.retake}
        </button>
      </div>
    );
  }

  // ── QUIZ ────────────────────────────────────────────────────────────────────
  const q = questions[idx];
  if (!q) return null;
  const last = idx + 1 >= questions.length;
  const tint = LEVEL_TINT[q.level] ?? { bg: "#E9F8F4", fg: OK };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {isCp ? (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -4 }}>
          <button onClick={() => onDone?.()} aria-label="Close" style={{ display: "inline-flex", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: MUTED, padding: 2 }}>
            <X style={{ width: 16, height: 16 }} strokeWidth={2.4} aria-hidden />
          </button>
        </div>
      ) : null}
      {/* progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...f, fontSize: 12, fontWeight: 700, color: MUTED }}>
          {t.question} {idx + 1} {t.of} {questions.length}
        </span>
        <span
          style={{
            ...font,
            fontSize: 10.5,
            fontWeight: 700,
            color: tint.fg,
            background: tint.bg,
            borderRadius: 99,
            padding: "3px 10px",
          }}
        >
          {q.level}
        </span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {questions.map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background: i < idx ? "#34A98F" : i === idx ? "#9FE0D1" : "#EDE8E0",
            }}
          />
        ))}
      </div>

      {/* question card */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          boxShadow: CARD_SHADOW,
          padding: "24px 18px 18px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontFamily: "'Sarabun', sans-serif",
              fontSize: 30,
              fontWeight: 700,
              color: INK_STRONG,
              lineHeight: 1.2,
            }}
          >
            {q.show}
          </div>
          {q.romanization ? (
            <div style={{ ...font, fontSize: 13, fontWeight: 600, color: MUTED, marginTop: 4 }}>{q.romanization}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {q.options.map((opt, oi) => {
            const isCorrect = oi === q.correctIndex;
            const isPicked = picked[idx] === oi;
            let bg = "#FFFFFF";
            let bd = BORDER;
            let fg = INK_STRONG;
            if (revealed && isCorrect) {
              bg = "#EBFBF4";
              bd = "#9FE0D1";
              fg = OK;
            } else if (revealed && isPicked && !isCorrect) {
              bg = "#FEEFEF";
              bd = "#F3C9C2";
              fg = NO;
            }
            return (
              <button
                key={oi}
                onClick={() => pick(oi)}
                disabled={revealed}
                style={{
                  ...f,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  textAlign: "left",
                  fontSize: 14.5,
                  fontWeight: 600,
                  padding: "13px 15px",
                  borderRadius: 14,
                  border: `1.5px solid ${bd}`,
                  background: bg,
                  color: fg,
                  cursor: revealed ? "default" : "pointer",
                  width: "100%",
                }}
              >
                <span>{opt}</span>
                {revealed && isCorrect ? (
                  <Check style={{ width: 17, height: 17, color: OK, flex: "0 0 17px" }} strokeWidth={2.6} aria-hidden />
                ) : revealed && isPicked && !isCorrect ? (
                  <X style={{ width: 17, height: 17, color: NO, flex: "0 0 17px" }} strokeWidth={2.6} aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {revealed ? (
        <button
          onClick={next}
          style={{
            ...font,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            fontSize: 15,
            fontWeight: 700,
            padding: "13px 0",
            borderRadius: 99,
            border: "none",
            background: CTA,
            color: "#fff",
            boxShadow: CTA_SHADOW,
            cursor: "pointer",
            width: "100%",
          }}
        >
          {last ? t.see : t.next}
          <ChevronRight style={{ width: 17, height: 17 }} strokeWidth={2.6} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
