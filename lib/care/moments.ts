/**
 * Miomi's care notes: the moment picker and bilingual email composer.
 *
 * Design law (Mike, locked): these are CARE messages, never nags. No streak
 * pressure, no upsell, no "your lessons are waiting". A note either says
 * something warm the Thai way (กินข้าวหรือยัง), tells them Miomi misses them,
 * brings up something she genuinely remembers about them, or gently recalls
 * a word they are learning. Every note is also a tiny lesson.
 *
 * VARIETY LAW (Mike, 7/16): notes must never feel repetitive or static.
 * Every moment has a pool of handwritten variants; selection is seeded by
 * user + day (two friends get different notes on the same day) and the
 * dispatcher passes each user's recently-sent variant keys so nobody sees
 * the same wording twice in a row. The chosen variantKey is returned and
 * stored in care_notifications.variant (migration 0025).
 *
 * Voice laws: no emoji, no em-dash, เมี้ยว~ sparing, Miomi speaks one
 * language per spoken line (the teaching caption is a separate line).
 */

export type CareLang = "th" | "en";
export type CareMoment = "meal" | "miss_you" | "memory" | "word_recall";

export type RecallWord = { en: string; th: string; roman: string | null };

export type CareEmail = {
  moment: CareMoment;
  variantKey: string;
  subject: string;
  html: string;
};

/**
 * Mirrors RemembersCard's humanize(): turns a stored third-person fact
 * ("wants to learn Thai to ...") into second person ("You want to ...").
 */
function humanize(fact: string): string {
  const rules: [RegExp, string][] = [
    [/^is learning /i, "You're learning "],
    [/^has /i, "You have "],
    [/^have /i, "You have "],
    [/^wants to /i, "You want to "],
    [/^wants /i, "You want "],
    [/^works as /i, "You work as "],
    [/^works /i, "You work "],
    [/^lives in /i, "You live in "],
    [/^lives /i, "You live "],
    [/^loves /i, "You love "],
    [/^likes /i, "You like "],
    [/^enjoys /i, "You enjoy "],
    [/^is /i, "You're "],
  ];
  for (const [re, rep] of rules) {
    if (re.test(fact)) return fact.replace(re, rep);
  }
  return fact;
}

/** Deterministic per-day component of the seed, same idiom as the Home greeting builder. */
function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

/** Tiny stable string hash for deterministic per-user variety. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type Variant = { key: string; text: string };

/**
 * Pick a variant deterministically from (userSeed, day), excluding the
 * user's recently-sent keys. If everything is excluded (tiny pool or a
 * very loyal returner), fall back to the full pool rather than sending nothing.
 */
function pickVariant(pool: readonly Variant[], userSeed: string, exclude: readonly string[]): Variant {
  const fresh = pool.filter((v) => !exclude.includes(v.key));
  const usable = fresh.length > 0 ? fresh : pool;
  return usable[hashStr(`${userSeed}:${daySeed()}`) % usable.length];
}

// ---------------------------------------------------------------------------
// VARIANT POOLS. Handwritten, voice-law compliant. Keys are stable — never
// renumber existing ones, only append, or the no-repeat memory breaks.
// ---------------------------------------------------------------------------

const MEAL_EN: readonly Variant[] = [
  { key: "meal_en_1", text: "In Thailand, this little question is how you tell someone you care about them. I just wanted you to know." },
  { key: "meal_en_2", text: "Thai people ask this instead of saying I care about you. So, have you eaten yet? Take care of yourself today." },
  { key: "meal_en_3", text: "Not checking on your homework, just checking on you. Eat something nice today, na ka." },
  { key: "meal_en_4", text: "A little secret: when a Thai friend asks if you have eaten, they are really saying you matter to them. You matter, ka." },
  { key: "meal_en_5", text: "I already had my invisible cat lunch. Your turn. Something delicious, please." },
  { key: "meal_en_6", text: "Somewhere out there is a plate of something tasty with your name on it. Go find it and think of me." },
  { key: "meal_en_7", text: "If you already ate, I am proud of you. If not, this is your sign, ka." },
  { key: "meal_en_8", text: "One tiny question with all my care inside it. Have you eaten yet?" },
] as const;

const MEAL_TH: readonly Variant[] = [
  { key: "meal_th_1", text: "แค่แวะมาถามเฉยๆ ค่ะ ดูแลตัวเองด้วยนะคะ" },
  { key: "meal_th_2", text: "ไม่มีอะไรค่ะ แค่อยากรู้ว่าวันนี้เป็นยังไงบ้าง กินข้าวให้อร่อยนะคะ" },
  { key: "meal_th_3", text: "หนูกินขนมแมวไปแล้วค่ะ ตาคุณแล้วนะคะ กินอะไรอร่อยๆ นะ" },
  { key: "meal_th_4", text: "คำถามเล็กๆ แต่ความห่วงใยเต็มคำเลยค่ะ" },
  { key: "meal_th_5", text: "ถ้ากินแล้วหนูดีใจค่ะ ถ้ายังไม่กิน นี่คือสัญญาณให้ไปกินได้แล้วนะคะ" },
  { key: "meal_th_6", text: "วันนี้อย่าลืมดูแลตัวเองก่อนนะคะ เรื่องอื่นไว้ทีหลังได้ค่ะ" },
  { key: "meal_th_7", text: "มีของอร่อยรอคุณอยู่ที่ไหนสักแห่งแน่นอนค่ะ ไปหามันให้เจอนะคะ" },
  { key: "meal_th_8", text: "หนูแวะมาส่งความคิดถึงตอนมื้อเที่ยงค่ะ กินเยอะๆ นะคะ" },
] as const;

const MISS_EN: readonly Variant[] = [
  { key: "miss_en_1", text: "It has been a few days. No rush and no pressure. Whenever you are ready, I will be right here." },
  { key: "miss_en_2", text: "I noticed you have been away a little while. I hope everything is okay. I saved your spot, come back whenever you like." },
  { key: "miss_en_3", text: "The chair by the window is still yours. I dusted it with my tail, ka." },
  { key: "miss_en_4", text: "I practiced a new word alone today and it was only half as fun. Missing my favorite student a little." },
  { key: "miss_en_5", text: "No guilt in this note, only a small wave from a small cat. Hi." },
  { key: "miss_en_6", text: "Busy days happen. I will keep the kettle warm and the words ready for when you come back." },
  { key: "miss_en_7", text: "I counted the days on my paws. Too many, na ka. But take your time, really." },
  { key: "miss_en_8", text: "Your Thai words are napping safely with me. Wake them up whenever you like, ka." },
] as const;

const MISS_TH: readonly Variant[] = [
  { key: "miss_th_1", text: "หายไปหลายวันเลยนะคะ ไม่ต้องรีบค่ะ พร้อมเมื่อไหร่หนูอยู่ตรงนี้เสมอ" },
  { key: "miss_th_2", text: "ไม่เจอกันหลายวันแล้ว หวังว่าทุกอย่างเรียบร้อยดีนะคะ หนูเก็บที่ของคุณไว้ให้เหมือนเดิมค่ะ" },
  { key: "miss_th_3", text: "หนูนับวันด้วยอุ้งเท้าแล้วนะคะ หลายวันอยู่เหมือนกัน แต่ไม่เป็นไรค่ะ ตามสบายเลยนะคะ" },
  { key: "miss_th_4", text: "วันยุ่งๆ เกิดขึ้นได้ค่ะ หนูรออยู่ตรงนี้พร้อมคำศัพท์อุ่นๆ เสมอนะคะ" },
  { key: "miss_th_5", text: "โน้ตนี้ไม่มีการบ้านค่ะ มีแต่ความคิดถึงจากแมวตัวเล็กๆ หนึ่งตัว" },
  { key: "miss_th_6", text: "คำศัพท์ของคุณนอนหลับอยู่กับหนูอย่างปลอดภัยค่ะ กลับมาปลุกเมื่อไหร่ก็ได้นะคะ" },
  { key: "miss_th_7", text: "แค่โบกมือทักทายเบาๆ ค่ะ ไม่มีอะไรต้องรีบเลยนะคะ" },
  { key: "miss_th_8", text: "หนูฝึกคำใหม่คนเดียววันนี้ สนุกแค่ครึ่งเดียวเองค่ะ คิดถึงนะคะ" },
] as const;

/** Memory wrappers: %%FACT%% is replaced with the humanized remembered fact. */
const MEMORY_EN: readonly Variant[] = [
  { key: "memory_en_1", text: "You told me once: %%FACT%%. I have been wondering how it is going. Come tell me sometime?" },
  { key: "memory_en_2", text: "I was thinking about something you shared with me: %%FACT%%. Any news, ka?" },
  { key: "memory_en_3", text: "A little cat remembers things. For example: %%FACT%%. How is that going lately?" },
  { key: "memory_en_4", text: "%%FACT%%. See, I did not forget. I would love to hear the latest." },
  { key: "memory_en_5", text: "My favorite little fact today: %%FACT%%. Thinking of you, na ka." },
] as const;

const RECALL_EN: readonly Variant[] = [
  { key: "recall_en_1", text: "This little word is yours now. Try sneaking it into your day somewhere, ka." },
  { key: "recall_en_2", text: "Remember this one? Say it out loud right where you are. I will hear it in spirit." },
  { key: "recall_en_3", text: "A word only stays with you if you use it. One chance today, that is all it needs, na ka." },
  { key: "recall_en_4", text: "Pop quiz from a very small teacher: what does this one mean? You know it, I believe in you." },
  { key: "recall_en_5", text: "I kept this word warm for you. It misses your voice a little." },
  { key: "recall_en_6", text: "Today's tiny mission: use this word once. The reward is my eternal cat pride, ka." },
] as const;

const RECALL_TH: readonly Variant[] = [
  { key: "recall_th_1", text: "คำนี้เป็นของคุณแล้วนะคะ ลองแอบใช้สักครั้งวันนี้ค่ะ" },
  { key: "recall_th_2", text: "จำคำนี้ได้ไหมคะ ลองพูดออกเสียงตรงนั้นเลยค่ะ หนูได้ยินด้วยใจแน่นอน" },
  { key: "recall_th_3", text: "คำศัพท์จะอยู่กับเราก็ต่อเมื่อเราใช้มันค่ะ วันนี้ครั้งเดียวก็พอนะคะ" },
  { key: "recall_th_4", text: "ควิซเล็กๆ จากครูตัวจิ๋ว คำนี้แปลว่าอะไรคะ หนูเชื่อว่าคุณตอบได้ค่ะ" },
  { key: "recall_th_5", text: "หนูเก็บคำนี้ไว้ให้อุ่นๆ เลยนะคะ มันคิดถึงเสียงของคุณแล้วค่ะ" },
  { key: "recall_th_6", text: "ภารกิจจิ๋ววันนี้ ใช้คำนี้หนึ่งครั้งนะคะ รางวัลคือความภูมิใจของแมวหนึ่งตัวค่ะ" },
] as const;

type Blocks = {
  /** Miomi's spoken line, in her language for this note. */
  heading: string;
  /** The teaching caption: romanization and/or the phrase in the other language. */
  caption: string;
  /** The warm body inside the bubble card. */
  bubble: string;
  cta: string;
  footerSettings: string;
  footerUnsub: string;
};

function renderHtml(lang: CareLang, b: Blocks, unsubscribeUrl: string): string {
  const font = lang === "th" ? "'Kanit',sans-serif" : "'Quicksand',sans-serif";
  return `
<div style="font-family:${font};max-width:480px;margin:0 auto;padding:24px;color:#1A1A18;">
  <img src="https://miomika.com/miomi/head-happy.png" alt="Miomi" width="88" height="88" style="display:block;margin:0 auto 16px;" />
  <h1 style="text-align:center;font-family:'Kanit',sans-serif;font-size:20px;color:#C9A96E;margin:0 0 6px;">
    ${b.heading}
  </h1>
  <p style="text-align:center;font-size:13px;color:#9A8B73;margin:0 0 24px;">
    ${b.caption}
  </p>
  <div style="background:#FFF8F2;border-radius:16px;padding:16px;margin-bottom:24px;">
    <p style="font-size:13.5px;line-height:1.6;color:#1A1A18;margin:0;">
      ${b.bubble}
    </p>
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <a href="https://miomika.com/talk" style="display:inline-block;background:linear-gradient(135deg,#E8C77A 0%,#C9A96E 100%);color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:999px;font-size:14px;font-weight:600;">
      ${b.cta}
    </a>
  </div>
  <p style="text-align:center;font-size:11px;color:#B0A488;margin:0;line-height:1.6;">
    ${b.footerSettings}<br />
    <a href="${unsubscribeUrl}" style="color:#B0A488;text-decoration:underline;">${b.footerUnsub}</a>
  </p>
</div>
`;
}

const FOOTER = {
  en: {
    settings: "A little note from Miomi at miomika.com",
    unsub: "Stop these little notes",
    cta: "Talk to Miomi",
  },
  th: {
    settings: "โน้ตเล็กๆ จากมีโอมิที่ miomika.com",
    unsub: "หยุดรับโน้ตเล็กๆ แบบนี้",
    cta: "มาคุยกับมีโอมิ",
  },
} as const;

export type CareComposeOpts = {
  lang: CareLang;
  daysAway: number;
  memoryFact?: string | null;
  recallWord?: RecallWord | null;
  /** Stable per-user seed (user id) so different users get different notes the same day. */
  userSeed: string;
  /** Variant keys sent to this user recently — never repeated back to back. */
  excludeVariants?: readonly string[];
  /** Moments of this user's most recent notes — a different moment is preferred. */
  recentMoments?: readonly string[];
};

/**
 * Moment choice, shared by email + push. Long absence always wins. Otherwise
 * rotate among whatever this user has material for (memory fact, recall word,
 * meal), preferring a moment they have NOT received in their last notes.
 */
export function chooseCareMoment(opts: CareComposeOpts): CareMoment {
  if (opts.daysAway >= 3) return "miss_you";
  const candidates: CareMoment[] = [];
  if (opts.lang === "en" && opts.memoryFact) candidates.push("memory");
  if (opts.recallWord) candidates.push("word_recall");
  candidates.push("meal");
  const recent = opts.recentMoments ?? [];
  const fresh = candidates.filter((m) => !recent.includes(m));
  const usable = fresh.length > 0 ? fresh : candidates;
  return usable[hashStr(`${opts.userSeed}:moment:${daySeed()}`) % usable.length];
}

function recallBits(lang: CareLang, w: RecallWord): { heading: string; caption: string } {
  return lang === "en"
    ? { heading: w.th, caption: `${w.roman ? `${w.roman} · ` : ""}${w.en}` }
    : { heading: w.en, caption: `ภาษาไทยคือ ${w.th} ค่ะ` };
}

/** The push variant of a care note: title + short body + tap destination. */
export function composeCarePush(opts: CareComposeOpts): {
  moment: CareMoment;
  variantKey: string;
  title: string;
  body: string;
  url: string;
} {
  const { lang, memoryFact, userSeed } = opts;
  const exclude = opts.excludeVariants ?? [];
  const moment = chooseCareMoment(opts);
  const url = "/talk";

  if (moment === "miss_you") {
    const v = pickVariant(lang === "en" ? MISS_EN : MISS_TH, userSeed, exclude);
    return lang === "en"
      ? { moment, variantKey: v.key, url, title: "หนูคิดถึงนะคะ", body: `nu kit teung na ka · I miss you. ${v.text}` }
      : { moment, variantKey: v.key, url, title: "หนูคิดถึงนะคะ เมี้ยว~", body: v.text };
  }
  if (moment === "memory") {
    const fact = humanize(String(memoryFact).trim()).slice(0, 90);
    const v = pickVariant(MEMORY_EN, userSeed, exclude);
    return { moment, variantKey: v.key, url, title: "I was thinking about you", body: v.text.replaceAll("%%FACT%%", fact) };
  }
  if (moment === "word_recall" && opts.recallWord) {
    const bits = recallBits(lang, opts.recallWord);
    const v = pickVariant(lang === "en" ? RECALL_EN : RECALL_TH, userSeed, exclude);
    return { moment, variantKey: v.key, url, title: `${bits.heading} · ${bits.caption}`, body: v.text };
  }
  const v = pickVariant(lang === "en" ? MEAL_EN : MEAL_TH, userSeed, exclude);
  return lang === "en"
    ? { moment: "meal", variantKey: v.key, url, title: "กินข้าวหรือยังคะ เมี้ยว~", body: `gin khao rue yang · Have you eaten yet? ${v.text}` }
    : { moment: "meal", variantKey: v.key, url, title: "กินข้าวหรือยังคะ เมี้ยว~", body: v.text };
}

export function composeCareEmail(opts: CareComposeOpts): CareEmail {
  const { lang, memoryFact, userSeed } = opts;
  const exclude = opts.excludeVariants ?? [];
  const f = FOOTER[lang];
  const moment = chooseCareMoment(opts);
  const base = { cta: f.cta, footerSettings: f.settings, footerUnsub: f.unsub };

  if (moment === "miss_you") {
    const v = pickVariant(lang === "en" ? MISS_EN : MISS_TH, userSeed, exclude);
    if (lang === "en") {
      return {
        moment,
        variantKey: v.key,
        subject: "หนูคิดถึงนะคะ · a little note from Miomi",
        html: renderHtml(lang, {
          heading: "หนูคิดถึงนะคะ",
          caption: "nu kit teung na ka · I miss you",
          bubble: v.text,
          ...base,
        }, "%%UNSUB%%"),
      };
    }
    return {
      moment,
      variantKey: v.key,
      subject: "หนูคิดถึงนะคะ เมี้ยว~",
      html: renderHtml(lang, {
        heading: "หนูคิดถึงนะคะ",
        caption: "ภาษาอังกฤษพูดว่า I miss you ค่ะ",
        bubble: v.text,
        ...base,
      }, "%%UNSUB%%"),
    };
  }

  if (moment === "memory") {
    const fact = humanize(String(memoryFact).trim());
    const v = pickVariant(MEMORY_EN, userSeed, exclude);
    return {
      moment,
      variantKey: v.key,
      subject: "I was thinking about you · Miomi",
      html: renderHtml(lang, {
        heading: "หนูนึกถึงเรื่องนี้อยู่เลยค่ะ",
        caption: "nu neuk teung reuang nee · I was just thinking about this",
        bubble: v.text.replaceAll("%%FACT%%", fact),
        ...base,
      }, "%%UNSUB%%"),
    };
  }

  if (moment === "word_recall" && opts.recallWord) {
    const bits = recallBits(lang, opts.recallWord);
    const v = pickVariant(lang === "en" ? RECALL_EN : RECALL_TH, userSeed, exclude);
    return {
      moment,
      variantKey: v.key,
      subject: lang === "en" ? `${opts.recallWord.th} · a little word from Miomi` : `${opts.recallWord.en} · คำเล็กๆ จากมีโอมิ`,
      html: renderHtml(lang, {
        heading: bits.heading,
        caption: bits.caption,
        bubble: v.text,
        ...base,
      }, "%%UNSUB%%"),
    };
  }

  // meal
  const v = pickVariant(lang === "en" ? MEAL_EN : MEAL_TH, userSeed, exclude);
  if (lang === "en") {
    return {
      moment: "meal",
      variantKey: v.key,
      subject: "กินข้าวหรือยัง · a little note from Miomi",
      html: renderHtml(lang, {
        heading: "กินข้าวหรือยังคะ เมี้ยว~",
        caption: "gin khao rue yang · Have you eaten yet?",
        bubble: v.text,
        ...base,
      }, "%%UNSUB%%"),
    };
  }
  return {
    moment: "meal",
    variantKey: v.key,
    subject: "กินข้าวหรือยังคะ เมี้ยว~",
    html: renderHtml(lang, {
      heading: "กินข้าวหรือยังคะ เมี้ยว~",
      caption: "ภาษาอังกฤษถามแบบนี้ค่ะ Have you eaten yet?",
      bubble: v.text,
      ...base,
    }, "%%UNSUB%%"),
  };
}
