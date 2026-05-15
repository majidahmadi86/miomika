"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const slideTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

const slideVariants = {
  initial: { x: 56, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -56, opacity: 0 },
};

type PersonalityId = "sweet" | "cheeky" | "dreamy";

const PERSONALITY_OPTIONS: {
  id: PersonalityId;
  th: string;
  en: string;
  desc: string;
}[] = [
  { id: "sweet", th: "หวาน", en: "Sweet", desc: "gentle, caring" },
  { id: "cheeky", th: "ซน", en: "Cheeky", desc: "playful, teasing" },
  { id: "dreamy", th: "ฝัน", en: "Dreamy", desc: "calm, poetic" },
];

const CREATOR_OPTIONS = [
  "Beauty",
  "Cafe",
  "Gym",
  "Fashion",
  "Freelancer",
  "Other",
] as const;

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "YouTube",
] as const;

type LanguageId = "thai" | "english" | "both";

const LANGUAGE_OPTIONS: {
  id: LanguageId;
  th: string;
  en: string;
}[] = [
  { id: "thai", th: "ภาษาไทยอย่างเดียว", en: "Thai only" },
  { id: "english", th: "ภาษาอังกฤษอย่างเดียว", en: "English only" },
  { id: "both", th: "ทั้งไทยและอังกฤษ", en: "Both (Thai + English)" },
];

function ProgressBar({ step }: { step: number }) {
  const filled = step >= 7 ? 6 : step;
  return (
    <div
      className="grid h-[2px] w-full shrink-0 grid-cols-6 gap-px bg-rose-border"
      aria-hidden
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={cn(
            "min-h-[2px] transition-colors duration-300",
            i < filled ? "bg-rose-accent" : "bg-white",
          )}
        />
      ))}
    </div>
  );
}

function BilingualPrimaryButton({
  th,
  en,
  disabled,
  onClick,
}: {
  th: string;
  en: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-full bg-rose-accent py-3.5 text-center transition-colors hover:bg-rose-mid disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="block text-sm font-semibold text-white">{th}</span>
      <span className="mt-1 block text-xs font-normal text-white/85">{en}</span>
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [catName, setCatName] = useState("");
  const [personality, setPersonality] = useState<PersonalityId | null>(null);
  const [creatorTypes, setCreatorTypes] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [language, setLanguage] = useState<LanguageId | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveRetry, setSaveRetry] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "loading" | "error">(
    "idle",
  );

  function toggleMulti(
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) {
    setList(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value],
    );
  }

  useEffect(() => {
    if (step !== 7) return;

    let cancelled = false;

    async function persist() {
      setSaveState("loading");
      setSaveError(null);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setSaveError("เซสชันหมดอายุค่า กรุณาเข้าสู่ระบบใหม่");
        setSaveState("error");
        return;
      }

      if (!personality || !language) {
        setSaveError("ข้อมูลไม่ครบค่า กรุณากลับไปเลือกใหม่");
        setSaveState("error");
        return;
      }

      const { error } = await supabase.from("users").upsert(
        {
          id: user.id,
          email: user.email,
          cat_name: catName.trim(),
          personality,
          creator_type: creatorTypes.join(", "),
          language,
          platforms: platforms.join(", "),
        },
        { onConflict: "id" },
      );

      if (cancelled) return;

      if (error) {
        setSaveError(
          "บันทึกไม่สำเร็จค่า ลองใหม่อีกครั้ง หรือติดต่อทีมงานนะคะ",
        );
        setSaveState("error");
        return;
      }

      router.push("/home");
      router.refresh();
    }

    void persist();

    return () => {
      cancelled = true;
    };
  }, [
    step,
    saveRetry,
    catName,
    personality,
    creatorTypes,
    platforms,
    language,
    router,
  ]);

  const showBack = step > 1 && step < 7;
  const nameOk = catName.trim().length > 0;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-white">
      <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto bg-white">
        <ProgressBar step={step} />

        <header className="relative flex h-11 shrink-0 items-center px-3">
          {showBack ? (
            <button
              type="button"
              onClick={() => {
                setStep((s) => Math.max(1, s - 1));
                setSaveError(null);
              }}
              className="text-sm font-medium text-rose-accent hover:text-rose-mid"
            >
              กลับ
            </button>
          ) : (
            <span className="w-10" aria-hidden />
          )}
        </header>

        <div className="flex flex-1 flex-col px-5 pb-10">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key={1}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-4">
                  <div className="miomi-login-float w-[200px] shrink-0">
                    <Image
                      src="/miomi/happy.png"
                      alt="Miomi"
                      width={200}
                      height={200}
                      className="mx-auto h-auto w-[200px] object-contain"
                      priority
                    />
                  </div>
                  <h1 className="mt-8 text-center text-2xl font-semibold text-neutral-900">
                    สวัสดีค่า~
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    Hello there!
                  </p>
                  <p className="mt-6 text-center text-base leading-relaxed text-neutral-800">
                    ฉันชื่อ Miomi และฉันจะเป็นเพื่อนของคุณค่า
                  </p>
                  <p className="mt-2 text-center text-sm text-neutral-500">
                    I&apos;m Miomi and I&apos;ll be your companion
                  </p>
                </div>
                <div className="mt-auto">
                  <BilingualPrimaryButton
                    th="มาเริ่มเลยค่า"
                    en={"Let's begin"}
                    onClick={() => setStep(2)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key={2}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-2">
                  <div className="miomi-login-float w-[150px] shrink-0">
                    <Image
                      src="/miomi/happy.png"
                      alt="Miomi"
                      width={150}
                      height={150}
                      className="mx-auto h-auto w-[150px] object-contain"
                    />
                  </div>
                  <h1 className="mt-6 text-center text-xl font-semibold text-neutral-900">
                    ตั้งชื่อให้ฉันด้วยนะคะ
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    Give me a name
                  </p>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="ชื่อของ Miomi..."
                    className="mt-8 w-full rounded-xl border border-rose-border bg-[#FAFAFA] px-4 py-4 text-center text-lg font-medium text-neutral-900 outline-none transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
                    autoComplete="off"
                  />
                  <p className="mt-2 text-center text-xs text-neutral-400">
                    Miomi&apos;s name...
                  </p>
                </div>
                <div className="mt-auto">
                  <BilingualPrimaryButton
                    th="ตกลงค่า"
                    en="Perfect!"
                    disabled={!nameOk}
                    onClick={() => setStep(3)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div
                key={3}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-2">
                  <div className="w-[130px] shrink-0">
                    <Image
                      src="/miomi/idle.png"
                      alt="Miomi"
                      width={130}
                      height={130}
                      className="mx-auto h-auto w-[130px] object-contain"
                    />
                  </div>
                  <h1 className="mt-5 text-center text-xl font-semibold text-neutral-900">
                    คุณอยากให้ฉันเป็นแบบไหนคะ?
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    What&apos;s my personality?
                  </p>
                  <div className="mt-6 grid w-full gap-3">
                    {PERSONALITY_OPTIONS.map((opt) => {
                      const selected = personality === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setPersonality(opt.id)}
                          className={cn(
                            "rounded-xl border-2 p-4 text-left transition-colors",
                            selected
                              ? "border-rose-accent bg-white"
                              : "border-rose-border bg-white hover:border-rose-mid/50",
                          )}
                        >
                          <p className="text-base font-semibold text-neutral-900">
                            {opt.th}
                          </p>
                          <p className="text-sm text-neutral-500">{opt.en}</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {opt.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-8">
                  <BilingualPrimaryButton
                    th="ถัดไป"
                    en="Next"
                    disabled={!personality}
                    onClick={() => setStep(4)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 4 ? (
              <motion.div
                key={4}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-2">
                  <div className="w-[130px] shrink-0">
                    <Image
                      src="/miomi/thinking.png"
                      alt="Miomi"
                      width={130}
                      height={130}
                      className="mx-auto h-auto w-[130px] object-contain"
                    />
                  </div>
                  <h1 className="mt-5 text-center text-xl font-semibold text-neutral-900">
                    คุณทำคอนเทนต์แบบไหนคะ?
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    What do you create?
                  </p>
                  <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                    {CREATOR_OPTIONS.map((opt) => {
                      const selected = creatorTypes.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            toggleMulti(creatorTypes, setCreatorTypes, opt)
                          }
                          className={cn(
                            "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                            selected
                              ? "border-rose-accent bg-rose-light text-rose-accent"
                              : "border-rose-border bg-[#FAFAFA] text-neutral-800",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-8">
                  <BilingualPrimaryButton
                    th="ถัดไป"
                    en="Next"
                    disabled={creatorTypes.length === 0}
                    onClick={() => setStep(5)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 5 ? (
              <motion.div
                key={5}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-2">
                  <div className="w-[130px] shrink-0">
                    <Image
                      src="/miomi/thinking.png"
                      alt="Miomi"
                      width={130}
                      height={130}
                      className="mx-auto h-auto w-[130px] object-contain"
                    />
                  </div>
                  <h1 className="mt-5 text-center text-xl font-semibold text-neutral-900">
                    โพสต์ที่ไหนบ้างคะ?
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    Where do you post?
                  </p>
                  <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
                    {PLATFORM_OPTIONS.map((opt) => {
                      const selected = platforms.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            toggleMulti(platforms, setPlatforms, opt)
                          }
                          className={cn(
                            "rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
                            selected
                              ? "border-rose-accent bg-rose-light text-rose-accent"
                              : "border-rose-border bg-[#FAFAFA] text-neutral-800",
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-8">
                  <BilingualPrimaryButton
                    th="ถัดไป"
                    en="Next"
                    disabled={platforms.length === 0}
                    onClick={() => setStep(6)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 6 ? (
              <motion.div
                key={6}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 flex-col items-center pt-2">
                  <div className="w-[130px] shrink-0">
                    <Image
                      src="/miomi/speaking.png"
                      alt="Miomi"
                      width={130}
                      height={130}
                      className="mx-auto h-auto w-[130px] object-contain"
                    />
                  </div>
                  <h1 className="mt-5 text-center text-xl font-semibold text-neutral-900">
                    อยากให้ Miomi เขียนภาษาอะไรให้คะ?
                  </h1>
                  <p className="mt-1 text-center text-sm text-neutral-500">
                    What language should I write in?
                  </p>
                  <div className="mt-6 grid w-full gap-3">
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const selected = language === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setLanguage(opt.id)}
                          className={cn(
                            "rounded-xl border-2 p-4 text-left transition-colors",
                            selected
                              ? "border-rose-accent bg-white"
                              : "border-rose-border bg-white hover:border-rose-mid/50",
                          )}
                        >
                          <p className="text-base font-semibold text-neutral-900">
                            {opt.th}
                          </p>
                          <p className="mt-1 text-sm text-neutral-500">
                            {opt.en}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-8">
                  <BilingualPrimaryButton
                    th="เสร็จแล้วค่า"
                    en="All set"
                    disabled={!language}
                    onClick={() => setStep(7)}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 7 ? (
              <motion.div
                key={7}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={slideTransition}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <div className="miomi-login-float w-[200px] shrink-0">
                  <Image
                    src="/miomi/happy.png"
                    alt="Miomi"
                    width={200}
                    height={200}
                    className="mx-auto h-auto w-[200px] object-contain"
                  />
                </div>
                <h1 className="mt-8 text-2xl font-semibold text-neutral-900">
                  {catName.trim()} พร้อมแล้วค่า!
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  {catName.trim()} is ready!
                </p>
                <p className="mt-6 text-base text-neutral-800">
                  ไปสร้าง content ด้วยกันเลยนะคะ
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  Let&apos;s create together
                </p>
                {saveState === "loading" && !saveError ? (
                  <p className="mt-8 text-sm text-neutral-500">กำลังบันทึก...</p>
                ) : null}
                {saveError ? (
                  <div className="mt-6 w-full">
                    <p
                      className="rounded-xl border border-rose-border bg-rose-light px-3 py-2 text-sm text-rose-accent"
                      role="alert"
                    >
                      {saveError}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveError(null);
                        setSaveState("idle");
                        setSaveRetry((n) => n + 1);
                      }}
                      className="mt-4 w-full rounded-full border border-rose-accent py-3 text-sm font-medium text-rose-accent"
                    >
                      ลองอีกครั้ง
                    </button>
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
