"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        setError("อีเมลหรือรหัสผ่านไม่ถูกต้องค่า");
        return;
      }
      router.push("/home");
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
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=/home`,
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

  return (
    <main className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white">
      {/* Back navigation (bug #2) */}
      <header className="flex h-12 shrink-0 items-center px-4">
        <Link
          href="/home"
          aria-label="กลับหน้าหลัก"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#9A8B73] transition-colors hover:bg-[#FAFAF6] hover:text-rose-accent"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-10 pt-2">
      <p className="text-center text-2xl font-bold text-rose-accent">Miomika</p>

      <div className="mt-6 flex justify-center">
        <div className="miomi-login-float w-[120px] shrink-0">
          <Image
            src="/miomi/idle.png"
            alt="Miomi"
            width={120}
            height={120}
            className="h-auto w-[120px] object-contain"
            priority
          />
        </div>
      </div>

      <h1 className="mt-6 text-center text-xl font-semibold text-neutral-900">
        ยินดีต้อนรับกลับค่า~
      </h1>
      <p className="mt-1 text-center text-sm text-neutral-500">Welcome back</p>

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={googleLoading || loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-[#EDE8E0] bg-white py-3 text-sm font-medium text-[#1A1A18] shadow-[0_1px_2px_rgba(26,26,24,0.04)] transition-colors hover:bg-[#FAFAF6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
        </svg>
        <span>{googleLoading ? "กำลังเชื่อมต่อ..." : "เข้าสู่ระบบด้วย Google"}</span>
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-rose-border" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#C4BDB5]">
          หรือใช้อีเมล
        </span>
        <div className="h-px flex-1 bg-rose-border" />
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="rounded-lg border border-rose-border bg-rose-light px-3 py-2 text-center text-sm text-rose-accent"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">Email</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            className="rounded-xl border border-rose-border bg-white px-3 py-2.5 text-sm outline-none ring-0 transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="rounded-xl border border-rose-border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-rose-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-mid disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "…" : "เข้าสู่ระบบ / Login"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-600">
        <Link
          href="/signup"
          className="font-medium text-rose-accent underline underline-offset-2"
        >
          ยังไม่มีบัญชี? สมัครเลยค่า
        </Link>
      </p>
      </div>
    </main>
  );
}
