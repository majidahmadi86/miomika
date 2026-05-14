import Image from "next/image";
import Link from "next/link";
import { Check, Clock, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const CALENDAR_DAYS = [
  { label: "จ", key: "mon", posted: true, isToday: false, best: false },
  { label: "อ", key: "tue", posted: false, isToday: true, best: false },
  { label: "พ", key: "wed", posted: false, isToday: false, best: false },
  { label: "พฤ", key: "thu", posted: false, isToday: false, best: false },
  { label: "ศ", key: "fri", posted: false, isToday: false, best: true },
  { label: "ส", key: "sat", posted: false, isToday: false, best: true },
  { label: "อา", key: "sun", posted: false, isToday: false, best: false },
] as const;

const TOPICS = [
  {
    th: "คาเฟ่ hidden gem กรุงเทพ",
    platform: "Instagram",
    hint: "กำลังกลายเป็นกระแสช่วงเช้า",
    hintEn: "Trending this morning",
  },
  {
    th: "Skincare routine เช้า",
    platform: "TikTok",
    hint: "มีคนมีส่วนร่วมสูงช่วงเช้าวันอังคาร",
    hintEn: "High engagement Tuesday mornings",
  },
  {
    th: "Day in my life Bangkok",
    platform: "Instagram",
    hint: "รูปแบบที่ได้ผลดีในนิชของคุณ",
    hintEn: "Strong format for your niche",
  },
] as const;

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[390px] flex-col bg-white px-4 pb-28 pt-4">
        {/* Miomi briefing */}
        <section className="flex gap-3">
          <div className="w-[80px] shrink-0 pt-0.5">
            <Image
              src="/miomi/idle.png"
              alt="Miomi"
              width={80}
              height={80}
              className="h-[80px] w-[80px] object-contain object-left"
              priority
            />
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-gold-border bg-gold-light px-3 py-3">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-gold">
              MIOMI&apos;S BRIEFING TODAY
            </p>
            <p className="mt-2 text-[11px] font-semibold leading-snug text-neutral-900">
              วันนี้เหมาะกับโพสต์ lifestyle มากค่า กำลัง trending ช่วงเช้าเลย!
            </p>
            <p className="mt-1.5 text-[10px] leading-snug text-neutral-600">
              Lifestyle content is trending this morning — perfect day to post!
            </p>
            <p className="mt-2 text-[9px] text-neutral-500">
              อัพเดทล่าสุด 9:00 น.
            </p>
            <p className="mt-0.5 text-[8px] text-nav-muted">Updated 9:00 AM</p>
          </div>
        </section>

        {/* Stats 2x2 */}
        <section className="mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-rose-border bg-white p-2.5">
            <p className="text-[10px] font-medium text-neutral-800">
              โพสต์เดือนนี้
            </p>
            <p className="text-[9px] text-nav-muted">Posts this month</p>
            <p className="mt-2 text-2xl font-bold text-rose-accent">12</p>
          </div>
          <div className="rounded-xl border border-rose-border bg-white p-2.5">
            <p className="text-[10px] font-medium text-neutral-800">สตรีค</p>
            <p className="text-[9px] text-nav-muted">Streak</p>
            <p className="mt-2 text-2xl font-bold leading-none text-gold">
              7 วัน
            </p>
            <p className="mt-1 text-xs font-semibold text-gold">7 days</p>
          </div>
          <div className="rounded-xl border border-rose-border bg-white p-2.5">
            <p className="text-[10px] font-medium text-neutral-800">
              เดือนที่แล้ว
            </p>
            <p className="text-[9px] text-nav-muted">Last month</p>
            <p className="mt-2 text-2xl font-bold text-neutral-500">9</p>
          </div>
          <div className="rounded-xl border border-rose-border bg-white p-2.5">
            <p className="text-[10px] font-medium text-neutral-800">ระดับ</p>
            <p className="text-[9px] text-nav-muted">Level</p>
            <div className="mt-2 flex items-center gap-1">
              <span className="text-2xl font-bold text-neutral-900">3</span>
              <Star
                className="h-4 w-4 shrink-0 fill-gold text-gold"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </div>
        </section>

        {/* Topic ideas */}
        <section className="mt-8">
          <h2 className="text-[11px] font-bold text-neutral-900">
            ไอเดียวันนี้
          </h2>
          <p className="mt-0.5 text-[10px] text-nav-muted">Today&apos;s ideas</p>
          <ul className="mt-3 space-y-2">
            {TOPICS.map((topic) => (
              <li
                key={topic.th}
                className="flex flex-col gap-2 rounded-xl border border-rose-border bg-white p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-snug text-neutral-900">
                      {topic.th}
                    </p>
                    <span className="mt-1.5 inline-block rounded-full border border-rose-border bg-[#FAFAFA] px-2.5 py-0.5 text-[9px] font-medium text-neutral-700">
                      {topic.platform}
                    </span>
                  </div>
                  <Link
                    href="/create"
                    className="shrink-0 whitespace-nowrap rounded-[20px] bg-rose-accent px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-rose-mid"
                  >
                    สร้าง
                  </Link>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] leading-snug text-neutral-800">
                    {topic.hint}
                  </p>
                  <p className="text-[8px] leading-snug text-nav-muted">
                    {topic.hintEn}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Calendar */}
        <section className="mt-8">
          <h2 className="text-[11px] font-bold text-neutral-900">ปฏิทินโพสต์</h2>
          <p className="mt-0.5 text-[10px] text-nav-muted">Posting calendar</p>
          <div className="mt-3 flex justify-between gap-0.5">
            {CALENDAR_DAYS.map((day) => (
              <div
                key={day.key}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[8px] text-nav-muted">{day.label}</span>
                <div
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium",
                    day.isToday
                      ? "border-rose-accent bg-rose-accent text-white"
                      : day.posted
                        ? "border-rose-accent bg-rose-light text-rose-accent"
                        : "border-rose-border bg-[#FAFAFA]",
                  ].join(" ")}
                >
                  {day.posted ? (
                    <Check className="h-3 w-3 text-rose-accent" strokeWidth={2.5} />
                  ) : null}
                </div>
                {day.best ? (
                  <span
                    className="h-1 w-1 shrink-0 rounded-full bg-gold"
                    aria-label="Best day to post"
                  />
                ) : (
                  <span className="h-1 w-1 shrink-0" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Best time */}
        <section className="mt-8 flex items-start gap-2 rounded-xl border border-rose-border bg-white px-3 py-3">
          <Clock
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-accent"
            strokeWidth={2}
            aria-hidden
          />
          <div className="min-w-0 text-[11px] leading-snug text-neutral-800">
            <p>
              เวลาที่ดีที่สุดวันนี้:{" "}
              <span className="font-semibold text-rose-accent">
                18:00 - 20:00 น.
              </span>
            </p>
            <p className="mt-1 text-[10px] text-nav-muted">
              Best time today:{" "}
              <span className="font-semibold text-rose-accent">
                6PM - 8PM
              </span>
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
