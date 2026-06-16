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
import { useCallback, useEffect, useMemo, useState } from "react";
import { WordCardV3 } from "@/components/talk/WordCardV3";
import { useUILanguage } from "@/lib/i18n/client";
import {
  cardDirectionForTarget,
  practiceWordToVocabularyEntry,
  type PracticeWord,
} from "@/lib/talk/teach-word-card";
import { replayWordAudio } from "@/lib/talk/word-replay";
import { me } from "@/lib/voice/warmth";
import type { ProgressResponse } from "@/app/api/profile/progress/route";

type ProgressData = ProgressResponse;

function statDisplay(value: number): string {
  return value > 0 ? String(value) : "0";
}

export default function DashboardPage() {
  const uiLang = useUILanguage();
  const [progress, setProgress] = useState<ProgressData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/profile/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProgressData | null) => {
        if (cancelled || !data) return;
        setProgress(data);
      })
      .catch(() => {
        /* warm empty states remain at zero */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const streakDays = progress?.streakDays ?? 0;
  const wordsMastered = progress?.wordsMastered ?? 0;
  const conversationCount = progress?.conversationCount ?? 0;
  const learningWords = progress?.learningWords ?? [];
  const cefrLevel = progress?.cefrLevel ?? null;
  const learningTarget = progress?.learningTargetLanguage ?? "th";
  const cardDirection = useMemo(
    () => cardDirectionForTarget(learningTarget),
    [learningTarget],
  );

  const handlePracticeReplay = useCallback(
    (word: PracticeWord) => {
      void replayWordAudio(practiceWordToVocabularyEntry(word), learningTarget);
    },
    [learningTarget],
  );

  const gridStats = [
    {
      icon: BookOpen,
      value: statDisplay(wordsMastered),
      th: "คำศัพท์ที่เรียน",
      en: "Words learned",
      empty: wordsMastered === 0,
    },
    {
      icon: Clock,
      value: "0",
      th: "นาทีที่ฝึก",
      en: "Minutes practiced",
      empty: true,
    },
    {
      icon: MessageCircle,
      value: statDisplay(conversationCount),
      th: "เซสชั่นรวม",
      en: "Total sessions",
      empty: conversationCount === 0,
    },
    {
      icon: TrendingUp,
      value: "0%",
      th: "ความมั่นใจ",
      en: "Speaking confidence",
      empty: true,
    },
  ] as const;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#EAD0DB] px-4 py-3">
        <Link href="/home" className="text-[#C9A96E]">
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
          {streakDays > 0 ? (
            <>
              <p className="mt-2 text-[36px] font-medium leading-none text-[#B8860B]">
                {streakDays}
              </p>
              <p className="mt-1 text-[13px] text-[#B8860B]">วันติดต่อกัน</p>
              <p className="mt-0.5 text-[10px] text-[#888888]">Day streak</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-[13px] font-medium text-[#B8860B]">
                {me.progress.statStreakEmpty(uiLang)}
              </p>
              <p className="mt-0.5 text-[10px] text-[#888888]">Day streak</p>
            </>
          )}
        </section>

        <section className="rounded-r-xl border-l-[3px] border-[#B8860B] bg-white py-3 pl-3.5 pr-3.5">
          <p className="text-[8px] font-medium uppercase tracking-wide text-[#B8860B]">
            MIOMI&apos;S OBSERVATION
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.6] text-[#1A1A18]">
            {conversationCount > 0
              ? "หนูเห็นคุณฝึกอย่างสม่ำเสมอเลย~ ภูมิใจในคุณมากค่า"
              : "เริ่มต้นการเรียนรู้กับมิโอมิวันนี้เลยนะคะ~ หนูรอคุณอยู่ค่า"}
          </p>
          <p className="mt-1 text-[10px] leading-[1.6] text-[#888888]">
            {conversationCount > 0
              ? "I see you showing up~ I'm proud of you."
              : "Start your learning journey with Miomi today~"}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {gridStats.map(({ icon: Icon, value, th, en, empty }) => (
            <div key={th} className="rounded-xl bg-[#FFF8F2] p-3 text-center">
              {empty ? (
                <Icon
                  className="mx-auto h-6 w-6 text-[#EAD0DB]"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : (
                <>
                  <Icon
                    className="mx-auto h-5 w-5 text-[#C9A96E]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <p className="mt-1 text-xl font-medium text-[#1A1A1A]">{value}</p>
                </>
              )}
              <p className={`text-[11px] text-[#888888] ${empty ? "mt-2" : ""}`}>{th}</p>
              <p className="text-[10px] text-[#AAAAAA]">{en}</p>
              {empty && (
                <p className="mt-1 text-[9px] text-[#AAAAAA]">
                  เริ่มเรียนเพื่อดูค่า~
                </p>
              )}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#1A1A1A]">
              ระดับปัจจุบัน
            </p>
            <p className="text-[11px] font-medium text-[#B8860B]">
              {cefrLevel ?? "Lv.1"}
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAD0DB]">
            <div
              className="h-2 rounded-full bg-[#B8860B]"
              style={{ width: wordsMastered > 0 ? `${Math.min(100, wordsMastered * 5)}%` : "0%" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-[#888888]">
            {wordsMastered > 0
              ? `${wordsMastered} ${uiLang === "en" ? "words mastered" : "คำที่จำได้แล้ว"}~`
              : "0/100 XP — เริ่มเรียนเพื่อสะสม XP ค่า~"}
          </p>
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <p className="text-[12px] font-medium text-[#1A1A1A]">
            {uiLang === "en" ? "Practice & review" : "ฝึกทบทวน"}
          </p>
          <p className="mt-0.5 text-[10px] text-[#AAAAAA]">
            {uiLang === "en" ? "Your saved words from Miomi" : "คำที่บันทึกจากการเรียนกับหนู"}
          </p>
          {learningWords.length === 0 ? (
            <div className="mt-4 flex flex-col items-center text-center">
              <BookOpen
                className="h-6 w-6 text-[#EAD0DB]"
                strokeWidth={2}
                aria-hidden
              />
              <p className="mt-2 text-[11px] text-[#888888]">
                {uiLang === "en"
                  ? "Words you learn with Miomi show up here"
                  : "คำที่เรียนกับหนูจะมาอยู่ตรงนี้นะคะ~"}
              </p>
              <Link
                href="/talk"
                className="mt-4 inline-flex rounded-full px-6 py-2 text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)" }}
              >
                {uiLang === "en" ? "Start learning" : "เริ่มเรียนเลย"}
              </Link>
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {learningWords.map((w) => (
                <WordCardV3
                  key={w.word_en}
                  word={practiceWordToVocabularyEntry(w)}
                  direction={cardDirection}
                  saveState="saved"
                  onReplayAudio={() => handlePracticeReplay(w)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#EAD0DB] bg-white p-3.5">
          <p className="text-[12px] font-medium text-[#1A1A1A]">ความสำเร็จ</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 opacity-40">
            {streakDays >= 7 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
                <Trophy className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                7 วัน
              </span>
            )}
            {wordsMastered >= 20 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
                <BookOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                20 คำ
              </span>
            )}
            {conversationCount >= 1 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2.5 py-1 text-[10px] font-medium text-[#666666]">
                <Star className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                เซสชั่นแรก
              </span>
            )}
          </div>
          <p className="mt-3 text-center text-[10px] text-[#888888]">
            {conversationCount >= 1
              ? uiLang === "en"
                ? "Keep going~ more badges await!"
                : "ต่อไปเรื่อยๆ นะคะ~ มีเหรียญรออยู่~"
              : "เรียนให้ครบ 1 เซสชั่นเพื่อปลดล็อคค่า~"}
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
