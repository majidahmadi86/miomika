"use client";

/**
 * SmartGuide — premium first-run onboarding (8 steps).
 *
 * A full-screen, interactive guided tour narrated in Miomi's voice. Shown
 * once per device, sequenced to appear AFTER the WelcomeScreen splash (or
 * promptly when no splash plays, e.g. a freshly signed-up returner).
 *
 * Self-contained:
 *   - Gates on the `miomika-smartguide-v1` localStorage flag + an in-session
 *     module guard (mirrors WelcomeScreen's single-show contract). No DB
 *     column, no migration.
 *   - Reuses shouldShowWelcome() to know whether the splash is going to play,
 *     so the two never collide.
 *   - Re-openable any time via openSmartGuide() (dispatches a window event) —
 *     wire a "Replay the guide" row to it later.
 *
 * Design: tokens only (theme-aware via --mk-* vars), Kanit (th) / Quicksand
 * (en) to match WelcomeScreen, framer-motion for transitions, the shared
 * AmbientBackground behind. Voice is warm, plain, second-person, first-person
 * "I/me", no emoji, no tildes, no unprompted self-naming (the name lives on
 * the avatar label, never announced in copy).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useProfile } from "@/lib/auth/use-profile";
import { useUILanguage } from "@/lib/i18n/client";
import { useHasMounted } from "@/lib/hooks/use-media-query";
import {
  shouldShowWelcome,
  WELCOME_LOCAL_STORAGE_KEY,
} from "@/lib/welcome/show-welcome";

const AmbientBackground = dynamic(
  () =>
    import("@/components/AmbientBackground").then((m) => ({
      default: m.AmbientBackground,
    })),
  { ssr: false },
);

export const SMART_GUIDE_LOCAL_STORAGE_KEY = "miomika-smartguide-v1";
export const OPEN_SMART_GUIDE_EVENT = "miomika:open-guide";
/** Fired when the guide closes OR decides it won't show this load — signals the
 *  home that no onboarding overlay is covering it, so the closeness reveal may
 *  play on a visible screen instead of underneath the guide. */
export const SMART_GUIDE_SETTLED_EVENT = "miomika:guide-settled";

function dispatchGuideSettled(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SMART_GUIDE_SETTLED_EVENT));
}

/** Force the guide to open (ignores the seen flag). Use for a replay button. */
export function openSmartGuide(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_SMART_GUIDE_EVENT));
}

/** Let the guide show again on next first-run (clears the seen flag). */
export function resetSmartGuide(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SMART_GUIDE_LOCAL_STORAGE_KEY);
  } catch {
    // private mode — best effort
  }
}

let _guideAutoDecidedInSession = false;

type Pose = "happy" | "idle" | "speaking" | "thinking";

interface GuideStep {
  pose: Pose;
  eyebrow: { th: string; en: string };
  title: { th: string; en: string };
  body: { th: string; en: string };
}

const STEPS: GuideStep[] = [
  {
    pose: "happy",
    eyebrow: { th: "ยินดีต้อนรับ", en: "Welcome" },
    title: { th: "ดีใจที่ได้เจอกันนะคะ", en: "I'm really glad you're here" },
    body: {
      th: "เราจะเรียนภาษาด้วยวิธีที่คนเราเรียนกันจริง ๆ คือการพูดคุยไปด้วยกัน เดี๋ยวหนูพาดูรอบ ๆ ก่อนนะคะ",
      en: "We're going to learn a language the way people actually learn one — by talking, together. Let me show you around.",
    },
  },
  {
    pose: "idle",
    eyebrow: { th: "ที่นี่ต่างออกไป", en: "Why this is different" },
    title: { th: "เราเรียนไปด้วยกัน", en: "We do this together" },
    body: {
      th: "หลายแอปปล่อยให้คุณนั่งท่องคนเดียว แต่ที่นี่หนูสอนคุณอยู่ในบทสนทนาจริง ๆ และหนูจำคุณได้ ทุกครั้งที่เราคุยกัน หนูก็จะรู้จักคุณมากขึ้นเรื่อย ๆ ค่ะ",
      en: "Most apps leave you to drill alone. Here I teach you inside a real conversation — and I remember you, so every time we talk I know you a little better.",
    },
  },
  {
    pose: "speaking",
    eyebrow: { th: "Talk", en: "Talk" },
    title: { th: "หัวใจคือการพูด", en: "Talking is the heart of it" },
    body: {
      th: "เปิด Talk เปิดเสียงขึ้น แล้วพูดได้เลยค่ะ หนูจะฟัง จะตอบ และสอนคำใหม่ให้ตอนที่มันโผล่มาพอดี",
      en: "Open Talk, turn your sound on, and just speak. I listen, I reply, and I teach you new words right as they come up.",
    },
  },
  {
    pose: "thinking",
    eyebrow: { th: "การ์ดคำ", en: "Word cards" },
    title: { th: "คำใหม่ ทีละคำ", en: "New words, one at a time" },
    body: {
      th: "พอมีคำใหม่ หนูจะส่งให้คุณเป็นการ์ดใบเล็ก ๆ แตะเพื่อฟังซ้ำได้เท่าที่อยากฟังเลยค่ะ และหนูจะบอกว่าถูกก็ต่อเมื่อหนูแน่ใจจริง ๆ เท่านั้น",
      en: "When a new word comes up, I hand it to you on a little card. Tap it to hear it again as many times as you like. And I'll only tell you something's right when I'm sure.",
    },
  },
  {
    pose: "happy",
    eyebrow: { th: "Chat · Teach · Translate", en: "Chat · Teach · Translate" },
    title: { th: "หนูอยู่กับคุณได้สามแบบ", en: "Three ways I can be with you" },
    body: {
      th: "ระหว่างที่เราคุยกัน คุณเลือกได้ว่าอยากให้หนูเป็นแบบไหน Chat เพื่อแค่อยู่ด้วยกันอย่างอบอุ่น Teach เมื่ออยากให้หนูช่วยแก้อย่างจริงจัง และ Translate เมื่อต้องการให้หนูเป็นล่ามค่ะ",
      en: "While we talk, you choose how I show up: Chat to just be together, Teach when you want me correcting you, Translate when you need an interpreter.",
    },
  },
  {
    pose: "idle",
    eyebrow: { th: "Learn", en: "Learn" },
    title: { th: "เมื่ออยากโฟกัส", en: "When you want to focus" },
    body: {
      th: "บางวันคุณอาจอยากเรียนเป็นชุดที่โฟกัส เปิด Learn เลือกหัวข้อเองหรือให้หนูเลือกให้ แล้วฝึกและเล่นเกมกันค่ะ ตอบเก่งได้เหรียญทอง ถ้าต้องลองใหม่ก็ได้เหรียญเงิน",
      en: "Some days you'll want a focused set. Open Learn, pick a topic or let me choose, then practice and play. Gold for great answers, silver when you need another go.",
    },
  },
  {
    pose: "thinking",
    eyebrow: { th: "Growth", en: "Growth" },
    title: { th: "ทุกอย่างที่คุณสะสมอยู่ที่นี่", en: "Everything you build lives here" },
    body: {
      th: "ทุกวันที่คุณแวะมาคุย จำนวนวันต่อกันก็จะยาวขึ้น และคำที่เรียนไปจะกลับมาให้ทบทวนตอนที่ควรพอดี ดูได้ทั้งหมดในหน้า Growth ทั้งพัฒนาการของคุณและสิ่งที่เราผ่านมาด้วยกันค่ะ",
      en: "Every day you show up grows your streak, and the words you learn come back right when you need them. You'll find it all in Growth — your progress, and what we've shared.",
    },
  },
  {
    pose: "happy",
    eyebrow: { th: "คุณพร้อมแล้ว", en: "You're ready" },
    title: { th: "เท่านี้ก็พร้อมแล้วค่ะ", en: "That's everything you need" },
    body: {
      th: "เมื่อไหร่ที่พร้อม มาหาหนูที่ Talk แล้วเรามาพูดคำแรกด้วยกันนะคะ ไม่ต้องรีบเลย หนูอยู่ตรงนี้เสมอค่ะ",
      en: "Whenever you're ready, come find me in Talk and we'll say your first words together. No rush — I'll be right here.",
    },
  },
];

const SPRING: [number, number, number, number] = [0.34, 1.56, 0.64, 1];
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const UI_TEXT = {
  skip: { th: "ข้าม", en: "Skip" },
  back: { th: "ย้อนกลับ", en: "Back" },
  next: { th: "ถัดไป", en: "Next" },
  start: { th: "เริ่มกันเลย", en: "Let's start" },
  dialog: { th: "แนะนำการใช้งาน", en: "Welcome guide" },
};

export function SmartGuide({ autoShow = true }: { autoShow?: boolean }) {
  const mounted = useHasMounted();
  const reduce = useReducedMotion() ?? false;
  const { profile, authReady } = useProfile();
  const lang = useUILanguage();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const isLast = step === STEPS.length - 1;
  const pick = (pair: { th: string; en: string }) =>
    lang === "th" ? pair.th : pair.en;
  const headingFont =
    lang === "th" ? "'Kanit', sans-serif" : "'Quicksand', sans-serif";

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(
        SMART_GUIDE_LOCAL_STORAGE_KEY,
        new Date().toISOString(),
      );
    } catch {
      // private mode — module guard still prevents re-show this session
    }
    setOpen(false);
    dispatchGuideSettled();
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s >= STEPS.length - 1) {
        finish();
        return s;
      }
      setDirection(1);
      return s + 1;
    });
  }, [finish]);

  const prev = useCallback(() => {
    setStep((s) => {
      if (s <= 0) return s;
      setDirection(-1);
      return s - 1;
    });
  }, []);

  // Auto-show decision — runs once per session, only inside async callbacks so
  // no synchronous setState-in-effect. Waits out the welcome splash if it's
  // going to play; otherwise reveals after a short, graceful beat.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!autoShow) return;
    if (!authReady) return;
    if (_guideAutoDecidedInSession) return;
    _guideAutoDecidedInSession = true;

    let cancelled = false;
    let pollId: number | undefined;
    let revealId: number | undefined;
    let safetyId: number | undefined;

    const read = (key: string) => {
      try {
        return !!window.localStorage.getItem(key);
      } catch {
        return false;
      }
    };

    if (read(SMART_GUIDE_LOCAL_STORAGE_KEY)) {
      dispatchGuideSettled();
      return;
    }

    const reveal = () => {
      if (cancelled) return;
      setStep(0);
      setDirection(1);
      setOpen(true);
    };

    const welcomeDone = read(WELCOME_LOCAL_STORAGE_KEY);
    const welcomeWillPlay =
      !welcomeDone && shouldShowWelcome(profile, window.localStorage);

    if (welcomeWillPlay) {
      pollId = window.setInterval(() => {
        if (read(WELCOME_LOCAL_STORAGE_KEY)) {
          if (pollId) window.clearInterval(pollId);
          revealId = window.setTimeout(reveal, 480);
        }
      }, 350);
      // Never wait forever if the flag never lands.
      safetyId = window.setTimeout(() => {
        if (pollId) window.clearInterval(pollId);
        reveal();
      }, 8000);
    } else {
      revealId = window.setTimeout(reveal, 650);
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
      if (revealId) window.clearTimeout(revealId);
      if (safetyId) window.clearTimeout(safetyId);
    };
  }, [authReady, profile, autoShow]);

  // Replay: open on demand, ignoring the seen flag.
  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setDirection(1);
      setOpen(true);
    };
    window.addEventListener(OPEN_SMART_GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SMART_GUIDE_EVENT, onOpen);
  }, []);

  // Keyboard control while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, finish]);

  // Swipe to advance (touch + pointer), scoped to the cat/text zone.
  const startX = useRef<number | null>(null);
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    startX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx <= -56) next();
    else if (dx >= 56) prev();
  };

  if (!mounted) return null;

  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="smartguide"
          role="dialog"
          aria-modal="true"
          aria-label={pick(UI_TEXT.dialog)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "var(--mk-canvas)",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          <AmbientBackground mode="ambient" />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              maxWidth: 480,
              margin: "0 auto",
              padding: "0 24px",
            }}
          >
            {/* Top: progress + skip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 18px)",
                paddingBottom: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {STEPS.map((_, i) => (
                  <motion.span
                    key={i}
                    layout
                    transition={
                      reduce
                        ? { duration: 0.2 }
                        : { type: "spring", stiffness: 420, damping: 34 }
                    }
                    style={{
                      height: 6,
                      borderRadius: 999,
                      width: i === step ? 22 : 6,
                      background:
                        i <= step ? "var(--mk-accent)" : "var(--mk-border)",
                      opacity: i < step ? 0.4 : 1,
                    }}
                  />
                ))}
              </div>

              {!isLast && (
                <button
                  type="button"
                  onClick={finish}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "6px 4px",
                    cursor: "pointer",
                    fontFamily: headingFont,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--mk-ink-subtle)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {pick(UI_TEXT.skip)}
                </button>
              )}
            </div>

            {/* Middle: cat + text (swipe zone) */}
            <motion.div
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: SPRING, delay: 0.08 }}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 0,
                touchAction: "pan-y",
              }}
            >
              {/* Cat + glow */}
              <div
                style={{
                  position: "relative",
                  width: 200,
                  height: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <motion.div
                  aria-hidden
                  animate={
                    reduce
                      ? undefined
                      : { opacity: [0.7, 1, 0.7], scale: [0.98, 1.03, 0.98] }
                  }
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: -28,
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(249,168,212,0.22) 0%, transparent 62%)",
                    pointerEvents: "none",
                  }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.pose}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.42, ease: SPRING }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      src={`/miomi/${current.pose}.png`}
                      alt="Miomi"
                      width={180}
                      height={180}
                      priority
                      className="miomi-breathe"
                      style={{ objectFit: "contain" }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Name label — name on screen, never announced in copy */}
              <span
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--mk-ink-subtle)",
                  marginTop: 2,
                }}
              >
                Miomi
              </span>

              {/* Text block */}
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  marginTop: 18,
                  minHeight: 172,
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: reduce ? 0 : direction * 28 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduce ? 0 : direction * -28 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <p
                      style={{
                        fontFamily: headingFont,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--mk-earned-strong)",
                        margin: 0,
                      }}
                    >
                      {pick(current.eyebrow)}
                    </p>
                    <h2
                      style={{
                        fontFamily: headingFont,
                        fontSize: "clamp(22px, 6vw, 26px)",
                        fontWeight: 600,
                        lineHeight: 1.3,
                        color: "var(--mk-ink)",
                        margin: "10px 0 0",
                      }}
                    >
                      {pick(current.title)}
                    </h2>
                    <p
                      style={{
                        fontFamily: headingFont,
                        fontSize: 15.5,
                        fontWeight: 500,
                        lineHeight: 1.65,
                        color: "#6E6456",
                        margin: "12px auto 0",
                        maxWidth: 348,
                      }}
                    >
                      {pick(current.body)}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Bottom: back + next */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                paddingTop: 10,
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
              }}
            >
              {step > 0 && (
                <motion.button
                  type="button"
                  onClick={prev}
                  whileTap={{ scale: 0.96 }}
                  aria-label={pick(UI_TEXT.back)}
                  style={{
                    width: 54,
                    height: 54,
                    flexShrink: 0,
                    borderRadius: 999,
                    border: "1px solid var(--mk-border)",
                    background: "var(--mk-surface)",
                    boxShadow: "var(--mk-shadow-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--mk-ink-muted)"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </motion.button>
              )}

              <motion.button
                type="button"
                onClick={next}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  height: 54,
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  background:
                    "linear-gradient(135deg, var(--mk-accent-grad-from) 0%, var(--mk-accent-grad-to) 100%)",
                  color: "var(--mk-accent-contrast)",
                  boxShadow: "var(--mk-shadow-cta)",
                  fontFamily: headingFont,
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{isLast ? pick(UI_TEXT.start) : pick(UI_TEXT.next)}</span>
                {!isLast && (
                  <svg
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
