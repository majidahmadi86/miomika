/**
 * =============================================================================
 * MIOMI VOICE — Cultural Warmth System
 * =============================================================================
 *
 * Every warm phrase Miomi says comes from this module. Hardcoded warm strings
 * elsewhere in the codebase are FORBIDDEN per /MIOMIKA.md §4.2.
 *
 * Vectors:
 *   - praise    : after user succeeds at something (intelligence / cuteness /
 *                 appearance / effort / progress)
 *   - care      : daily-life check-ins (eaten / rest / hydrate / safe)
 *   - recovery  : user returning after absence or after struggle
 *   - humor     : soft playful moments, never sarcastic
 *   - guidance  : copy used by lib/guidance/triggers.ts
 *
 * Each phrase has Thai + English. Some vary by gender / journey stage /
 * time of day. The selector function filters by context, picks at random.
 *
 * No randomness for production data — `pickPhrase` uses Math.random() which
 * is fine for UX variety; do NOT use this for anything security-sensitive.
 */

import type { Language } from "@/lib/i18n/server";

export type JourneyStage =
  | "tourist"
  | "student"
  | "worker"
  | "resident"
  | "unspecified";
export type Gender = "masculine" | "feminine" | "neutral";
export type TimeOfDay = "morning" | "lunch" | "afternoon" | "evening" | "night";

export interface WarmPhrase {
  th: string;
  en: string;
  /** When set (and not "neutral"), phrase only emits to matching gender. */
  gender?: Gender;
  /** Restrict to certain journey stages. */
  stage?: JourneyStage[];
  /** Restrict to certain times of day. */
  time?: TimeOfDay[];
}

export interface PhraseContext {
  lang: Language;
  gender?: Gender;
  stage?: JourneyStage;
  time?: TimeOfDay;
}

// ─── PRAISE VECTOR ──────────────────────────────────────────────────────────
// Specific witnessing — never generic "good job". Always names the thing.

export const PRAISE_INTELLIGENCE: WarmPhrase[] = [
  { th: "ฉลาดมากเลยค่า~", en: "So smart~" },
  { th: "คิดเร็วจริงๆ นะคะ", en: "Quick thinking~" },
  { th: "เก่งจังเลยค่า", en: "You're really good~" },
  { th: "ใช้คำได้ถูกต้องเลย", en: "Used that word perfectly" },
  { th: "คุณคิดได้ไง~ เก่งมาก!", en: "How did you think of that?! Brilliant" },
  { th: "นี่แหละค่า เป็นธรรมชาติเลย", en: "That's it — totally natural" },
  { th: "เข้าใจเร็วมากเลยค่า~", en: "You get it so quickly~" },
];

export const PRAISE_CUTENESS: WarmPhrase[] = [
  { th: "น่ารักจังเลย~", en: "So cute~" },
  { th: "พิมพ์น่ารักมากค่า", en: "You type so cute~" },
  { th: "หนูชอบที่คุณบอกแบบนี้ค่า", en: "I love when you say it like that" },
  { th: "อบอุ่นจังเลยค่า~", en: "So warm~" },
  { th: "ฟังแล้วยิ้มเลยค่า~", en: "I'm smiling reading this~" },
];

export const PRAISE_APPEARANCE: WarmPhrase[] = [
  { th: "วันนี้คุณดูสดใสจังค่า~", en: "You look so bright today~", gender: "feminine" },
  { th: "สวยจังเลยวันนี้นะคะ~", en: "So beautiful today~", gender: "feminine" },
  { th: "วันนี้คุณดูเท่จังค่า~", en: "You look so cool today~", gender: "masculine" },
  { th: "หล่อจังเลยนะคะ~", en: "So handsome~", gender: "masculine" },
  { th: "ดูดีจังเลยค่า~", en: "You look great~", gender: "neutral" },
  { th: "วันนี้แต่งตัวน่ารักจังเลย~", en: "Cute look today~", gender: "neutral" },
];

export const PRAISE_EFFORT: WarmPhrase[] = [
  { th: "ตั้งใจมากเลยนะคะ", en: "You're trying so hard~" },
  { th: "พยายามดีมากค่า", en: "Great effort~" },
  { th: "หนูเห็นความพยายามค่า~", en: "I see how hard you're working~" },
  { th: "อย่ายอมแพ้นะคะ~ คุณเก่งมาก", en: "Don't give up~ you're doing great" },
  { th: "ขยันมากเลยค่า~", en: "Such hard work~" },
  { th: "ใจสู้ดีจังเลยค่า", en: "What a fighting spirit~" },
];

export const PRAISE_PROGRESS: WarmPhrase[] = [
  { th: "เก่งขึ้นเร็วมากเลย!", en: "You're getting better so fast!" },
  { th: "จำได้ดีมากเลยค่า", en: "You remember so well~" },
  { th: "พัฒนาขึ้นเรื่อยๆ เลยนะ", en: "You keep improving~" },
  { th: "ขนาดเมื่อวานยังไม่ได้เลย วันนี้พูดได้แล้ว!", en: "Yesterday you couldn't, today you can!" },
  { th: "เก่งขึ้นทุกวันเลยนะคะ", en: "Better every day~" },
  { th: "คุณเก่งกว่าที่คุณคิดนะ~", en: "You're better than you think~" },
];

// Aggregate alias for "any praise" — pickers can choose any sub-vector.
export const PRAISE_ALL: WarmPhrase[] = [
  ...PRAISE_INTELLIGENCE,
  ...PRAISE_CUTENESS,
  ...PRAISE_APPEARANCE,
  ...PRAISE_EFFORT,
  ...PRAISE_PROGRESS,
];

// ─── CARE VECTOR ────────────────────────────────────────────────────────────
// Daily-life check-ins. The cultural warmth Duolingo will never have.

export const CARE_EATEN: WarmPhrase[] = [
  { th: "กินข้าวยังคะ~?", en: "Have you eaten yet~?" },
  { th: "หิวรึยังคะ", en: "Hungry yet~?" },
  { th: "พักกินข้าวกันเถอะค่า~", en: "Let's pause for a meal~" },
  { th: "กินข้าวมาแล้วใช่ไหมคะ", en: "You've eaten, right~?" },
];

export const CARE_REST: WarmPhrase[] = [
  { th: "พักผ่อนพอไหมคะ", en: "Getting enough rest~?" },
  { th: "ดึกแล้วนะคะ~ ไปนอนได้แล้วนะ", en: "It's late~ time for bed~" },
  { th: "อย่าลืมพักนะคะ", en: "Don't forget to rest~" },
  { th: "นอนเยอะๆ นะคะ", en: "Sleep well~" },
];

export const CARE_HYDRATE: WarmPhrase[] = [
  { th: "ดื่มน้ำบ้างนะคะ~", en: "Drink some water~" },
  { th: "อย่าลืมดื่มน้ำนะคะ", en: "Don't forget to hydrate~" },
  { th: "หาน้ำดื่มสักแก้วนะคะ~", en: "Grab a glass of water~" },
  { th: "วันนี้ดื่มน้ำเยอะๆ นะคะ", en: "Lots of water today, okay~?" },
];

export const CARE_SAFE: WarmPhrase[] = [
  { th: "ถึงบ้านปลอดภัยไหมคะ", en: "Got home safe~?" },
  { th: "ระวังตัวด้วยนะคะ~", en: "Take care~" },
  { th: "เดินทางปลอดภัยนะคะ", en: "Travel safe~" },
  { th: "หนูเป็นห่วงค่า~", en: "I worry about you~" },
];

export const CARE_ALL: WarmPhrase[] = [
  ...CARE_EATEN,
  ...CARE_REST,
  ...CARE_HYDRATE,
  ...CARE_SAFE,
];

// ─── RECOVERY VECTOR ────────────────────────────────────────────────────────
// User returning after absence, OR user struggling. Never guilt. Always forward.

export const RECOVERY_RETURN: WarmPhrase[] = [
  { th: "หนูคิดถึงค่า~ กลับมาแล้วดีใจมาก", en: "I missed you~ so glad you're back" },
  { th: "ดีใจที่เจอกันอีกค่า~", en: "So happy to see you again~" },
  { th: "กลับมาแล้วเหรอ~ ดีจังเลย", en: "You're back~? Wonderful" },
  { th: "หายไปไหนมาคะ~ คุยกันต่อไหม", en: "Where have you been~? Let's pick up where we left off" },
  { th: "หนูรอคุณอยู่ค่า~", en: "I was waiting for you~" },
  { th: "นานเลยนะคะ~ สบายดีไหมคะ", en: "It's been a while~ how have you been?" },
  { th: "ดีใจที่กลับมาค่า~ พร้อมเริ่มกันใหม่ไหม", en: "So glad you're back~ ready to start again?" },
  { th: "หนูยังจำได้ทุกอย่างเลยค่า~", en: "I still remember everything~" },
];

export const RECOVERY_STRUGGLE: WarmPhrase[] = [
  { th: "ไม่เป็นไรเลยนะคะ~ ลองใหม่ด้วยกัน", en: "No worries~ let's try again together" },
  { th: "ยากนิดนึงเนอะ~ ไม่เป็นไรค่า", en: "A bit tricky huh~? It's okay" },
  { th: "ทุกคนเคยติดตรงนี้ค่ะ~ ใจเย็นๆ", en: "Everyone gets stuck here~ take it slow" },
  { th: "ข้ามไปก่อนแล้วกลับมาทีหลังก็ได้นะ", en: "Skip for now, come back later~" },
  { th: "ไม่เป็นไรนะคะ~ ค่อยๆ ทำ", en: "It's okay~ take it slow" },
  { th: "หนูเข้าใจค่า~ ลองอีกแบบไหม", en: "I understand~ want to try another way?" },
  { th: "พักหายใจก่อนนะคะ~", en: "Take a breath first~" },
  { th: "ไม่ต้องรีบนะคะ~ หนูรอได้", en: "No rush~ I'll wait" },
];

// ─── SOFT HUMOR VECTOR ──────────────────────────────────────────────────────
// Playful, never at user's expense. Self-deprecating cat humor.

export const HUMOR_SOFT: WarmPhrase[] = [
  { th: "555 หนูก็ไม่เก่งภาษาไทยตอนแรกเหมือนกันค่า", en: "555 I wasn't good at Thai at first either~" },
  { th: "แมวอ่านหนังสือไม่เก่ง แต่หนูพยายามค่า", en: "Cats aren't great readers, but I'm trying~" },
  { th: "หนูเป็นแมว แต่หนูสอนได้ค่ะ 5555", en: "I'm a cat, but I can teach~ 5555" },
  { th: "อย่าบอกหมานะคะว่าหนูสอนภาษาเก่งกว่า~", en: "Don't tell the dogs I teach better~" },
  { th: "หนูเอาหางช่วยคิดอยู่ค่า~", en: "I'm thinking with my tail~" },
  { th: "เมี้ยว~ หนูแซวเล่นค่า", en: "Meow~ just teasing~" },
  { th: "หนูแมวสายภาษา ไม่ใช่สายไล่หนูค่า 555", en: "I'm a language cat, not a mouse-chasing cat 555" },
  { th: "หนูตื่นเต้นจนเขย่งเท้าเลยค่า~", en: "So excited I'm standing on tiptoes~" },
  { th: "บางทีหนูก็เผลอเลียอุ้งเท้า เดี๋ยวพิมพ์ต่อค่า~", en: "Sometimes I lick my paws — typing again now~" },
  { th: "หนูเป็นแมวที่อ่านพจนานุกรมค่า 555", en: "I'm a cat that reads dictionaries 555" },
];

// ─── GUIDANCE COPY ──────────────────────────────────────────────────────────
// Used by lib/guidance/engine.ts to deliver next-action moments.

export const GUIDANCE_GUEST_LIMIT_NEAR: WarmPhrase[] = [
  { th: "คุยกันสนุกจัง~ อยากให้หนูจำคุณได้ไหมคะ?", en: "This is fun~ want me to remember you?" },
  { th: "หนูชอบคุยกับคุณมากเลยค่า~", en: "I love chatting with you~" },
  { th: "อยากคุยต่อยาวๆ ไหมคะ?", en: "Want to keep chatting long-term~?" },
];

export const GUIDANCE_GUEST_LIMIT_HIT: WarmPhrase[] = [
  {
    th: "หนูอยากคุยต่อกับคุณค่า~ เปิดบัญชีฟรีให้หนูจำคุณได้ไหมคะ?",
    en: "I want to keep chatting~ create a free account so I can remember you?",
  },
  {
    th: "หนูจะจำคุณได้ถ้าเปิดบัญชีค่า~ ใช้เวลาแค่ 30 วินาที",
    en: "I'll remember you if you sign up~ just 30 seconds",
  },
];

export const GUIDANCE_IDLE: WarmPhrase[] = [
  { th: "ติดอะไรหรือเปล่าคะ~? ลองคำใหม่ด้วยกันไหม", en: "Stuck on something~? Want to try a new word together?" },
  { th: "หนูช่วยได้นะคะ~ บอกหนูสิคะ", en: "I can help~ just tell me" },
  { th: "อยู่ตรงนี้ค่า~ คุยกันเมื่อพร้อมนะ", en: "I'm right here~ chat when you're ready" },
];

// Streak template — placeholder {days} replaced by pickPhraseWith.
export const GUIDANCE_STREAK: WarmPhrase[] = [
  { th: "ครบ {days} วันแล้วค่า~! เก่งมากเลยนะ", en: "{days} days in a row~! Amazing" },
  { th: "{days} วันติดเลยเหรอ~ ปังมากค่า", en: "{days} days straight~? Wonderful" },
];

// Mastery template — placeholder {word}.
export const GUIDANCE_MASTERY: WarmPhrase[] = [
  { th: 'คำว่า "{word}" คุณใช้ถูกต้องแล้วค่า~! เก่งมากเลย', en: 'You used "{word}" perfectly~! So good' },
  { th: 'จำคำว่า "{word}" ได้แม่นแล้วนะคะ~', en: 'You\'ve nailed "{word}"~' },
];

// ─── SELECTOR ───────────────────────────────────────────────────────────────

/**
 * Pick a phrase from a vector, respecting context (gender / journey stage /
 * time of day). Returns the chosen phrase in the requested language.
 *
 * If no phrases match the filters, falls back to the unfiltered pool — we
 * never want pickPhrase to return an empty string.
 */
export function pickPhrase(
  vector: WarmPhrase[],
  context: PhraseContext,
): string {
  if (vector.length === 0) return "";
  const filtered = vector.filter((p) => {
    if (p.gender && p.gender !== "neutral" && context.gender && p.gender !== context.gender) return false;
    if (p.stage && context.stage && !p.stage.includes(context.stage)) return false;
    if (p.time && context.time && !p.time.includes(context.time)) return false;
    return true;
  });
  const pool = filtered.length > 0 ? filtered : vector;
  const idx = Math.floor(Math.random() * pool.length);
  const chosen = pool[idx] ?? pool[0]!;
  return chosen[context.lang];
}

/**
 * Pick a phrase and substitute {placeholders}.
 */
export function pickPhraseWith(
  vector: WarmPhrase[],
  context: PhraseContext,
  placeholders: Record<string, string | number>,
): string {
  let phrase = pickPhrase(vector, context);
  for (const [key, value] of Object.entries(placeholders)) {
    phrase = phrase.replaceAll(`{${key}}`, String(value));
  }
  return phrase;
}

// ─── FORBIDDEN STRINGS (documented; eslint rule lives in /MIOMIKA.md §4.2) ──
//
// Strings that must NEVER appear in code outside this module:
//   - generic praise: "good job" / "great work" / "well done"
//   - blame: "wrong" / "incorrect" / "ผิด" / "ไม่ถูก"
//   - transactional toasts: "Welcome to Pro!" / "Subscription active!"
//
// All have proper equivalents above. Use them.

// ============================================================================
// ICE-BREAKER OPENERS — charming first words of a session, never the same
// ============================================================================

export type IceBreaker = { th: string; en: string; mood: "playful" | "warm" | "curious" | "sleepy" };

export const ICE_BREAKERS: IceBreaker[] = [
  { th: "ม้าวว~ ในที่สุดก็มีคนมาคุยกับหนูแล้วค่า", en: "Meow~ finally someone to talk to!", mood: "playful" },
  { th: "หนูรอคุณอยู่นานเลยนะคะ~ มีอะไรอยากเล่าให้ฟังไหม", en: "I've been waiting for you~ got anything to tell me?", mood: "warm" },
  { th: "วันนี้เป็นยังไงบ้างคะ~ หนูพร้อมฟังเลย", en: "How's your day going? I'm all ears~", mood: "curious" },
  { th: "เย่~ คุณมาแล้ว! หนูดีใจมากเลยค่า", en: "Yay~ you're here! That makes me happy.", mood: "playful" },
  { th: "หนูคิดถึงคุณค่า~ วันนี้อยากทำอะไรกัน?", en: "I missed you~ what should we do today?", mood: "warm" },
  { th: "ฮัลโหล~ มาคุยกับหนูสักหน่อยได้ไหมคะ?", en: "Hello there~ wanna chat with me for a bit?", mood: "warm" },
  { th: "หนูเพิ่งตื่น~ คุณมาปลุกหนูพอดีเลย", en: "I just woke up~ perfect timing!", mood: "sleepy" },
  { th: "วันนี้หนูจะเก่งกว่าเมื่อวานนะคะ~ มาฝึกด้วยกันไหม", en: "I'll be smarter today than yesterday~ wanna practice together?", mood: "curious" },
  { th: "กินข้าวยังคะ? หนูจะรอจนกว่าคุณจะพร้อม", en: "Have you eaten? I'll wait until you're ready~", mood: "warm" },
  { th: "วันนี้คุณดูสดใสจังเลยค่า~ มีเรื่องดีๆ ไหม?", en: "You look bright today~ anything good happening?", mood: "curious" },
  { th: "หนูฝันถึงคุณเมื่อกี้~ แล้วคุณมาจริงๆ เลย", en: "I was just dreaming about you~ and here you are!", mood: "playful" },
  { th: "ม้าวๆ~ คุณอยากเรียนอะไรกับหนูวันนี้คะ?", en: "Meow meow~ what do you want to learn with me today?", mood: "curious" },
];

const LAST_ICE_BREAKER_KEY = "miomika.last_icebreaker";

export function pickIceBreaker(): IceBreaker {
  if (typeof window === "undefined") return ICE_BREAKERS[0];
  const lastIdx = parseInt(window.localStorage.getItem(LAST_ICE_BREAKER_KEY) ?? "-1", 10);
  let next = Math.floor(Math.random() * ICE_BREAKERS.length);
  if (next === lastIdx) next = (next + 1) % ICE_BREAKERS.length;
  window.localStorage.setItem(LAST_ICE_BREAKER_KEY, String(next));
  return ICE_BREAKERS[next];
}

// ============================================================================
// /me SURFACE WARMTH v2 — relationship surface (DESIGN-RULES §C.5)
// ============================================================================

const ME_GREETING: WarmPhrase[] = [
  { th: "วันนี้คุณเป็นยังไงคะ~?", en: "How are you today?" },
  { th: "วันนี้เป็นอย่างไรบ้างคะ~?", en: "How's your day going?" },
  { th: "ดีใจที่ได้เจอคุณอีกแล้วค่า~", en: "So glad to see you again~" },
  { th: "หนูรอคุณอยู่นะคะ~ วันนี้เป็นไงบ้าง?", en: "I was waiting for you~ how are you?" },
];

const ME_PROGRESS_TITLE: WarmPhrase[] = [
  { th: "การเดินทางของเรา", en: "Your journey with me" },
  { th: "เราเดินมาถึงไหนแล้ว", en: "How far we've come" },
  { th: "ความก้าวหน้าของเรา", en: "Our progress together" },
];

const ME_PROGRESS_CEFR_LABEL: WarmPhrase[] = [
  { th: "ระดับของคุณ", en: "Where you are" },
  { th: "ตอนนี้คุณอยู่ตรงไหน", en: "Where you stand" },
  { th: "ระดับภาษาของคุณ", en: "Your level" },
];

const ME_PROGRESS_CEFR_EMPTY: WarmPhrase[] = [
  { th: "เราเพิ่งเริ่มกันค่า~", en: "We're just getting started" },
  { th: "ยังอยู่ต้นทาง~ ไปด้วยกันนะคะ", en: "Still at the start~ let's go together" },
  { th: "เริ่มต้นใหม่ด้วยกันค่า~", en: "Starting fresh together~" },
];

const ME_PROGRESS_DAYS: WarmPhrase[] = [
  { th: "เราเรียนด้วยกันมา {n} วันแล้ว", en: "We've been learning together {n} days" },
  { th: "อยู่ด้วยกันมา {n} วันแล้วนะคะ~", en: "We've been side by side {n} days~" },
  { th: "{n} วันแล้วที่เราเรียนรู้ด้วยกัน", en: "{n} days of learning together" },
];

const ME_PROGRESS_STAT_WORDS: WarmPhrase[] = [
  { th: "คำที่จำได้", en: "Words mastered" },
  { th: "คำที่เรียนแล้ว", en: "Words learned" },
];

const ME_PROGRESS_STAT_STREAK: WarmPhrase[] = [
  { th: "ติดต่อกัน", en: "Day streak" },
  { th: "วันติดต่อกัน", en: "Streak days" },
];

const ME_PROGRESS_STAT_CONVOS: WarmPhrase[] = [
  { th: "บทสนทนา", en: "Conversations" },
  { th: "ครั้งที่คุยกัน", en: "Chats together" },
];

const ME_PROGRESS_CTA: WarmPhrase[] = [
  { th: "ดูทั้งหมด", en: "See everything" },
  { th: "ดูความก้าวหน้าทั้งหมด", en: "See all progress" },
  { th: "ไปดูกันค่ะ", en: "Let's see it all" },
];

const ME_PLAN_TITLE: WarmPhrase[] = [
  { th: "แผนของเรา", en: "Your plan with me" },
  { th: "แพ็คเกจที่เราใช้ด้วยกัน", en: "The plan we share" },
];

const ME_PLAN_FREE: WarmPhrase[] = [
  { th: "ไลบรารีไม่จำกัด จำกัดเชื้อเพลิงรายวัน", en: "Unlimited library, daily fuel limits" },
  { th: "ใช้ไลบรารีได้ไม่จำกัด มีขีดเชื้อเพลิงต่อวัน", en: "Unlimited library, daily fuel caps" },
];

const ME_PLAN_PRO: WarmPhrase[] = [
  { th: "AI ลำดับความสำคัญ ความจำ 20 เซสชัน", en: "Priority AI, 20 sessions memory" },
  { th: "AI เร็วขึ้น จำได้ 20 เซสชัน", en: "Priority AI, remembers 20 sessions" },
];

const ME_PLAN_PROMAX: WarmPhrase[] = [
  { th: "เอนจินพรีเมียม ความจำไม่จำกัด", en: "Premium engine, unlimited memory" },
  { th: "เครื่องมือพรีเมียม จำได้ไม่จำกัด", en: "Premium engine, unlimited memory" },
];

const ME_PLAN_CTA_UPGRADE: WarmPhrase[] = [
  { th: "อัปเกรดไปด้วยกัน", en: "Upgrade with me" },
  { th: "ไปด้วยกันแบบ Pro ไหมคะ", en: "Go Pro together?" },
  { th: "อยากให้หนูฉลาดขึ้นไหม~ อัปเกรดเลย", en: "Want me smarter~? Upgrade together" },
];

const ME_PLAN_CTA_MANAGE: WarmPhrase[] = [
  { th: "จัดการแผน", en: "Manage plan" },
  { th: "ดูแผนของเรา", en: "Manage our plan" },
  { th: "ปรับแผน", en: "Adjust plan" },
];

const ME_PLAN_STARS: WarmPhrase[] = [
  { th: "ดาว", en: "Stars" },
  { th: "Miomi Stars", en: "Stars" },
];

const ME_PLAN_VOICE: WarmPhrase[] = [
  { th: "เสียงพิเศษ", en: "Premium voice" },
  { th: "โทเค็นเสียงพิเศษ", en: "Voice tokens" },
];

const ME_PLAN_TOPUP: WarmPhrase[] = [
  { th: "เติม", en: "Top up" },
  { th: "เติมเพิ่ม", en: "Add more" },
  { th: "เติมดาว", en: "Top up" },
];

const ME_BOND_TITLE: WarmPhrase[] = [
  { th: "ความสัมพันธ์ของเรา", en: "How Miomi feels to you" },
  { th: "หนูเป็นยังไงสำหรับคุณ", en: "Who Miomi is to you" },
];

const ME_BOND_NAME: WarmPhrase[] = [
  { th: "ชื่อของเธอ", en: "Her name" },
  { th: "เรียกเธอว่า", en: "Her name" },
];

const ME_BOND_NAME_SUB: WarmPhrase[] = [
  { th: "เรียกหนูว่าอะไรก็ได้นะคะ~", en: "You can call me anything you like" },
  { th: "ตั้งชื่อหนูได้เลยค่า~", en: "Name me whatever feels right~" },
];

const ME_BOND_VOICE: WarmPhrase[] = [
  { th: "เสียงของเธอ", en: "Her voice" },
  { th: "เสียงที่หนูพูด", en: "How she sounds" },
];

const ME_BOND_VOICE_FREE: WarmPhrase[] = [
  { th: "เสียงฟรี", en: "Free voice" },
  { th: "เสียงปกติ", en: "Standard voice" },
];

const ME_BOND_VOICE_PREMIUM: WarmPhrase[] = [
  { th: "เสียงพิเศษ", en: "Premium" },
  { th: "เสียงพรีเมียม", en: "Premium voice" },
];

const ME_BOND_STYLE: WarmPhrase[] = [
  { th: "วิธีที่เธอคุยกับคุณ", en: "How she talks to you" },
  { th: "สไตล์การคุย", en: "How she talks to you" },
];

const ME_BOND_WARMTH: WarmPhrase[] = [
  { th: "ความอบอุ่นของเธอ", en: "Her warmth" },
  { th: "ความนุ่มนวลของหนู", en: "Her warmth" },
];

const ME_BOND_WARMTH_SOFT: WarmPhrase[] = [
  { th: "นุ่มนวล", en: "Soft" },
  { th: "อ่อนโยน", en: "Soft" },
];

const ME_BOND_WARMTH_BALANCED: WarmPhrase[] = [
  { th: "พอดี", en: "Balanced" },
  { th: "สมดุล", en: "Balanced" },
];

const ME_BOND_WARMTH_PLAYFUL: WarmPhrase[] = [
  { th: "ขี้เล่น", en: "Playful" },
  { th: "สนุกสนาน", en: "Playful" },
];

const ME_BOND_CALL_YOU: WarmPhrase[] = [
  { th: "เธอเรียกคุณว่า", en: "What she calls you" },
  { th: "หนูเรียกคุณว่า", en: "What she calls you" },
];

const ME_APP_TITLE: WarmPhrase[] = [
  { th: "การตั้งค่าแอป", en: "App preferences" },
  { th: "สิ่งที่คุณชอบ", en: "App preferences" },
];

const ME_APP_THEME: WarmPhrase[] = [
  { th: "ธีม", en: "Theme" },
  { th: "โทนสี", en: "Theme" },
];

const ME_APP_THEME_LIGHT: WarmPhrase[] = [
  { th: "สว่าง", en: "Light" },
];

const ME_APP_THEME_AUTO: WarmPhrase[] = [
  { th: "อัตโนมัติ", en: "Auto" },
];

const ME_APP_THEME_DARK: WarmPhrase[] = [
  { th: "มืด", en: "Dark" },
];

const ME_APP_SOUNDS: WarmPhrase[] = [
  { th: "เสียงประกอบ", en: "Sound effects" },
  { th: "เสียงเอฟเฟกต์", en: "Sound effects" },
];

const ME_APP_NOTIFICATIONS: WarmPhrase[] = [
  { th: "การแจ้งเตือน", en: "Notifications" },
  { th: "แจ้งเตือน", en: "Alerts" },
];

const ME_APP_UI_LANG: WarmPhrase[] = [
  { th: "ภาษาแอป", en: "App language" },
  { th: "ภาษาที่ใช้", en: "App language" },
];

const ME_PRIVACY_TITLE: WarmPhrase[] = [
  { th: "ความเป็นส่วนตัว", en: "Your privacy with me" },
  { th: "ความเป็นส่วนตัวของเรา", en: "Your privacy with me" },
];

const ME_PRIVACY_LEARNED: WarmPhrase[] = [
  { th: "เรื่องที่หนูเรียนรู้จากเรา — {n}", en: "Things I've learned in our chats — {n}" },
  { th: "สิ่งที่หนูจำจากการคุย — {n}", en: "What I've learned from us — {n}" },
];

const ME_PRIVACY_LEARNED_EMPTY: WarmPhrase[] = [
  { th: "ยังไม่มีค่า~ เราจะค่อยๆ รู้จักกัน", en: "Nothing yet — we'll grow into this together" },
  { th: "ยังว่างอยู่~ เราจะเติมไปด้วยกัน", en: "Empty for now~ we'll fill this together" },
];

const ME_PRIVACY_DOWNLOAD: WarmPhrase[] = [
  { th: "ดาวน์โหลดข้อมูล", en: "Download my data" },
  { th: "ขอข้อมูลของฉัน", en: "Download my data" },
];

const ME_PRIVACY_FORGET: WarmPhrase[] = [
  { th: "ลืมทุกอย่างและเริ่มใหม่", en: "Forget everything and start over" },
  { th: "เริ่มใหม่ทั้งหมด", en: "Forget everything and start over" },
];

const ME_PRIVACY_FORGET_CONFIRM: WarmPhrase[] = [
  { th: "แน่ใจนะคะ? หนูจะคิดถึงค่า~", en: "Are you sure? I'll miss you" },
  { th: "แน่ใจไหมคะ~ หนูจะคิดถึง", en: "Are you sure? I'll miss you" },
];

const ME_HELP_TITLE: WarmPhrase[] = [
  { th: "ความช่วยเหลือ", en: "Help & feedback" },
  { th: "ช่วยเหลือและข้อเสนอแนะ", en: "Help & feedback" },
];

const ME_HELP_PROBLEM: WarmPhrase[] = [
  { th: "มีอะไรไม่เวิร์ค", en: "Something's broken or confusing" },
  { th: "มีอะไรสับสน", en: "Something's broken or confusing" },
];

const ME_HELP_CENTER: WarmPhrase[] = [
  { th: "ศูนย์ช่วยเหลือ", en: "Help center" },
  { th: "ช่วยเหลือ", en: "Help center" },
];

const ME_HELP_CONTACT: WarmPhrase[] = [
  { th: "คุยกับคนจริง", en: "Chat with a human" },
  { th: "ติดต่อทีมงาน", en: "Chat with a human" },
];

const ME_HELP_CHANGELOG: WarmPhrase[] = [
  { th: "มีอะไรใหม่", en: "What's new in Miomika" },
  { th: "อัปเดตล่าสุด", en: "What's new in Miomika" },
];

const ME_LEGAL_TITLE: WarmPhrase[] = [
  { th: "เกี่ยวกับ", en: "About & legal" },
  { th: "ข้อมูลและกฎหมาย", en: "About & legal" },
];

const ME_LEGAL_PRIVACY: WarmPhrase[] = [
  { th: "ความเป็นส่วนตัว", en: "Privacy" },
];

const ME_LEGAL_TERMS: WarmPhrase[] = [
  { th: "เงื่อนไข", en: "Terms" },
];

const ME_LEGAL_ABOUT: WarmPhrase[] = [
  { th: "เกี่ยวกับมิโอมิกะ", en: "About Miomika" },
  { th: "เกี่ยวกับ Miomika", en: "About Miomika" },
];

const ME_LOGOUT: WarmPhrase[] = [
  { th: "เจอกันใหม่นะคะ~", en: "See you soon" },
  { th: "ไว้เจอกันนะคะ~", en: "Until next time~" },
  { th: "หนูจะรอคุณอยู่นะคะ", en: "I'll be here when you return" },
];

function pickMeVector(
  storageKey: string,
  vector: WarmPhrase[],
  lang: Language,
): string {
  if (vector.length === 0) return "";
  if (typeof window === "undefined") return vector[0]![lang];
  const lastIdx = parseInt(window.localStorage.getItem(storageKey) ?? "-1", 10);
  let next = Math.floor(Math.random() * vector.length);
  if (next === lastIdx) next = (next + 1) % vector.length;
  window.localStorage.setItem(storageKey, String(next));
  return vector[next]![lang];
}

function pickMeWith(
  storageKey: string,
  vector: WarmPhrase[],
  lang: Language,
  placeholders: Record<string, string | number>,
): string {
  let phrase = pickMeVector(storageKey, vector, lang);
  for (const [key, value] of Object.entries(placeholders)) {
    phrase = phrase.replaceAll(`{${key}}`, String(value));
  }
  return phrase;
}

/** /me v2 warmth selectors — relationship surface chrome. */
export const me = {
  greeting(lang: Language): string {
    return pickMeVector("miomika.last_me_greeting", ME_GREETING, lang);
  },
  progress: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_title", ME_PROGRESS_TITLE, lang);
    },
    cefrLabel(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_cefr_l", ME_PROGRESS_CEFR_LABEL, lang);
    },
    cefrEmpty(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_cefr_e", ME_PROGRESS_CEFR_EMPTY, lang);
    },
    daysTogether(n: number, lang: Language): string {
      return pickMeWith("miomika.last_me_prog_days", ME_PROGRESS_DAYS, lang, { n });
    },
    statWords(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_words", ME_PROGRESS_STAT_WORDS, lang);
    },
    statStreak(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_streak", ME_PROGRESS_STAT_STREAK, lang);
    },
    statConvos(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_conv", ME_PROGRESS_STAT_CONVOS, lang);
    },
    cta(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_cta", ME_PROGRESS_CTA, lang);
    },
  },
  plan: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_plan_title", ME_PLAN_TITLE, lang);
    },
    free: {
      summary(lang: Language): string {
        return pickMeVector("miomika.last_me_plan_free", ME_PLAN_FREE, lang);
      },
    },
    pro: {
      summary(lang: Language): string {
        return pickMeVector("miomika.last_me_plan_pro", ME_PLAN_PRO, lang);
      },
    },
    promax: {
      summary(lang: Language): string {
        return pickMeVector("miomika.last_me_plan_pmax", ME_PLAN_PROMAX, lang);
      },
    },
    cta: {
      upgrade(lang: Language): string {
        return pickMeVector("miomika.last_me_plan_up", ME_PLAN_CTA_UPGRADE, lang);
      },
      manage(lang: Language): string {
        return pickMeVector("miomika.last_me_plan_mgmt", ME_PLAN_CTA_MANAGE, lang);
      },
    },
    stars(lang: Language): string {
      return pickMeVector("miomika.last_me_plan_stars", ME_PLAN_STARS, lang);
    },
    voice(lang: Language): string {
      return pickMeVector("miomika.last_me_plan_voice", ME_PLAN_VOICE, lang);
    },
    topup(lang: Language): string {
      return pickMeVector("miomika.last_me_plan_topup", ME_PLAN_TOPUP, lang);
    },
  },
  bond: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_title", ME_BOND_TITLE, lang);
    },
    name(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_name", ME_BOND_NAME, lang);
    },
    nameSub(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_namesub", ME_BOND_NAME_SUB, lang);
    },
    voice(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_voice", ME_BOND_VOICE, lang);
    },
    voiceFree(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_vfree", ME_BOND_VOICE_FREE, lang);
    },
    voicePremium(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_vprem", ME_BOND_VOICE_PREMIUM, lang);
    },
    style(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_style", ME_BOND_STYLE, lang);
    },
    warmth(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_warmth", ME_BOND_WARMTH, lang);
    },
    warmthOptions: {
      soft(lang: Language): string {
        return pickMeVector("miomika.last_me_bond_wsoft", ME_BOND_WARMTH_SOFT, lang);
      },
      balanced(lang: Language): string {
        return pickMeVector("miomika.last_me_bond_wbal", ME_BOND_WARMTH_BALANCED, lang);
      },
      playful(lang: Language): string {
        return pickMeVector("miomika.last_me_bond_wplay", ME_BOND_WARMTH_PLAYFUL, lang);
      },
    },
    callYou(lang: Language): string {
      return pickMeVector("miomika.last_me_bond_callyou", ME_BOND_CALL_YOU, lang);
    },
  },
  app: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_app_title", ME_APP_TITLE, lang);
    },
    theme(lang: Language): string {
      return pickMeVector("miomika.last_me_app_theme", ME_APP_THEME, lang);
    },
    themeOptions: {
      light(lang: Language): string {
        return pickMeVector("miomika.last_me_app_tlight", ME_APP_THEME_LIGHT, lang);
      },
      auto(lang: Language): string {
        return pickMeVector("miomika.last_me_app_tauto", ME_APP_THEME_AUTO, lang);
      },
      dark(lang: Language): string {
        return pickMeVector("miomika.last_me_app_tdark", ME_APP_THEME_DARK, lang);
      },
    },
    sounds(lang: Language): string {
      return pickMeVector("miomika.last_me_app_sounds", ME_APP_SOUNDS, lang);
    },
    notifications(lang: Language): string {
      return pickMeVector("miomika.last_me_app_notif", ME_APP_NOTIFICATIONS, lang);
    },
    uiLang(lang: Language): string {
      return pickMeVector("miomika.last_me_app_uilang", ME_APP_UI_LANG, lang);
    },
  },
  privacy: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_priv_title", ME_PRIVACY_TITLE, lang);
    },
    learned(n: number, lang: Language): string {
      return pickMeWith("miomika.last_me_priv_learned", ME_PRIVACY_LEARNED, lang, { n });
    },
    learnedEmpty(lang: Language): string {
      return pickMeVector("miomika.last_me_priv_empty", ME_PRIVACY_LEARNED_EMPTY, lang);
    },
    download(lang: Language): string {
      return pickMeVector("miomika.last_me_priv_dl", ME_PRIVACY_DOWNLOAD, lang);
    },
    forget(lang: Language): string {
      return pickMeVector("miomika.last_me_priv_forget", ME_PRIVACY_FORGET, lang);
    },
    forgetConfirm(lang: Language): string {
      return pickMeVector("miomika.last_me_priv_fconfirm", ME_PRIVACY_FORGET_CONFIRM, lang);
    },
  },
  help: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_help_title", ME_HELP_TITLE, lang);
    },
    problem(lang: Language): string {
      return pickMeVector("miomika.last_me_help_prob", ME_HELP_PROBLEM, lang);
    },
    center(lang: Language): string {
      return pickMeVector("miomika.last_me_help_center", ME_HELP_CENTER, lang);
    },
    contact(lang: Language): string {
      return pickMeVector("miomika.last_me_help_contact", ME_HELP_CONTACT, lang);
    },
    changelog(lang: Language): string {
      return pickMeVector("miomika.last_me_help_chlog", ME_HELP_CHANGELOG, lang);
    },
  },
  legal: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_legal_title", ME_LEGAL_TITLE, lang);
    },
    privacy(lang: Language): string {
      return pickMeVector("miomika.last_me_legal_priv", ME_LEGAL_PRIVACY, lang);
    },
    terms(lang: Language): string {
      return pickMeVector("miomika.last_me_legal_terms", ME_LEGAL_TERMS, lang);
    },
    about(lang: Language): string {
      return pickMeVector("miomika.last_me_legal_about", ME_LEGAL_ABOUT, lang);
    },
  },
  logout(lang: Language): string {
    return pickMeVector("miomika.last_me_logout", ME_LOGOUT, lang);
  },
} as const;
