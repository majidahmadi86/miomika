"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { log, logError } from "@/lib/debug/log";
import {
  clearRedirectTo,
  readRedirectTo,
} from "@/lib/auth/redirect-to";

/**
 * Celebration screen shown immediately after sign-up.
 *
 * No form. No questions. We greet the user by name, mark onboarding
 * complete in the DB, dispatch a profile-refresh so client caches update,
 * then auto-route to /home?celebrate=signup. Total time: ~3 seconds.
 *
 * Returning users never see this — the OAuth callback only routes here
 * for accounts with no onboarding_completed_at set.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    let cancelled = false;

    async function complete() {
      const supabase = createClient();

      // 1. Get the current user.
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        log("onboarding", "no session, redirecting to login");
        router.replace("/login");
        return;
      }

      const user = sessionData.session.user;

      // 2. Resolve a display name from Google metadata or email prefix.
      const metaName =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null;
      const fallbackName = user.email ? user.email.split("@")[0] : "friend";
      const resolvedName = metaName?.trim() || fallbackName;

      if (!cancelled) setDisplayName(resolvedName);

      log("onboarding", "completing", {
        user: user.email,
        nameSource: metaName ? "google" : "email-prefix",
      });

      // 3. Mark onboarding complete + set display_name if not already set.
      try {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            onboarding_completed_at: new Date().toISOString(),
            display_name: resolvedName,
          })
          .eq("id", user.id);

        if (updateError) {
          logError("onboarding", "profile update failed", updateError);
          if (!cancelled) setError("retry");
          return;
        }
      } catch (e) {
        logError("onboarding", "profile update threw", e);
        if (!cancelled) setError("retry");
        return;
      }

      // 4. Notify any mounted useProfile() hooks to re-fetch.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("miomika:profile-refresh"));
      }

      // 5. Hold the celebration for 3 seconds, then route onward.
      window.setTimeout(async () => {
        if (cancelled) return;
        const storedRedirect = readRedirectTo();
        let destination = "/home?celebrate=signup";

        if (storedRedirect) {
          destination = storedRedirect;
          clearRedirectTo();
        } else {
          try {
            const res = await fetch("/api/auth/post-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (res.ok) {
              const data = (await res.json()) as { redirect_to?: string };
              if (data.redirect_to) destination = data.redirect_to;
            }
          } catch (e) {
            logError("onboarding", "post-signup fetch failed", e);
          }
        }

        log("onboarding", "celebration done, routing", { destination });
        router.replace(destination);
      }, 3000);
    }

    void complete();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const retry = () => {
    setError(null);
    didRunRef.current = false;
    // Force the effect to re-run by triggering a state change.
    // The next render will see didRunRef.current === false and re-enter.
    setDisplayName("");
    // Schedule a microtask so React re-renders before the effect re-runs.
    window.setTimeout(() => {
      didRunRef.current = false;
      // Trigger the effect by updating a state used in its deps — using
      // router.refresh keeps everything clean.
      router.refresh();
    }, 0);
  };

  if (error) {
    return (
      <main className="flex h-[100dvh] w-full flex-col items-center justify-center bg-white px-6">
        <div className="miomi-login-float w-[140px] shrink-0">
          <Image
            src="/miomi/idle.png"
            alt="Miomi"
            width={140}
            height={140}
            className="h-auto w-[140px] object-contain"
            priority
          />
        </div>
        <p className="mt-6 text-center text-base font-semibold text-neutral-900">
          อุ๊ปส์~ ลองอีกครั้งนะคะ
        </p>
        <p className="mt-1 text-center text-sm text-neutral-500">
          Something went wrong. Let&apos;s try again.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-6 rounded-full px-6 py-3 text-sm font-semibold text-white"
          style={{
            background:
              "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
          }}
        >
          ลองอีกครั้ง / Try again
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-white px-6">
      {/* Sparkles */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.2, 0.8],
                x: Math.cos((i / 12) * Math.PI * 2) * 160,
                y: Math.sin((i / 12) * Math.PI * 2) * 160,
              }}
              transition={{
                duration: 2.4,
                delay: 0.2 + i * 0.05,
                ease: "easeOut",
              }}
              className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
            >
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, #E8C77A 0%, transparent 70%)",
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src="/miomi/happy.png"
          alt="Miomi"
          width={160}
          height={160}
          className="h-auto w-[160px] object-contain"
          priority
        />
      </motion.div>

      <motion.h1
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 text-center text-2xl font-semibold text-neutral-900"
      >
        ยินดีต้อนรับค่า {displayName ? displayName : ""}~ ✨
      </motion.h1>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-2 text-center text-sm text-neutral-500"
      >
        Welcome {displayName ? displayName : "friend"}! So happy you&apos;re
        here!
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="mt-6 text-center text-xs text-rose-accent/80"
      >
        ดีใจที่ได้เจอกันนะคะ~
      </motion.p>
    </main>
  );
}
