"use client";
import {
  BookOpen,
  ChevronRight,
  Flame,
  GraduationCap,
  MessageCircle,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatTile } from "@/components/ui/StatTile";
import { WordCardV3 } from "@/components/talk/WordCardV3";
import { useUILanguage } from "@/lib/i18n/client";
import {
  cardDirectionForTarget,
  practiceWordToVocabularyEntry,
  type PracticeWord,
} from "@/lib/talk/teach-word-card";
import { replayWordAudio } from "@/lib/talk/word-replay";
import type { ProgressResponse } from "@/app/api/profile/progress/route";

type ProgressData = ProgressResponse;

const LEVEL_DESC: Record<string, { th: string; en: string }> = {
  A1: { th: "ผู้เริ่มต้น", en: "Beginner" },
  A2: { th: "ระดับต้น", en: "Elementary" },
  B1: { th: "ระดับกลาง", en: "Intermediate" },
  B2: { th: "ระดับกลาง-สูง", en: "Upper-intermediate" },
};
const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dateKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export default function DashboardPage() {
  const lang = useUILanguage();
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
        /* warm zero states remain */
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
  const activityDates = progress?.activityDates;

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

  const [now] = useState(() => Date.now());
  const dueWords = learningWords.filter(
    (w) => w.next_spiral_at && new Date(w.next_spiral_at).getTime() <= now,
  );
  const learningOnly = learningWords.filter(
    (w) => !(w.next_spiral_at && new Date(w.next_spiral_at).getTime() <= now),
  );
  const [tab, setTab] = useState<"due" | "learning">("due");
  const reviewList = tab === "due" ? dueWords : learningOnly;

  const week = useMemo(() => {
    const set = new Set(activityDates ?? []);
    const today = new Date();
    const todayK = dateKeyUTC(today);
    const dow = (today.getUTCDay() + 6) % 7;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - dow);
    return WEEKDAY_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const key = dateKeyUTC(d);
      return { label, done: set.has(key), isToday: key === todayK };
    });
  }, [activityDates]);

  const nextMilestone = STREAK_MILESTONES.find((m) => m > streakDays) ?? null;
  const daysToMilestone = nextMilestone ? nextMilestone - streakDays : 0;
  const nextLevel =
    cefrLevel === "A1" ? "A2" : cefrLevel === "A2" ? "B1" : cefrLevel === "B1" ? "B2" : null;
  const levelDesc = cefrLevel && LEVEL_DESC[cefrLevel] ? LEVEL_DESC[cefrLevel][lang] : null;

  const t =
    lang === "en"
      ? {
          title: "Your progress",
          sub: "Look how far you've come with Miomi.",
          noteEyebrow: "✦ Miomi's note",
          streakLabel: "day streak",
          practiceToday: "Practice today",
          startStreak: "Start your streak",
          milestone: (n: number, m: number) =>
            `${n} more ${n === 1 ? "day" : "days"} → ${m}-day badge`,
          keepGoing: "You're on a roll — keep it going!",
          yourLevel: "Your level",
          pickLevel: "Pick your level",
          proLevels: "Levels B1 & B2 unlock with Pro",
          changeLevel: "Change level",
          wordsMastered: "Words mastered",
          conversations: "Conversations",
          wordsDue: "Words due",
          review: "Practice & review",
          reviewSub: "Words you've saved from talking with Miomi",
          tabDue: "Due",
          tabLearning: "Learning",
          reviewEmpty: "Words you learn with Miomi show up here.",
          startLearning: "Start learning",
          allCaughtUp: "All caught up — nothing due right now.",
          achievements: "Achievements",
          share: "Share your progress",
          shareRef: "Invite a friend — you both get ฿30",
          shareBtn: "Invite a friend",
          firstChat: "First chat",
          wordsBadge: (n: number) => `${n} words`,
          streakBadge: (n: number) => `${n}-day streak`,
          toGo: (n: number) => ` · ${n} to go`,
          achNote: "Your next badges are within reach — keep practicing.",
        }
      : {
          title: "ความก้าวหน้าของคุณ",
          sub: "ดูสิว่าคุณมาไกลแค่ไหนกับมิโอมิ",
          noteEyebrow: "✦ โน้ตจากมิโอมิ",
          streakLabel: "วันต่อกัน",
          practiceToday: "ฝึกวันนี้",
          startStreak: "เริ่มสตรีควันนี้",
          milestone: (n: number, m: number) => `อีก ${n} วัน → เหรียญ ${m} วัน`,
          keepGoing: "กำลังไปได้สวยเลย~ ทำต่อไปนะคะ",
          yourLevel: "ระดับของคุณ",
          pickLevel: "เลือกระดับของคุณ",
          proLevels: "ระดับ B1 และ B2 ปลดล็อกด้วย Pro",
          changeLevel: "เปลี่ยนระดับ",
          wordsMastered: "คำที่จำได้แล้ว",
          conversations: "บทสนทนา",
          wordsDue: "คำที่ถึงเวลาทบทวน",
          review: "ฝึกทบทวน",
          reviewSub: "คำที่บันทึกจากการคุยกับมิโอมิ",
          tabDue: "ถึงเวลาทบทวน",
          tabLearning: "กำลังเรียน",
          reviewEmpty: "คำที่เรียนกับหนูจะมาอยู่ตรงนี้นะคะ~",
          startLearning: "เริ่มเรียนเลย",
          allCaughtUp: "ทบทวนครบแล้ว~ ตอนนี้ยังไม่มีคำที่ต้องทบทวนค่า",
          achievements: "ความสำเร็จ",
          share: "แชร์ความก้าวหน้า",
          shareRef: "ชวนเพื่อน — รับคนละ ฿30",
          shareBtn: "ชวนเพื่อน",
          firstChat: "คุยครั้งแรก",
          wordsBadge: (n: number) => `${n} คำ`,
          streakBadge: (n: number) => `สตรีค ${n} วัน`,
          toGo: (n: number) => ` · อีก ${n}`,
          achNote: "อีกนิดเดียวก็ได้เหรียญใหม่แล้ว~ ฝึกต่อไปนะคะ",
        };

  const miomiNote =
    streakDays >= 3
      ? lang === "en"
        ? `${streakDays} days in a row — I can hear your English getting smoother.`
        : `${streakDays} วันติดต่อกันแล้ว~ หนูได้ยินว่าคุณพูดลื่นขึ้นเลยค่า`
      : conversationCount > 0
        ? lang === "en"
          ? "I'm so glad you're showing up to practice — let's keep building."
          : "ดีใจจังที่คุณมาฝึกกับหนู~ มาเก่งไปด้วยกันนะคะ"
        : lang === "en"
          ? "Let's start your learning journey today — I'm right here."
          : "มาเริ่มเรียนรู้ไปด้วยกันวันนี้เลยนะคะ~ หนูอยู่ตรงนี้ค่า";

  const achievements = [
    {
      id: "firstChat",
      label: t.firstChat,
      icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
      earned: conversationCount >= 1,
      toGo: 0,
    },
    {
      id: "words20",
      label: t.wordsBadge(20),
      icon: <BookOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
      earned: wordsMastered >= 20,
      toGo: Math.max(0, 20 - wordsMastered),
    },
    {
      id: "streak7",
      label: t.streakBadge(7),
      icon: <Flame className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />,
      earned: streakDays >= 7,
      toGo: Math.max(0, 7 - streakDays),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-transparent">
      <div className="mx-auto w-full max-w-[1040px] px-4 py-5 md:px-8 md:py-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink md:text-[25px]">{t.title}</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted md:text-sm">{t.sub}</p>

        {/* Miomi's note */}
        <div
          className="mt-4 flex items-center gap-3.5 rounded-card border border-[#F2E3D8] px-4 py-3"
          style={{ background: "linear-gradient(100deg, #FCEFF3 0%, #FFF9EF 100%)" }}
        >
          <div className="h-11 w-11 shrink-0 rounded-full" style={{ background: "radial-gradient(circle at 50% 36%, #FCE3EC, #F6C7D7)" }} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C75C86]">{t.noteEyebrow}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink" style={{ fontFamily: lang === "en" ? undefined : "'Kanit', sans-serif" }}>{miomiNote}</p>
          </div>
        </div>

        {/* streak hero + level */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col rounded-card border border-[#EFE0C2] p-5 shadow-card" style={{ background: "linear-gradient(135deg, #FCF4E2 0%, #FFFDF8 70%)" }}>
            <div className="flex flex-wrap items-start justify-between gap-y-3 gap-x-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-earned-soft text-earned-strong">
                  <Flame className="h-6 w-6" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <p className="text-[34px] font-bold leading-none text-earned-strong" style={{ fontFamily: "'Quicksand', sans-serif" }}>{streakDays}</p>
                  <p className="mt-1 text-[12px] text-ink-muted">{t.streakLabel}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {week.map((d, i) => (
                  <span
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold leading-none"
                    style={
                      d.done
                        ? {
                            fontFamily: "'Quicksand', sans-serif",
                            background: "linear-gradient(135deg, #E3C98B, #B8860B)",
                            color: "#fff",
                            boxShadow: d.isToday ? "0 0 0 2px #fff, 0 0 0 4px #B8860B" : undefined,
                          }
                        : {
                            fontFamily: "'Quicksand', sans-serif",
                            border: "1.5px solid #E7D7B8",
                            color: "#B89F6A",
                            boxShadow: d.isToday ? "0 0 0 2px #fff, 0 0 0 4px #B8860B" : undefined,
                          }
                    }
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashed border-[#E7D7B8] pt-3.5">
              <p className="text-[12.5px] font-medium text-ink">{nextMilestone ? t.milestone(daysToMilestone, nextMilestone) : t.keepGoing}</p>
              <Link href="/talk" className="inline-flex shrink-0 items-center gap-1.5 rounded-[14px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-cta" style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from) 0%, var(--mk-accent-grad-to) 100%)" }}>
                <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
                {streakDays > 0 ? t.practiceToday : t.startStreak}
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-card border border-line bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[12.5px] font-medium text-ink-muted">{t.yourLevel}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-earned-soft text-earned-strong">
                <GraduationCap className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
            </div>
            {cefrLevel ? (
              <>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[26px] font-bold text-ink" style={{ fontFamily: "'Quicksand', sans-serif" }}>{cefrLevel}</span>
                  {levelDesc ? <span className="text-[13px] text-ink-muted">{levelDesc}</span> : null}
                </div>
                {nextLevel === "B1" || nextLevel === "B2" ? <p className="mt-2 text-[11.5px] text-ink-muted">{t.proLevels}</p> : null}
              </>
            ) : (
              <p className="mt-2 text-[13px] text-ink-muted">{t.pickLevel}</p>
            )}
            <Link href="/me" className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-accent">
              {cefrLevel ? t.changeLevel : t.pickLevel}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Link>
          </div>
        </div>

        {/* stat tiles */}
        <div className="mt-4 grid grid-cols-3 gap-3 md:gap-4">
          <StatTile tone="teal" icon={<BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />} value={wordsMastered} label={t.wordsMastered} />
          <StatTile tone="teal" icon={<MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />} value={conversationCount} label={t.conversations} />
          <StatTile tone="teal" icon={<RotateCcw className="h-5 w-5" strokeWidth={2} aria-hidden />} value={dueWords.length} label={t.wordsDue} />
        </div>

        {/* review + right */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.55fr_1fr]">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h3 className="text-[14px] font-semibold text-ink">{t.review}</h3>
            <p className="mt-0.5 text-[11.5px] text-ink-subtle">{t.reviewSub}</p>
            {learningWords.length > 0 ? (
              <>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setTab("due")} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition ${tab === "due" ? "border-transparent bg-accent text-white" : "border-line bg-surface text-ink-muted"}`}>
                    {t.tabDue} <span className="opacity-70">{dueWords.length}</span>
                  </button>
                  <button type="button" onClick={() => setTab("learning")} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition ${tab === "learning" ? "border-transparent bg-accent text-white" : "border-line bg-surface text-ink-muted"}`}>
                    {t.tabLearning} <span className="opacity-70">{learningOnly.length}</span>
                  </button>
                </div>
                {reviewList.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {reviewList.map((w) => (
                      <WordCardV3 key={w.word_en} word={practiceWordToVocabularyEntry(w)} direction={cardDirection} saveState="saved" onReplayAudio={() => handlePracticeReplay(w)} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-center text-[12px] text-ink-muted">{t.allCaughtUp}</p>
                )}
              </>
            ) : (
              <div className="mt-5 flex flex-col items-center text-center">
                <BookOpen className="h-7 w-7 text-ink-subtle" strokeWidth={1.75} aria-hidden />
                <p className="mt-2.5 text-[12px] text-ink-muted">{t.reviewEmpty}</p>
                <Link href="/talk" className="mt-4 inline-flex rounded-full px-6 py-2.5 text-[13px] font-semibold text-white shadow-cta" style={{ background: "linear-gradient(135deg, var(--mk-accent-grad-from) 0%, var(--mk-accent-grad-to) 100%)" }}>{t.startLearning}</Link>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-card border border-line bg-surface p-5 shadow-card">
              <h3 className="text-[14px] font-semibold text-ink">{t.achievements}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <span key={a.id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${a.earned ? "border border-[#E4D6B0] bg-earned-soft text-earned-strong" : "border border-dashed border-[#D9CFBE] bg-[#FBFAF7] text-ink-subtle"}`}>
                    {a.icon}
                    {a.label}
                    {!a.earned && a.toGo > 0 ? <span className="text-[10.5px] font-medium">{t.toGo(a.toGo)}</span> : null}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-ink-muted">{t.achNote}</p>
            </div>

            <div className="rounded-card border border-[#E6DECF] bg-[#F8F4ED] p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-ink-muted">
                <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                {t.share}
              </div>
              <p className="mt-1 text-[11px] text-ink-subtle">{t.shareRef}</p>
              <Link href="/invite" className="mt-3 inline-block rounded-full border border-line bg-white px-4 py-2 text-[12px] font-semibold text-ink-muted">{t.shareBtn}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
