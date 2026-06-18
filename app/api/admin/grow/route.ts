// app/api/admin/grow/route.ts — admin-only: generate+enrich+persist UNVERIFIED bank rows.
// ?apply=1 writes; default previews. New rows are status='generated', verified_at=null —
// they do NOT serve until promote:clean verifies them. en_ipa is filled later by fill:ipa.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { createServiceClient } from "@/lib/supabase/service";
import { callGeminiJson, generateWordCard } from "@/lib/brain/word-content";
import { resolvePhonetics } from "@/lib/brain/phonetics";

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? null;
  if (!email || !admins.includes(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const level = sp.get("level") || "C1";
  const topic = sp.get("topic") || "business";
  const n = Math.min(Math.max(Number(sp.get("n") || "5"), 1), 8);
  const apply = sp.get("apply") === "1";

  const supabase = await createServiceClient();
  const { data: existing } = await supabase.from("vocabulary_bank").select("word_en, word_th").limit(5000);
  const haveEn = new Set((existing ?? []).map((r) => (r.word_en ?? "").trim().toLowerCase()).filter(Boolean));
  const haveTh = new Set((existing ?? []).map((r) => (r.word_th ?? "").trim()).filter(Boolean));

  const sys = `You are a Thai-English curriculum designer. List exactly ${n} useful ENGLISH words or short phrases for a CEFR ${level} learner studying "${topic}". Real, natural, commonly taught — no rare jargon, no duplicates. STRICT JSON ONLY: {"words":["..."]}. No prose, no fences.`;
  const raw = await callGeminiJson(sys, `topic=${topic} level=${level}`);
  let words: string[] = [];
  try {
    words = (JSON.parse((raw || "{}").replace(/```json|```/g, "").trim()).words ?? [])
      .map((w: string) => String(w).trim()).filter(Boolean).slice(0, n);
  } catch { /* ignore */ }
  if (!words.length) return NextResponse.json({ level, topic, error: "proposal failed", raw: (raw || "").slice(0, 300) });

  const cards: unknown[] = [];
  const skipped: string[] = [];
  const withheld: string[] = [];
  for (const w of words) {
    if (haveEn.has(w.toLowerCase())) { skipped.push(`${w} (dup)`); continue; }
    const card = await generateWordCard(w, "th", level);
    if (!card) { withheld.push(w); continue; }
    if (haveEn.has(card.word_en.toLowerCase()) || haveTh.has(card.word_th)) { skipped.push(`${card.word_en} (dup)`); continue; }
    const phon = await resolvePhonetics({
      word_th: card.word_th, word_en: card.word_en,
      learningTarget: "th", bankRomanization: null, bankIpa: null,
    });
    const romanization = phon.th_romanization ?? null;
    cards.push({ word_en: card.word_en, word_th: card.word_th, romanization, example_th: card.example_th, example_en: card.example_en });
    if (apply) {
      const { error } = await supabase.from("vocabulary_bank").upsert({
        word_en: card.word_en, word_th: card.word_th,
        example_en: card.example_en, example_th: card.example_th,
        th_romanization: romanization, en_ipa: null,
        topic, cefr_level: level, register: card.register ?? "neutral",
        status: "generated", verified_at: null,
        teach_thai_to_english: true, teach_english_to_thai: true,
        frequency_score: 0, difficulty_score: 0, created_at: new Date().toISOString(),
      }, { onConflict: "word_en", ignoreDuplicates: true });
      if (error) console.error("[grow] insert failed", card.word_en, error.message);
      haveEn.add(card.word_en.toLowerCase()); haveTh.add(card.word_th);
    }
  }
  return NextResponse.json({ level, topic, apply, proposed: words, added: cards.length, skipped, withheld, cards });
}
