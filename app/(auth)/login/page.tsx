"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        ยินดีต้อนรับกลับค่า~
      </h1>
      <p className="mt-1 text-center text-sm text-neutral-500">Welcome back</p>

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
    </main>
  );
}
