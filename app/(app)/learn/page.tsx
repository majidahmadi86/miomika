"use client";

// /learn — the Learn surface (Curriculum milestone). Nav-linked.
// Live: Course (journey + creator + own lessons) and SPEAK — Confident
// Speaking with the SPEAKING ROOM: door → live session in /talk → results.
// Tests/Reading/Fun ship next.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Flame, ShieldCheck, Lock, Medal, Mic, Crown, Volume2, Check, ChevronLeft } from "lucide-react";
import { useGuestExploration } from "@/components/guest/GuestExplorationContext";
import { useProfile } from "@/lib/auth/use-profile";
import { detectLang, speak } from "@/lib/voice/tts";
import { sfxSuccess } from "@/lib/sound/sfx";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => ({ default: m.AmbientBackground })),
  { ssr: false },
);

type LessonLite = {
  id: string;
  title_en: string;
  status: string;
  progress: { step?: number; checkpoint?: { score: number; total: number } };
};

type CurriculumUnit = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  lesson_titles: string[];
  lesson_ids: string[];
  status: string;
};

type CurriculumCheckpoint = { badge: string; after_unit: number; kind: "checkpoint" | "level_test" };

type CurriculumRow = {
  id: string;
  cefr_level: string;
  learning_target: string;
  status: string;
  plan: { units?: CurriculumUnit[]; checkpoints?: CurriculumCheckpoint[] };
  progress: Record<string, unknown>;
};

type SpeakingScenario = {
  position: number;
  title_en: string;
  scene_en: string;
  goals: string[];
  phrases: Array<{ en: string; th: string; romanization: string | null }>;
  status: string;
};

type SpeakingCourse = {
  position: number;
  title_en: string;
  topic: string;
  color: string;
  scenario_titles: string[];
  scenarios: SpeakingScenario[];
};

type SpeakingRow = {
  id: string;
  cefr_level: string;
  learning_target: string;
  status: string;
  plan: { courses?: SpeakingCourse[] };
  progress: Record<string, unknown>;
};

type SessionLite = {
  id: string;
  title_en: string;
  status: string;
  results: { minutes?: number; objectives_done?: number[]; notes?: Array<{ kind: string; note: string }> };
  created_at: string;
  completed_at: string | null;
  course_position?: number | null;
  scenario_position?: number | null;
};

type RoomPlan = {
  scene: string;
  miomi_role: string;
  objectives: string[];
  stages: Array<{ id: string; title: string; activity: string; guidance: string }>;
  phrases: Array<{ en: string; th: string; romanization: string | null }>;
};

type RoomHandoff = {
  sessionId: string;
  title_en: string;
  level: string;
  learningTarget: string;
  register: string;
  plan: RoomPlan;
};

type SessionDetail = {
  id: string;
  status: string;
  results: {
    minutes?: number;
    objectives_done?: number[];
    notes?: Array<{ kind: string; note: string }>;
    exit_done?: boolean;
  };
  completed_at: string | null;
  library: {
    title_en: string;
    cefr_level: string;
    learning_target: string;
    register: string;
    plan: RoomPlan;
  } | null;
};

const LADDER = ["A1", "A2", "B1", "B2", "C1"] as const;
const SURFACES = ["Course", "Speak", "Tests", "Reading", "Fun"] as const;
const BUILT_SURFACES: ReadonlyArray<(typeof SURFACES)[number]> = ["Course", "Speak"];
type Surface = (typeof SURFACES)[number];

const REGISTER_OPTIONS = [
  { v: "polite", t: "Polite", minRank: 0 },
  { v: "everyday", t: "Everyday", minRank: 0 },
  { v: "casual", t: "Casual", minRank: 0 },
  { v: "genz", t: "Gen-Z", minRank: 2 },
  { v: "social", t: "Creator", minRank: 2 },
] as const;

const PRESET_TOPICS = [
  "Job interview",
  "Meeting your partner's family",
  "Business meeting",
  "Hotel check-in",
  "At the doctor",
  "Presenting my work",
] as const;

const SESSION_ARC = ["Warm-up", "Phrases", "Activity", "Practice", "Check-up", "Exit ticket"] as const;

const TOPIC_HEX: Record<string, { edge: string; soft: string }> = {
  peach: { edge: "#FDBA74", soft: "#FEF1E3" },
  pink: { edge: "#F9A8D4", soft: "#FDEAF4" },
  lavender: { edge: "#C4B5FD", soft: "#F1EEFE" },
  mint: { edge: "#A7F3D0", soft: "#EBFBF4" },
  teal: { edge: "#7DD3C0", soft: "#E9F8F4" },
  coral: { edge: "#FCA5A5", soft: "#FEEFEF" },
};
const TOPIC_DEEP: Record<string, string> = {
  peach: "#B06A28", pink: "#C2497E", lavender: "#6D5BBF",
  mint: "#3E7A66", teal: "#3E9C82", coral: "#C56A5E",
};
const INK = "#4A4136";
const INK_STRONG = "#3C352B";
const MUTED = "#9A8B73";
const BORDER = "#EDE8E0";
const CTA = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";
const CTA_SHADOW = "0 4px 16px -4px rgba(52,169,143,0.40)";
const CARD_SHADOW = "0 1px 2px rgba(74,65,54,.05), 0 8px 22px rgba(74,65,54,.06)";
const GOLD_GRAD = "linear-gradient(135deg,#E8C77A,#C9A96E)";
const SILVER_GRAD = "linear-gradient(135deg,#E3E7ED,#AAB4C0)";
const TEAL_DEEP = "#2C8576";
const font = { fontFamily: "'Quicksand', sans-serif" } as const;
const thaiFont = { fontFamily: "'Sarabun', sans-serif" } as const;

const STAT_STYLES = [
  { bg: "#F1EEFE", fg: "#6D5BBF" },
  { bg: "#FEEFEF", fg: "#C56A5E" },
  { bg: "#F7F0E2", fg: "#A8853F" },
  { bg: "#F0F2F5", fg: "#5F6B79" },
] as const;

function MedalDot({ gold }: { gold: boolean }) {
  return (
    <span style={{
      display: "inline-flex", width: 18, height: 18, borderRadius: "50%",
      background: gold ? GOLD_GRAD : SILVER_GRAD, flex: "0 0 18px",
      boxShadow: gold ? "0 2px 6px rgba(201,169,110,.4)" : "0 2px 6px rgba(150,160,175,.4)",
    }} />
  );
}

function ProChip() {
  return (
    <span style={{
      ...font, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9.5, fontWeight: 700,
      letterSpacing: ".05em", color: "#fff", background: CTA, borderRadius: 7, padding: "3px 8px",
      boxShadow: CTA_SHADOW, flex: "0 0 auto",
    }}>
      <Crown style={{ width: 10, height: 10 }} strokeWidth={2.6} aria-hidden />PRO
    </span>
  );
}

function SoundBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label="Play sound" style={{
      width: 28, height: 28, borderRadius: "50%", border: `1px solid ${BORDER}`, background: "#FFFFFF",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "0 0 28px",
    }}>
      <Volume2 style={{ width: 14, height: 14, color: "#3E9C82" }} strokeWidth={2.2} aria-hidden />
    </button>
  );
}

function ArcStrip() {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {SESSION_ARC.map((s, i) => (
        <span key={s} style={{
          ...font, display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 10.5, fontWeight: 700, color: TEAL_DEEP,
          background: "#E9F8F4", border: "1px solid #C9EEE4", borderRadius: 99, padding: "4px 10px",
        }}>
          <span style={{
            ...font, width: 14, height: 14, borderRadius: "50%", background: "#34A98F", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700,
          }}>{i + 1}</span>
          {s}
        </span>
      ))}
    </div>
  );
}

export default function LearnPage() {
  const router = useRouter();
  const { isGuest, authReady } = useGuestExploration();
  const { profile } = useProfile();
  const [myLevel, setMyLevel] = useState<string>("A1");
  const [viewLevel, setViewLevel] = useState<string | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumRow | null>(null);
  const [speaking, setSpeaking] = useState<SpeakingRow | null>(null);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [allLessons, setAllLessons] = useState<LessonLite[]>([]);
  const [lessonsById, setLessonsById] = useState<Map<string, LessonLite>>(new Map());
  const [goldCount, setGoldCount] = useState(0);
  const [silverCount, setSilverCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [surface, setSurface] = useState<Surface>("Course");
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [activeScenario, setActiveScenario] = useState<{ c: number; s: number } | null>(null);
  const [resultsSession, setResultsSession] = useState<SessionDetail | null>(null);
  const [pendingRoom, setPendingRoom] = useState<RoomHandoff | null>(null);
  const [planning, setPlanning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [speakPlanning, setSpeakPlanning] = useState(false);
  const [scenarioBuilding, setScenarioBuilding] = useState(false);
  const [roomStarting, setRoomStarting] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [speakMsg, setSpeakMsg] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [planLevel, setPlanLevel] = useState<string>("auto");
  const [planTarget, setPlanTarget] = useState<string>("auto");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [csOpen, setCsOpen] = useState(false);
  const [csTopic, setCsTopic] = useState("");
  const [csRegister, setCsRegister] = useState("everyday");

  const say = useCallback((text: string) => {
    try { void speak(text, detectLang(text)); } catch { /* audio is best-effort */ }
  }, []);

  const refresh = useCallback(async (levelAsk?: string) => {
    try {
      const q = levelAsk ? `?level=${encodeURIComponent(levelAsk)}` : "";
      const [curRes, spkRes, sesRes, lesRes] = await Promise.all([
        fetch(`/api/curriculum${q}`),
        fetch(`/api/speaking${q}`),
        fetch("/api/speaking/session"),
        fetch("/api/lessons"),
      ]);
      const curJson = (await curRes.json()) as { curriculum?: CurriculumRow | null; level?: string };
      const spkJson = (await spkRes.json()) as { speaking?: SpeakingRow | null };
      const sesJson = (await sesRes.json()) as { sessions?: SessionLite[] };
      const lesJson = (await lesRes.json()) as { lessons?: LessonLite[]; cefrLevel?: string | null };
      const lessons = Array.isArray(lesJson.lessons) ? lesJson.lessons : [];
      const map = new Map<string, LessonLite>();
      let gold = 0;
      let silver = 0;
      for (const l of lessons) {
        map.set(l.id, l);
        if (l.status !== "completed") continue;
        const cp = l.progress?.checkpoint;
        if (cp && cp.score === cp.total) gold += 1;
        else silver += 1;
      }
      setAllLessons(lessons);
      setLessonsById(map);
      setGoldCount(gold);
      setSilverCount(silver);
      if (lesJson.cefrLevel && (LADDER as readonly string[]).includes(lesJson.cefrLevel.toUpperCase())) {
        setMyLevel(lesJson.cefrLevel.toUpperCase());
      }
      setCurriculum(curJson.curriculum ?? null);
      setSpeaking(spkJson.speaking ?? null);
      setSessions(Array.isArray(sesJson.sessions) ? sesJson.sessions : []);
      if (curJson.level) setViewLevel(curJson.level);
    } catch {
      setCurriculum(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!authReady || isGuest) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state is set only after await, matching the app's existing pattern
    void refresh();
  }, [authReady, isGuest, refresh]);

  // Results view: arriving back from the Room with ?session=<id>.
  useEffect(() => {
    if (!authReady || isGuest) return;
    if (typeof window === "undefined") return;
    const m = window.location.search.match(/[?&]session=([0-9a-f-]+)/i);
    if (!m) return;
    const id = m[1]!;
    void (async () => {
      try {
        const r = await fetch(`/api/speaking/session?id=${encodeURIComponent(id)}`);
        const j = (await r.json()) as { session?: SessionDetail | null };
        if (j.session?.library) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot results load on mount, matching the app's fetch-on-mount pattern
          setResultsSession(j.session);
          setSurface("Speak");
          try { sfxSuccess(); } catch { /* best-effort */ }
        }
      } catch { /* results can be reopened from Your sessions */ }
    })();
  }, [authReady, isGuest]);

  const planJourney = useCallback(async () => {
    if (planning) return;
    setPlanning(true);
    setGenMsg("Miomi is planning your whole journey — give her a moment…");
    try {
      const r = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined }),
      });
      const j = (await r.json()) as { ok?: boolean };
      if (j.ok) {
        setGenMsg(null);
        await refresh(viewLevel ?? undefined);
      } else {
        setGenMsg("Miomi could not finish planning — try once more in a moment.");
      }
    } catch {
      setGenMsg("Something slipped — try once more.");
    } finally {
      setPlanning(false);
    }
  }, [planning, viewLevel, refresh]);

  const buildNextLesson = useCallback(async (unitPosition: number) => {
    if (building) return;
    setBuilding(true);
    setGenMsg("Miomi is planning your lesson — every word gets checked, give her a moment…");
    try {
      const r = await fetch("/api/curriculum/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined, unit_position: unitPosition }),
      });
      const j = (await r.json()) as { ok?: boolean; lessonId?: string };
      if (j.ok && j.lessonId) {
        setGenMsg(null);
        router.push(`/lessons/${j.lessonId}`);
      } else {
        setGenMsg("Miomi could not finish that one — try once more.");
      }
    } catch {
      setGenMsg("Something slipped — try once more.");
    } finally {
      setBuilding(false);
    }
  }, [building, viewLevel, router]);

  const createLesson = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setCreateMsg("Miomi is planning your lesson — every word gets checked, give her a moment…");
    try {
      const r = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          level: planLevel === "auto" ? undefined : planLevel,
          target: planTarget === "auto" ? undefined : planTarget,
        }),
      });
      const j = (await r.json()) as { ok?: boolean };
      if (j.ok) {
        setCreateMsg(null);
        setTopic("");
        setAskOpen(false);
        await refresh(viewLevel ?? undefined);
      } else {
        setCreateMsg("Miomi could not finish planning that one — try once more, or a different topic.");
      }
    } catch {
      setCreateMsg("Something slipped — try once more.");
    } finally {
      setCreating(false);
    }
  }, [creating, topic, planLevel, planTarget, viewLevel, refresh]);

  const planSpeaking = useCallback(async () => {
    if (speakPlanning) return;
    setSpeakPlanning(true);
    setSpeakMsg("Miomi is planning your speaking path — give her a moment…");
    try {
      const r = await fetch("/api/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined }),
      });
      const j = (await r.json()) as { ok?: boolean };
      if (j.ok) {
        setSpeakMsg(null);
        await refresh(viewLevel ?? undefined);
      } else {
        setSpeakMsg("Miomi could not finish planning — try once more in a moment.");
      }
    } catch {
      setSpeakMsg("Something slipped — try once more.");
    } finally {
      setSpeakPlanning(false);
    }
  }, [speakPlanning, viewLevel, refresh]);

  const buildScenario = useCallback(async (coursePos: number, scenarioPos: number) => {
    if (scenarioBuilding) return;
    setScenarioBuilding(true);
    setSpeakMsg("Miomi is setting the scene — every phrase gets checked, give her a moment…");
    try {
      const r = await fetch("/api/speaking/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: viewLevel ?? undefined, course_position: coursePos, scenario_position: scenarioPos }),
      });
      const j = (await r.json()) as { ok?: boolean; reason?: string };
      if (j.ok) {
        setSpeakMsg(null);
        await refresh(viewLevel ?? undefined);
        setActiveScenario({ c: coursePos, s: scenarioPos });
      } else if (j.reason === "pro_required") {
        setSpeakMsg("This scene unlocks with Pro — the first session of every course is yours free~");
      } else {
        setSpeakMsg("Miomi could not set that scene — try once more.");
      }
    } catch {
      setSpeakMsg("Something slipped — try once more.");
    } finally {
      setScenarioBuilding(false);
    }
  }, [scenarioBuilding, viewLevel, refresh]);

  // Write the handoff and walk into the Room.
  const walkIn = useCallback((handoff: RoomHandoff): boolean => {
    try {
      window.sessionStorage.setItem("miomika.room_session", JSON.stringify(handoff));
    } catch {
      setSpeakMsg("Your browser blocked the room key — try once more.");
      return false;
    }
    window.location.href = "/talk?room=1";
    return true;
  }, []);

  // Create (or bank-fetch) the session. Scenario doors enter directly;
  // custom (ESP) sessions show their door first so the plan is visible.
  const enterRoom = useCallback(async (args: { coursePos?: number; scenarioPos?: number; topic?: string; register?: string; showDoor?: boolean }) => {
    if (roomStarting) return;
    setRoomStarting(true);
    setSpeakMsg(args.showDoor ? "Miomi is planning your session — give her a moment…" : "Miomi is preparing your private room — give her a moment…");
    try {
      const r = await fetch("/api/speaking/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: viewLevel ?? undefined,
          course_position: args.coursePos,
          scenario_position: args.scenarioPos,
          topic: args.topic,
          register: args.register,
        }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        reason?: string;
        sessionId?: string;
        title_en?: string;
        level?: string;
        learningTarget?: string;
        register?: string;
        plan?: RoomPlan;
      };
      if (j.ok && j.sessionId && j.plan) {
        const handoff: RoomHandoff = {
          sessionId: j.sessionId,
          title_en: j.title_en ?? "Speaking session",
          level: j.level ?? (viewLevel ?? myLevel),
          learningTarget: j.learningTarget ?? (profile?.learning_target_language ?? "th"),
          register: j.register ?? "everyday",
          plan: j.plan,
        };
        setSpeakMsg(null);
        if (args.showDoor) {
          setPendingRoom(handoff);
        } else {
          walkIn(handoff);
          return;
        }
      } else if (j.reason === "pro_required") {
        setSpeakMsg("Sessions beyond the first of each course are Pro — your free room is session one~");
      } else {
        setSpeakMsg("Miomi could not prepare the room — try once more.");
      }
    } catch {
      setSpeakMsg("Something slipped — try once more.");
    } finally {
      setRoomStarting(false);
    }
  }, [roomStarting, viewLevel, myLevel, profile, walkIn]);

  // Re-enter an unfinished session from its saved plan.
  const continueSession = useCallback(async (id: string) => {
    if (roomStarting) return;
    setRoomStarting(true);
    setSpeakMsg("Opening your room again — one moment…");
    try {
      const r = await fetch(`/api/speaking/session?id=${encodeURIComponent(id)}`);
      const j = (await r.json()) as { session?: SessionDetail | null };
      const lib = j.session?.library;
      if (j.session && lib) {
        setSpeakMsg(null);
        walkIn({
          sessionId: j.session.id,
          title_en: lib.title_en,
          level: lib.cefr_level,
          learningTarget: lib.learning_target,
          register: lib.register,
          plan: lib.plan,
        });
        return;
      }
      setSpeakMsg("Could not reopen that session — try once more.");
    } catch {
      setSpeakMsg("Something slipped — try once more.");
    } finally {
      setRoomStarting(false);
    }
  }, [roomStarting, walkIn]);

  const myRank = Math.max(0, (LADDER as readonly string[]).indexOf(myLevel));
  const targetName = profile?.learning_target_language === "en" ? "English" : "Thai";
  const targetIsEn = profile?.learning_target_language === "en";
  const isPro = profile?.tier === "pro" || profile?.tier === "pro_max";
  const units = Array.isArray(curriculum?.plan?.units) ? curriculum.plan.units : [];
  const checkpoints = Array.isArray(curriculum?.plan?.checkpoints) ? curriculum.plan.checkpoints : [];
  const courses = Array.isArray(speaking?.plan?.courses) ? speaking.plan.courses : [];
  // Scene completion now derives from REAL completed sessions.
  const completedScenes = new Set(
    sessions
      .filter((s) => s.completed_at && s.course_position && s.scenario_position)
      .map((s) => `${s.course_position}-${s.scenario_position}`),
  );
  const scenesDone = completedScenes.size;
  const scenesTotal = courses.reduce((n, c) => n + (c.scenario_titles?.length ?? 0), 0);
  const unfinished = sessions.find((s) => !s.completed_at) ?? null;

  const unitLessons = useCallback((u: CurriculumUnit): LessonLite[] =>
    (u.lesson_ids ?? []).map((id) => lessonsById.get(id)).filter(Boolean) as LessonLite[],
  [lessonsById]);
  const unitComplete = useCallback((u: CurriculumUnit): boolean => {
    const built = unitLessons(u);
    return (u.lesson_ids ?? []).length >= 4 && built.length >= 4 && built.every((l) => l.status === "completed");
  }, [unitLessons]);
  const unitAllGold = useCallback((u: CurriculumUnit): boolean =>
    unitLessons(u).every((l) => {
      const cp = l.progress?.checkpoint;
      return !!cp && cp.score === cp.total;
    }),
  [unitLessons]);
  const firstOpen = units.find((u) => !unitComplete(u))?.position ?? (units.length ? units.length + 1 : 0);
  const openUnit = expandedUnit ?? firstOpen;
  const journeyIds = new Set(units.flatMap((u) => u.lesson_ids ?? []));
  const ownLessons = allLessons.filter((l) => !journeyIds.has(l.id));

  const stats = [
    { n: myLevel, l: "Level", icon: ShieldCheck },
    { n: String(profile?.streak ?? 0), l: "Day streak", icon: Flame },
    { n: String(goldCount), l: "Gold", icon: Medal },
    { n: String(silverCount), l: "Silver", icon: Medal },
  ];

  const shownSurfaces = SURFACES.filter((s) => (BUILT_SURFACES as readonly string[]).includes(s));

  const activeCourse = activeScenario ? courses.find((c) => c.position === activeScenario.c) ?? null : null;
  const activeScene = activeCourse && activeScenario
    ? activeCourse.scenarios?.find((s) => s.position === activeScenario.s) ?? null
    : null;

  const closeResults = useCallback(() => {
    setResultsSession(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/learn");
    }
    void refresh(viewLevel ?? undefined);
  }, [refresh, viewLevel]);

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden", background: "#FAFAF6" }}>
      <AmbientBackground mode="ambient" />
      <div style={{ position: "relative", zIndex: 1, height: "100%", overflowY: "auto", padding: "22px 18px 96px" }}>

        {/* Level rail */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LADDER.map((lv, i) => {
            const done = i < myRank;
            const isView = (viewLevel ?? myLevel) === lv;
            const open = i <= myRank + 1;
            return (
              <button key={lv} onClick={() => { if (!open) return; setViewLevel(lv); setExpandedUnit(null); setExpandedCourse(null); setActiveScenario(null); setPendingRoom(null); void refresh(lv); }} style={{
                ...font, display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 12.5, fontWeight: 700, padding: "6px 12px", borderRadius: 99,
                border: isView ? "1px solid transparent" : `1px solid ${done ? "#E8C77A" : BORDER}`,
                background: isView ? CTA : "#FFFFFF",
                color: isView ? "#fff" : done ? "#A8853F" : open ? INK_STRONG : MUTED,
                opacity: open ? 1 : 0.45, cursor: open ? "pointer" : "default",
              }}>
                {lv}
                {!open ? <Lock style={{ width: 10, height: 10 }} aria-hidden /> : null}
              </button>
            );
          })}
        </div>

        {/* Header card */}
        <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "14px 15px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 46, height: 46, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 46px", overflow: "hidden" }}>
              <Image src="/miomi/head-happy.png" alt="Miomi" width={40} height={40} style={{ objectFit: "contain" }} />
            </span>
            <div>
              <h1 style={{ ...font, fontSize: 17, fontWeight: 700, color: INK_STRONG, margin: 0, lineHeight: 1.2 }}>
                Your {targetName} path
              </h1>
              <p style={{ ...font, fontSize: 12, fontWeight: 600, color: MUTED, margin: "2px 0 0" }}>
                Planned by Miomi — she walks every step with you~
              </p>
            </div>
          </div>
          {authReady && !isGuest ? (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {stats.map((s, i) => {
                const st = STAT_STYLES[i]!;
                const Icon = s.icon;
                return (
                  <div key={s.l} style={{ flex: 1, background: st.bg, borderRadius: 12, padding: "9px 4px", textAlign: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <Icon style={{ width: 13, height: 13, color: st.fg }} strokeWidth={2.4} aria-hidden />
                      <b style={{ ...font, fontSize: 15, color: st.fg }}>{s.n}</b>
                    </span>
                    <span style={{ ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: st.fg, opacity: 0.75, display: "block", marginTop: 2 }}>{s.l}</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* CONFIDENT SPEAKING — flagship */}
        {authReady && !isGuest ? (
          <button onClick={() => { setSurface("Speak"); setActiveScenario(null); setResultsSession(null); setPendingRoom(null); }} style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
            background: "linear-gradient(135deg,#34A98F 0%,#1F7A68 100%)", border: "none", borderRadius: 18,
            padding: "14px 15px", marginBottom: 12, cursor: "pointer",
            boxShadow: "0 8px 20px -6px rgba(31,122,104,0.45)",
          }}>
            <span style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 40px" }}>
              <Mic style={{ width: 19, height: 19, color: "#fff" }} strokeWidth={2.2} aria-hidden />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...font, display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: "rgba(255,255,255,.92)" }}>
                Confident Speaking
                <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", borderRadius: 6, padding: "2px 6px" }}>
                  <Crown style={{ width: 9, height: 9 }} strokeWidth={2.6} aria-hidden />PRO
                </span>
              </span>
              <span style={{ ...font, display: "block", fontSize: 14.5, fontWeight: 700, color: "#fff", marginTop: 2 }}>
                {courses.length ? `${scenesDone} of ${scenesTotal} sessions spoken` : "Your private speaking room with Miomi"}
              </span>
              <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: "rgba(255,255,255,.85)", marginTop: 1 }}>
                The first session of every course is free~
              </span>
            </span>
          </button>
        ) : null}

        {/* Surface bar */}
        {shownSurfaces.length > 1 ? (
          <div style={{ display: "flex", background: "#F1ECE3", borderRadius: 14, padding: 4, gap: 4, marginBottom: 16 }}>
            {shownSurfaces.map((s) => (
              <button key={s} onClick={() => { setSurface(s); setActiveScenario(null); setResultsSession(null); setPendingRoom(null); }} style={{
                ...font, flex: 1, fontSize: 12, fontWeight: 700, padding: "8px 0",
                borderRadius: 10, border: "none", cursor: "pointer",
                background: surface === s ? "#FFFFFF" : "transparent",
                color: surface === s ? INK_STRONG : MUTED,
                boxShadow: surface === s ? "0 2px 6px rgba(74,65,54,.08)" : "none",
              }}>{s}</button>
            ))}
          </div>
        ) : null}

        {!authReady || (!isGuest && !loaded) ? (
          <p style={{ ...font, fontSize: 13, color: MUTED }}>Loading…</p>
        ) : isGuest ? (
          <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 22, textAlign: "center" }}>
            <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
              Your learning path lives in your Miomika account
            </p>
            <p style={{ ...font, fontSize: 12.5, color: MUTED, margin: "8px 0 16px", lineHeight: 1.5 }}>
              Sign up free and Miomi plans your whole journey — level by level, yours.
            </p>
            <Link href="/signup" style={{
              ...font, display: "inline-block", fontSize: 14, fontWeight: 700,
              padding: "12px 26px", borderRadius: 99, background: CTA, color: "#fff",
              textDecoration: "none", boxShadow: CTA_SHADOW,
            }}>
              Sign up free
            </Link>
          </div>
        ) : surface === "Speak" ? (
          resultsSession && resultsSession.library ? (
            /* ---------- RESULTS / EXIT TICKET ---------- */
            <>
              <div style={{ textAlign: "center", padding: "2px 0 14px" }}>
                <span style={{ width: 68, height: 68, borderRadius: "50%", background: "#FDEAF4", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <Image src="/miomi/companion-celebration.png" alt="Miomi celebrating" width={60} height={60} style={{ objectFit: "contain" }} />
                </span>
                <h2 style={{ ...font, fontSize: 18, fontWeight: 700, color: INK_STRONG, margin: "10px 0 0", lineHeight: 1.25 }}>
                  Session complete{typeof resultsSession.results?.minutes === "number" && resultsSession.results.minutes > 0 ? ` — you spoke for ${resultsSession.results.minutes} minute${resultsSession.results.minutes === 1 ? "" : "s"}.` : "~"}
                </h2>
                <p style={{ ...font, fontSize: 12, fontWeight: 600, color: MUTED, margin: "4px 0 0" }}>
                  {resultsSession.library.title_en} · {resultsSession.library.cefr_level} · {(resultsSession.results?.objectives_done ?? []).length} of {resultsSession.library.plan.objectives.length} objectives earned
                </p>
              </div>

              <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 11 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 7px" }}>Objectives</p>
                {resultsSession.library.plan.objectives.map((o, oi) => {
                  const earned = (resultsSession.results?.objectives_done ?? []).includes(oi);
                  return (
                    <div key={oi} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: oi < resultsSession.library!.plan.objectives.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: "50%", flex: "0 0 20px",
                        border: earned ? "2px solid transparent" : `2px solid ${BORDER}`,
                        background: earned ? CTA : "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {earned ? <Check style={{ width: 11, height: 11, color: "#fff" }} strokeWidth={3} aria-hidden /> : null}
                      </span>
                      <span style={{ ...font, fontSize: 12.5, fontWeight: 700, color: earned ? TEAL_DEEP : MUTED }}>{o}</span>
                    </div>
                  );
                })}
              </div>

              {(resultsSession.results?.notes ?? []).length ? (
                <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 11 }}>
                  <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 7px" }}>{`Miomi's notes — your tutor's honest read`}</p>
                  {(resultsSession.results?.notes ?? []).map((n, ni) => (
                    <div key={ni} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "6px 0", borderBottom: ni < (resultsSession.results?.notes ?? []).length - 1 ? `1px solid ${BORDER}` : "none" }}>
                      <span style={{
                        ...font, fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase",
                        borderRadius: 6, padding: "3px 7px", flex: "0 0 auto", marginTop: 1,
                        background: n.kind === "grow" ? "#FEF1E3" : "#E9F8F4",
                        color: n.kind === "grow" ? "#B06A28" : TEAL_DEEP,
                      }}>{n.kind === "grow" ? "Grow" : "Glow"}</span>
                      <p style={{ ...font, fontSize: 12.5, fontWeight: 600, lineHeight: 1.5, color: INK, margin: 0 }}>{n.note}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ background: "#FFFFFF", border: "1px solid #C4B5FD", borderRadius: 18, padding: "13px 14px", marginBottom: 11 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#6D5BBF", margin: "0 0 6px" }}>Phrases from your session</p>
                {resultsSession.library.plan.phrases.map((p, pi) => (
                  <div key={pi} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: pi < resultsSession.library!.plan.phrases.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <SoundBtn onClick={() => say(targetIsEn ? p.en : p.th)} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...(targetIsEn ? font : thaiFont), display: "block", fontSize: 14, fontWeight: 700, color: INK_STRONG }}>{targetIsEn ? p.en : p.th}</span>
                      {!targetIsEn && p.romanization ? (
                        <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: "#6D5BBF", marginTop: 1 }}>{p.romanization}</span>
                      ) : null}
                      <span style={{ ...(targetIsEn ? thaiFont : font), display: "block", fontSize: 12, fontWeight: 600, color: MUTED, marginTop: 1 }}>{targetIsEn ? p.th : p.en}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#FFFFFF", border: "1px solid #C9A96E", borderRadius: 16, padding: "10px 13px", marginBottom: 11 }}>
                <p style={{ ...font, fontSize: 11, fontWeight: 600, color: INK, lineHeight: 1.45, margin: 0 }}>
                  <b>Share this session</b> — your friend gets their first room free, you earn 30฿
                </p>
                <button onClick={() => { try { void navigator.share?.({ title: "Miomika", text: `I just finished a Confident Speaking session with Miomi~ ${resultsSession.library?.title_en ?? ""}`, url: "https://miomika.com" }); } catch { /* share sheet optional */ } }} style={{
                  ...font, display: "inline-flex", alignItems: "center", gap: 5, border: "1.5px solid #34A98F", background: "#FFFFFF",
                  color: TEAL_DEEP, borderRadius: 99, padding: "7px 13px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                }}>Share</button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={closeResults} style={{
                  ...font, flex: 1, textAlign: "center", fontSize: 12.5, fontWeight: 700, padding: "12px 0",
                  borderRadius: 99, border: `1.5px solid #34A98F`, background: "#FFFFFF", color: TEAL_DEEP, cursor: "pointer",
                }}>Back to Speak</button>
              </div>
              <p style={{ ...font, fontSize: 10.5, fontWeight: 600, color: MUTED, textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                {`Notes are Miomi's coaching read — sound grading is coming in an update~`}
              </p>
            </>
          ) : pendingRoom ? (
            /* ---------- CUSTOM SESSION DOOR (plan preview) ---------- */
            <>
              <button onClick={() => setPendingRoom(null)} style={{
                ...font, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                color: MUTED, background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} aria-hidden />Back
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h2 style={{ ...font, fontSize: 17, fontWeight: 700, color: INK_STRONG, margin: 0 }}>{pendingRoom.title_en}</h2>
                <ProChip />
              </div>
              <div style={{ background: "#FEF1E3", border: "1px solid #F4D9BC", borderRadius: 18, padding: "13px 14px", marginBottom: 12 }}>
                <p style={{ ...font, fontSize: 12.5, fontWeight: 600, color: "#7A4F26", margin: 0, lineHeight: 1.55 }}>
                  <b style={{ fontWeight: 700 }}>The scene:</b> {pendingRoom.plan.scene} <b style={{ fontWeight: 700 }}>Just you and Miomi — no one else hears a thing~</b>
                </p>
              </div>
              <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 12 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 8px" }}>
                  {`What you'll walk out with — Miomi checks each as you earn it`}
                </p>
                {pendingRoom.plan.objectives.map((g, gi) => (
                  <div key={gi} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: gi < pendingRoom.plan.objectives.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #7DD3C0", flex: "0 0 18px" }} />
                    <span style={{ ...font, fontSize: 13, fontWeight: 700, color: INK_STRONG }}>{g}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 14 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 8px" }}>
                  {`How you'll learn — Miomi leads every stage`}
                </p>
                {pendingRoom.plan.stages.map((st, si) => (
                  <div key={st.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", borderBottom: si < pendingRoom.plan.stages.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <span style={{
                      ...font, width: 20, height: 20, borderRadius: "50%", background: "#E9F8F4", color: TEAL_DEEP,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flex: "0 0 20px", marginTop: 1,
                    }}>{si + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG }}>{st.title}</span>
                      <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.45 }}>{st.activity}</span>
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => walkIn(pendingRoom)} disabled={roomStarting} style={{
                ...font, display: "block", width: "100%", textAlign: "center", fontSize: 14, fontWeight: 700,
                padding: "14px 20px", borderRadius: 99, border: "none", cursor: "pointer",
                background: CTA, color: "#fff", boxShadow: CTA_SHADOW,
              }}>
                Enter your room
              </button>
              <p style={{ ...font, fontSize: 11, fontWeight: 600, color: MUTED, textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                A full guided session — warm-up to exit ticket, ~15 minutes. Uses your speaking minutes.
              </p>
            </>
          ) : activeScene && activeCourse && activeScenario ? (
            /* ---------- SCENARIO DOOR ---------- */
            <>
              <button onClick={() => setActiveScenario(null)} style={{
                ...font, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700,
                color: MUTED, background: "transparent", border: "none", cursor: "pointer", padding: 0, marginBottom: 10,
              }}>
                <ChevronLeft style={{ width: 14, height: 14 }} aria-hidden />{activeCourse.title_en}
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <h2 style={{ ...font, fontSize: 17, fontWeight: 700, color: INK_STRONG, margin: 0 }}>{activeScene.title_en}</h2>
                {activeScenario.s === 1 ? (
                  <span style={{ ...font, fontSize: 9.5, fontWeight: 700, letterSpacing: ".05em", color: "#3E7A66", background: "#EBFBF4", borderRadius: 7, padding: "3px 8px", flex: "0 0 auto" }}>FREE SESSION</span>
                ) : <ProChip />}
              </div>
              <div style={{ background: "#FEF1E3", border: "1px solid #F4D9BC", borderRadius: 18, padding: "13px 14px", marginBottom: 12 }}>
                <p style={{ ...font, fontSize: 12.5, fontWeight: 600, color: "#7A4F26", margin: 0, lineHeight: 1.55 }}>
                  <b style={{ fontWeight: 700 }}>The scene:</b> {activeScene.scene_en} <b style={{ fontWeight: 700 }}>Just you and Miomi — no one else hears a thing~</b>
                </p>
              </div>
              <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 12 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 8px" }}>
                  {`What you'll walk out with — Miomi checks each as you earn it`}
                </p>
                {activeScene.goals.map((g, gi) => (
                  <div key={gi} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: gi < activeScene.goals.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #7DD3C0", flex: "0 0 18px" }} />
                    <span style={{ ...font, fontSize: 13, fontWeight: 700, color: INK_STRONG }}>{g}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: "13px 14px", marginBottom: 14 }}>
                <p style={{ ...font, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, margin: "0 0 9px" }}>
                  {`How you'll learn — a full session, Miomi leading`}
                </p>
                <ArcStrip />
                <p style={{ ...font, fontSize: 11, fontWeight: 600, color: MUTED, margin: "9px 0 0", lineHeight: 1.5 }}>
                  Helper phrases wait on your hint drawer inside — one tap whenever you need them~
                </p>
              </div>
              <button onClick={() => void enterRoom({ coursePos: activeScenario.c, scenarioPos: activeScenario.s })} disabled={roomStarting} style={{
                ...font, display: "block", width: "100%", textAlign: "center", fontSize: 14, fontWeight: 700,
                padding: "14px 20px", borderRadius: 99, border: "none", cursor: roomStarting ? "default" : "pointer",
                background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: roomStarting ? 0.7 : 1,
              }}>
                {roomStarting ? "Preparing your room…" : "Enter your room"}
              </button>
              <p style={{ ...font, fontSize: 11, fontWeight: 600, color: MUTED, textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
                A full guided session — warm-up to exit ticket, ~15 minutes. Uses your speaking minutes.
              </p>
              {speakMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "8px 0 0", textAlign: "center" }}>{speakMsg}</p> : null}
            </>
          ) : !speaking || !courses.length ? (
            /* ---------- SPEAK EMPTY STATE ---------- */
            <div style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW, padding: 22, textAlign: "center" }}>
              <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
                Speak {targetName} from day one
              </p>
              <p style={{ ...font, fontSize: 12, color: MUTED, margin: "6px 0 14px", lineHeight: 1.5 }}>
                Private guided sessions — Miomi plays the other side, you do the talking. 4 courses, 16 sessions, planned for {viewLevel ?? myLevel}.
              </p>
              <button onClick={() => void planSpeaking()} disabled={speakPlanning} style={{
                ...font, fontSize: 14, fontWeight: 700, padding: "13px 26px", borderRadius: 99,
                border: "none", cursor: speakPlanning ? "default" : "pointer",
                background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: speakPlanning ? 0.7 : 1,
              }}>
                {speakPlanning ? "Miomi is planning…" : "Plan my speaking path"}
              </button>
              {speakMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "10px 0 0" }}>{speakMsg}</p> : null}
            </div>
          ) : (
            /* ---------- COURSE LIST + ESP + YOUR SESSIONS ---------- */
            <>
              <p style={{ ...font, fontSize: 12.5, fontWeight: 600, color: MUTED, margin: "0 2px 12px", lineHeight: 1.55 }}>
                <b style={{ color: INK_STRONG }}>Your private speaking room.</b> Warm-up to exit ticket, Miomi leading every step — the first session of every course is free~
              </p>

              {/* Continue banner — an unfinished room is one tap away */}
              {unfinished ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF", border: "1.5px solid #7DD3C0", borderRadius: 18, boxShadow: CARD_SHADOW, padding: "12px 14px", marginBottom: 12 }}>
                  <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px", overflow: "hidden" }}>
                    <Image src="/miomi/head-idle.png" alt="Miomi" width={30} height={30} style={{ objectFit: "contain" }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...font, display: "block", fontSize: 13, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {unfinished.title_en || "Your session"} is waiting~
                    </span>
                    <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>Pick up right where you left off</span>
                  </span>
                  <button onClick={() => void continueSession(unfinished.id)} disabled={roomStarting} style={{
                    ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                    border: "none", cursor: "pointer", background: CTA, color: "#fff", boxShadow: CTA_SHADOW, flexShrink: 0,
                  }}>
                    Continue
                  </button>
                </div>
              ) : null}

              {/* ESP — create your own session */}
              <div style={{
                border: "1.5px dashed #D9EBE4", borderRadius: 18, padding: csOpen ? 16 : 0,
                background: "linear-gradient(135deg,#E9F8F4,#F1EEFE)", marginBottom: 12, overflow: "hidden",
              }}>
                {!csOpen ? (
                  <button onClick={() => setCsOpen(true)} style={{
                    display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "13px 14px",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                  }}>
                    <span style={{ width: 34, height: 34, borderRadius: 11, background: CTA, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px", boxShadow: CTA_SHADOW }}>
                      <Mic style={{ width: 16, height: 16 }} strokeWidth={2.2} aria-hidden />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG }}>Create your own session</span>
                      <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
                        Interview prep, business meetings, anything — your topic, your style~
                      </span>
                    </span>
                    <ProChip />
                  </button>
                ) : (
                  <div>
                    <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, margin: 0, textAlign: "center" }}>
                      What do you want to speak about?
                    </p>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                      {PRESET_TOPICS.map((t) => (
                        <button key={t} onClick={() => setCsTopic(t)} disabled={roomStarting} style={{
                          ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99, cursor: "pointer",
                          border: `1px solid ${csTopic === t ? "#F9A8D4" : BORDER}`,
                          background: csTopic === t ? "#FDEAF4" : "#FFFFFF",
                          color: csTopic === t ? "#C2497E" : MUTED,
                        }}>{t}</button>
                      ))}
                    </div>
                    <input
                      value={csTopic}
                      onChange={(e) => setCsTopic(e.target.value)}
                      placeholder="…or type your own"
                      disabled={roomStarting}
                      style={{
                        ...font, width: "100%", fontSize: 13.5, padding: "11px 14px", marginTop: 12,
                        borderRadius: 12, border: `1px solid ${BORDER}`, color: INK,
                        background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                      {REGISTER_OPTIONS.map((o) => {
                        const locked = myRank < o.minRank;
                        return (
                          <button key={o.v} onClick={() => !locked && setCsRegister(o.v)} disabled={roomStarting || locked}
                            title={locked ? "Unlocks from B1" : undefined}
                            style={{
                              ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99,
                              cursor: locked ? "default" : "pointer", opacity: locked ? 0.4 : 1,
                              border: `1px solid ${csRegister === o.v ? "#7DD3C0" : BORDER}`,
                              background: csRegister === o.v ? "#E9F8F4" : "#FFFFFF",
                              color: csRegister === o.v ? "#3E9C82" : MUTED,
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}>
                            {locked ? <Lock style={{ width: 10, height: 10 }} aria-hidden /> : null}
                            {o.t}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => { if (csTopic.trim()) void enterRoom({ topic: csTopic.trim(), register: csRegister, showDoor: true }); }} disabled={roomStarting || !csTopic.trim()} style={{
                      ...font, width: "100%", marginTop: 10, fontSize: 14, fontWeight: 700,
                      padding: "13px 20px", borderRadius: 99, border: "none",
                      cursor: roomStarting || !csTopic.trim() ? "default" : "pointer",
                      background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: roomStarting || !csTopic.trim() ? 0.7 : 1,
                    }}>
                      {roomStarting ? "Miomi is planning…" : "Plan my session"}
                    </button>
                    <button onClick={() => { if (!roomStarting) setCsOpen(false); }} style={{
                      ...font, width: "100%", marginTop: 6, fontSize: 12, fontWeight: 700, padding: "8px 0",
                      borderRadius: 99, border: "none", cursor: "pointer", background: "transparent", color: MUTED,
                    }}>
                      Close
                    </button>
                  </div>
                )}
              </div>

              {courses.map((c) => {
                const tc = TOPIC_HEX[c.color] ?? TOPIC_HEX.peach;
                const deep = TOPIC_DEEP[c.color] ?? TOPIC_DEEP.peach;
                const isOpen = expandedCourse === c.position;
                const courseDone = (c.scenario_titles ?? []).filter((_, si) => completedScenes.has(`${c.position}-${si + 1}`)).length;
                return (
                  <div key={c.position} style={{
                    background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18,
                    boxShadow: CARD_SHADOW, overflow: "hidden", position: "relative", marginBottom: 10,
                  }}>
                    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: tc.edge }} />
                    <button onClick={() => setExpandedCourse(isOpen ? null : c.position)} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 13px 12px 16px",
                      background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    }}>
                      <span style={{
                        width: 34, height: 34, borderRadius: 11, background: tc.soft, color: deep,
                        display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px",
                      }}>
                        <Mic style={{ width: 16, height: 16 }} strokeWidth={2.2} aria-hidden />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title_en}</span>
                        <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>
                          {courseDone} of {c.scenario_titles?.length ?? 4} sessions spoken
                        </span>
                      </span>
                      {!isPro ? <ProChip /> : null}
                    </button>
                    {isOpen ? (
                      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "4px 13px 12px 16px" }}>
                        {(c.scenario_titles ?? []).map((title, si) => {
                          const pos = si + 1;
                          const built = (c.scenarios ?? []).find((s) => s.position === pos);
                          const isDone = completedScenes.has(`${c.position}-${pos}`);
                          const isNextBuild = !built && pos === (c.scenarios ?? []).length + 1;
                          const needsPro = pos > 1 && !isPro;
                          return (
                            <div key={si} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: si < 3 ? `1px solid ${BORDER}` : "none", opacity: built || isNextBuild ? 1 : 0.5 }}>
                              <span style={{
                                width: 18, height: 18, borderRadius: "50%", flex: "0 0 18px",
                                border: isDone ? "2px solid transparent" : `2px solid ${built || isNextBuild ? "#7DD3C0" : BORDER}`,
                                background: isDone ? CTA : "#FFFFFF",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {isDone ? <Check style={{ width: 10, height: 10, color: "#fff" }} strokeWidth={3} aria-hidden /> : null}
                              </span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                                <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                                  {isDone ? "Completed" : built ? "Ready" : pos === 1 ? "Free session" : needsPro ? "Unlocks with Pro" : "Up next"}
                                </span>
                              </span>
                              {built ? (
                                <button onClick={() => setActiveScenario({ c: c.position, s: pos })} style={{
                                  ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                                  border: isDone ? `1px solid ${BORDER}` : "none", cursor: "pointer",
                                  color: isDone ? MUTED : "#fff", background: isDone ? "transparent" : CTA,
                                  boxShadow: isDone ? "none" : CTA_SHADOW,
                                }}>
                                  {isDone ? "Again" : "Open"}
                                </button>
                              ) : isNextBuild && !needsPro ? (
                                <button onClick={() => void buildScenario(c.position, pos)} disabled={scenarioBuilding} style={{
                                  ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                                  border: "none", cursor: scenarioBuilding ? "default" : "pointer",
                                  background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: scenarioBuilding ? 0.7 : 1,
                                }}>
                                  {scenarioBuilding ? "Setting up…" : "Start"}
                                </button>
                              ) : needsPro ? (
                                <Crown style={{ width: 15, height: 15, color: "#C9A96E", flex: "0 0 15px" }} strokeWidth={2.2} aria-hidden />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {sessions.length ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 2px 10px" }}>
                    <h2 style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>Your sessions</h2>
                    <span style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED }}>{sessions.length}</span>
                  </div>
                  {sessions.map((s) => (
                    <div key={s.id} style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW,
                      padding: "12px 14px", marginBottom: 10,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", flex: "0 0 18px",
                        border: s.completed_at ? "2px solid transparent" : `2px solid ${BORDER}`,
                        background: s.completed_at ? CTA : "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {s.completed_at ? <Check style={{ width: 10, height: 10, color: "#fff" }} strokeWidth={3} aria-hidden /> : null}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ ...font, display: "block", fontSize: 13, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title_en || "Speaking session"}</span>
                        <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                          {s.completed_at ? `Completed${typeof s.results?.minutes === "number" && s.results.minutes > 0 ? ` · ${s.results.minutes} min spoken` : ""}` : "Not finished"}
                        </span>
                      </span>
                      {s.completed_at ? (
                        <button onClick={() => { window.history.replaceState(null, "", `/learn?session=${s.id}`); void (async () => { try { const r = await fetch(`/api/speaking/session?id=${encodeURIComponent(s.id)}`); const j = (await r.json()) as { session?: SessionDetail | null }; if (j.session?.library) setResultsSession(j.session); } catch { /* row stays */ } })(); }} style={{
                          ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                          border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, cursor: "pointer", flexShrink: 0,
                        }}>
                          Review
                        </button>
                      ) : (
                        <button onClick={() => void continueSession(s.id)} disabled={roomStarting} style={{
                          ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                          border: "none", background: CTA, color: "#fff", boxShadow: CTA_SHADOW, cursor: "pointer", flexShrink: 0,
                        }}>
                          Continue
                        </button>
                      )}
                    </div>
                  ))}
                </>
              ) : null}
              {speakMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "4px 0 0", textAlign: "center" }}>{speakMsg}</p> : null}
            </>
          )

        ) : (
          <>
            {/* Create your own lesson */}
            <div style={{
              border: "1.5px dashed #D9EBE4", borderRadius: 18, padding: askOpen ? 16 : 0,
              background: "linear-gradient(135deg,#E9F8F4,#F1EEFE)", marginBottom: 14, overflow: "hidden",
            }}>
              {!askOpen ? (
                <button onClick={() => setAskOpen(true)} style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "13px 14px",
                  background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{
                    ...font, width: 34, height: 34, borderRadius: 11, background: CTA, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 19, fontWeight: 700, flex: "0 0 34px", boxShadow: CTA_SHADOW,
                  }}>+</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG }}>Create your own lesson</span>
                    <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
                      Any topic, your level — tell Miomi and she plans it just for you~
                    </span>
                  </span>
                </button>
              ) : (
                <div>
                  <p style={{ ...font, fontSize: 14, fontWeight: 700, color: INK_STRONG, margin: 0, textAlign: "center" }}>
                    Ask Miomi for a lesson on anything
                  </p>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (optional) — e.g. taxis, feelings, past tense"
                    disabled={creating}
                    style={{
                      ...font, width: "100%", fontSize: 13.5, padding: "11px 14px", marginTop: 12,
                      borderRadius: 12, border: `1px solid ${BORDER}`, color: INK,
                      background: "#FFFFFF", outline: "none", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                    {["auto", "A1", "A2", "B1", "B2", "C1"].map((lv) => {
                      const locked = lv !== "auto" && (LADDER as readonly string[]).indexOf(lv) > Math.min(myRank + 1, LADDER.length - 1);
                      return (
                        <button key={lv} onClick={() => !locked && setPlanLevel(lv)} disabled={creating || locked}
                          title={locked ? "Unlocks as your level grows" : undefined}
                          style={{
                            ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99,
                            cursor: locked ? "default" : "pointer", opacity: locked ? 0.4 : 1,
                            border: `1px solid ${planLevel === lv ? "#C4B5FD" : BORDER}`,
                            background: planLevel === lv ? "#F1EEFE" : "#FFFFFF",
                            color: planLevel === lv ? "#6D5BBF" : MUTED,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                          {locked ? <Lock style={{ width: 10, height: 10 }} aria-hidden /> : null}
                          {lv === "auto" ? "My level" : lv}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
                    {[
                      { v: "auto", t: "My language" },
                      { v: "th", t: "Thai" },
                      { v: "en", t: "English" },
                    ].map((o) => (
                      <button key={o.v} onClick={() => setPlanTarget(o.v)} disabled={creating} style={{
                        ...font, fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 99, cursor: "pointer",
                        border: `1px solid ${planTarget === o.v ? "#7DD3C0" : BORDER}`,
                        background: planTarget === o.v ? "#E9F8F4" : "#FFFFFF",
                        color: planTarget === o.v ? "#3E9C82" : MUTED,
                      }}>{o.t}</button>
                    ))}
                  </div>
                  <button onClick={() => void createLesson()} disabled={creating} style={{
                    ...font, width: "100%", marginTop: 10, fontSize: 14, fontWeight: 700,
                    padding: "13px 20px", borderRadius: 99, border: "none", cursor: creating ? "default" : "pointer",
                    background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: creating ? 0.7 : 1,
                  }}>
                    {creating ? "Miomi is planning…" : "Plan my lesson"}
                  </button>
                  <button onClick={() => { if (!creating) { setAskOpen(false); setCreateMsg(null); } }} style={{
                    ...font, width: "100%", marginTop: 6, fontSize: 12, fontWeight: 700, padding: "8px 0",
                    borderRadius: 99, border: "none", cursor: "pointer", background: "transparent", color: MUTED,
                  }}>
                    Close
                  </button>
                  {createMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "8px 0 0", lineHeight: 1.5, textAlign: "center" }}>{createMsg}</p> : null}
                </div>
              )}
            </div>

            {!curriculum || !units.length ? (
              <div style={{
                background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18,
                boxShadow: CARD_SHADOW, padding: 22, textAlign: "center",
              }}>
                <p style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
                  Miomi plans your whole {viewLevel ?? myLevel} {targetName} journey
                </p>
                <p style={{ ...font, fontSize: 12, color: MUTED, margin: "6px 0 14px", lineHeight: 1.5 }}>
                  8 units, 4 checkpoints — laid out around what you already know, built as you walk.
                </p>
                <button onClick={() => void planJourney()} disabled={planning} style={{
                  ...font, fontSize: 14, fontWeight: 700, padding: "13px 26px", borderRadius: 99,
                  border: "none", cursor: planning ? "default" : "pointer",
                  background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: planning ? 0.7 : 1,
                }}>
                  {planning ? "Miomi is planning…" : "Plan my journey"}
                </button>
                {genMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "10px 0 0" }}>{genMsg}</p> : null}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 10px" }}>
                  <h2 style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>
                    {targetName} · {curriculum.cefr_level} journey
                  </h2>
                  <span style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                    {units.length} units · {checkpoints.length} checkpoints
                  </span>
                </div>
                <div style={{ borderLeft: `3px solid ${BORDER}`, marginLeft: 10, paddingLeft: 16 }}>
                  {units.map((u) => {
                    const tc = TOPIC_HEX[u.color] ?? TOPIC_HEX.peach;
                    const deep = TOPIC_DEEP[u.color] ?? TOPIC_DEEP.peach;
                    const built = unitLessons(u);
                    const done = unitComplete(u);
                    const allGold = done && unitAllGold(u);
                    const isCurrent = u.position === firstOpen;
                    const isFuture = u.position > firstOpen;
                    const isOpen = u.position === openUnit;
                    const cp = checkpoints.find((c) => c.after_unit === u.position);
                    const cpReached = cp ? firstOpen > cp.after_unit : false;
                    const firstNonGoldId = built.find((l) => {
                      const v = l.progress?.checkpoint;
                      return l.status === "completed" && !(v && v.score === v.total);
                    })?.id;
                    return (
                      <div key={u.position}>
                        <div style={{ position: "relative", marginBottom: 10 }}>
                          <span style={{
                            position: "absolute", left: -28.5, top: 14, width: 22, height: 22, borderRadius: "50%",
                            background: done ? (allGold ? GOLD_GRAD : SILVER_GRAD) : isCurrent ? CTA : "#FFFFFF",
                            border: done || isCurrent ? "2px solid transparent" : `2px solid ${BORDER}`,
                            boxShadow: isCurrent ? "0 0 0 4px rgba(52,169,143,.18)" : "none",
                            opacity: isFuture ? 0.6 : 1,
                          }} />
                          <div style={{
                            background: "#FFFFFF", border: `1px solid ${isCurrent ? "#7DD3C0" : BORDER}`,
                            borderRadius: 18, boxShadow: isCurrent ? "0 4px 14px rgba(52,169,143,.12)" : CARD_SHADOW,
                            overflow: "hidden", position: "relative",
                          }}>
                            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: tc.edge }} />
                            <button onClick={() => setExpandedUnit(isOpen ? -1 : u.position)} style={{
                              display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 13px 12px 16px",
                              background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                            }}>
                              <span style={{
                                ...font, width: 34, height: 34, borderRadius: 11, background: tc.soft, color: deep,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 700, flex: "0 0 34px",
                              }}>{u.position}</span>
                              <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.title_en}</span>
                                <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>
                                  {u.topic} · {built.length}/4 lessons{isCurrent ? " · You are here" : ""}
                                </span>
                              </span>
                              {done ? (
                                <span style={{ ...font, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: allGold ? "#A8853F" : "#5F6B79", whiteSpace: "nowrap" }}>
                                  <MedalDot gold={allGold} />{allGold ? "Gold" : "Silver"} · Completed
                                </span>
                              ) : (
                                <span style={{ ...font, fontSize: 11, fontWeight: 700, color: MUTED, whiteSpace: "nowrap" }}>
                                  {isCurrent ? "" : "Up next"}
                                </span>
                              )}
                            </button>
                            {isOpen ? (
                              <div style={{ borderTop: `1px solid ${BORDER}`, padding: "4px 13px 12px 16px" }}>
                                {(u.lesson_titles ?? []).map((title, li) => {
                                  const lesson = built[li];
                                  if (lesson) {
                                    const v = lesson.progress?.checkpoint;
                                    const lGold = lesson.status === "completed" && !!v && v.score === v.total;
                                    const lDone = lesson.status === "completed";
                                    return (
                                      <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: li < 3 ? `1px solid ${BORDER}` : "none" }}>
                                        {lDone ? <MedalDot gold={lGold} /> : (
                                          <span style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #7DD3C0", flex: "0 0 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34A98F" }} />
                                          </span>
                                        )}
                                        <span style={{ flex: 1, minWidth: 0 }}>
                                          <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lesson.title_en}</span>
                                          <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                                            {lDone ? (lGold ? "Gold · Completed" : "Silver · Completed") : "In progress"}
                                          </span>
                                        </span>
                                        <Link href={`/lessons/${lesson.id}`} style={{
                                          ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99, textDecoration: "none",
                                          ...(lDone
                                            ? { border: `1px solid ${BORDER}`, color: MUTED, background: "transparent" }
                                            : { border: "none", color: "#fff", background: CTA, boxShadow: CTA_SHADOW }),
                                        }}>
                                          {lDone ? "Review" : "Continue"}
                                        </Link>
                                      </div>
                                    );
                                  }
                                  const isNext = li === built.length && isCurrent;
                                  return (
                                    <div key={li} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: li < 3 ? `1px solid ${BORDER}` : "none", opacity: isNext ? 1 : 0.5 }}>
                                      <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isNext ? "#7DD3C0" : BORDER}`, flex: "0 0 18px" }} />
                                      <span style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ ...font, display: "block", fontSize: 12.5, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                                        <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>{isNext ? "Miomi builds it when you start" : "Up next"}</span>
                                      </span>
                                      {isNext ? (
                                        <button onClick={() => void buildNextLesson(u.position)} disabled={building} style={{
                                          ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99,
                                          border: "none", cursor: building ? "default" : "pointer",
                                          background: CTA, color: "#fff", boxShadow: CTA_SHADOW, opacity: building ? 0.7 : 1,
                                        }}>
                                          {building ? "Planning…" : "Start"}
                                        </button>
                                      ) : null}
                                    </div>
                                  );
                                })}
                                {!allGold && done && firstNonGoldId ? (
                                  <Link href={`/lessons/${firstNonGoldId}`} style={{ ...font, display: "inline-block", fontSize: 11.5, fontWeight: 700, color: "#3E9C82", textDecoration: "none", marginTop: 8 }}>
                                    Retry for gold
                                  </Link>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                        {cp ? (
                          <div style={{ position: "relative", marginBottom: 10 }}>
                            <span style={{
                              position: "absolute", left: -28.5, top: 14, width: 22, height: 22, borderRadius: "50%",
                              background: "#FFFFFF", border: `2px solid ${cpReached ? "#7DD3C0" : BORDER}`, opacity: cpReached ? 1 : 0.7,
                            }} />
                            <div style={{
                              display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF",
                              border: `1.5px ${cpReached ? "solid #7DD3C0" : `dashed ${BORDER}`}`, borderRadius: 18, padding: "11px 13px",
                            }}>
                              <span style={{
                                ...thaiFont, width: 34, height: 34, borderRadius: "50%", background: "#F1ECE3", color: MUTED,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 16, fontWeight: 700, flex: "0 0 34px",
                              }}>{cp.badge}</span>
                              <span style={{ flex: 1 }}>
                                <span style={{ ...font, display: "block", fontSize: 13, fontWeight: 700, color: INK_STRONG }}>
                                  {cp.kind === "level_test" ? `${curriculum.cefr_level} level test` : `Checkpoint ${cp.badge}`}
                                </span>
                                <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>
                                  {cpReached ? "Miomi is preparing this — coming in an update" : `After unit ${cp.after_unit}`}
                                </span>
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {genMsg ? <p style={{ ...font, fontSize: 12, color: MUTED, margin: "4px 0 0", textAlign: "center" }}>{genMsg}</p> : null}
              </>
            )}

            {ownLessons.length ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "18px 2px 10px" }}>
                  <h2 style={{ ...font, fontSize: 15, fontWeight: 700, color: INK_STRONG, margin: 0 }}>Your own lessons</h2>
                  <span style={{ ...font, fontSize: 11.5, fontWeight: 700, color: MUTED }}>{ownLessons.length}</span>
                </div>
                {ownLessons.map((l) => {
                  const v = l.progress?.checkpoint;
                  const lGold = l.status === "completed" && !!v && v.score === v.total;
                  const lDone = l.status === "completed";
                  const inProgress = l.status === "in_progress";
                  return (
                    <div key={l.id} style={{
                      display: "flex", alignItems: "center", gap: 10, background: "#FFFFFF",
                      border: `1px solid ${BORDER}`, borderRadius: 18, boxShadow: CARD_SHADOW,
                      padding: "12px 14px", marginBottom: 10,
                    }}>
                      {lDone ? <MedalDot gold={lGold} /> : (
                        <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${inProgress ? "#7DD3C0" : BORDER}`, flex: "0 0 18px" }} />
                      )}
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ ...font, display: "block", fontSize: 13, fontWeight: 700, color: INK_STRONG, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.title_en}</span>
                        <span style={{ ...font, display: "block", fontSize: 10.5, fontWeight: 600, color: MUTED }}>
                          {lDone ? (lGold ? "Gold · Completed" : "Silver · Completed") : inProgress ? "In progress" : "Up next"}
                        </span>
                      </span>
                      <Link href={`/lessons/${l.id}`} style={{
                        ...font, fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 99, textDecoration: "none",
                        ...(lDone
                          ? { border: `1px solid ${BORDER}`, color: MUTED, background: "transparent" }
                          : { border: "none", color: "#fff", background: CTA, boxShadow: CTA_SHADOW }),
                      }}>
                        {lDone ? "Review" : inProgress ? "Continue" : "Start"}
                      </Link>
                    </div>
                  );
                })}
              </>
            ) : null}

            <Link href="/talk" style={{
              display: "flex", alignItems: "center", gap: 11, textDecoration: "none",
              background: "#FFFFFF", border: `1px solid ${BORDER}`, borderRadius: 18,
              boxShadow: CARD_SHADOW, padding: "13px 14px", marginTop: 14,
            }}>
              <span style={{ width: 34, height: 34, borderRadius: "50%", background: "#FDEAF4", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 34px", overflow: "hidden" }}>
                <Image src="/miomi/head-idle.png" alt="Miomi" width={30} height={30} style={{ objectFit: "contain" }} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...font, display: "block", fontSize: 13.5, fontWeight: 700, color: INK_STRONG }}>Say it out loud with Miomi</span>
                <span style={{ ...font, display: "block", fontSize: 11, fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
                  Everything you learn here, you two can chat about~
                </span>
              </span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
