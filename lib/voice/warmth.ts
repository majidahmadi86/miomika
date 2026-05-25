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
