/**
 * Miomi's care notes: the moment picker and bilingual email composer.
 *
 * Design law (Mike, locked): these are CARE messages, never nags. No streak
 * pressure, no upsell, no "your lessons are waiting". A note either says
 * something warm the Thai way (กินข้าวหรือยัง), tells them Miomi misses them,
 * or brings up something she genuinely remembers about them. Every note is
 * also a tiny lesson: EN-UI learners get the Thai phrase with romanization
 * and meaning; TH-UI learners get the English phrase for the same feeling.
 *
 * Voice laws: no emoji, no em-dash, เมี้ยว~ sparing, Miomi speaks one
 * language per spoken line (the teaching caption is a separate line).
 */

export type CareLang = "th" | "en";
export type CareMoment = "meal" | "miss_you" | "memory";

export type CareEmail = {
  moment: CareMoment;
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

/** Deterministic per-day variety, same idiom as the Home greeting builder. */
function daySeed(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function pick<T>(arr: readonly T[]): T {
  return arr[daySeed() % arr.length];
}

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

/**
 * Compose the note. `daysAway` is whole days since last_seen (>= 1 here).
 * `memoryFact` is the newest user_memories row's content, if any. The memory
 * moment is EN-UI only in v1: stored facts are English free text, and Miomi
 * never mixes an English fact into a Thai note.
 */
export function composeCareEmail(opts: {
  lang: CareLang;
  daysAway: number;
  memoryFact?: string | null;
}): CareEmail {
  const { lang, daysAway, memoryFact } = opts;
  const f = FOOTER[lang];

  // Moment choice: long absence wins; a remembered fact beats the generic
  // meal note on alternating days so neither goes stale.
  const moment: CareMoment =
    daysAway >= 3
      ? "miss_you"
      : lang === "en" && memoryFact && daySeed() % 2 === 0
        ? "memory"
        : "meal";

  const base = { cta: f.cta, footerSettings: f.settings, footerUnsub: f.unsub };

  if (moment === "miss_you") {
    if (lang === "en") {
      const bubble = pick([
        "It has been a few days. No rush and no pressure. Whenever you are ready, I will be right here.",
        "I noticed you have been away a little while. I hope everything is okay. I saved your spot, come back whenever you like.",
      ] as const);
      return {
        moment,
        subject: "หนูคิดถึงนะคะ · a little note from Miomi",
        html: renderHtml(lang, {
          heading: "หนูคิดถึงนะคะ",
          caption: "nu kit teung na ka · I miss you",
          bubble,
          ...base,
        }, "%%UNSUB%%"),
      };
    }
    const bubble = pick([
      "หายไปหลายวันเลยนะคะ ไม่ต้องรีบค่ะ พร้อมเมื่อไหร่หนูอยู่ตรงนี้เสมอ",
      "ไม่เจอกันหลายวันแล้ว หวังว่าทุกอย่างเรียบร้อยดีนะคะ หนูเก็บที่ของคุณไว้ให้เหมือนเดิมค่ะ",
    ] as const);
    return {
      moment,
      subject: "หนูคิดถึงนะคะ เมี้ยว~",
      html: renderHtml(lang, {
        heading: "หนูคิดถึงนะคะ",
        caption: "ภาษาอังกฤษพูดว่า I miss you ค่ะ",
        bubble,
        ...base,
      }, "%%UNSUB%%"),
    };
  }

  if (moment === "memory") {
    const fact = humanize(String(memoryFact).trim());
    return {
      moment,
      subject: "I was thinking about you · Miomi",
      html: renderHtml(lang, {
        heading: "หนูนึกถึงเรื่องนี้อยู่เลยค่ะ",
        caption: "nu neuk teung reuang nee · I was just thinking about this",
        bubble: `You told me once: ${fact}. I have been wondering how it is going. Come tell me sometime?`,
        ...base,
      }, "%%UNSUB%%"),
    };
  }

  // meal
  if (lang === "en") {
    const bubble = pick([
      "In Thailand, this little question is how you tell someone you care about them. Miomi just wanted you to know.",
      "Thai people ask this instead of saying I care about you. So, have you eaten yet? Take care of yourself today.",
    ] as const);
    return {
      moment,
      subject: "กินข้าวหรือยัง · a little note from Miomi",
      html: renderHtml(lang, {
        heading: "กินข้าวหรือยังคะ เมี้ยว~",
        caption: "gin khao rue yang · Have you eaten yet?",
        bubble,
        ...base,
      }, "%%UNSUB%%"),
    };
  }
  const bubble = pick([
    "แค่แวะมาถามเฉยๆ ค่ะ ดูแลตัวเองด้วยนะคะ",
    "ไม่มีอะไรค่ะ แค่อยากรู้ว่าวันนี้เป็นยังไงบ้าง กินข้าวให้อร่อยนะคะ",
  ] as const);
  return {
    moment,
    subject: "กินข้าวหรือยังคะ เมี้ยว~",
    html: renderHtml(lang, {
      heading: "กินข้าวหรือยังคะ เมี้ยว~",
      caption: "ภาษาอังกฤษถามแบบนี้ค่ะ: Have you eaten yet?",
      bubble,
      ...base,
    }, "%%UNSUB%%"),
  };
}
