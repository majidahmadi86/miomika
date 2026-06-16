"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";

const AmbientBackground = dynamic(
  () =>
    import("@/components/AmbientBackground").then((m) => ({
      default: m.AmbientBackground,
    })),
  { ssr: false }
);

export default function ResetPage() {
  const isThai = useUILanguage() === "th";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = isThai
    ? {
        back: "กลับ",
        title: "ลืมรหัสผ่าน?",
        body: "ใส่อีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ค่ะ",
        email: "อีเมล",
        submit: "ส่งลิงก์รีเซ็ต",
        submitting: "กำลังส่ง...",
        backToLogin: "กลับไปหน้าเข้าสู่ระบบค่ะ",
        sentTitle: "เช็คอีเมลของคุณด้วยนะคะ",
        sentBody: "ถ้ามีบัญชีกับอีเมลนี้ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว กดลิงก์ในอีเมลได้เลยค่ะ",
        err: "ส่งไม่สำเร็จค่ะ ลองอีกครั้งนะคะ",
      }
    : {
        back: "Back",
        title: "Forgot password?",
        body: "Enter your email and we'll send you a link to set a new password.",
        email: "Email",
        submit: "Send reset link",
        submitting: "Sending…",
        backToLogin: "Back to log in",
        sentTitle: "Check your email",
        sentBody: "If an account exists for this email, we've sent a link to set a new password. Click it to continue.",
        err: "Couldn't send the link. Please try again.",
      };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/update-password`,
      });
      if (resetError) {
        setError(t.err);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <AmbientBackground mode="ambient" />
      </div>

      <Link
        href="/login"
        aria-label={t.back}
        className="absolute left-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/80 text-ink-muted shadow-card backdrop-blur transition hover:bg-surface hover:text-accent"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
      </Link>

      <div className="relative z-10 flex h-full min-h-0 overflow-y-auto px-4 py-3">
        <div className="m-auto w-full max-w-[400px] rounded-card bg-surface p-6 shadow-card md:p-7">
          <p className="text-center text-2xl font-bold text-[#B8860B]">Miomika</p>

          <div className="mt-3 flex justify-center">
            <div className="miomi-login-float w-[64px] shrink-0 md:w-[80px]">
              <Image src="/miomi/idle.png" alt="Miomi" width={80} height={80} className="h-auto w-full object-contain" priority />
            </div>
          </div>

          {sent ? (
            <>
              <h1 className="mt-4 text-center text-lg font-semibold text-ink">{t.sentTitle}</h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-muted">{t.sentBody}</p>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-center text-xl font-semibold text-ink">{t.title}</h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-muted">{t.body}</p>

              <form className="mt-4 flex flex-col gap-2.5" onSubmit={handleSubmit}>
                {error ? (
                  <p className="rounded-lg border border-[#E7C9C4] bg-[#FBECEA] px-3 py-2 text-center text-sm text-[#C4564A]" role="alert">
                    {error}
                  </p>
                ) : null}
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">{t.email}</span>
                  <input
                    type="email" name="email" autoComplete="email" required
                    value={email} onChange={(ev) => setEmail(ev.target.value)}
                    className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="you@example.com"
                  />
                </label>
                <button
                  type="submit" disabled={loading}
                  className="mt-1 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-cta transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? t.submitting : t.submit}
                </button>
              </form>
            </>
          )}

          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-accent underline underline-offset-2">{t.backToLogin}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
