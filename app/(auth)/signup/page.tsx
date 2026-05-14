"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
  const [success, setSuccess] = useState(false);

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
      <main className="mx-auto flex max-h-[100dvh] min-h-0 w-full max-w-[400px] flex-col overflow-y-auto bg-white px-6 py-10">
        <p className="text-center text-2xl font-bold text-rose-accent">Miomika</p>

        <div className="mt-6 flex justify-center">
          <div className="miomi-login-float w-[120px] shrink-0">
            <Image
              src="/miomi/happy.png"
              alt="Miomi"
              width={120}
              height={120}
              className="h-auto w-[120px] object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="mt-8 text-center text-lg font-semibold leading-snug text-neutral-900">
          เช็คอีเมลของคุณด้วยนะคะ~ 📧
        </h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-neutral-600">
          We sent you a confirmation email. Click the link inside to continue.
        </p>
        <p className="mt-3 text-center text-xs leading-relaxed text-rose-accent/90">
          พอกดลิงก์ในอีเมลแล้ว เจอกันต่อนะคะ Miomi รออยู่เลย~ ✨
        </p>

        <div className="mt-8 rounded-2xl border border-rose-border bg-rose-light/60 px-4 py-3 text-center">
          <p className="text-sm leading-relaxed text-neutral-800">
            ไม่เจออีเมล? เช็ค spam ด้วยนะคะ
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">
            Don&apos;t see it? Check your spam folder.
          </p>
        </div>

        <p className="mt-10 text-center text-sm text-neutral-600">
          <Link
            href="/login"
            className="font-medium text-rose-accent underline underline-offset-2"
          >
            กลับไปหน้าเข้าสู่ระบบค่า
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-h-[100dvh] min-h-0 w-full max-w-[400px] flex-col overflow-y-auto bg-white px-6 py-10">
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
        มาเริ่มต้นด้วยกันนะคะ~
      </h1>
      <p className="mt-1 text-center text-sm text-neutral-500">
        Create your account
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
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
            className="rounded-xl border border-rose-border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
            placeholder="you@example.com"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            className="rounded-xl border border-rose-border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
            placeholder="••••••••"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-neutral-700">
            Confirm password
          </span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(ev) => setConfirmPassword(ev.target.value)}
            className="rounded-xl border border-rose-border bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/25"
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-rose-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-mid disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "…" : "สมัครสมาชิก / Sign up"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-600">
        <Link
          href="/login"
          className="font-medium text-rose-accent underline underline-offset-2"
        >
          มีบัญชีแล้ว? เข้าสู่ระบบค่า
        </Link>
      </p>
    </main>
  );
}
