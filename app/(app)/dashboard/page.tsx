"use client";

import { AppShell } from "@/components/layout/AppShell";
import { BookOpen, ChevronLeft, Clock, Trophy } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex h-svh max-h-svh flex-col overflow-hidden bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-[#EAD0DB] px-4 py-3">
          <Link href="/home" className="text-[#8B1A35]">
            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
          </Link>
          <div>
            <p className="text-[15px] font-semibold text-[#1A1A1A]">แดชบอร์ด</p>
            <p className="text-[11px] text-[#888888]">Dashboard</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-2xl border border-[#B8860B]/30 bg-[#FDF5E0] p-4 text-center">
            <Trophy className="mx-auto mb-1 h-8 w-8 text-[#B8860B]" strokeWidth={2} />
            <p className="text-3xl font-bold text-[#B8860B]">7</p>
            <p className="text-[13px] font-medium text-[#1A1A1A]">วันติดต่อกัน</p>
            <p className="text-[11px] text-[#888888]">Day streak</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#EAD0DB] bg-[#FBEAF0] p-3 text-center">
              <BookOpen className="mx-auto mb-1 h-5 w-5 text-[#8B1A35]" strokeWidth={2} />
              <p className="text-xl font-bold text-[#1A1A1A]">0</p>
              <p className="text-[11px] text-[#888888]">คำศัพท์ที่เรียน</p>
              <p className="text-[10px] text-[#AAAAAA]">Words learned</p>
            </div>
            <div className="rounded-2xl border border-[#EAD0DB] bg-[#FBEAF0] p-3 text-center">
              <Clock className="mx-auto mb-1 h-5 w-5 text-[#8B1A35]" strokeWidth={2} />
              <p className="text-xl font-bold text-[#1A1A1A]">0</p>
              <p className="text-[11px] text-[#888888]">นาทีที่ฝึก</p>
              <p className="text-[10px] text-[#AAAAAA]">Minutes practiced</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#EAD0DB] bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#1A1A1A]">ระดับปัจจุบัน</p>
              <p className="text-[11px] font-semibold text-[#B8860B]">Lv.3</p>
            </div>
            <div className="h-2 w-full rounded-full bg-[#EAD0DB]">
              <div
                className="h-2 rounded-full bg-[#B8860B]"
                style={{ width: "40%" }}
              />
            </div>
            <p className="mt-1 text-[10px] text-[#888888]">40/100 XP ถึงระดับ 4</p>
          </div>

          <div className="rounded-r-2xl border-l-4 border-[#B8860B] bg-[#FDF5E0] p-4">
            <p className="mb-1 text-[11px] font-semibold text-[#B8860B]">
              MIOMI&apos;S NOTE
            </p>
            <p className="text-[13px] text-[#1A1A1A]">
              เริ่มต้นการเรียนรู้กับมิโอมิวันนี้เลยนะคะ~
            </p>
            <p className="text-[11px] text-[#888888]">
              Start your learning journey with Miomi today~
            </p>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-[#1A1A1A]">
              เซสชั่นล่าสุด
            </p>
            <p className="text-[12px] text-[#888888]">
              ยังไม่มีเซสชั่น — มาเริ่มเรียนกันเลยค่า~
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
