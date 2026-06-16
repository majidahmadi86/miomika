import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronDown } from "lucide-react";

export const metadata = { title: "Help — Miomika" };

type QA = { q: string; a: string; steps?: string[]; link?: { href: string; label: string } };
type Cat = { title: string; items: QA[] };

const HELP_EN: Cat[] = [
  {
    title: "Getting started",
    items: [
      { q: "What is Miomika?", a: "Miomika is a voice-first app for learning Thai or English by talking with Miomi, a friendly AI cat. You speak out loud, Miomi listens and replies, and teaches you words and phrases inside a real conversation." },
      { q: "Who is Miomi?", a: "Miomi is your AI learning companion — a cat who talks warmly, remembers what you've learned, and guides your practice. Miomi is software, not a person, and isn't a substitute for human relationships or professional help." },
      { q: "Can I try Miomika without an account?", a: "Yes. As a guest you can have a few turns with Miomi to feel how it works. To save progress, learn at your level, and keep talking, you create a free account.", link: { href: "/home", label: "Start as a guest" } },
      { q: "How do I create an account?", a: "It takes a few seconds.", steps: ["Tap Sign up.", "Choose Facebook, Instagram, or LINE.", "Confirm you're 18 or older and agree to the terms.", "You're in — Miomi will greet you."], link: { href: "/signup", label: "Create account" } },
    ],
  },
  {
    title: "Using Miomika",
    items: [
      { q: "How do I talk with Miomi?", a: "Talking is the heart of Miomika.", steps: ["Open Talk.", "Allow microphone access when asked.", "Turn your sound on so you can hear Miomi.", "Start speaking — Miomi listens, replies, and teaches as you go.", "Tap any word card to hear it again."], link: { href: "/talk", label: "Open Talk" } },
      { q: "How do lessons work?", a: "Lessons are Miomi teaching you a focused set of words and phrases, with quick games to lock them in.", steps: ["Open Learn.", "Pick a topic, or let Miomi choose.", "Practise the words and phrases, then play the games.", "Earn gold for great answers, silver when you need another try."], link: { href: "/learn", label: "Open Learn" } },
      { q: "What are Chat, Teach, and Translate modes?", a: "While talking you can switch how Miomi behaves: Chat is a warm, free conversation; Teach has Miomi actively teach and correct you; Translate turns Miomi into a live interpreter between Thai and English." },
      { q: "How do I hear how something sounds?", a: "Every word and example has a sound button. Tap it to hear the language you're learning spoken clearly, as many times as you like." },
      { q: "How does reviewing words work?", a: "Words you've learned come back at the right moment so they stick. You'll find them in Growth, under Practice & review.", link: { href: "/dashboard", label: "See your words" } },
      { q: "How do I change my level, photo, or name?", a: "All of these live on the Me screen.", steps: ["Open Me.", "Use 'I'm learning' to choose Thai or English.", "Tap your level to set your CEFR level.", "Tap your photo or name to change them."], link: { href: "/me", label: "Open Me" } },
    ],
  },
  {
    title: "Plans, trial & billing",
    items: [
      { q: "What's the difference between guest, Free, Pro, and Pro Max?", a: "As a guest you can sample a few turns. A free account lets you start learning with a taste of voice conversation. Pro and Pro Max unlock higher levels and more talking time. Hour packs add prepaid talking time on top. The exact limits and prices for each are always shown in the app at checkout." },
      { q: "How does the free trial work?", a: "Your free account includes a starter amount of voice time so you can experience talking with Miomi. When it's used up, a plan or an hour pack keeps you going. The current trial amount is shown in the app." },
      { q: "What are hour packs?", a: "Hour packs are prepaid blocks of voice time you buy once — handy if you'd rather top up than subscribe." },
      { q: "How do I manage, cancel, or get a refund?", a: "Manage everything from billing.", steps: ["Open Me → Manage billing.", "Cancel anytime — you keep access until the end of your paid period.", "During beta, email support@miomika.com within 14 days of a charge for a refund."], link: { href: "/me/billing", label: "Manage billing" } },
    ],
  },
  {
    title: "Fixing problems",
    items: [
      { q: "Miomi can't hear me", a: "Check that you allowed microphone access in your browser, that the right microphone is selected, and that you're somewhere reasonably quiet. If it still doesn't work, reload the page." },
      { q: "I can't hear Miomi", a: "Turn your device volume up, check that Sound is on in Me, and make sure the browser tab isn't muted. On a phone, take it off silent mode." },
      { q: "The app is slow or won't load", a: "Check your internet connection and reload — live voice needs a steady connection. Closing other heavy tabs or apps can help." },
      { q: "I can't sign in", a: "Use the same login (Facebook, Instagram, or LINE) you signed up with. If a sign-in popup was blocked, allow popups for the site and try again." },
      { q: "Something's wrong with a payment", a: "If a charge looks wrong or didn't go through, email support@miomika.com with the date and amount and we'll sort it out." },
      { q: "Miomi said something that seems wrong", a: "Miomi can make mistakes, and it holds back answers it can't verify. For anything important, double-check elsewhere — and never rely on Miomi for medical, legal, financial, or emergency advice." },
    ],
  },
  {
    title: "Account & data",
    items: [
      { q: "How do I sign in?", a: "Sign in with Facebook, Instagram, or LINE. One account per person; keep your login secure." },
      { q: "What about my data and privacy?", a: "We follow Thailand's PDPA. We don't train AI on your conversations, we don't sell your data, and we treat your conversation content as sensitive. You can access, correct, or delete your data.", link: { href: "/me", label: "Me → Your data" } },
      { q: "How do I delete my account?", a: "Email privacy@miomika.com to request deletion. We delete your conversation and learning data within 30 days, except limited records we must keep for legal reasons." },
    ],
  },
  {
    title: "Safety & wellbeing",
    items: [
      { q: "Is Miomi a real friend?", a: "Miomi is warm and remembers you, and it's fine to enjoy that — but Miomi is an AI companion, not a person, and not a replacement for real relationships or professional care. Miomika is built to help you learn, not to keep you online." },
      { q: "What if I'm in crisis?", a: "Miomi can't help in an emergency. If you're in danger or thinking about harming yourself, contact local emergency services or a crisis line right away. In Thailand: emergency 1669; Department of Mental Health 1323 (24h, free); Mental Wellness Centre 1667; Samaritans Thailand 02 713 6793." },
    ],
  },
  {
    title: "Languages",
    items: [
      { q: "How do I choose what I'm learning?", a: "Open Me → I'm learning and pick Thai or English. Miomi teaches that language, and you can change it anytime.", link: { href: "/me", label: "Open Me" } },
      { q: "Can I change the app's language?", a: "Yes — Me → App language switches the interface between Thai and English, separate from the language you're learning." },
    ],
  },
];

const HELP_TH: Cat[] = [
  {
    title: "เริ่มต้นใช้งาน",
    items: [
      { q: "Miomika คืออะไร?", a: "Miomika เป็นแอปเรียนภาษาแบบเน้นการพูด สำหรับเรียนภาษาไทยหรืออังกฤษโดยพูดคุยกับ Miomi แมว AI ที่เป็นมิตร คุณพูดออกเสียง Miomi ฟังและตอบกลับ พร้อมสอนคำและประโยคให้ในบทสนทนาจริง" },
      { q: "Miomi คือใคร?", a: "Miomi คือเพื่อนเรียนรู้ AI ของคุณ — แมวที่พูดคุยอย่างอบอุ่น จดจำสิ่งที่คุณเรียนได้ และช่วยนำทางการฝึก Miomi เป็นซอฟต์แวร์ ไม่ใช่คน และไม่ใช่สิ่งทดแทนความสัมพันธ์กับมนุษย์หรือการดูแลจากผู้เชี่ยวชาญ" },
      { q: "ลองใช้ Miomika โดยไม่สมัครได้ไหม?", a: "ได้ ในฐานะผู้เยี่ยมชมคุณคุยกับ Miomi ได้สองสามครั้งเพื่อดูว่าเป็นอย่างไร หากต้องการบันทึกความก้าวหน้า เรียนตามระดับ และคุยต่อ ให้สร้างบัญชีฟรี", link: { href: "/home", label: "เริ่มแบบผู้เยี่ยมชม" } },
      { q: "สร้างบัญชีอย่างไร?", a: "ใช้เวลาไม่กี่วินาที", steps: ["แตะ สมัคร", "เลือก Facebook, Instagram หรือ LINE", "ยืนยันว่าคุณอายุ 18 ปีขึ้นไป และยอมรับข้อกำหนด", "เสร็จแล้ว — Miomi จะทักทายคุณ"], link: { href: "/signup", label: "สร้างบัญชี" } },
    ],
  },
  {
    title: "การใช้งาน Miomika",
    items: [
      { q: "พูดคุยกับ Miomi อย่างไร?", a: "การพูดคือหัวใจของ Miomika", steps: ["เปิด Talk", "อนุญาตให้ใช้ไมโครโฟนเมื่อระบบถาม", "เปิดเสียงเพื่อฟัง Miomi", "เริ่มพูดได้เลย — Miomi ฟัง ตอบกลับ และสอนไปด้วยกัน", "แตะการ์ดคำใดก็ได้เพื่อฟังซ้ำ"], link: { href: "/talk", label: "ไปที่ Talk" } },
      { q: "บทเรียนทำงานอย่างไร?", a: "บทเรียนคือ Miomi สอนชุดคำและประโยคแบบเจาะจง พร้อมเกมสั้น ๆ เพื่อจดจำ", steps: ["เปิด Learn", "เลือกหัวข้อ หรือให้ Miomi เลือกให้", "ฝึกคำและประโยค แล้วเล่นเกม", "ได้เหรียญทองเมื่อตอบได้ดี เหรียญเงินเมื่อยังต้องลองอีกครั้ง"], link: { href: "/learn", label: "ไปที่ Learn" } },
      { q: "โหมด Chat, Teach และ Translate คืออะไร?", a: "ระหว่างพูดคุยคุณสลับวิธีที่ Miomi ทำงานได้: Chat คือคุยเล่นอย่างอบอุ่น; Teach คือ Miomi สอนและแก้ให้คุณอย่างจริงจัง; Translate คือ Miomi เป็นล่ามแปลสดระหว่างไทยกับอังกฤษ" },
      { q: "ฟังเสียงของคำได้อย่างไร?", a: "ทุกคำและตัวอย่างมีปุ่มเสียง แตะเพื่อฟังภาษาที่คุณกำลังเรียนออกเสียงชัด ๆ ได้บ่อยเท่าที่ต้องการ" },
      { q: "การทบทวนคำทำงานอย่างไร?", a: "คำที่คุณเรียนไปแล้วจะกลับมาให้ทบทวนในจังหวะที่เหมาะสมเพื่อให้จำได้แม่น ดูได้ในหน้า Growth ที่ส่วนฝึกและทบทวน", link: { href: "/dashboard", label: "ดูคำของคุณ" } },
      { q: "เปลี่ยนระดับ รูป หรือชื่ออย่างไร?", a: "ทั้งหมดอยู่ในหน้า ฉัน", steps: ["เปิดหน้า ฉัน", "ใช้ 'ฉันกำลังเรียน' เพื่อเลือกภาษาไทยหรืออังกฤษ", "แตะที่ระดับเพื่อตั้งระดับ CEFR", "แตะรูปหรือชื่อเพื่อเปลี่ยน"], link: { href: "/me", label: "ไปที่ ฉัน" } },
    ],
  },
  {
    title: "แพ็กเกจ การทดลอง และการชำระเงิน",
    items: [
      { q: "ผู้เยี่ยมชม, ฟรี, Pro และ Pro Max ต่างกันอย่างไร?", a: "ในฐานะผู้เยี่ยมชมคุณลองได้สองสามครั้ง บัญชีฟรีให้คุณเริ่มเรียนพร้อมลิ้มลองการสนทนาด้วยเสียง Pro และ Pro Max ปลดล็อกระดับที่สูงขึ้นและเวลาคุยมากขึ้น แพ็กชั่วโมงเพิ่มเวลาคุยแบบจ่ายล่วงหน้า ขีดจำกัดและราคาที่แน่นอนของแต่ละแบบจะแสดงในแอปตอนชำระเงินเสมอ" },
      { q: "ทดลองใช้ฟรีทำงานอย่างไร?", a: "บัญชีฟรีมีเวลาพูดเริ่มต้นให้คุณได้ลองคุยกับ Miomi เมื่อใช้หมด สมัครแพ็กเกจหรือซื้อแพ็กชั่วโมงเพื่อคุยต่อ จำนวนเวลาทดลองปัจจุบันแสดงอยู่ในแอป" },
      { q: "แพ็กชั่วโมงคืออะไร?", a: "แพ็กชั่วโมงคือเวลาพูดแบบจ่ายล่วงหน้าที่ซื้อครั้งเดียว เหมาะถ้าคุณอยากเติมมากกว่าสมัครสมาชิก" },
      { q: "จัดการ ยกเลิก หรือขอคืนเงินอย่างไร?", a: "จัดการทุกอย่างได้จากการเรียกเก็บเงิน", steps: ["เปิด ฉัน → จัดการการเรียกเก็บเงิน", "ยกเลิกได้ตลอดเวลา — ใช้งานได้จนสิ้นรอบที่จ่ายไว้", "ในช่วงเบต้า อีเมล support@miomika.com ภายใน 14 วันนับจากการเรียกเก็บเพื่อขอคืนเงิน"], link: { href: "/me/billing", label: "จัดการการเรียกเก็บเงิน" } },
    ],
  },
  {
    title: "แก้ปัญหา",
    items: [
      { q: "Miomi ไม่ได้ยินเสียงฉัน", a: "ตรวจสอบว่าคุณอนุญาตให้ใช้ไมโครโฟนในเบราว์เซอร์แล้ว เลือกไมโครโฟนถูกตัว และอยู่ในที่ที่เงียบพอ หากยังไม่ได้ ลองรีโหลดหน้า" },
      { q: "ฉันไม่ได้ยินเสียง Miomi", a: "เพิ่มเสียงอุปกรณ์ ตรวจสอบว่าเปิดเสียงในหน้า ฉัน แล้ว และแท็บเบราว์เซอร์ไม่ได้ปิดเสียง ถ้าใช้มือถือ ให้ปิดโหมดเงียบ" },
      { q: "แอปช้าหรือโหลดไม่ขึ้น", a: "ตรวจสอบอินเทอร์เน็ตแล้วรีโหลด — การคุยด้วยเสียงสดต้องใช้สัญญาณที่นิ่ง การปิดแท็บหรือแอปหนัก ๆ อื่นช่วยได้" },
      { q: "เข้าสู่ระบบไม่ได้", a: "ใช้การล็อกอินเดิม (Facebook, Instagram หรือ LINE) ที่คุณสมัครไว้ หากหน้าต่างล็อกอินถูกบล็อก ให้อนุญาตป็อปอัปแล้วลองใหม่" },
      { q: "การชำระเงินมีปัญหา", a: "หากการเรียกเก็บดูผิดปกติหรือไม่สำเร็จ อีเมล support@miomika.com พร้อมวันที่และจำนวนเงิน แล้วเราจะช่วยจัดการให้" },
      { q: "Miomi พูดบางอย่างที่ดูไม่ถูกต้อง", a: "Miomi อาจผิดพลาดได้ และจะไม่เดาคำตอบที่ยืนยันไม่ได้ สำหรับเรื่องสำคัญ ควรตรวจสอบจากแหล่งอื่นด้วย และอย่าพึ่งพา Miomi สำหรับคำแนะนำทางการแพทย์ กฎหมาย การเงิน หรือกรณีฉุกเฉิน" },
    ],
  },
  {
    title: "บัญชีและข้อมูล",
    items: [
      { q: "เข้าสู่ระบบอย่างไร?", a: "เข้าสู่ระบบด้วย Facebook, Instagram หรือ LINE หนึ่งบัญชีต่อหนึ่งคน และรักษาข้อมูลเข้าสู่ระบบให้ปลอดภัย" },
      { q: "ข้อมูลและความเป็นส่วนตัวเป็นอย่างไร?", a: "เราปฏิบัติตาม PDPA ของไทย เราไม่นำบทสนทนาไปฝึก AI ไม่ขายข้อมูล และถือว่าเนื้อหาการสนทนาเป็นข้อมูลอ่อนไหว คุณเข้าถึง แก้ไข หรือลบข้อมูลได้", link: { href: "/me", label: "ฉัน → ข้อมูลของคุณ" } },
      { q: "ลบบัญชีอย่างไร?", a: "อีเมลถึง privacy@miomika.com เพื่อขอลบบัญชี เราจะลบข้อมูลการสนทนาและการเรียนรู้ภายใน 30 วัน ยกเว้นบันทึกบางส่วนที่ต้องเก็บตามกฎหมาย" },
    ],
  },
  {
    title: "ความปลอดภัยและสุขภาวะ",
    items: [
      { q: "Miomi เป็นเพื่อนจริงไหม?", a: "Miomi อบอุ่นและจดจำคุณได้ และคุณจะเพลิดเพลินกับสิ่งนั้นก็ได้ แต่ Miomi เป็นเพื่อน AI ไม่ใช่คน และไม่ใช่สิ่งทดแทนความสัมพันธ์จริงหรือการดูแลจากผู้เชี่ยวชาญ Miomika สร้างมาเพื่อช่วยให้คุณเรียนรู้ ไม่ใช่เพื่อให้คุณอยู่ออนไลน์นาน ๆ" },
      { q: "ถ้าฉันอยู่ในภาวะวิกฤติควรทำอย่างไร?", a: "Miomi ช่วยในกรณีฉุกเฉินไม่ได้ หากคุณตกอยู่ในอันตรายหรือคิดทำร้ายตนเอง โปรดติดต่อบริการฉุกเฉินหรือสายด่วนทันที ในไทย: ฉุกเฉิน 1669; กรมสุขภาพจิต 1323 (24 ชม. ฟรี); ศูนย์สุขภาพจิต 1667; สะมาริตันส์ไทย 02 713 6793" },
    ],
  },
  {
    title: "ภาษา",
    items: [
      { q: "เลือกภาษาที่จะเรียนอย่างไร?", a: "เปิด ฉัน → ฉันกำลังเรียน แล้วเลือกภาษาไทยหรืออังกฤษ Miomi จะสอนภาษานั้นให้คุณ และเปลี่ยนได้ทุกเมื่อ", link: { href: "/me", label: "ไปที่ ฉัน" } },
      { q: "เปลี่ยนภาษาของแอปได้ไหม?", a: "ได้ — ฉัน → ภาษาแอป สลับหน้าจอระหว่างไทยกับอังกฤษ ซึ่งแยกจากภาษาที่คุณกำลังเรียน" },
    ],
  },
];

const UI = {
  en: { title: "Help center", intro: "Everything about using Miomika — getting started, talking and lessons, your plan, fixing problems, and your data.", still: "Still need help? Email ", terms: "Terms of Service", privacy: "Privacy Policy" },
  th: { title: "ศูนย์ช่วยเหลือ", intro: "ทุกอย่างเกี่ยวกับการใช้ Miomika — เริ่มต้นใช้งาน การพูดและบทเรียน แพ็กเกจ การแก้ปัญหา และข้อมูลของคุณ", still: "ยังต้องการความช่วยเหลือ? อีเมล ", terms: "ข้อกำหนดการให้บริการ", privacy: "นโยบายความเป็นส่วนตัว" },
};

export default async function HelpPage() {
  const store = await cookies();
  const lang = store.get("ui-language")?.value === "th" ? "th" : "en";
  const cats = lang === "th" ? HELP_TH : HELP_EN;
  const ui = UI[lang];
  return (
    <article>
      <h1 className="text-[26px] font-semibold text-ink">{ui.title}</h1>
      <p className="mt-1 mb-6 max-w-[560px] text-[14px] leading-relaxed text-ink-muted">{ui.intro}</p>

      {cats.map((cat) => (
        <section key={cat.title} className="mb-6">
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">{cat.title}</h2>
          <div className="overflow-hidden rounded-card bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-line">
            {cat.items.map((it) => (
              <details key={it.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[14px] font-medium text-ink transition hover:bg-surface-2">
                  {it.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-3.5 text-[13.5px] leading-relaxed text-ink-muted">
                  <p>{it.a}</p>
                  {it.steps ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {it.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : null}
                  {it.link ? (
                    <Link href={it.link.href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
                      {it.link.label}
                      <span aria-hidden>→</span>
                    </Link>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <p className="mt-6 text-[13px] text-ink-muted">
        {ui.still}
        <a href="mailto:support@miomika.com" className="font-medium text-accent">support@miomika.com</a>
      </p>
      <div className="mt-3 flex gap-4 text-[13px]">
        <Link href="/legal/terms" className="text-accent">{ui.terms}</Link>
        <Link href="/legal/privacy" className="text-accent">{ui.privacy}</Link>
      </div>
    </article>
  );
}
