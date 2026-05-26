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
// /me SURFACE WARMTH — relationship moments (DESIGN-RULES §C.5)
// ============================================================================

const ME_WELCOME_BACK: WarmPhrase[] = [
  { th: "วันนี้คุณเป็นยังไงคะ~?", en: "How are you today?" },
  { th: "วันนี้เป็นอย่างไรบ้างคะ~?", en: "How's your day going?" },
  { th: "ดีใจที่ได้เจอคุณอีกแล้วค่า~", en: "So glad to see you again~" },
  { th: "หนูรอคุณอยู่นะคะ~ วันนี้เป็นไงบ้าง?", en: "I was waiting for you~ how are you?" },
  { th: "มาแล้วเหรอคะ~ วันนี้สบายดีไหม?", en: "You're here~ doing okay today?" },
];

const ME_GROWTH_STORY: WarmPhrase[] = [
  {
    th: "เราอยู่ด้วยกันมา {days} วันแล้วนะคะ~ หนูจำเรื่องของคุณได้ {memories} อย่างเลย",
    en: "We've been together {days} days~ I remember {memories} things about you",
  },
  {
    th: "หนูจำคุณมา {days} วันแล้วค่า~ และจำได้ {memories} เรื่องเกี่ยวกับคุณ",
    en: "I've remembered you for {days} days~ and {memories} things about you",
  },
  {
    th: "เราคุยกันมา {days} วันแล้ว~ หนูจำคุณไว้ {memories} อย่าง และเรียนไป {words} คำแล้ว",
    en: "We've talked for {days} days~ I keep {memories} memories and we've practiced {words} words",
  },
  {
    th: "{days} วันแล้วนะคะที่เราอยู่ด้วยกัน~ หนูรู้จักคุณ {memories} เรื่องแล้ว",
    en: "{days} days together~ I know {memories} things about you now",
  },
  {
    th: "เราอยู่ข้างกันมา {days} วัน~ หนูเก็บความทรงจำ {memories} อย่างไว้ให้คุณ",
    en: "Side by side for {days} days~ I hold {memories} memories for you",
  },
];

const ME_SECTION_SUBSCRIPTION: WarmPhrase[] = [
  { th: "แผนของเรา", en: "Your plan with me" },
  { th: "แพ็คเกจที่เราใช้ด้วยกัน", en: "The plan we share" },
  { th: "เราใช้แผนไหนอยู่", en: "Our plan together" },
];

const ME_SECTION_MEMORY: WarmPhrase[] = [
  { th: "เรื่องที่หนูจำได้", en: "Things I remember about you" },
  { th: "สิ่งที่หนูรู้จักเกี่ยวกับคุณ", en: "Things I know about you" },
  { th: "ความทรงจำของเรา", en: "What I keep about you" },
];

const ME_SECTION_VOICE: WarmPhrase[] = [
  { th: "เสียงพิเศษ", en: "Premium voice" },
  { th: "เสียงของหนู", en: "My premium voice" },
  { th: "โทเค็นเสียงพิเศษ", en: "Voice tokens" },
];

const ME_SECTION_SETTINGS: WarmPhrase[] = [
  { th: "การตั้งค่า", en: "Preferences" },
  { th: "สิ่งที่คุณชอบ", en: "What you prefer" },
  { th: "ปรับให้เหมาะกับคุณ", en: "Tune things for you" },
];

const ME_SECTION_HELP: WarmPhrase[] = [
  { th: "ความช่วยเหลือ", en: "Help & info" },
  { th: "ช่วยเหลือและข้อมูล", en: "Help & information" },
  { th: "ถามหรืออ่านเพิ่ม", en: "Help & resources" },
];

const ME_CTA_UPGRADE: WarmPhrase[] = [
  { th: "อัปเกรดไปด้วยกัน", en: "Upgrade with me" },
  { th: "ไปด้วยกันแบบ Pro ไหมคะ", en: "Go Pro together?" },
  { th: "อยากให้หนูฉลาดขึ้นไหม~ อัปเกรดเลย", en: "Want me smarter~? Upgrade together" },
];

const ME_CTA_MANAGE: WarmPhrase[] = [
  { th: "จัดการแผน", en: "Manage plan" },
  { th: "ดูแผนของเรา", en: "Manage our plan" },
  { th: "ปรับแผน", en: "Adjust plan" },
];

const ME_CTA_EDIT_MEMORY: WarmPhrase[] = [
  { th: "แก้ไขความทรงจำ", en: "Edit what I remember" },
  { th: "ปรับสิ่งที่หนูจำ", en: "Change what I remember" },
  { th: "แก้ความทรงจำของหนู", en: "Edit my memories of you" },
];

const ME_CTA_TOPUP_VOICE: WarmPhrase[] = [
  { th: "เติมเสียง", en: "Top up voice" },
  { th: "เติมโทเค็นเสียง", en: "Top up tokens" },
  { th: "เพิ่มเสียงพิเศษ", en: "Add voice tokens" },
];

const ME_EMPTY_MEMORY: WarmPhrase[] = [
  {
    th: "หนูเพิ่งเริ่มรู้จักคุณค่า~ เล่าให้ฟังตอนไหนก็ได้นะคะ",
    en: "I'm just starting to know you. Tell me about yourself any time~",
  },
  {
    th: "หนูยังจำได้ไม่มาก~ เล่าเรื่องของคุณให้ฟังได้ทุกเมื่อนะคะ",
    en: "I don't know much yet~ tell me about yourself whenever you like",
  },
  {
    th: "เราเพิ่งเริ่มคุยกัน~ บอกหนูเรื่องของคุณได้เลยค่า",
    en: "We're just getting started~ share anything about yourself",
  },
];

const ME_LOGOUT: WarmPhrase[] = [
  { th: "เจอกันใหม่นะคะ", en: "See you soon" },
  { th: "ไว้เจอกันนะคะ~", en: "Until next time~" },
  { th: "หนูจะรอคุณอยู่นะคะ", en: "I'll be here when you return" },
];

const ME_BADGE_PRO: WarmPhrase[] = [
  { th: "Pro Miomi", en: "Pro Miomi" },
  { th: "Pro", en: "Pro" },
];

const ME_BADGE_PRO_MAX: WarmPhrase[] = [
  { th: "Pro Max", en: "Pro Max" },
  { th: "Pro Max Miomi", en: "Pro Max Miomi" },
];

const ME_SETTINGS_VOICE: WarmPhrase[] = [
  { th: "เสียง (หนูพูด)", en: "Voice (Miomi speaks)" },
  { th: "ให้หนูพูด", en: "Miomi speaks aloud" },
];

const ME_SETTINGS_LANGUAGE: WarmPhrase[] = [
  { th: "ภาษา", en: "Language" },
  { th: "ภาษาที่ใช้", en: "App language" },
];

const ME_SETTINGS_NOTIFICATIONS: WarmPhrase[] = [
  { th: "การแจ้งเตือน", en: "Notifications" },
  { th: "แจ้งเตือน", en: "Alerts" },
];

const ME_ROW_VOICE_TOKENS: WarmPhrase[] = [
  { th: "โทเค็นเสียง", en: "Voice tokens" },
  { th: "เสียงคงเหลือ", en: "Voice balance" },
];

const ME_LINK_HELP: WarmPhrase[] = [
  { th: "ศูนย์ช่วยเหลือ", en: "Help center" },
  { th: "ช่วยเหลือ", en: "Help" },
];

const ME_LINK_PRIVACY: WarmPhrase[] = [
  { th: "ความเป็นส่วนตัว", en: "Privacy" },
];

const ME_LINK_TERMS: WarmPhrase[] = [
  { th: "ข้อกำหนด", en: "Terms" },
];

const ME_LINK_CONTACT: WarmPhrase[] = [
  { th: "ติดต่อ", en: "Contact" },
];

const ME_MEMORY_CALLS_YOU: WarmPhrase[] = [
  { th: "เรียกคุณว่า {name}", en: "Calls you {name}" },
  { th: "หนูเรียกคุณว่า {name}", en: "I call you {name}" },
];

const ME_MEMORY_LEARNING: WarmPhrase[] = [
  { th: "เรียน {lang}", en: "Learning {lang}" },
  { th: "กำลังเรียน {lang}", en: "Studying {lang}" },
];

const ME_MEMORY_LIVES_IN: WarmPhrase[] = [
  { th: "อยู่ที่ {location}", en: "Lives in {location}" },
  { th: "อาศัยอยู่ {location}", en: "Based in {location}" },
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

export interface MeGrowthParams {
  days: number;
  memoriesCount: number;
  wordsLearned: number;
}

/** /me warmth selectors — all user-facing chrome on the relationship surface. */
export const me = {
  identity: {
    pickWelcomeBack(lang: Language): string {
      return pickMeVector("miomika.last_me_welcome", ME_WELCOME_BACK, lang);
    },
  },
  growthStory(params: MeGrowthParams, lang: Language): string {
    return pickMeWith("miomika.last_me_growth", ME_GROWTH_STORY, lang, {
      days: params.days,
      memories: params.memoriesCount,
      words: params.wordsLearned,
    });
  },
  section: {
    pickSubscription(lang: Language): string {
      return pickMeVector("miomika.last_me_sec_sub", ME_SECTION_SUBSCRIPTION, lang);
    },
    pickMemory(lang: Language): string {
      return pickMeVector("miomika.last_me_sec_mem", ME_SECTION_MEMORY, lang);
    },
    pickVoice(lang: Language): string {
      return pickMeVector("miomika.last_me_sec_voice", ME_SECTION_VOICE, lang);
    },
    pickSettings(lang: Language): string {
      return pickMeVector("miomika.last_me_sec_set", ME_SECTION_SETTINGS, lang);
    },
    pickHelp(lang: Language): string {
      return pickMeVector("miomika.last_me_sec_help", ME_SECTION_HELP, lang);
    },
  },
  cta: {
    pickUpgrade(lang: Language): string {
      return pickMeVector("miomika.last_me_cta_up", ME_CTA_UPGRADE, lang);
    },
    pickManage(lang: Language): string {
      return pickMeVector("miomika.last_me_cta_mgmt", ME_CTA_MANAGE, lang);
    },
    pickEditMemory(lang: Language): string {
      return pickMeVector("miomika.last_me_cta_mem", ME_CTA_EDIT_MEMORY, lang);
    },
    pickTopupVoice(lang: Language): string {
      return pickMeVector("miomika.last_me_cta_voice", ME_CTA_TOPUP_VOICE, lang);
    },
  },
  empty: {
    pickMemory(lang: Language): string {
      return pickMeVector("miomika.last_me_empty_mem", ME_EMPTY_MEMORY, lang);
    },
  },
  logout: {
    pick(lang: Language): string {
      return pickMeVector("miomika.last_me_logout", ME_LOGOUT, lang);
    },
  },
  badge: {
    pickPro(lang: Language): string {
      return pickMeVector("miomika.last_me_badge_pro", ME_BADGE_PRO, lang);
    },
    pickProMax(lang: Language): string {
      return pickMeVector("miomika.last_me_badge_pmax", ME_BADGE_PRO_MAX, lang);
    },
  },
  settings: {
    pickVoice(lang: Language): string {
      return pickMeVector("miomika.last_me_set_voice", ME_SETTINGS_VOICE, lang);
    },
    pickLanguage(lang: Language): string {
      return pickMeVector("miomika.last_me_set_lang", ME_SETTINGS_LANGUAGE, lang);
    },
    pickNotifications(lang: Language): string {
      return pickMeVector("miomika.last_me_set_notif", ME_SETTINGS_NOTIFICATIONS, lang);
    },
  },
  row: {
    pickVoiceTokens(lang: Language): string {
      return pickMeVector("miomika.last_me_row_vtok", ME_ROW_VOICE_TOKENS, lang);
    },
  },
  link: {
    pickHelp(lang: Language): string {
      return pickMeVector("miomika.last_me_link_help", ME_LINK_HELP, lang);
    },
    pickPrivacy(lang: Language): string {
      return pickMeVector("miomika.last_me_link_priv", ME_LINK_PRIVACY, lang);
    },
    pickTerms(lang: Language): string {
      return pickMeVector("miomika.last_me_link_terms", ME_LINK_TERMS, lang);
    },
    pickContact(lang: Language): string {
      return pickMeVector("miomika.last_me_link_contact", ME_LINK_CONTACT, lang);
    },
  },
  memory: {
    pickCallsYou(name: string, lang: Language): string {
      return pickMeWith("miomika.last_me_mem_name", ME_MEMORY_CALLS_YOU, lang, { name });
    },
    pickLearning(langName: string, lang: Language): string {
      return pickMeWith("miomika.last_me_mem_learn", ME_MEMORY_LEARNING, lang, { lang: langName });
    },
    pickLivesIn(location: string, lang: Language): string {
      return pickMeWith("miomika.last_me_mem_loc", ME_MEMORY_LIVES_IN, lang, { location });
    },
  },
} as const;
