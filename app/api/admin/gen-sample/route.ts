// app/api/admin/gen-sample/route.ts — admin-only: preview generated cards before bulk seeding
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse, type NextRequest } from "next/server";
import { getServerProfile } from "@/lib/auth/get-server-profile";
import { callGeminiJson, generateWordCard } from "@/lib/brain/word-content";

export async function GET(req: NextRequest) {
  const profile = await getServerProfile();
  const admins = (process.env.ADMIN_EMAILS || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = profile?.email?.toLowerCase() ?? null;
  if (!email || !admins.includes(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const level = sp.get("level") || "C1";
  const topic = sp.get("topic") || "business";
  const n = Math.min(Math.max(Number(sp.get("n") || "5"), 1), 8);

  const sys = `You are a Thai-English curriculum designer. List exactly ${n} useful ENGLISH words or short phrases for a CEFR ${level} learner studying "${topic}". Real, natural, commonly taught — no rare jargon, no duplicates. STRICT JSON ONLY: {"words":["..."]}. No prose, no fences.`;
  const raw = await callGeminiJson(sys, `topic=${topic} level=${level}`);
  let words: string[] = [];
  try {
    words = (JSON.parse((raw || "{}").replace(/```json|```/g, "").trim()).words ?? [])
      .map((w: string) => String(w).trim()).filter(Boolean).slice(0, n);
  } catch { /* fall through */ }
  if (!words.length) {
    return NextResponse.json({ level, topic, error: "proposal failed", raw: (raw || "").slice(0, 300) });
  }
  const cards: unknown[] = [];
  const withheld: string[] = [];
  for (const w of words) {
    const c = await generateWordCard(w, "th", level);
    if (c) cards.push({ word_en: c.word_en, word_th: c.word_th, example_th: c.example_th, example_en: c.example_en, source: c.source });
    else withheld.push(w);
  }
  return NextResponse.json({ level, topic, proposed: words, generated: cards.length, withheld, cards });
}
