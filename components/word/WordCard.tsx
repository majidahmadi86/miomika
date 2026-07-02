"use client";

// The canonical Miomika word card. ONE component, three densities, both
// learning directions. Every screen that shows a word uses this — never a
// local re-implementation. Fields render only when present, so partial data
// degrades gracefully instead of breaking layout.

import { useState } from "react";

export type CanonicalWord = {
  id?: string;
  word_en: string;
  word_th: string;
  romanization?: string | null;   // Thai word -> latin karaoke (for EN learners)
  ipa?: string | null;            // English word -> IPA (fallback aid for TH learners)
  karaoke_th?: string | null;     // English word -> Thai-script karaoke (preferred for TH learners; content-gen, Gemini era)
  pos?: string | null;            // part of speech, already in the learner's language
  register?: string | null;       // formality note, already in the learner's language
  cefr_level?: string | null;
  example_en?: string | null;
  example_th?: string | null;
  note_en?: string | null;        // Miomi's tip for EN-speaking learners
  note_th?: string | null;        // Miomi's tip for TH-speaking learners
  meanings?: Array<{ sense: string; example_en?: string; example_th?: string }> | null;
};

type Target = "en" | "th"; // the language being LEARNED

export type SpeakFn = (text: string, lang: Target) => void;

// ---- brand tokens (Miomika kawaii palette) ----
const MINT = "#2C8E76", MINT_DEEP = "#1F7A68", MINT_SOFT = "#E7F3EF";
const HEAD = "#1B4F43", INK = "#57534A", MUTED = "#8A857A";
const CARD_BORDER = "#E5EFEA", EX_BG = "#F6FBF9", EX_BORDER = "#E1EFE9";
const GOLD_BG = "#FBF3DC", GOLD = "#8A6D1F";
const PINK_SOFT = "#FBEAF0", PINK_DEEP = "#993556";
const LAV_SOFT = "#EEEDFE", LAV_DEEP = "#3C3489";
const STAR_OFF = "#C9BFA8", STAR_ON = "#EFB93F";
const Q = "'Quicksand', system-ui, sans-serif";
const TH_FONT = "'Noto Sans Thai', 'Quicksand', system-ui, sans-serif";

// Resolve which text goes in which slot for a given direction.
function resolve(w: CanonicalWord, target: Target) {
  if (target === "th") {
    return {
      head: w.word_th, headThai: true,
      pron: w.romanization ?? null,
      meaning: w.word_en,
      ex: w.example_th ?? null, exThai: true,
      exTrans: w.example_en ?? null,
      tip: w.note_en ?? null, tipThai: false,
      headLang: "th" as Target, exLang: "th" as Target,
    };
  }
  return {
    head: w.word_en, headThai: false,
    pron: w.karaoke_th ?? w.ipa ?? null,
    meaning: w.word_th,
    ex: w.example_en ?? null, exThai: false,
    exTrans: w.example_th ?? null,
    tip: w.note_th ?? null, tipThai: true,
    headLang: "en" as Target, exLang: "en" as Target,
  };
}

function PlayBtn({ onClick, size = 46, soft = false, label }: { onClick: () => void; size?: number; soft?: boolean; label: string }) {
  return (
    <button aria-label={label} onClick={onClick} style={{
      width: size, height: size, borderRadius: "50%", border: "none",
      background: soft ? MINT_SOFT : MINT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flex: "0 0 auto",
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill={soft ? MINT_DEEP : "#fff"} aria-hidden="true">
        <path d="M8.6 5.4 L19.2 12 L8.6 18.6 Z" />
      </svg>
    </button>
  );
}

function Star({ saved, onToggle }: { saved?: boolean; onToggle?: () => void }) {
  if (!onToggle) return null;
  return (
    <button aria-label={saved ? "Saved" : "Save word"} onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill={saved ? STAR_ON : "none"} stroke={saved ? STAR_ON : STAR_OFF} strokeWidth="1.8" aria-hidden="true">
        <path d="M12 2.7l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ---------- FULL CARD ----------
export function WordCardFull({ word, target, onSpeak, saved, onToggleSave, onCollapse }: {
  word: CanonicalWord; target: Target; onSpeak: SpeakFn; saved?: boolean; onToggleSave?: () => void; onCollapse?: () => void;
}) {
  const r = resolve(word, target);
  const [showMore, setShowMore] = useState(false);
  return (
    <div style={{ fontFamily: Q, background: "#fff", border: `0.5px solid ${CARD_BORDER}`, borderRadius: 16, padding: "16px 16px 13px", color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 11 }}>
        {word.pos ? <span style={{ fontFamily: r.tipThai ? TH_FONT : Q, background: MINT_SOFT, color: MINT_DEEP, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>{word.pos}</span> : null}
        {word.register ? <span style={{ fontFamily: r.tipThai ? TH_FONT : Q, background: PINK_SOFT, color: PINK_DEEP, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>{word.register}</span> : null}
        {word.cefr_level ? <span style={{ background: LAV_SOFT, color: LAV_DEEP, fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 99 }}>{word.cefr_level}</span> : null}
        <span style={{ flex: 1 }} />
        <Star saved={saved} onToggle={onToggleSave} />
        {onCollapse ? (
          <button aria-label="Collapse" onClick={onCollapse} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B9C7C0" strokeWidth="2.2" aria-hidden="true"><path d="M6 14l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: r.headThai ? TH_FONT : Q, fontSize: r.headThai ? 33 : 30, fontWeight: 600, lineHeight: 1.15, color: HEAD }}>{r.head}</div>
          {r.pron ? <div style={{ fontFamily: r.headThai ? Q : TH_FONT, fontSize: 15, color: MINT, fontWeight: 600, marginTop: 2 }}>{r.pron}</div> : null}
          <div style={{ fontFamily: r.headThai ? Q : TH_FONT, fontSize: 14.5, color: INK, marginTop: 5 }}>{r.meaning}</div>
        </div>
        <PlayBtn onClick={() => onSpeak(r.head, r.headLang)} label="Play audio" />
      </div>

      {r.ex ? (
        <div style={{ background: EX_BG, border: `0.5px solid ${EX_BORDER}`, borderRadius: 12, padding: "10px 12px", marginTop: 13 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: r.exThai ? TH_FONT : Q, fontSize: r.exThai ? 16.5 : 15.5, color: "#22443B", fontWeight: 500 }}>{r.ex}</div>
              {r.exTrans ? <div style={{ fontFamily: r.exThai ? Q : TH_FONT, fontSize: 12.5, color: MUTED, marginTop: 3 }}>{r.exTrans}</div> : null}
            </div>
            <PlayBtn onClick={() => onSpeak(r.ex!, r.exLang)} size={30} soft label="Play example" />
          </div>
        </div>
      ) : null}

      {r.tip ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: GOLD_BG, borderRadius: 10, padding: "8px 11px", marginTop: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.9" style={{ flex: "0 0 auto", marginTop: 2 }} aria-hidden="true">
            <circle cx="7" cy="6.5" r="1.9" /><circle cx="12" cy="4.6" r="1.9" /><circle cx="17" cy="6.5" r="1.9" /><path d="M8 13.5c1-2 2.4-3 4-3s3 1 4 3c1.4 2.6-.4 5-4 5s-5.4-2.4-4-5z" />
          </svg>
          <span style={{ fontFamily: r.tipThai ? TH_FONT : Q, fontSize: 12, color: GOLD, lineHeight: 1.55 }}>{r.tip}</span>
        </div>
      ) : null}

      {word.meanings?.length ? (
        <>
          <button onClick={() => setShowMore(!showMore)} style={{ fontFamily: Q, fontSize: 11, fontWeight: 700, color: LAV_DEEP, background: "none", border: "none", cursor: "pointer", padding: "8px 0 0" }}>
            {showMore ? "Hide meanings" : "More meanings"}
          </button>
          {showMore ? (
            <div style={{ marginTop: 8, background: LAV_SOFT, borderRadius: 10, padding: "9px 11px" }}>
              {word.meanings.map((m, k) => (
                <p key={k} style={{ fontFamily: Q, fontSize: 12.5, lineHeight: 1.5, color: INK, margin: k ? "8px 0 0" : 0 }}>
                  <b style={{ color: HEAD }}>{m.sense}</b>
                  {m.example_en ? <><br />{m.example_en}</> : null}
                  {m.example_th ? <><br /><span style={{ fontFamily: TH_FONT, color: MUTED }}>{m.example_th}</span></> : null}
                </p>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ---------- COMPACT ROW (expands into the full card) ----------
export function WordRow({ word, target, onSpeak, saved, onToggleSave, defaultOpen }: {
  word: CanonicalWord; target: Target; onSpeak: SpeakFn; saved?: boolean; onToggleSave?: () => void; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const r = resolve(word, target);
  if (open) {
    return (
      <div style={{ marginBottom: 10 }}>
        <WordCardFull word={word} target={target} onSpeak={onSpeak} saved={saved} onToggleSave={onToggleSave} onCollapse={() => setOpen(false)} />
      </div>
    );
  }
  return (
    <div onClick={() => setOpen(true)} style={{ fontFamily: Q, display: "flex", alignItems: "center", gap: 11, background: "#fff", border: `0.5px solid ${CARD_BORDER}`, borderRadius: 12, padding: "9px 13px", marginBottom: 8, cursor: "pointer", color: INK }}>
      <span onClick={(e) => e.stopPropagation()}>
        <PlayBtn onClick={() => onSpeak(r.head, r.headLang)} size={30} soft label="Play audio" />
      </span>
      <span style={{ fontFamily: r.headThai ? TH_FONT : Q, fontSize: r.headThai ? 16.5 : 15.5, color: HEAD, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "38%" }}>{r.head}</span>
      {r.pron ? <span style={{ fontFamily: r.headThai ? Q : TH_FONT, fontSize: 12.5, color: MINT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.pron}</span> : null}
      <span style={{ flex: 1, fontFamily: r.headThai ? Q : TH_FONT, fontSize: 12.5, color: MUTED, textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.meaning}</span>
      <span onClick={(e) => e.stopPropagation()} style={{ lineHeight: 0 }}><Star saved={saved} onToggle={onToggleSave} /></span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B9C7C0" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
}

// ---------- CHIP (inline in chat; tap = open) ----------
export function WordChip({ word, target, onSpeak, onOpen }: {
  word: CanonicalWord; target: Target; onSpeak: SpeakFn; onOpen?: () => void;
}) {
  const r = resolve(word, target);
  return (
    <button onClick={onOpen ?? (() => onSpeak(r.head, r.headLang))} style={{ fontFamily: Q, display: "inline-flex", alignItems: "center", gap: 7, background: "#fff", border: "0.5px solid #CFE7DF", borderRadius: 99, padding: "5px 13px 5px 9px", cursor: "pointer" }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill={MINT_DEEP} aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
      <span style={{ fontFamily: r.headThai ? TH_FONT : Q, fontSize: 14, color: HEAD, fontWeight: 600 }}>{r.head}</span>
      {r.pron ? <span style={{ fontFamily: r.headThai ? Q : TH_FONT, fontSize: 11.5, color: MINT, fontWeight: 600 }}>{r.pron}</span> : null}
    </button>
  );
}

// ---------- adapters from existing data shapes ----------
export function fromLessonWord(w: {
  word_en: string; word_th: string; romanization: string | null; ipa: string | null;
  cefr_level: string | null; example_en: string | null; example_th: string | null;
  meanings?: Array<{ sense: string; example_en?: string; example_th?: string }>;
}): CanonicalWord {
  return { ...w };
}

export function fromVocabularyEntry(v: {
  id: string; word_en: string; word_th: string; th_romanization?: string; en_ipa?: string;
  miomi_note_th?: string; miomi_note_en?: string; example_en?: string; example_th?: string;
  cefr_level?: string; register?: string;
}): CanonicalWord {
  return {
    id: v.id, word_en: v.word_en, word_th: v.word_th,
    romanization: v.th_romanization ?? null, ipa: v.en_ipa ?? null,
    note_en: v.miomi_note_en ?? null, note_th: v.miomi_note_th ?? null,
    example_en: v.example_en ?? null, example_th: v.example_th ?? null,
    cefr_level: v.cefr_level ?? null, register: v.register ?? null,
  };
}
