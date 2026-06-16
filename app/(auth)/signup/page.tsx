"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const AmbientBackground = dynamic(
  () =>
    import("@/components/AmbientBackground").then((m) => ({
      default: m.AmbientBackground,
    })),
  { ssr: false }
);

function getSignupErrorThai(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists") ||
    m.includes("duplicate")
  ) {
    return "อีเมลนี้ถูกใช้สมัครแล้วค่า";
  }
  if (m.includes("password") && m.includes("least")) {
    return "รหัสผ่านสั้นเกินไปค่า กรุณาใช้อย่างน้อย 6 ตัวอักษร";
  }
  if (m.includes("invalid email") || m.includes("unable to validate email")) {
    return "รูปแบบอีเมลไม่ถูกต้องค่า";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "ลองบ่อยเกินไปค่า กรุณารอสักครู่แล้วลองใหม่นะคะ";
  }
  return "สมัครสมาชิกไม่สำเร็จค่า กรุณาลองใหม่อีกครั้ง";
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/onboarding`,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });
      if (oauthError) {
        setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จค่า ลองอีกครั้งนะคะ");
        setGoogleLoading(false);
      }
    } catch {
      setError("เข้าสู่ระบบด้วย Google ไม่สำเร็จค่า ลองอีกครั้งนะคะ");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("รหัสผ่านไม่ตรงกันค่า");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: origin ? `${origin}/onboarding` : undefined,
        },
      });
      if (signUpError) {
        setError(getSignupErrorThai(signUpError.message));
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="relative isolate flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <AmbientBackground mode="ambient" />
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="m-auto w-full max-w-[400px] rounded-card bg-surface p-6 shadow-card md:p-8">
            <p className="text-center text-2xl font-bold text-[#B8860B]">Miomika</p>

            <div className="mt-5 flex justify-center">
              <div className="miomi-login-float w-[110px] shrink-0">
                <Image
                  src="/miomi/happy.png"
                  alt="Miomi"
                  width={110}
                  height={110}
                  className="h-auto w-[110px] object-contain"
                  priority
                />
              </div>
            </div>

            <h1 className="mt-6 text-center text-lg font-semibold leading-snug text-ink">
              เช็คอีเมลของคุณด้วยนะคะ 📧
            </h1>
            <p className="mt-3 text-center text-sm leading-relaxed text-ink-muted">
              We sent you a confirmation email. Click the link inside to continue.
            </p>
            <p className="mt-3 text-center text-xs leading-relaxed text-accent">
              พอกดลิงก์ในอีเมลแล้ว เจอกันต่อนะคะ Miomi รออยู่เลย ✨
            </p>

            <div className="mt-8 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-center">
              <p className="text-sm leading-relaxed text-ink">
                ไม่เจออีเมล? เช็ค spam ด้วยนะคะ
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                Don&apos;t see it? Check your spam folder.
              </p>
            </div>

            <p className="mt-8 text-center text-sm text-ink-muted">
              <Link
                href="/login"
                className="font-medium text-accent underline underline-offset-2"
              >
                กลับไปหน้าเข้าสู่ระบบค่า
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <AmbientBackground mode="ambient" />
      </div>

      <header className="relative z-10 flex h-12 shrink-0 items-center px-4">
        <Link
          href="/home"
          aria-label="กลับหน้าหลัก"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-2 hover:text-accent"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="m-auto w-full max-w-[400px] rounded-card bg-surface p-6 shadow-card md:p-8">
          <p className="text-center text-2xl font-bold text-[#B8860B]">Miomika</p>

          <div className="mt-5 flex justify-center">
            <div className="miomi-login-float w-[110px] shrink-0">
              <Image
                src="/miomi/idle.png"
                alt="Miomi"
                width={110}
                height={110}
                className="h-auto w-[110px] object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="mt-5 text-center text-xl font-semibold text-ink">
            มาเริ่มต้นด้วยกันนะคะ
          </h1>
          <p className="mt-1 text-center text-sm text-ink-muted">
            Create your account
          </p>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleLoading || loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-medium text-ink shadow-card transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            <span>{googleLoading ? "กำลังเชื่อมต่อ..." : "สมัครด้วย Google"}</span>
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
              หรือใช้อีเมล
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error ? (
              <p
                className="rounded-lg border border-[#E7C9C4] bg-[#FBECEA] px-3 py-2 text-center text-sm text-[#C4564A]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">Email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="••••••••"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">
                Confirm password
              </span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-cta transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "…" : "สมัครสมาชิก / Sign up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-muted">
            <Link
              href="/login"
              className="font-medium text-accent underline underline-offset-2"
            >
              มีบัญชีแล้ว? เข้าสู่ระบบค่า
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
