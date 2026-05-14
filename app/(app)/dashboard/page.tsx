"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GuestScreenLockOverlay } from "@/components/guest/GuestScreenLockOverlay";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";

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
    hint: "เทรนด์ช่วงเช้า · 18–20 น. ดีที่สุดวันนี้",
    hintEn: "Morning trend · best 6–8 PM",
  },
  {
    th: "Skincare routine เช้า",
    platform: "TikTok",
    hint: "มีส่วนร่วมสูงวันอังคารเช้า",
    hintEn: "High engagement Tue AM",
  },
] as const;

export default function DashboardPage() {
  const { isGuest } = useGuestExploration();

  return (
    <AppShell>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden bg-white px-3 pt-2">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
          {/* Briefing — single compact strip */}
          <section className="flex shrink-0 gap-2 rounded-lg border border-gold-border bg-gold-light px-2 py-1.5">
            <div className="w-12 shrink-0 self-end pb-0.5">
              <Image
                src="/miomi/idle.png"
                alt="Miomi"
                width={48}
                height={48}
                className="h-12 w-12 object-contain object-left"
                priority
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[7px] font-semibold uppercase tracking-wide text-gold">
                MIOMI&apos;S BRIEFING
              </p>
              <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-neutral-900">
                วันนี้เหมาะกับ lifestyle เช้า — โพสต์ 18–20 น. ดีที่สุดค่า
              </p>
              <p className="line-clamp-1 text-[8px] leading-tight text-neutral-600">
                Lifestyle trending AM — best window 6–8 PM.
              </p>
            </div>
          </section>

          {/* Stats 2×2 */}
          <section className="grid shrink-0 grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-rose-border bg-white p-2">
              <p className="text-[9px] font-medium text-neutral-800">
                โพสต์เดือนนี้
              </p>
              <p className="text-[8px] text-nav-muted">Posts</p>
              <p className="mt-0.5 text-xl font-bold leading-none text-rose-accent">
                12
              </p>
            </div>
            <div className="rounded-lg border border-rose-border bg-white p-2">
              <p className="text-[9px] font-medium text-neutral-800">สตรีค</p>
              <p className="text-[8px] text-nav-muted">Streak</p>
              <p className="mt-0.5 text-xl font-bold leading-none text-gold">
                7
              </p>
              <p className="text-[8px] font-medium leading-none text-gold">
                days
              </p>
            </div>
            <div className="rounded-lg border border-rose-border bg-white p-2">
              <p className="text-[9px] font-medium text-neutral-800">
                เดือนที่แล้ว
              </p>
              <p className="text-[8px] text-nav-muted">Last mo.</p>
              <p className="mt-0.5 text-xl font-bold leading-none text-neutral-500">
                9
              </p>
            </div>
            <div className="rounded-lg border border-rose-border bg-white p-2">
              <p className="text-[9px] font-medium text-neutral-800">ระดับ</p>
              <p className="text-[8px] text-nav-muted">Level</p>
              <div className="mt-0.5 flex items-center gap-0.5">
                <span className="text-xl font-bold leading-none text-neutral-900">
                  3
                </span>
                <Star
                  className="h-3.5 w-3.5 shrink-0 fill-gold text-gold"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </div>
            </div>
          </section>

          {/* Topic ideas — 2-up grid, no third card */}
          <section className="min-h-0 shrink-0">
            <h2 className="text-[10px] font-bold leading-none text-neutral-900">
              ไอเดียวันนี้
            </h2>
            <p className="text-[8px] leading-none text-nav-muted">Ideas</p>
            <ul className="mt-1 grid grid-cols-2 gap-1.5">
              {TOPICS.map((topic) => (
                <li
                  key={topic.th}
                  className="flex min-h-0 flex-col rounded-lg border border-rose-border bg-white p-1.5"
                >
                  <p className="line-clamp-2 text-[10px] font-bold leading-snug text-neutral-900">
                    {topic.th}
                  </p>
                  <span className="mt-1 inline-block w-fit rounded-full border border-rose-border bg-[#FAFAFA] px-1.5 py-px text-[8px] font-medium text-neutral-700">
                    {topic.platform}
                  </span>
                  <p className="mt-1 line-clamp-2 text-[8px] leading-snug text-neutral-800">
                    {topic.hint}
                  </p>
                  <p className="line-clamp-1 text-[7px] leading-snug text-nav-muted">
                    {topic.hintEn}
                  </p>
                  <Link
                    href="/create"
                    className="mt-auto inline-flex w-full items-center justify-center rounded-full bg-rose-accent py-1 text-[9px] font-semibold text-white"
                  >
                    สร้าง
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Calendar — compact */}
          <section className="mt-auto shrink-0 pb-0.5">
            <h2 className="text-[10px] font-bold leading-none text-neutral-900">
              ปฏิทินโพสต์
            </h2>
            <p className="text-[8px] leading-none text-nav-muted">Calendar</p>
            <div className="mt-1 flex justify-between gap-px">
              {CALENDAR_DAYS.map((day) => (
                <div
                  key={day.key}
                  className="flex min-w-0 flex-1 flex-col items-center gap-0.5"
                >
                  <span className="text-[7px] text-nav-muted">{day.label}</span>
                  <div
                    className={[
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-medium",
                      day.isToday
                        ? "border-rose-accent bg-rose-accent text-white"
                        : day.posted
                          ? "border-rose-accent bg-rose-light text-rose-accent"
                          : "border-rose-border bg-[#FAFAFA]",
                    ].join(" ")}
                  >
                    {day.posted ? (
                      <Check
                        className="h-2.5 w-2.5 text-rose-accent"
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </div>
                  {day.best ? (
                    <span
                      className="h-0.5 w-0.5 shrink-0 rounded-full bg-gold"
                      aria-label="Best day to post"
                    />
                  ) : (
                    <span className="h-0.5 w-0.5 shrink-0" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
        {isGuest ? <GuestScreenLockOverlay /> : null}
      </div>
    </AppShell>
  );
}
