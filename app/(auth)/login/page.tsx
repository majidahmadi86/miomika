"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";
import {
  clearRedirectTo,
  resolveRedirectTarget,
} from "@/lib/auth/redirect-to";

const AmbientBackground = dynamic(
  () =>
    import("@/components/AmbientBackground").then((m) => ({
      default: m.AmbientBackground,
    })),
  { ssr: false }
);

export default function LoginPage() {
  const router = useRouter();
  const isThai = useUILanguage() === "th";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const t = isThai
    ? {
        back: "กลับ",
        title: "ยินดีต้อนรับกลับค่ะ",
        google: "เข้าสู่ระบบด้วย Google",
        connecting: "กำลังเชื่อมต่อ...",
        orEmail: "หรือใช้อีเมล",
        email: "อีเมล",
        password: "รหัสผ่าน",
        submit: "เข้าสู่ระบบ",
        submitting: "กำลังเข้าสู่ระบบ...",
        noAccount: "ยังไม่มีบัญชี? สมัครเลยค่ะ",
        errCreds: "อีเมลหรือรหัสผ่านไม่ถูกต้องค่ะ",
        errGoogle: "เข้าสู่ระบบด้วย Google ไม่สำเร็จค่ะ ลองอีกครั้งนะคะ",
      }
    : {
        back: "Back",
        title: "Welcome back",
        google: "Continue with Google",
        connecting: "Connecting…",
        orEmail: "or use email",
        email: "Email",
        password: "Password",
        submit: "Log in",
        submitting: "Logging in…",
        noAccount: "New here? Create an account",
        errCreds: "Wrong email or password.",
        errGoogle: "Google sign-in failed. Please try again.",
      };

  function getPostLoginPath(): string {
    const search =
      typeof window !== "undefined" ? window.location.search : "";
    return resolveRedirectTarget(search) ?? "/home";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(t.errCreds);
        return;
      }
      const destination = getPostLoginPath();
      clearRedirectTo();
      router.push(destination);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const next = encodeURIComponent(getPostLoginPath());
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${next}`,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });
      if (oauthError) {
        setError(t.errGoogle);
        setGoogleLoading(false);
      }
    } catch {
      setError(t.errGoogle);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative isolate flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <AmbientBackground mode="ambient" />
      </div>

      <header className="relative z-10 flex h-14 shrink-0 items-center px-4">
        <Link
          href="/home"
          aria-label={t.back}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/70 text-ink-muted shadow-card backdrop-blur transition hover:bg-surface hover:text-accent"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="m-auto w-full max-w-[400px] rounded-card bg-surface p-6 shadow-card md:p-7">
          <p className="text-center text-2xl font-bold text-[#B8860B]">Miomika</p>

          <div className="mt-3 flex justify-center">
            <div className="miomi-login-float w-[76px] shrink-0 md:w-[92px]">
              <Image
                src="/miomi/idle.png"
                alt="Miomi"
                width={92}
                height={92}
                className="h-auto w-full object-contain"
                priority
              />
            </div>
          </div>

          <h1 className="mt-3 text-center text-xl font-semibold text-ink">
            {t.title}
          </h1>

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={googleLoading || loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface py-3 text-sm font-medium text-ink shadow-card transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            <span>{googleLoading ? t.connecting : t.google}</span>
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
              {t.orEmail}
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            {error ? (
              <p
                className="rounded-lg border border-[#E7C9C4] bg-[#FBECEA] px-3 py-2 text-center text-sm text-[#C4564A]"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-muted">{t.email}</span>
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
              <span className="text-xs font-medium text-ink-muted">{t.password}</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-cta transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-muted">
            <Link
              href="/signup"
              className="font-medium text-accent underline underline-offset-2"
            >
              {t.noAccount}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
