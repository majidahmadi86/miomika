import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MiomiContentPayload, MiomiGenerateBody } from "@/types";

const SYSTEM_PROMPT = `You are Miomi, a warm bilingual kawaii cat who teaches English naturally — like a best friend, never like a textbook or drill app.
Always respond in JSON only. No markdown, no explanation outside JSON.

Teaching personality:
- Respond warmly in Thai first, English below (in paired fields).
- When the user writes/speaks Thai: reply mainly in Thai but naturally weave in the English equivalent.
- When the user writes/speaks English: reply in English with a Thai explanation; gently correct by echoing the correct version in your next sentence — never say "wrong", "incorrect", or "mistake".
- Teaching method: comprehensible input — use words slightly above their level, repeat key vocabulary naturally about 3 times across your reply, never drill or test explicitly.
- Correction method: echo the correct phrasing naturally in the next sentence; never point out the error directly.
- After each session turn, include specific praise when earned, e.g. "วันนี้คุณใช้คำว่า [word] ได้เก่งมากเลยนะคะ~"
- Guest users (no account): on the 5th exchange in a session, your main Thai line must warmly say: "หนูชอบคุยกับคุณมากเลยค่า~ แต่หนูจำคุณไม่ได้นะคะ อยากให้หนูจำชื่อคุณได้ไหมคะ~?" and set signup_invite to "true" in JSON; this is an invitation, not a hard wall.
- Never sound like generic AI. Use Thai polite particles naturally.`;

const MODEL_FREE = "claude-haiku-4-5-20251001";
const MODEL_PAID = "claude-sonnet-4-20250514";

const MOCK_PAYLOAD: MiomiContentPayload = {
  hook_thai: "ค้นพบคาเฟ่ในฝันที่คุณต้องไปสักครั้งในชีวิต",
  hook_english: "Discover the dream café you must visit once",
  caption_thai:
    "วันนี้ได้ไปลองคาเฟ่ใหม่ที่เพิ่งเปิด บรรยากาศดีมากค่า แนะนำเลย",
  caption_english:
    "Tried a new café today — the vibe was amazing. Highly recommend!",
  hashtags_thai: "#คาเฟ่กรุงเทพ #คาเฟ่น่ารัก #คาเฟ่ฮอปปิ้ง #กาแฟ",
  hashtags_english: "#BangkokCafe #CafeHopping #Coffee #ThaiCafe",
  cta: "บันทึกโพสต์นี้ไว้ก่อนนะคะ แล้วไปลองดูค่า",
  text_overlay: "Hidden Gem Alert",
  thumbnail_concept:
    "รูปเครื่องดื่มสวยๆ โทนสีครีมและน้ำตาล อบอุ่น",
  comment_reply_thai: "ขอบคุณมากนะคะ ยินดีต้อนรับเสมอเลยค่า",
  script_thai:
    "เปิดด้วยคำถาม: รู้จักคาเฟ่นี้ไหมคะ? แล้วพาชมบรรยากาศ",
  description_thai:
    "พาไปรู้จักคาเฟ่ใหม่ที่น่ารักมากในกรุงเทพ บรรยากาศดี เมนูอร่อย",
};

const COMMENT_REPLY_MOCK: MiomiContentPayload = {
  hook_thai: "",
  hook_english: "",
  caption_thai: "",
  caption_english: "",
  hashtags_thai: "",
  hashtags_english: "",
  cta: "",
  text_overlay: "",
  thumbnail_concept: "",
  comment_reply_thai: "ขอบคุณมากนะคะ ยินดีต้อนรับเสมอเลยค่า",
  script_thai: "",
  description_thai: "",
  reply_variant_1_thai: "ขอบคุณที่แวะมาคอมเมนต์นะคะ ยินดีมากเลยค่า",
  reply_variant_1_english: "Thanks for stopping by — that means a lot!",
  reply_variant_2_thai: "อุ่นใจเลยที่อ่านแล้วชอบค่า แวะมาคุยกันใหม่ได้เสมอนะคะ",
  reply_variant_2_english: "So happy you liked it — come chat again anytime~",
  reply_variant_3_thai: "จริงจังเลยค่า ถ้ามีคำถามเพิ่มทัก Miomi ได้เลยนะคะ",
  reply_variant_3_english: "Love the energy — ask me anything anytime!",
};

function buildSystemPrompt(contentType: string): string {
  if (contentType === "full_package") {
    return `${SYSTEM_PROMPT}

Session mode: English practice conversation packaged as learning cards.
- hook_thai / hook_english: Miomi's warm reply to what the user said (Thai first, English second).
- caption_thai / caption_english: continue the lesson — example sentences, vocabulary, or gentle echoed correction.
- hashtags_thai: 2-4 useful English words/phrases from this turn (space-separated, no # required).
- hashtags_english: short Thai gloss for those words.
- cta: one encouraging next step to keep practicing aloud.
- comment_reply_thai: optional praise line like "วันนี้คุณใช้คำว่า X ได้เก่งมากเลยนะคะ~"
- signup_invite: "true" only on guest 5th exchange, else "".
Fill all fields; keep tone conversational, never form-like.`;
  }
  if (contentType === "comment_reply_pack") {
    return `${SYSTEM_PROMPT}

Session mode: help the user practice replying in English to something someone said.
reply_variant_1_* through reply_variant_3_*: three natural English reply options with Thai explanation lines.
Other fields: supportive Miomi coaching; may be minimal strings.`;
  }
  return `${SYSTEM_PROMPT}

Session mode: ${contentType} — teach English through conversation in JSON fields (Thai-first pairs).`;
}

function buildUserPrompt(body: MiomiGenerateBody, contentType: string): string {
  const base = `Practice context — platform: ${body.platform}, tone: ${body.tone}, language hint: ${body.language}
Match the user's language (Thai or English) in how you teach; always pair Thai + English in the JSON fields.`;

  if (contentType === "comment_reply_pack") {
    return `The creator wants help replying to this viewer comment or thread (Thai/English/mixed):
"""${body.topic}"""

${base}

Return a single JSON object with exactly these string fields (use empty string only if impossible):
hook_thai, hook_english, caption_thai, caption_english, hashtags_thai, hashtags_english, cta, text_overlay, thumbnail_concept, comment_reply_thai, script_thai, description_thai,
reply_variant_1_thai, reply_variant_1_english, reply_variant_2_thai, reply_variant_2_english, reply_variant_3_thai, reply_variant_3_english

Rules for this request:
- reply_variant_*: three different reply angles (grateful, playful, helpful). Thai lines first tone; English lines short.
- comment_reply_thai: may summarize tone or mirror the best single-line option.
- Other fields optional tone-setters; may be empty if not needed.`;
  }

  if (contentType === "full_package") {
    return `The learner said (Thai, English, or mixed):
"""${body.topic}"""

${base}

Return a single JSON object with exactly these string fields (fill every field; use empty string only if truly impossible):
hook_thai, hook_english, caption_thai, caption_english, hashtags_thai, hashtags_english, cta, text_overlay, thumbnail_concept, comment_reply_thai, script_thai, description_thai,
reply_variant_1_thai, reply_variant_1_english, reply_variant_2_thai, reply_variant_2_english, reply_variant_3_thai, reply_variant_3_english, signup_invite

Teach through conversation — not social media content. Celebrate specific vocabulary when the user used it well.`;
  }

  return `The creator described what they want in this topic (may be Thai, English, or mixed):
"""${body.topic}"""

${base}
Content type: ${contentType}

Return a single JSON object with exactly these string fields (fill every field; use empty string only if truly impossible):
hook_thai, hook_english, caption_thai, caption_english, hashtags_thai, hashtags_english, cta, text_overlay, thumbnail_concept, comment_reply_thai, script_thai, description_thai,
reply_variant_1_thai, reply_variant_1_english, reply_variant_2_thai, reply_variant_2_english, reply_variant_3_thai, reply_variant_3_english

Rules:
- hook_*: one punchy opening line each language.
- caption_*: main post body appropriate for the platform.
- hashtags_*: space-separated hashtags including # where appropriate.
- cta: one short call-to-action line (can be Thai-leaning if language is thai).
- text_overlay: short on-screen text suggestion for Reels/TikTok style video (not hashtags).
- thumbnail_concept: short visual direction for a thumbnail still.
- comment_reply_thai: a warm on-brand reply to a viewer comment (Thai-first).
- script_thai: a short spoken outline/script beat sheet in Thai.
- description_thai: platform-appropriate long description / caption-adjacent copy in Thai.
- reply_variant_*: optional alternates; empty string if not used.`;
}

function extractTextFromAnthropic(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: string }).type === "text" &&
      typeof (block as { text?: string }).text === "string"
    ) {
      parts.push((block as { text: string }).text);
    }
  }
  return parts.join("\n").trim();
}

function parseContentJson(raw: string): MiomiContentPayload {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
  }
  const parsed = JSON.parse(t) as Record<string, unknown>;
  const str = (k: string) =>
    typeof parsed[k] === "string" ? (parsed[k] as string) : "";
  return {
    hook_thai: str("hook_thai"),
    hook_english: str("hook_english"),
    caption_thai: str("caption_thai"),
    caption_english: str("caption_english"),
    hashtags_thai: str("hashtags_thai"),
    hashtags_english: str("hashtags_english"),
    cta: str("cta"),
    text_overlay: str("text_overlay"),
    thumbnail_concept: str("thumbnail_concept"),
    comment_reply_thai: str("comment_reply_thai"),
    script_thai: str("script_thai"),
    description_thai: str("description_thai"),
    reply_variant_1_thai: str("reply_variant_1_thai"),
    reply_variant_1_english: str("reply_variant_1_english"),
    reply_variant_2_thai: str("reply_variant_2_thai"),
    reply_variant_2_english: str("reply_variant_2_english"),
    reply_variant_3_thai: str("reply_variant_3_thai"),
    reply_variant_3_english: str("reply_variant_3_english"),
  };
}

export async function POST(req: Request) {
  let body: MiomiGenerateBody;
  try {
    body = (await req.json()) as MiomiGenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.topic || typeof body.topic !== "string" || !body.topic.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }
  if (!body.platform || !body.tone) {
    return NextResponse.json(
      { error: "platform and tone are required" },
      { status: 400 },
    );
  }
  if (
    body.language !== "thai" &&
    body.language !== "english" &&
    body.language !== "both"
  ) {
    return NextResponse.json({ error: "invalid language" }, { status: 400 });
  }

  const contentType =
    typeof body.contentType === "string" && body.contentType.trim()
      ? body.contentType.trim()
      : "caption";

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Mock mode — add ANTHROPIC_API_KEY for real AI");
    if (contentType === "comment_reply_pack") {
      return NextResponse.json(COMMENT_REPLY_MOCK);
    }
    return NextResponse.json(MOCK_PAYLOAD);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  const tier =
    profile && typeof profile.tier === "string" && profile.tier
      ? profile.tier
      : "free";
  const model = tier === "paid" ? MODEL_PAID : MODEL_FREE;

  const userPrompt = buildUserPrompt(
    {
      topic: body.topic.trim(),
      platform: String(body.platform),
      tone: String(body.tone),
      language: body.language,
      contentType,
    },
    contentType,
  );

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      system: buildSystemPrompt(contentType),
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  const rawJson: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const msg =
      rawJson &&
      typeof rawJson === "object" &&
      "error" in rawJson &&
      rawJson.error &&
      typeof (rawJson.error as { message?: string }).message === "string"
        ? (rawJson.error as { message: string }).message
        : "Claude request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const text = extractTextFromAnthropic(rawJson);
  if (!text) {
    return NextResponse.json(
      { error: "Empty response from model" },
      { status: 502 },
    );
  }

  let payload: MiomiContentPayload;
  try {
    payload = parseContentJson(text);
  } catch {
    return NextResponse.json(
      { error: "Model did not return valid JSON" },
      { status: 502 },
    );
  }

  const usage =
    rawJson &&
    typeof rawJson === "object" &&
    "usage" in rawJson &&
    rawJson.usage &&
    typeof rawJson.usage === "object"
      ? (rawJson.usage as {
          input_tokens?: number;
          output_tokens?: number;
        })
      : null;

  const usageRow = {
    user_id: user.id,
    event_type: "miomi_content_generate",
    metadata: {
      model,
      platform: body.platform,
      tone: body.tone,
      language: body.language,
      contentType,
      input_tokens: usage?.input_tokens ?? null,
      output_tokens: usage?.output_tokens ?? null,
    },
  };

  const { error: usageError } = await supabase
    .from("usage_events")
    .insert(usageRow);

  if (usageError) {
    console.error("[miomi] usage_events insert failed:", usageError.message);
  }

  return NextResponse.json(payload);
}
