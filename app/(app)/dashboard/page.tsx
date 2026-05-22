"use client";

import {
  BookOpen,
  ChevronLeft,
  Clock,
  MessageCircle,
  Share2,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#EAD0DB] px-4 py-3">
        <Link href="/home" className="text-[#DB2777]">
          <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
        <div>
          <p className="text-[15px] font-semibold text-[#1A1A1A]">แดชบอร์ด</p>
          <p className="text-[11px] text-[#888888]">Dashboard</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        <section className="rounded-2xl bg-[#FDF5E0] p-5 text-center">
          <Trophy
            className="mx-auto h-7 w-7 text-[#B8860B]"
            strokeWidth={2}
            aria-hidden
          />
          <p className="mt-2 text-[36px] font-medium leading-none text-[#B8860B]">
            7
          </p>
          <p className="mt-1 text-[13px] text-[#B8860B]">วันติดต่อกัน</p>
          <p className="mt-0.5 text-[10px] text-[#888888]">Day streak</p>
        </section>

        <section className="rounded-r-xl border-l-[3px] border-[#B8860B] bg-white py-3 pl-3.5 pr-3.5">
          <p className="text-[8px] font-medium uppercase tracking-wide text-[#B8860B]">
            MIOMI&apos;S OBSERVATION
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-[#1A1A18]">
            เริ่มต้นการเรียนรู้กับมิโอมิวันนี้เลยนะคะ~ หนูรอคุณอยู่ค่า
          </p>
          <p className="mt-1 text-[10px] leading-[1.6] text-[#888888]">
            Start your learning journey with Miomi today~
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {[
            {
              icon: BookOpen,
              value: "0",
              th: "คำศัพท์ที่เรียน",
              en: "Words learned",
            },
            {
              icon: Clock,
              value: "0",
              th: "นาทีที่ฝึก",
              en: "Minutes practiced",
            },
            {
              icon: MessageCircle,
              value: "0",
              th: "เซสชั่นรวม",
              en: "Total sessions",
            },
            {
              icon: TrendingUp,
              value: "0%",
              th: "ความมั่นใจ",
              en: "Speaking confidence",
            },
          ].map(({ icon: Icon, value, th, en }) => (
            <div key={th} className="rounded-xl bg-[#FFF8F2] p-3 text-center">
              <Icon
                className="mx-auto h-5 w-5 text-[#DB2777]"
                strokeWidth={2}
                aria-hidden
              />
              <p className="mt-1 text-xl font-medium text-[#1A1A1A]">{value}</p>
              <p className="text-[11px] text-[#888888]">{th}</p>
              <p className="text-[10px] text-[#AAAAAA]">{en}</p>
              <p className="mt-1 text-[9px] text-[#AAAAAA]">
                เริ่มเรียนเพื่อดูค่า~
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#1A1A1A]">
              ระดับปัจจุบัน
            </p>
            <p className="text-[11px] font-medium text-[#B8860B]">Lv.1</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAD0DB]">
            <div className="h-2 w-0 rounded-full bg-[#B8860B]" />
          </div>
          <p className="mt-1.5 text-[10px] text-[#888888]">
            0/100 XP — เริ่มเรียนเพื่อสะสม XP ค่า~
          </p>
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <p className="text-[12px] font-medium text-[#1A1A1A]">
            คำศัพท์ที่เรียนล่าสุด
          </p>
          <div className="mt-4 flex flex-col items-center text-center">
            <BookOpen
              className="h-6 w-6 text-[#EAD0DB]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="mt-2 text-[11px] text-[#888888]">
              คำศัพท์ที่เรียนจะปรากฏที่นี่ค่า~
            </p>
            <p className="mt-0.5 text-[9px] text-[#AAAAAA]">
              Words you learn will appear here~
            </p>
            <Link
              href="/create"
              className="mt-4 inline-flex rounded-full px-6 py-2 text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)" }}
            >
              เริ่มเรียนเลย
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <p className="text-[12px] font-medium text-[#1A1A1A]">ความสำเร็จ</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 opacity-40">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
              <Trophy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              7 วัน
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              20 คำ
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
              <Star className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              เซสชั่นแรก
            </span>
          </div>
          <p className="mt-3 text-center text-[10px] text-[#888888]">
            เรียนให้ครบ 1 เซสชั่นเพื่อปลดล็อคค่า~
          </p>
        </section>

        <section className="rounded-xl border border-[#DDD6C8] bg-[#F7F3EC] p-3 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Share2
              className="h-4 w-4 text-[#9A8B73]"
              strokeWidth={2}
              aria-hidden
            />
            <p className="text-[12px] text-[#9A8B73]">แชร์ความก้าวหน้าของคุณ</p>
          </div>
          <p className="mt-0.5 text-[10px] text-[#AAAAAA]">Share your progress</p>
          <button
            type="button"
            className="mt-3 inline-flex rounded-full border border-[#DDD6C8] bg-transparent px-4 py-1.5 text-[11px] text-[#9A8B73]"
          >
            สร้างบัตรความสำเร็จ
          </button>
        </section>
      </div>
    </div>
  );
}
