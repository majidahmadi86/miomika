import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronDown } from "lucide-react";

export const metadata = { title: "Help — Miomika" };

type QA = { q: string; a: string };
type Cat = { title: string; items: QA[] };

const HELP_EN: Cat[] = [
  {
    title: "Getting started",
    items: [
      { q: "What is Miomika?", a: "Miomika is a voice-first app for learning a language by talking with Miomi, a friendly AI cat. You speak, Miomi listens, replies, and gently teaches you words and phrases as you go." },
      { q: "Who is Miomi?", a: "Miomi is your AI companion — a cat who remembers you, talks with warmth, and helps you practice. Miomi is software, not a person, and isn't a substitute for human relationships or professional help." },
      { q: "How do I start a conversation?", a: "Open Talk, allow microphone access, and just start speaking. Keep your sound on so you can hear Miomi, and tap any word to hear it again." },
    ],
  },
  {
    title: "Talking & lessons",
    items: [
      { q: "How does Miomi teach me?", a: "Miomi teaches inside real conversation — introducing words and short phrases at your level, showing meaning and pronunciation, then nudging you to use them. You earn gold when you say a word well, silver when it needs another try." },
      { q: "How do I hear how a word sounds?", a: "Every word and example has a sound button — tap it to hear the language you're learning spoken clearly." },
      { q: "Why won't Miomi answer something?", a: "Miomi is built to teach language and to hold back answers it can't verify rather than guess. It isn't a source of medical, legal, financial, or emergency advice." },
    ],
  },
  {
    title: "Plan & billing",
    items: [
      { q: "How does the free trial work?", a: "New accounts get a one-time 10-minute voice trial — a single allowance, not a weekly refill. After that, a plan or an hour pack keeps you talking." },
      { q: "What do plans cost?", a: "Pro and Pro Max are monthly subscriptions shown in Thai baht at checkout, and the price varies by the language you're learning. Prepaid hour packs are also available. The price you see at purchase is the price that applies." },
      { q: "Can I cancel or get a refund?", a: "You can cancel anytime and keep access until the end of your paid period. During beta, if you're unhappy you can request a refund within 14 days of a charge by emailing support@miomika.com." },
    ],
  },
  {
    title: "Account & data",
    items: [
      { q: "How do I sign in?", a: "You sign in with Facebook, Instagram, or LINE. One account per person — keep your login secure." },
      { q: "What about my data and privacy?", a: "We follow Thailand's PDPA. We don't use your conversations to train AI, we don't sell your data, and we treat your conversation content as sensitive. You can access, correct, or delete your data from Me → Your data, or by emailing privacy@miomika.com. Full detail is in the Privacy Policy." },
      { q: "How do I delete my account?", a: "Email privacy@miomika.com to request deletion. We delete your conversation and learning data within 30 days, except limited records we must keep for legal reasons." },
    ],
  },
  {
    title: "Safety & wellbeing",
    items: [
      { q: "Is Miomi a real friend?", a: "Miomi is warm and remembers you, and it's okay to enjoy that — but Miomi is an AI companion, not a person, and not a replacement for human relationships or professional care. Miomika is designed to help you learn, not to keep you in the app." },
      { q: "What if I'm in crisis?", a: "Miomi can't help in an emergency. If you're in danger or thinking about harming yourself, contact local emergency services or a crisis line right away. In Thailand: emergency 1669; Department of Mental Health 1323 (24h, free); Mental Wellness Centre 1667; Samaritans Thailand 02 713 6793." },
    ],
  },
  {
    title: "Languages",
    items: [
      { q: "How do I choose what I'm learning?", a: "Go to Me → I'm learning and pick Thai or English. Miomi teaches you that language, and you can change it anytime." },
      { q: "Can I change the app's language?", a: "Yes — Me → App language switches the interface between Thai and English. That's separate from the language you're learning." },
    ],
  },
];

const HELP_TH: Cat[] = [
  {
    title: "เริ่มต้นใช้งาน",
    items: [
      { q: "Miomika คืออะไร?", a: "Miomika เป็นแอปเรียนภาษาแบบเน้นการพูด โดยพูดคุยกับ Miomi แมว AI ที่เป็นมิตร คุณพูด Miomi ฟัง ตอบกลับ และค่อย ๆ สอนคำและประโยคให้คุณไปด้วยกัน" },
      { q: "Miomi คือใคร?", a: "Miomi คือเพื่อน AI ของคุณ — แมวที่จดจำคุณได้ พูดคุยอย่างอบอุ่น และช่วยให้คุณฝึกฝน Miomi เป็นซอฟต์แวร์ ไม่ใช่คน และไม่ใช่สิ่งทดแทนความสัมพันธ์กับมนุษย์หรือการดูแลจากผู้เชี่ยวชาญ" },
      { q: "เริ่มสนทนาอย่างไร?", a: "เปิดแท็บ Talk อนุญาตให้ใช้ไมโครโฟน แล้วเริ่มพูดได้เลย เปิดเสียงไว้เพื่อฟัง Miomi และแตะที่คำใดก็ได้เพื่อฟังซ้ำ" },
    ],
  },
  {
    title: "การพูดและบทเรียน",
    items: [
      { q: "Miomi สอนอย่างไร?", a: "Miomi สอนผ่านการสนทนาจริง — แนะนำคำและวลีสั้น ๆ ตามระดับของคุณ แสดงความหมายและการออกเสียง แล้วชวนให้คุณลองใช้ คุณจะได้เหรียญทองเมื่อพูดได้ดี และเหรียญเงินเมื่อยังต้องลองอีกครั้ง" },
      { q: "ฟังเสียงของคำได้อย่างไร?", a: "ทุกคำและตัวอย่างมีปุ่มเสียง แตะเพื่อฟังภาษาที่คุณกำลังเรียนออกเสียงชัด ๆ" },
      { q: "ทำไม Miomi ไม่ตอบบางเรื่อง?", a: "Miomi ถูกสร้างมาเพื่อสอนภาษา และจะไม่เดาคำตอบที่ยืนยันไม่ได้ Miomi ไม่ใช่แหล่งคำแนะนำทางการแพทย์ กฎหมาย การเงิน หรือกรณีฉุกเฉิน" },
    ],
  },
  {
    title: "แพ็กเกจและการชำระเงิน",
    items: [
      { q: "ทดลองใช้ฟรีทำงานอย่างไร?", a: "บัญชีใหม่จะได้รับสิทธิ์ทดลองสนทนาด้วยเสียง 10 นาที แบบครั้งเดียว ไม่ใช่สิทธิ์ที่เติมใหม่ทุกสัปดาห์ หลังจากนั้นสมัครแพ็กเกจหรือซื้อแพ็กชั่วโมงเพื่อคุยต่อได้" },
      { q: "แพ็กเกจราคาเท่าไหร่?", a: "Pro และ Pro Max เป็นสมาชิกรายเดือน แสดงราคาเป็นบาทตอนชำระเงิน และราคาต่างกันตามภาษาที่คุณกำลังเรียน มีแพ็กชั่วโมงแบบจ่ายล่วงหน้าด้วย ราคาที่คุณเห็นตอนซื้อคือราคาที่ใช้" },
      { q: "ยกเลิกหรือขอคืนเงินได้ไหม?", a: "ยกเลิกได้ตลอดเวลาและใช้งานได้จนสิ้นรอบที่จ่ายไว้ ในช่วงเบต้า หากไม่พอใจ ขอคืนเงินได้ภายใน 14 วันนับจากการเรียกเก็บ โดยอีเมลถึง support@miomika.com" },
    ],
  },
  {
    title: "บัญชีและข้อมูล",
    items: [
      { q: "เข้าสู่ระบบอย่างไร?", a: "เข้าสู่ระบบด้วย Facebook, Instagram หรือ LINE หนึ่งบัญชีต่อหนึ่งคน และรักษาข้อมูลเข้าสู่ระบบให้ปลอดภัย" },
      { q: "ข้อมูลและความเป็นส่วนตัวเป็นอย่างไร?", a: "เราปฏิบัติตาม PDPA ของไทย เราไม่นำบทสนทนาของคุณไปฝึก AI ไม่ขายข้อมูล และถือว่าเนื้อหาการสนทนาเป็นข้อมูลอ่อนไหว คุณเข้าถึง แก้ไข หรือลบข้อมูลได้จาก ฉัน → ข้อมูลของคุณ หรืออีเมล privacy@miomika.com รายละเอียดทั้งหมดอยู่ในนโยบายความเป็นส่วนตัว" },
      { q: "ลบบัญชีอย่างไร?", a: "อีเมลถึง privacy@miomika.com เพื่อขอลบบัญชี เราจะลบข้อมูลการสนทนาและการเรียนรู้ภายใน 30 วัน ยกเว้นบันทึกบางส่วนที่ต้องเก็บตามกฎหมาย" },
    ],
  },
  {
    title: "ความปลอดภัยและสุขภาวะ",
    items: [
      { q: "Miomi เป็นเพื่อนจริงไหม?", a: "Miomi อบอุ่นและจดจำคุณได้ และคุณจะเพลิดเพลินกับสิ่งนั้นก็ได้ แต่ Miomi เป็นเพื่อน AI ไม่ใช่คน และไม่ใช่สิ่งทดแทนความสัมพันธ์กับมนุษย์หรือการดูแลจากผู้เชี่ยวชาญ Miomika ออกแบบมาเพื่อช่วยให้คุณเรียนรู้ ไม่ใช่เพื่อให้คุณอยู่ในแอปนาน ๆ" },
      { q: "ถ้าฉันอยู่ในภาวะวิกฤติควรทำอย่างไร?", a: "Miomi ช่วยในกรณีฉุกเฉินไม่ได้ หากคุณตกอยู่ในอันตรายหรือคิดทำร้ายตนเอง โปรดติดต่อบริการฉุกเฉินหรือสายด่วนทันที ในไทย: ฉุกเฉิน 1669; กรมสุขภาพจิต 1323 (24 ชม. ฟรี); ศูนย์สุขภาพจิต 1667; สะมาริตันส์ไทย 02 713 6793" },
    ],
  },
  {
    title: "ภาษา",
    items: [
      { q: "เลือกภาษาที่จะเรียนอย่างไร?", a: "ไปที่ ฉัน → ฉันกำลังเรียน แล้วเลือกภาษาไทยหรือภาษาอังกฤษ Miomi จะสอนภาษานั้นให้คุณ และเปลี่ยนได้ทุกเมื่อ" },
      { q: "เปลี่ยนภาษาของแอปได้ไหม?", a: "ได้ — ฉัน → ภาษาแอป สลับหน้าจอระหว่างไทยกับอังกฤษ ซึ่งแยกจากภาษาที่คุณกำลังเรียน" },
    ],
  },
];

const UI = {
  en: { title: "Help center", intro: "Quick answers about Miomika, Miomi, your plan, and your data.", still: "Still need help? Email ", terms: "Terms of Service", privacy: "Privacy Policy" },
  th: { title: "ศูนย์ช่วยเหลือ", intro: "คำตอบเร็ว ๆ เกี่ยวกับ Miomika, Miomi, แพ็กเกจ และข้อมูลของคุณ", still: "ยังต้องการความช่วยเหลือ? อีเมล ", terms: "ข้อกำหนดการให้บริการ", privacy: "นโยบายความเป็นส่วนตัว" },
};

export default async function HelpPage() {
  const store = await cookies();
  const lang = store.get("ui-language")?.value === "th" ? "th" : "en";
  const cats = lang === "th" ? HELP_TH : HELP_EN;
  const ui = UI[lang];
  return (
    <article>
      <h1 className="text-[26px] font-semibold text-ink">{ui.title}</h1>
      <p className="mt-1 mb-6 text-[14px] text-ink-muted">{ui.intro}</p>

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
                <div className="px-4 pb-3 text-[13.5px] leading-relaxed text-ink-muted">{it.a}</div>
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
