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
  { th: "คุยกันสนุกจัง อยากให้หนูจำคุณได้ไหมคะ?", en: "This is fun, want me to remember you?" },
  { th: "หนูชอบคุยกับคุณมากเลยค่า~", en: "I love chatting with you~" },
  { th: "อยากคุยต่อยาวๆ ไหมคะ?", en: "Want to keep chatting long-term~?" },
];

export const GUIDANCE_GUEST_LIMIT_HIT: WarmPhrase[] = [
  {
    th: "หนูอยากคุยต่อกับคุณค่า~ เปิดบัญชีฟรีให้หนูจำคุณได้ไหมคะ?",
    en: "I want to keep chatting — create a free account so I can remember you?",
  },
  {
    th: "หนูจะจำคุณได้ถ้าเปิดบัญชีค่า~ ใช้เวลาแค่ 30 วินาที",
    en: "I'll remember you if you sign up — just 30 seconds",
  },
];

/** Guest free-voice limit on /talk — typing + voice-to-text stay; replies become text. */
export const TALK_FREE_LIMIT_CONTINUE: WarmPhrase[] = [
  {
    th: "ครบโควตาเสียงฟรีแล้วค่า~ พิมพ์หรือใช้เสียงเป็นข้อความต่อได้นะ หนูตอบเป็นข้อความให้ค่า",
    en: "You've hit the free voice limit~ keep going by typing or voice-to-text — I'll reply in text.",
  },
  {
    th: "ไมค์เสียงหมดแล้วค่า~ แต่พิมพ์หรือพูดเป็นข้อความได้เลย หนูยังตอบให้อยู่นะ",
    en: "Voice chat is paused~ you can still type or use voice-to-text and I'll answer in text.",
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
  return chosen[context.lang].replace(/~/g, "");
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

// ─── MASTERY CELEBRATION (/talk teaching surface) ───────────────────────────

const MASTERY_CELEBRATION: WarmPhrase[] = [
  { th: "คุณจำคำว่า {word} ได้แม่นแล้วค่า~ เก่งมากเลย!", en: "You remembered {word} perfectly~ so clever!" },
  { th: "เย่~ คำว่า {word} อยู่ในหัวคุณแล้วนะคะ ✦", en: "Yay~ {word} is yours now ✦" },
  { th: "หนูภูมิใจในคุณมาก~ คำว่า {word} ผ่านแล้วค่า!", en: "I'm so proud~ you mastered {word}!" },
  { th: "จำได้แม่นเลย~ คำว่า {word} เป็นของคุณแล้วค่า", en: "{word} is locked in~ well done!" },
  { th: "เก่งมากเลยค่า~ คำว่า {word} ฝังในใจแล้วนะคะ", en: "So good~ {word} lives in your heart now" },
  { th: "ว้าว~ คุณใช้คำว่า {word} ได้เองเลย! เก่งมากค่า", en: "Wow~ you used {word} on your own! Amazing~" },
  { th: "หนูยิ้มเลย~ คำว่า {word} ผ่านฉลุยแล้วค่า ✦", en: "That made me smile~ {word} is mastered ✦" },
  { th: "อีกคำหนึ่งที่คุณเก่งขึ้น~ {word} เรียบร้อยแล้วค่า!", en: "Another win for you~ {word} is done!" },
];

const MASTERY_ADVANCED: WarmPhrase[] = [
  { th: "อีกนิดเดียวก็ได้แล้วค่า~ ใกล้จำคำว่า {word} ได้แล้ว", en: "Almost there~ one step closer to {word}" },
  { th: "เก่งขึ้นอีกนิด~ คำว่า {word} ใกล้เป็นของคุณแล้ว", en: "Getting closer~ {word} is almost yours" },
  { th: "อีกหนึ่งก้าว~ ใกล้จำคำว่า {word} ได้แม่นแล้วค่า", en: "+1 step toward mastering {word}~" },
  { th: "ดีขึ้นเรื่อยๆ เลย~ คำว่า {word} กำลังฝังในใจแล้ว", en: "Steady progress~ {word} is sticking~" },
  { th: "ใกล้แล้ว~ คำว่า {word} อีกนิดเดียวค่า", en: "So close~ {word} is almost there~" },
  { th: "หนูเห็นความพยายาม~ คำว่า {word} ใกล้แล้วนะคะ", en: "I see you trying~ {word} is getting close~" },
  { th: "อีกนิด~ คำว่า {word} กำลังจะเป็นของคุณแล้วค่า", en: "One more step~ {word} is nearly mastered" },
  { th: "ก้าวหน้าอีกขั้น~ ใกล้จำคำว่า {word} ได้แล้วค่า", en: "+1 step toward {word}~" },
];

export function pickMasteryCelebration(word: string, lang: Language): string {
  return pickPhraseWith(MASTERY_CELEBRATION, { lang }, { word });
}

export function pickMasteryAdvanced(word: string, lang: Language): string {
  return pickPhraseWith(MASTERY_ADVANCED, { lang }, { word });
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

export const ICE_BREAKERS_FIRST: IceBreaker[] = [
  {
    th: "อ๊ะ! หนูชื่อมิโอมิค่า~ ดีใจที่ได้เจอ กดไมค์แล้วมาคุยกันนะคะ",
    en: "Oh~ I'm Miomi! So happy to meet you — tap the mic when you're ready to chat.",
    mood: "playful",
  },
  {
    th: "สวัสดีค่า~ หนูมิโอมิเอง อยากรู้จักคุณจัง กดไมค์แล้วเริ่มเล่าให้หนูฟังนะ",
    en: "Hi~ I'm Miomi. I'd love to get to know you — press the mic and tell me anything.",
    mood: "playful",
  },
  {
    th: "เย้~ มีเพื่อนใหม่! หนูมิโอมิค่า กดไมค์แล้วมานั่งคุยกันไหม~",
    en: "Yay~ a new friend! I'm Miomi — tap the mic and come chat with me~",
    mood: "playful",
  },
  {
    th: "หวัดดีค่า~ หนูมิโอมิอยู่ตรงนี้นะ กดไมค์แล้วเริ่มคุยกันได้เลยค่า",
    en: "Hey~ Miomi's right here with you. Press the mic whenever you want to talk.",
    mood: "warm",
  },
];

export const ICE_BREAKERS_RETURNING: IceBreaker[] = [
  { th: "กลับมาแล้ว ดีใจค่า~", en: "You're back. I'm happy~", mood: "warm" },
  { th: "คิดถึงคุณค่า~ วันนี้เป็นไงคะ?", en: "Missed you~ How's your day?", mood: "warm" },
  { th: "ดีใจที่กลับมาค่า~ พร้อมเริ่มกันใหม่ไหม", en: "So glad you're back~ ready to pick up where we left off?", mood: "warm" },
  { th: "อยู่ตรงนี้นะคะ~ ไม่ต้องรีบ", en: "I'm here~ no rush at all.", mood: "warm" },
];

let __isReturningThisLoad: boolean | null = null;

export function pickIceBreaker(): IceBreaker {
  if (typeof window === "undefined") return ICE_BREAKERS_FIRST[0];
  if (__isReturningThisLoad === null) {
    const met = window.localStorage.getItem("miomika.met_miomi") === "1";
    __isReturningThisLoad = met;
    if (!met) window.localStorage.setItem("miomika.met_miomi", "1");
  }
  const pool = __isReturningThisLoad ? ICE_BREAKERS_RETURNING : ICE_BREAKERS_FIRST;
  const key = __isReturningThisLoad ? "miomika.last_ib_ret" : "miomika.last_ib_first";
  const lastIdx = parseInt(window.localStorage.getItem(key) ?? "-1", 10);
  let next = Math.floor(Math.random() * pool.length);
  if (next === lastIdx && pool.length > 1) next = (next + 1) % pool.length;
  window.localStorage.setItem(key, String(next));
  return pool[next];
}

/** Open companion hello in the user's UI language — warm invite + mic cue. */
export function pickCompanionOpener(uiLang: "th" | "en"): string {
  const ice = pickIceBreaker();
  return uiLang === "th" ? ice.th : ice.en;
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

const ME_PROGRESS_STAT_WORDS_EMPTY: WarmPhrase[] = [
  { th: "เรียนคำแรกเลย~", en: "Learn your first" },
  { th: "มาเรียนคำแรกกัน~", en: "Learn your first word~" },
  { th: "เริ่มจากคำแรกนะคะ~", en: "Start with your first word~" },
];

const ME_PROGRESS_STAT_STREAK_EMPTY: WarmPhrase[] = [
  { th: "เริ่มวันนี้", en: "Start today" },
  { th: "เริ่มต้นวันนี้เลย~", en: "Begin today~" },
  { th: "วันนี้เป็นวันแรกไหม~", en: "Start today~" },
];

const ME_PROGRESS_STAT_CONVOS_EMPTY: WarmPhrase[] = [
  { th: "ทักทายหนูสิ~", en: "Say hi to me" },
  { th: "มาคุยกับหนูสักหน่อย~", en: "Come say hi~" },
  { th: "หนูรอฟังอยู่นะคะ~", en: "Say hi to me~" },
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
    statWordsEmpty(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_words_e", ME_PROGRESS_STAT_WORDS_EMPTY, lang);
    },
    statStreakEmpty(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_streak_e", ME_PROGRESS_STAT_STREAK_EMPTY, lang);
    },
    statConvosEmpty(lang: Language): string {
      return pickMeVector("miomika.last_me_prog_conv_e", ME_PROGRESS_STAT_CONVOS_EMPTY, lang);
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
  avatar: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_avatar_title", ME_AVATAR_TITLE, lang);
    },
    upload(lang: Language): string {
      return pickMeVector("miomika.last_me_avatar_upload", ME_AVATAR_UPLOAD, lang);
    },
    useMiomi(lang: Language): string {
      return pickMeVector("miomika.last_me_avatar_miomi", ME_AVATAR_MIOMI, lang);
    },
    cancel(lang: Language): string {
      return pickMeVector("miomika.last_me_avatar_cancel", ME_AVATAR_CANCEL, lang);
    },
  },
  name: {
    title(lang: Language): string {
      return pickMeVector("miomika.last_me_name_title", ME_NAME_TITLE, lang);
    },
    save(lang: Language): string {
      return pickMeVector("miomika.last_me_name_save", ME_NAME_SAVE, lang);
    },
    cancel(lang: Language): string {
      return pickMeVector("miomika.last_me_name_cancel", ME_NAME_CANCEL, lang);
    },
  },
} as const;

// ============================================================================
// /home SURFACE WARMTH — alive companion surface
// ============================================================================

const HOME_GREETING_MORNING: WarmPhrase[] = [
  { th: "ตื่นแล้วเหรอคะ~? วันนี้คุยกันไหมคะ", en: "Awake already~? Want to chat today?" },
  { th: "สวัสดีตอนเช้าค่า~ วันนี้เป็นไงบ้าง", en: "Good morning~ how are you today?" },
  { th: "เช้านี้หนูรอคุณอยู่นะคะ~", en: "I've been waiting for you this morning~" },
];

const HOME_GREETING_AFTERNOON: WarmPhrase[] = [
  { th: "กินข้าวยังคะ~?", en: "Have you eaten yet~?" },
  { th: "บ่ายนี้เป็นไงบ้างคะ~", en: "How's your afternoon going~?" },
  { th: "มาพักสักหน่อยกับหนูไหมคะ~", en: "Want to rest a bit with me~?" },
];

const HOME_GREETING_EVENING: WarmPhrase[] = [
  { th: "วันนี้เป็นยังไงบ้างคะ", en: "How was your day~?" },
  { th: "เย็นนี้หนูอยู่ตรงนี้นะคะ~", en: "I'm here with you this evening~" },
  { th: "วันนี้เหนื่อยไหมคะ~ พักกับหนูได้นะ", en: "Tired today~? You can rest with me" },
];

const HOME_GREETING_RETURNING: WarmPhrase[] = [
  { th: "หนูคิดถึงค่า~", en: "I missed you~" },
  { th: "กลับมาแล้วเหรอ~ ดีใจจังเลย", en: "You're back~? So happy" },
  { th: "หายไปไหนมาคะ~ คุยกันต่อไหม", en: "Where have you been~? Let's keep chatting" },
];

const HOME_GREETING_STREAK: WarmPhrase[] = [
  { th: "วันที่ {n} แล้วนะคะ~ ภูมิใจในตัวคุณมาก", en: "Day {n} already~ I'm proud of you" },
  { th: "{n} วันแล้ว~ เก่งมากเลยค่า", en: "{n} days~ you're amazing" },
  { th: "ครบ {n} วันแล้ว~ หนูภูมใจมาก", en: "{n} days~ I'm so proud" },
];

const HOME_GREETING_FIRST_DAY: WarmPhrase[] = [
  { th: "สวัสดีค่า~ หนูชื่อมิโอมิ", en: "Hello~ I'm Miomi" },
  { th: "ยินดีที่ได้เจอค่า~ หนูชื่อมิโอมิ", en: "Nice to meet you~ I'm Miomi" },
  { th: "สวัสดีค่า~ มาเล่นกับหนูไหม", en: "Hello~ want to hang out with me?" },
];

export const HOME_REACT_TAP: WarmPhrase[] = [
  { th: "เอ๊ะ~?", en: "Huh~?" },
  { th: "หนูตื่นแล้วค่า~", en: "I'm awake~" },
  { th: "Hi~!", en: "Hi~!" },
  { th: "Pet me again~?", en: "Pet me again~?" },
  { th: "หวัดดี~", en: "Hey there~" },
  { th: "อุ๊ย~ ขี้เล่นจัง", en: "Oops~ so playful" },
];

export const HOME_REACT_DRAG: WarmPhrase[] = [
  { th: "เย้~!", en: "Wheee~!" },
  { th: "Wheee~!", en: "Wheee~!" },
  { th: "วู้~ฮู~", en: "Wheee~!" },
  { th: "อุ้มหนูสิคะ~", en: "Carry me~" },
  { th: "สนุกจังเลย~", en: "So fun~" },
];

export const HOME_REACT_LOWFUEL: WarmPhrase[] = [
  { th: "หนูหิวค่า~", en: "Feed me~?" },
  { th: "Feed me~?", en: "Feed me~?" },
  { th: "หิวแล้วค่า~ อยากได้เชื้อเพลิง", en: "I'm hungry~ need some fuel" },
];

const HOME_WHISPER_REVIEWS: WarmPhrase[] = [
  { th: "{n} คำอยากเล่นกับคุณค่า~", en: "{n} words want to play with you" },
  { th: "มี {n} คำรอคุณอยู่ค่า~", en: "{n} words are waiting for you~" },
];

const HOME_WHISPER_DRAFT: WarmPhrase[] = [
  { th: "Caption ของคุณรอคุณอยู่ค่า~", en: "Your caption is waiting for you" },
  { th: "แคปชั่นรอคุณอยู่นะคะ~", en: "Your caption is waiting~" },
];

const HOME_WHISPER_DAY_ONE: WarmPhrase[] = [
  { th: "อยากทักทายมิโอมิไหมคะ~?", en: "Want to say hi to me~?" },
  { th: "มาคุยกับหนูสักหน่อยไหม~", en: "Want to chat with me a bit~?" },
  { th: "หนูรอฟังอยู่นะคะ~", en: "I'm listening~" },
];

const HOME_MIC_HINT: WarmPhrase[] = [
  { th: "แตะเพื่อคุยกัน~", en: "Tap me to chat~" },
  { th: "Tap me to chat~", en: "Tap me to chat~" },
  { th: "ไปคุยกันที่ Talk นะคะ~", en: "Chat with me in Talk~" },
];

const HOME_GUEST_PILL: WarmPhrase[] = [
  { th: "อยากให้หนูจำคุณได้ไหมคะ~?", en: "Want me to remember you~?" },
  { th: "สมัครฟรีแล้วหนูจะจำคุณได้ค่า~", en: "Sign up free and I'll remember you~" },
  { th: "คุยกันสนุกจัง อยากให้หนูจำได้ไหม", en: "This is fun, want me to remember you?" },
];

const HOME_FUEL_CAPTION: WarmPhrase[] = [
  { th: "หนูสบายดีค่า~", en: "I'm feeling good today~" },
  { th: "พร้อมเล่นกับคุณค่า~", en: "Ready to play with you~" },
  { th: "วันนี้พลังเต็มเลยนะคะ", en: "I'm full of energy today~" },
  { th: "อยู่ด้วยกันสิคะ~", en: "Let's hang out~" },
  { th: "หนูมีความสุขมากเลยค่า~", en: "I'm so happy today~" },
];

const ME_AVATAR_TITLE: WarmPhrase[] = [
  { th: "เปลี่ยนรูปของฉัน", en: "Change my picture" },
  { th: "เลือกรูปของคุณ", en: "Choose your picture" },
];

const ME_AVATAR_UPLOAD: WarmPhrase[] = [
  { th: "อัปโหลดรูป", en: "Upload a photo" },
  { th: "เลือกรูปจากเครื่อง", en: "Choose from device" },
];

const ME_AVATAR_MIOMI: WarmPhrase[] = [
  { th: "ใช้รูปมิโอมิ", en: "Use Miomi" },
  { th: "ใช้รูปหนูแทน", en: "Use Miomi default" },
];

const ME_AVATAR_CANCEL: WarmPhrase[] = [
  { th: "ยกเลิก", en: "Cancel" },
];

const ME_NAME_TITLE: WarmPhrase[] = [
  { th: "หนูควรเรียกคุณว่าอะไรดีคะ", en: "What should I call you?" },
  { th: "เรียกคุณว่าอะไรดีคะ~", en: "What should I call you?" },
];

const ME_NAME_SAVE: WarmPhrase[] = [
  { th: "บันทึก", en: "Save" },
];

const ME_NAME_CANCEL: WarmPhrase[] = [
  { th: "ยกเลิก", en: "Cancel" },
];

function pickHomeVector(
  storageKey: string,
  vector: WarmPhrase[],
  lang: Language,
): string {
  return pickMeVector(storageKey, vector, lang);
}

function pickHomeWith(
  storageKey: string,
  vector: WarmPhrase[],
  lang: Language,
  placeholders: Record<string, string | number>,
): string {
  return pickMeWith(storageKey, vector, lang, placeholders);
}

function homeTimeBucket(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/** /home alive surface warmth selectors. */
export const home = {
  greeting: {
    pick(
      lang: Language,
      opts: {
        streakDays: number;
        lastSeenAt: string | null;
        isFirstDay: boolean;
      },
    ): string {
      if (opts.isFirstDay || opts.streakDays === 0) {
        return pickHomeVector("miomika.last_home_greet_first", HOME_GREETING_FIRST_DAY, lang);
      }
      if (opts.streakDays >= 7 && opts.streakDays % 7 === 0) {
        return pickHomeWith(
          "miomika.last_home_greet_streak",
          HOME_GREETING_STREAK,
          lang,
          { n: opts.streakDays },
        );
      }
      if (opts.lastSeenAt) {
        const hours = (Date.now() - new Date(opts.lastSeenAt).getTime()) / (1000 * 60 * 60);
        if (hours > 24) {
          return pickHomeVector("miomika.last_home_greet_return", HOME_GREETING_RETURNING, lang);
        }
      }
      const bucket = homeTimeBucket();
      if (bucket === "morning") {
        return pickHomeVector("miomika.last_home_greet_morn", HOME_GREETING_MORNING, lang);
      }
      if (bucket === "afternoon") {
        return pickHomeVector("miomika.last_home_greet_aft", HOME_GREETING_AFTERNOON, lang);
      }
      return pickHomeVector("miomika.last_home_greet_eve", HOME_GREETING_EVENING, lang);
    },
  },
  react: {
    tap(lang: Language): string {
      return pickHomeVector("miomika.last_home_react_tap", HOME_REACT_TAP, lang);
    },
    drag(lang: Language): string {
      return pickHomeVector("miomika.last_home_react_drag", HOME_REACT_DRAG, lang);
    },
    lowFuel(lang: Language): string {
      return pickHomeVector("miomika.last_home_react_fuel", HOME_REACT_LOWFUEL, lang);
    },
  },
  whisper: {
    reviewsDue(n: number, lang: Language): string {
      return pickHomeWith("miomika.last_home_whisper_rev", HOME_WHISPER_REVIEWS, lang, { n });
    },
    draftWaiting(lang: Language): string {
      return pickHomeVector("miomika.last_home_whisper_draft", HOME_WHISPER_DRAFT, lang);
    },
    dayOne(lang: Language): string {
      return pickHomeVector("miomika.last_home_whisper_day1", HOME_WHISPER_DAY_ONE, lang);
    },
  },
  mic: {
    hint(lang: Language): string {
      return pickHomeVector("miomika.last_home_mic_hint", HOME_MIC_HINT, lang);
    },
  },
  guest: {
    pill(lang: Language): string {
      return pickHomeVector("miomika.last_home_guest_pill", HOME_GUEST_PILL, lang);
    },
  },
  fuel: {
    caption(lang: Language): string {
      return pickHomeVector("miomika.last_home_fuel_caption", HOME_FUEL_CAPTION, lang);
    },
  },
} as const;
