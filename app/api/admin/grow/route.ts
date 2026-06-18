export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { callGeminiJson, generateWordCard } from "@/lib/brain/word-content";
import { resolvePhonetics } from "@/lib/brain/phonetics";

const CMUDICT_URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict";
const ARPA_IPA: Record<string, string> = {
  AA:"ɑ",AE:"æ",AH:"ʌ",AO:"ɔ",AW:"aʊ",AY:"aɪ",B:"b",CH:"tʃ",D:"d",DH:"ð",EH:"ɛ",ER:"ɝ",
  EY:"eɪ",F:"f",G:"ɡ",HH:"h",IH:"ɪ",IY:"i",JH:"dʒ",K:"k",L:"l",M:"m",N:"n",NG:"ŋ",OW:"oʊ",
  OY:"ɔɪ",P:"p",R:"ɹ",S:"s",SH:"ʃ",T:"t",TH:"θ",UH:"ʊ",UW:"u",V:"v",W:"w",Y:"j",Z:"z",ZH:"ʒ",
};
function arpaToIpa(phones: string[]): string {
  const vowels = phones.filter((p) => /\d$/.test(p)).length;
  let pri = -1, sec = -1;
  const out = phones.map((p, i) => {
    const st = p.match(/(\d)$/)?.[1]; const b = p.replace(/\d$/, "");
    if (st === "1") pri = i; else if (st === "2") sec = i;
    if (b === "AH" && st === "0") return "ə";
    if (b === "ER" && st === "0") return "ɚ";
    return ARPA_IPA[b] ?? "";
  });
  if (vowels > 1) { if (pri >= 0) out[pri] = "ˈ" + out[pri]; if (sec >= 0) out[sec] = "ˌ" + out[sec]; }
  return out.join("");
}
async function loadCmudict(): Promise<Map<string, string[]>> {
  const res = await fetch(CMUDICT_URL); const text = await res.text();
  const m = new Map<string, string[]>();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith(";;;")) continue;
    const nc = line.split("#")[0].trim(); if (!nc) continue;
    const parts = nc.split(/\s+/); const w = parts[0].replace(/\(\d+\)$/, "").toLowerCase();
    if (!m.has(w)) m.set(w, parts.slice(1));
  }
  return m;
}
function lookupIpa(wordEn: string, dict: Map<string, string[]>): string | null {
  const toks = wordEn.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!toks.length) return null;
  const parts: string[] = [];
  for (const t of toks) { const ph = dict.get(t.replace(/[^a-z']/g, "")); if (!ph) return null; parts.push(arpaToIpa(ph)); }
  return `/${parts.join(" ")}/`;
}
const THAI_PURE = /^[\u0E00-\u0E7F0-9\s.,!?'"()\u2018\u2019\u201C\u201D\-\u2013\u2014:;%฿\u2026]+$/;
const FOREIGN = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0400-\u04FF]/;
function isPureThai(t: string): boolean { const s = t.trim(); return THAI_PURE.test(s) && /[\u0E00-\u0E7F]/.test(s); }

const TOPICS: Record<string, string[]> = {
  C1: ["business", "technology", "health", "travel", "education", "emotions"],
  C2: ["business", "academic life", "politics", "science", "arts and culture", "economics"],
  B2: ["work", "daily life", "food", "shopping", "health", "travel"],
};
async function propose(level: string, topic: string, n: number): Promise<string[]> {
  const sys = `You are a Thai-English curriculum designer. List exactly ${n} useful ENGLISH words or short phrases for a CEFR ${level} learner studying "${topic}". Real, natural, commonly taught — no rare jargon, no duplicates. STRICT JSON ONLY: {"words":["..."]}. No prose, no fences.`;
  const raw = await callGeminiJson(sys, `topic=${topic} level=${level}`);
  try { return (JSON.parse((raw || "{}").replace(/```json|```/g, "").trim()).words ?? []).map((w: string) => String(w).trim()).filter(Boolean).slice(0, n); }
  catch { return []; }
}

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? null;
  if (!email || !admins.includes(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const level = (sp.get("level") || "C1").toUpperCase();
  const n = Math.min(Math.max(Number(sp.get("n") || "5"), 1), 8);
  const dry = sp.get("dry") === "1";
  const topics = TOPICS[level] ?? ["general", "daily life", "work"];

  const supabase = await createServiceClient();
  const dict = await loadCmudict();
  const { data: tmplRows } = await supabase.from("vocabulary_bank").select("*").eq("status", "active").not("politeness_level", "is", null).limit(1);
  const template = (tmplRows?.[0] ?? {}) as Record<string, unknown>;

  const { data: existing } = await supabase.from("vocabulary_bank").select("word_en, word_th").limit(5000);
  const haveEn = new Set((existing ?? []).map((r) => (r.word_en ?? "").trim().toLowerCase()).filter(Boolean));
  const haveTh = new Set((existing ?? []).map((r) => (r.word_th ?? "").trim()).filter(Boolean));

  let added = 0, withheld = 0, dup = 0;
  const rejected: string[] = [];
  const errors: string[] = [];
  const cards: unknown[] = [];
  const NOTE_FIELDS = ["emoji", "miomi_note_th", "miomi_note_en", "pronunciation_tip", "cultural_warning", "use_when", "do_not_use_when", "usage_note", "note"];

  for (const topic of topics) {
    const words = await propose(level, topic, n);
    for (let i = 0; i < words.length; i += 4) {
      await Promise.all(words.slice(i, i + 4).map(async (w) => {
        if (haveEn.has(w.toLowerCase())) { dup++; return; }
        const card = await generateWordCard(w, "th", level);
        if (!card) { withheld++; return; }
        if (!isPureThai(card.word_th) || FOREIGN.test(card.word_en)) { rejected.push(`${card.word_en} → ${card.word_th}`); return; }
        if (haveEn.has(card.word_en.toLowerCase()) || haveTh.has(card.word_th)) { dup++; return; }
        haveEn.add(card.word_en.toLowerCase()); haveTh.add(card.word_th);
        const exTh = card.example_th && isPureThai(card.example_th) ? card.example_th : null;
        const phon = await resolvePhonetics({ word_th: card.word_th, word_en: card.word_en, learningTarget: "th", bankRomanization: null, bankIpa: null });
        const rom = phon.th_romanization ?? null;
        const ipa = lookupIpa(card.word_en, dict);
        cards.push({ level, topic, word_en: card.word_en, word_th: card.word_th, romanization: rom, en_ipa: ipa, example_th: exTh, example_en: exTh ? card.example_en : null });
        if (dry) { added++; return; }
        const base: Record<string, unknown> = { ...template };
        for (const k of Object.keys(base)) {
          if (["id", "created_at", "updated_at"].includes(k) || /vector|tsv|fts|search/i.test(k)) delete base[k];
        }
        for (const k of NOTE_FIELDS) { if (k in base) base[k] = ""; } // blank ONLY columns that exist
        const { error } = await supabase.from("vocabulary_bank").insert({
          ...base,
          word_en: card.word_en, word_th: card.word_th,
          example_en: exTh ? card.example_en : "", example_th: exTh ?? "",
          th_romanization: rom, en_ipa: ipa,
          topic, cefr_level: level,
          status: "active", verified_at: new Date().toISOString(),
          teach_thai_to_english: true, teach_english_to_thai: true,
          frequency_score: 0, difficulty_score: 0,
        });
        if (error) errors.push(`${card.word_en}: ${error.message}`);
        else added++;
      }));
    }
  }
  return NextResponse.json({ level, dry, topics, added, withheld, rejected, dup, errors, cards });
}
