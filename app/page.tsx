import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/tiers";

/**
 * Public landing page (miomika.com). Server-rendered, zero client JS, fully
 * crawlable: this is the page Google (and the Google for Startups reviewers)
 * see. Signed-in users skip straight to /home.
 *
 * Language: ?lang=th|en wins, then the ui-language cookie, then English.
 * The toggle is a plain link, so both language versions are crawlable too.
 *
 * globals.css locks html/body scrolling on mobile, so the page owns its
 * scroll container (h-dvh overflow-y-auto) like every app screen does.
 */

type Lang = "en" | "th";

const T = {
  en: {
    login: "Log in",
    tryFree: "Try Miomi free",
    navHow: "How it works",
    navPricing: "Pricing",
    navHelp: "Help",
    heroTitle: "A friend who remembers you",
    heroSub:
      "Miomi is a voice-first AI companion who teaches you Thai or English by talking with you. A little conversation every day, and every conversation she knows you a bit better.",
    heroCta: "Talk to Miomi free",
    heroCta2: "See pricing",
    heroNote: "No sign-up needed to try. Works in your browser, in Thai and English.",
    bubble: "Hello! I am Miomi, meow~",
    demoEyebrow: "What talking to Miomi feels like",
    demoCaption:
      "Real voice, both directions: speak Thai or English, and Miomi listens, answers, and turns the moment into a lesson.",
    howEyebrow: "How it works",
    how: [
      {
        title: "Talk",
        body: "Have a real voice conversation. Miomi listens, speaks with a natural Thai or English voice, and meets you at your level, from first words to fluent chat.",
      },
      {
        title: "Learn",
        body: "Words, phrases and little games every day, across 27 real-life topics from street food to work, with CEFR checkpoints from A1 up to C1.",
      },
      {
        title: "She remembers",
        body: "Miomi keeps what you tell her: your name, your week, the words you struggle with. Come back tomorrow and she picks up right where you left off.",
      },
    ],
    howTry: "Try it now →",
    insideEyebrow: "Inside Miomika",
    inside: [
      "Voice conversations in Thai and English",
      "Hundreds of words and phrases across 27 topics",
      "CEFR course library from A1 to C1",
      "Chat, Teach and Translate modes",
      "Streaks, bonding and a memory that grows",
      "Live speaking rooms on paid plans",
    ],
    pricingEyebrow: "Simple pricing in Thai baht",
    pricingNote: "Cancel anytime. Full details on the pricing page.",
    perMonth: "/month",
    freePrice: "฿0",
    planCta: "Compare plans",
    popular: "Most popular",
    aboutEyebrow: "About us",
    aboutTitle: "Made with care in Bangkok",
    aboutBody:
      "Miomika is built by Mikaro Studio, an independent creative technology studio in Bangkok, Thailand. We believe the warmest way to learn a language is not flashcards but a friend, so we built Miomi: a companion who talks with you, teaches you, and genuinely remembers you.",
    aboutContact: "Questions? Write to us at",
    backToTop: "Back to top",
    footerTagline: "Learn Thai and English with Miomi, your AI companion.",
    footerLinks: { pricing: "Pricing", help: "Help center", terms: "Terms", privacy: "Privacy" },
    langSwitch: "ไทย",
    langHref: "/?lang=th",
  },
  th: {
    login: "เข้าสู่ระบบ",
    tryFree: "ลองคุยกับมีโอมิฟรี",
    navHow: "ใช้งานอย่างไร",
    navPricing: "ราคา",
    navHelp: "ช่วยเหลือ",
    heroTitle: "เพื่อนที่จำคุณได้",
    heroSub:
      "มีโอมิคือเพื่อน AI ที่สอนภาษาอังกฤษหรือภาษาไทยด้วยการพูดคุยกับคุณจริงๆ คุยกันวันละนิด แล้วมีโอมิจะรู้จักคุณมากขึ้นทุกวัน",
    heroCta: "คุยกับมีโอมิฟรี",
    heroCta2: "ดูราคา",
    heroNote: "ลองได้เลยไม่ต้องสมัคร ใช้งานในเบราว์เซอร์ ทั้งภาษาไทยและอังกฤษ",
    bubble: "สวัสดีค่ะ หนูชื่อมีโอมิ เมี้ยว~",
    demoEyebrow: "คุยกับมีโอมิเป็นแบบนี้",
    demoCaption:
      "เสียงจริงทั้งสองภาษา พูดไทยหรืออังกฤษก็ได้ มีโอมิฟัง ตอบ และเปลี่ยนทุกบทสนทนาให้เป็นบทเรียน",
    howEyebrow: "ใช้งานอย่างไร",
    how: [
      {
        title: "พูดคุย",
        body: "สนทนาด้วยเสียงจริง มีโอมิฟังและพูดด้วยเสียงภาษาไทยและอังกฤษที่เป็นธรรมชาติ ปรับให้เข้ากับระดับของคุณ ตั้งแต่คำแรกจนคุยคล่อง",
      },
      {
        title: "เรียนรู้",
        body: "คำศัพท์ วลี และเกมเล็กๆ ทุกวัน ครอบคลุม 27 หัวข้อในชีวิตจริง ตั้งแต่อาหารริมทางถึงเรื่องงาน พร้อมด่านทดสอบ CEFR ตั้งแต่ A1 ถึง C1",
      },
      {
        title: "มีโอมิจำคุณได้",
        body: "มีโอมิจำสิ่งที่คุณเล่าให้ฟัง ทั้งชื่อของคุณ เรื่องราวในสัปดาห์ และคำที่คุณยังไม่คล่อง กลับมาพรุ่งนี้แล้วคุยต่อจากเดิมได้เลย",
      },
    ],
    howTry: "ลองเลย →",
    insideEyebrow: "ใน Miomika มีอะไรบ้าง",
    inside: [
      "สนทนาด้วยเสียงทั้งภาษาไทยและอังกฤษ",
      "คำศัพท์และวลีหลายร้อยคำใน 27 หัวข้อ",
      "คลังคอร์ส CEFR ตั้งแต่ A1 ถึง C1",
      "โหมดคุยเล่น สอน และแปลภาษา",
      "สตรีค ความผูกพัน และความทรงจำที่เติบโต",
      "ห้องพูดสดสำหรับแพ็กเกจแบบชำระเงิน",
    ],
    pricingEyebrow: "ราคาเข้าใจง่าย เป็นเงินบาท",
    pricingNote: "ยกเลิกได้ทุกเมื่อ ดูรายละเอียดทั้งหมดได้ที่หน้าราคา",
    perMonth: "/เดือน",
    freePrice: "฿0",
    planCta: "เปรียบเทียบแพ็กเกจ",
    popular: "ยอดนิยม",
    aboutEyebrow: "เกี่ยวกับเรา",
    aboutTitle: "สร้างด้วยความตั้งใจ ที่กรุงเทพฯ",
    aboutBody:
      "Miomika พัฒนาโดย Mikaro Studio สตูดิโอเทคโนโลยีสร้างสรรค์อิสระในกรุงเทพฯ ประเทศไทย เราเชื่อว่าวิธีเรียนภาษาที่อบอุ่นที่สุดไม่ใช่บัตรคำศัพท์ แต่คือเพื่อนสักคน เราจึงสร้างมีโอมิ เพื่อนที่คุยกับคุณ สอนคุณ และจำคุณได้จริงๆ",
    aboutContact: "มีคำถาม? เขียนหาเราได้ที่",
    backToTop: "กลับขึ้นด้านบน",
    footerTagline: "เรียนภาษาไทยและอังกฤษกับมีโอมิ เพื่อน AI ของคุณ",
    footerLinks: { pricing: "ราคา", help: "ศูนย์ช่วยเหลือ", terms: "ข้อกำหนด", privacy: "ความเป็นส่วนตัว" },
    langSwitch: "EN",
    langHref: "/?lang=en",
  },
} as const;

/**
 * The demo exchange is direction-aware: the EN view shows an English speaker
 * learning Thai; the TH view shows a Thai speaker learning English. Each
 * bubble has a main line and a smaller teaching caption.
 */
const DEMO_EN = [
  { who: "miomi", main: "กินข้าวหรือยังคะ เมี้ยว~", caption: "gin khao rue yang · Have you eaten yet?" },
  { who: "you", main: "Not yet! How do I say that I am hungry?", caption: "ยังเลย! ถ้าจะบอกว่าหิวต้องพูดว่าอะไร" },
  { who: "miomi", main: "หิวข้าว ค่ะ ลองพูดดูนะคะ หนูฟังอยู่", caption: "hiw khao · Try saying it, I am listening." },
] as const;

/** Deep links for the three "How it works" cards: Talk, Learn, She remembers. */
const HOW_HREFS = ["/talk", "/learn", "/home"] as const;

const DEMO_TH = [
  { who: "miomi", main: "กินข้าวหรือยังคะ เมี้ยว~", caption: "ภาษาอังกฤษพูดว่า Have you eaten yet?" },
  { who: "you", main: "ยังเลย แล้วถ้าจะบอกว่าหิวข้าว ภาษาอังกฤษพูดว่ายังไงนะ", caption: "Not yet! How do I say hiw khao in English?" },
  { who: "miomi", main: "พูดว่า I am hungry ค่ะ ลองพูดดูนะคะ หนูฟังอยู่", caption: "ลองออกเสียงตามได้เลย มีโอมิฟังอยู่นะคะ" },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { lang: langParam, welcome } = await searchParams;
  const cookieStore = await cookies();

  // The landing is for strangers and crawlers. Anyone signed in, and anyone
  // who has already been inside the app (mk_seen_app, set by the app shell),
  // goes straight to /home so the front door never feels like a wall.
  // ?welcome=1 forces the landing for previews and sharing.
  if (user || (cookieStore.get("mk_seen_app") && welcome !== "1")) {
    redirect("/home");
  }

  const cookieLang = cookieStore.get("ui-language")?.value;
  const lang: Lang =
    langParam === "th" || langParam === "en"
      ? langParam
      : cookieLang === "th"
        ? "th"
        : "en";
  const t = T[lang];
  const thaiBody = lang === "th";

  return (
    <div
      id="mk-scroll"
      lang={lang}
      className={`h-dvh overflow-y-auto bg-canvas text-ink ${
        thaiBody ? "[font-family:var(--font-sarabun),system-ui,sans-serif]" : ""
      }`}
    >
      {/* Ambient background: CSS-only, no client JS, crawler-safe. */}
      <style>{`
        @keyframes mk-drift { 0%,100% { transform: translate(0,0) } 50% { transform: translate(12px,-18px) } }
        @keyframes mk-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @media (prefers-reduced-motion: reduce) {
          .mk-drift, .mk-float { animation: none !important; }
        }
        /* Scroll reveals: applied ONLY when the tiny script below adds
           .mk-motion, so crawlers and no-JS visitors always see everything. */
        .mk-motion [data-reveal] { opacity: 0; transform: translateY(16px); transition: opacity .6s ease, transform .6s ease; }
        .mk-motion [data-reveal].mk-in { opacity: 1; transform: none; }
        /* Quick-access dock: hidden until the visitor scrolls past the hero. */
        #mk-dock { position: fixed; right: 16px; bottom: 16px; z-index: 50; display: flex; align-items: center; gap: 8px; opacity: 0; pointer-events: none; transform: translateY(8px); transition: opacity .3s ease, transform .3s ease; }
        #mk-dock.mk-dock-show { opacity: 1; pointer-events: auto; transform: none; }
      `}</style>

      <div className="relative min-h-full">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="mk-drift absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent-soft opacity-70 blur-3xl [animation:mk-drift_14s_ease-in-out_infinite]" />
          <div className="mk-drift absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-earned-soft opacity-60 blur-3xl [animation:mk-drift_18s_ease-in-out_infinite_reverse]" />
          <div className="mk-drift absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-warm-soft opacity-50 blur-3xl [animation:mk-drift_16s_ease-in-out_infinite]" />
        </div>

        <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
          {/* ── Header ── */}
          <header className="flex items-center justify-between gap-3 py-5">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-earned-strong [font-family:var(--font-kanit),sans-serif]"
            >
              Miomika
            </Link>
            <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
              <a href="#how" className="hover:text-ink">{t.navHow}</a>
              <a href="#pricing" className="hover:text-ink">{t.navPricing}</a>
              <Link href="/help" className="hover:text-ink">{t.navHelp}</Link>
            </nav>
            <div className="flex items-center gap-2">
              <Link
                href={t.langHref}
                className="rounded-full border border-line px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
              >
                {t.langSwitch}
              </Link>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-1.5 text-sm text-ink-muted hover:text-ink sm:block"
              >
                {t.login}
              </Link>
              <Link
                href="/home"
                className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-contrast shadow-cta hover:bg-accent-hover"
              >
                {t.tryFree}
              </Link>
            </div>
          </header>

          {/* ── Hero ── */}
          <section className="grid items-center gap-10 py-10 sm:py-16 md:grid-cols-[1.15fr_1fr]">
            <div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl [font-family:var(--font-kanit),sans-serif]">
                {t.heroTitle}
              </h1>
              <p className="mt-2 text-lg text-earned-strong [font-family:var(--font-kanit),sans-serif]">
                {lang === "en" ? "เพื่อนที่จำคุณได้" : "A friend who remembers you"}
              </p>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {t.heroSub}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/home"
                  className="rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-contrast shadow-cta hover:bg-accent-hover"
                >
                  {t.heroCta}
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-line-strong px-6 py-3 text-base font-medium text-ink hover:bg-surface"
                >
                  {t.heroCta2}
                </Link>
              </div>
              <p className="mt-4 text-sm text-ink-subtle">{t.heroNote}</p>
            </div>

            <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
              <div className="mk-float relative [animation:mk-float_6s_ease-in-out_infinite]">
                <div className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-2xl rounded-bl-sm bg-surface px-4 py-2 text-sm shadow-card [font-family:var(--font-kanit),sans-serif]">
                  {t.bubble}
                </div>
                <div className="rounded-full bg-accent-soft p-6">
                  <Image
                    src="/miomi/happy.png"
                    alt="Miomi, the Miomika companion cat"
                    width={420}
                    height={420}
                    priority
                    className="h-auto w-full"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ── Conversation demo (signature) ── */}
          <section aria-label={t.demoEyebrow} data-reveal className="py-8">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">{t.demoEyebrow}</p>
            <div className="mt-4 rounded-tile bg-surface p-5 shadow-card sm:p-7">
              <div className="flex flex-col gap-3">
                {(lang === "th" ? DEMO_TH : DEMO_EN).map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                      m.who === "miomi"
                        ? "self-start rounded-bl-sm bg-accent-soft"
                        : "self-end rounded-br-sm bg-surface-2"
                    }`}
                  >
                    <p className="[font-family:var(--font-kanit),sans-serif]">{m.main}</p>
                    <p className="mt-1 text-sm text-ink-subtle">{m.caption}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm text-ink-muted">{t.demoCaption}</p>
            </div>
          </section>

          {/* ── How it works ── */}
          <section id="how" data-reveal className="py-12">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">{t.howEyebrow}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {t.how.map((step, i) => (
                <Link
                  key={step.title}
                  href={HOW_HREFS[i]}
                  className="group rounded-card bg-surface p-6 shadow-card transition-shadow hover:shadow-float"
                >
                  <h2 className="text-lg font-semibold [font-family:var(--font-kanit),sans-serif]">
                    {step.title}
                  </h2>
                  <p className="mt-2 leading-relaxed text-ink-muted">{step.body}</p>
                  <p className="mt-3 text-sm font-medium text-accent group-hover:underline">{t.howTry}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* ── Inside Miomika ── */}
          <section data-reveal className="py-6">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">{t.insideEyebrow}</p>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {t.inside.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink-muted"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Pricing (live data from lib/billing/tiers) ── */}
          <section id="pricing" data-reveal className="py-12">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">{t.pricingEyebrow}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-card bg-surface p-6 shadow-card ${
                    plan.highlighted ? "border-2 border-accent" : "border border-line"
                  }`}
                >
                  {plan.highlighted ? (
                    <p className="mb-2 w-fit rounded-full bg-accent-soft px-3 py-0.5 text-xs font-medium text-accent">
                      {t.popular}
                    </p>
                  ) : null}
                  <h2 className="text-lg font-semibold [font-family:var(--font-kanit),sans-serif]">
                    {plan.name[lang]}
                  </h2>
                  <p className="mt-1 text-sm text-ink-subtle">{plan.tagline[lang]}</p>
                  <p className="mt-3 text-3xl font-semibold text-earned-strong">
                    {plan.priceTHB === null ? t.freePrice : `฿${plan.priceTHB}`}
                    {plan.priceTHB !== null ? (
                      <span className="text-base font-normal text-ink-subtle">{t.perMonth}</span>
                    ) : null}
                  </p>
                  <ul className="mt-4 flex flex-col gap-2 text-sm text-ink-muted">
                    {plan.features.map((f) => (
                      <li key={f.en} className="flex gap-2">
                        <span aria-hidden className="text-accent">✦</span>
                        {f[lang]}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/pricing"
                className="rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-contrast shadow-cta hover:bg-accent-hover"
              >
                {t.planCta}
              </Link>
              <p className="text-sm text-ink-subtle">{t.pricingNote}</p>
            </div>
          </section>

          {/* ── About (the paragraph reviewers need) ── */}
          <section data-reveal className="py-12">
            <p className="text-sm font-medium uppercase tracking-wide text-accent">{t.aboutEyebrow}</p>
            <h2 className="mt-3 text-2xl font-semibold [font-family:var(--font-kanit),sans-serif]">
              {t.aboutTitle}
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">{t.aboutBody}</p>
            <p className="mt-3 text-ink-muted">
              {t.aboutContact}{" "}
              <a href="mailto:support@miomika.com" className="text-accent underline underline-offset-2">
                support@miomika.com
              </a>
            </p>
          </section>

          {/* ── Footer ── */}
          <footer className="border-t border-line py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-earned-strong [font-family:var(--font-kanit),sans-serif]">
                  Miomika
                </p>
                <p className="mt-1 max-w-xs text-sm text-ink-muted">{t.footerTagline}</p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
                <Link href="/pricing" className="hover:text-ink">{t.footerLinks.pricing}</Link>
                <Link href="/help" className="hover:text-ink">{t.footerLinks.help}</Link>
                <Link href="/legal/terms" className="hover:text-ink">{t.footerLinks.terms}</Link>
                <Link href="/legal/privacy" className="hover:text-ink">{t.footerLinks.privacy}</Link>
              </nav>
            </div>
            <p className="mt-8 text-xs text-ink-subtle">
              © 2026 Mikaro Studio · Bangkok, Thailand · support@miomika.com
            </p>
          </footer>
        </div>
      </div>

      {/* Quick-access dock: the app is never more than one tap away, and
          long pages never strand the visitor at the bottom. */}
      <div id="mk-dock">
        <Link
          href="/home"
          className="rounded-full bg-accent px-5 py-3 text-sm font-medium text-accent-contrast shadow-cta hover:bg-accent-hover"
        >
          {t.heroCta}
        </Link>
        <button
          id="mk-top"
          type="button"
          aria-label={t.backToTop}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink shadow-card"
        >
          ↑
        </button>
      </div>

      {/* Progressive enhancement only: reveals + dock. No JS, no problem. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var root=document.getElementById('mk-scroll');if(!root)return;var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!reduce&&'IntersectionObserver' in window){root.classList.add('mk-motion');var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('mk-in');io.unobserve(e.target);}});},{root:root,rootMargin:'0px 0px -8% 0px'});document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});}var dock=document.getElementById('mk-dock');if(dock){var toggle=function(){dock.classList.toggle('mk-dock-show',root.scrollTop>420);};root.addEventListener('scroll',toggle,{passive:true});toggle();var top=document.getElementById('mk-top');if(top){top.addEventListener('click',function(){root.scrollTo({top:0,behavior:reduce?'auto':'smooth'});});}}})();`,
        }}
      />
    </div>
  );
}
