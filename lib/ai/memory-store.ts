import { createClient } from "@/lib/supabase/server";
import { getAIResponse } from "@/lib/ai/router";

const MAX_RECALL = 8;
const MIN_INPUT_LEN = 18;
const PERSONAL_HINT_EN = /\b(i|i'm|im|i've|ive|my|mine|me|we|our|us)\b/i;
const PERSONAL_HINT_TH = /ผม|ฉัน|หนู|ดิฉัน|กระผม|เรา|ของฉัน|ของผม|ของหนู|ชั้น/;

/** Recent durable facts for this user (newest first). Best-effort: returns [] on any failure. */
export async function fetchUserMemories(userId: string): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("user_memories")
      .select("content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_RECALL);
    if (error || !data) return [];
    return data.map((r) => String(r.content)).filter(Boolean);
  } catch {
    return [];
  }
}

interface ExtractArgs {
  userId: string;
  userInput: string;
  existing: string[];
  uiLanguage: "th" | "en";
}

/** Pull 0–2 NEW durable personal facts from the user's message and store them. Never throws. */
export async function extractAndStoreMemories(args: ExtractArgs): Promise<void> {
  const { userId, userInput, existing, uiLanguage } = args;
  try {
    const text = userInput.trim();
    if (text.length < MIN_INPUT_LEN) return;
    if (!PERSONAL_HINT_EN.test(text) && !PERSONAL_HINT_TH.test(text)) return;

    const known = existing.length ? existing.map((m) => `- ${m}`).join("\n") : "(none yet)";
    const sys =
      `You extract DURABLE personal facts worth remembering long-term about a language learner, from their message. ` +
      `Return ONLY a JSON array of short third-person fact strings in English (e.g. ["Has a dog named Coco","Is learning Thai for a trip to Chiang Mai","Works as a nurse"]). ` +
      `Include ONLY genuinely durable personal facts: family, pets, job, where they live, goals or reasons for learning, strong preferences, significant life events. ` +
      `EXCLUDE small talk, greetings, weather, transient moods, app/lesson mechanics, and anything already in KNOWN. ` +
      `Do NOT rephrase or duplicate KNOWN facts. If nothing qualifies, return []. Maximum 2 items. ` +
      `Output the JSON array and nothing else — no prose, no markdown.\n\nKNOWN:\n${known}`;

    const res = await getAIResponse([{ role: "user", content: text }], sys, uiLanguage);
    if (!res || res.wasFailover) return;

    const facts = parseFacts(res.content ?? "");
    if (!facts.length) return;

    const supabase = await createClient();
    const rows = facts.slice(0, 2).map((content) => ({ user_id: userId, content }));
    await supabase.from("user_memories").insert(rows);
  } catch {
    /* memory is best-effort — never block or break a reply */
  }
}

function parseFacts(raw: string): string[] {
  try {
    let s = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = s.indexOf("[");
    const end = s.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) return [];
    s = s.slice(start, end + 1);
    const arr: unknown = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x.length >= 3 && x.length <= 140);
  } catch {
    return [];
  }
}
