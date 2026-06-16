"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";

const AmbientBackground = dynamic(
  () =>
    import("@/components/AmbientBackground").then((m) => ({
      default: m.AmbientBackground,
    })),
  { ssr: false }
);

export default function UpdatePasswordPage() {
  const router = useRouter();
  const isThai = useUILanguage() === "th";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const t = isThai
    ? {
        title: "ตั้งรหัสผ่านใหม่",
        body: "ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณได้เลยค่ะ",
        password: "รหัสผ่านใหม่",
        confirm: "ยืนยันรหัสผ่านใหม่",
        showPw: "แสดงรหัสผ่าน",
        hidePw: "ซ่อนรหัสผ่าน",
        submit: "บันทึกรหัสผ่าน",
        submitting: "กำลังบันทึก...",
        mismatch: "รหัสผ่านไม่ตรงกันค่ะ",
        tooShort: "รหัสผ่านสั้นเกินไปค่ะ ใช้อย่างน้อย 6 ตัวอักษร",
        errSamePw: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิมค่ะ",
        errWeak: "รหัสผ่านยังไม่ปลอดภัยพอค่ะ ลองใช้รหัสที่ยาวขึ้นหน่อยนะคะ",
        errExpired: "ตั้งรหัสผ่านไม่สำเร็จค่ะ ลิงก์อาจหมดอายุ",
        errGeneric: "ตั้งรหัสผ่านไม่สำเร็จค่ะ ลองอีกครั้งนะคะ",
        requestNew: "ขอลิงก์รีเซ็ตใหม่",
        doneTitle: "เปลี่ยนรหัสผ่านเรียบร้อยแล้วค่ะ",
        cont: "ไปต่อเลย",
      }
    : {
        title: "Set a new password",
        body: "Choose a new password for your account.",
        password: "New password",
        confirm: "Confirm new password",
        showPw: "Show password",
        hidePw: "Hide password",
        submit: "Save password",
        submitting: "Saving…",
        mismatch: "Passwords don't match.",
        tooShort: "Password is too short — use at least 6 characters.",
        errSamePw: "Your new password must be different from your current one.",
        errWeak: "That password is too weak — try something a bit longer.",
        errExpired: "Couldn't update your password. The link may have expired.",
        errGeneric: "Couldn't update your password. Please try again.",
        requestNew: "Request a new link",
        doneTitle: "Your password has been changed.",
        cont: "Continue",
      };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLinkExpired(false);
    if (password !== confirm) {
      setError(t.mismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.tooShort);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        const msg = updateError.message.toLowerCase();
        if (msg.includes("different") || msg.includes("should be different")) {
          setError(t.errSamePw);
        } else if (
          msg.includes("weak") ||
          msg.includes("at least") ||
          msg.includes("characters") ||
          msg.includes("minimum") ||
          msg.includes("strength")
        ) {
          setError(t.errWeak);
        } else if (
          msg.includes("session") ||
          msg.includes("missing") ||
          msg.includes("not authenticated") ||
          msg.includes("jwt") ||
          msg.includes("expired")
        ) {
          setError(t.errExpired);
          setLinkExpired(true);
        } else {
          setError(t.errGeneric);
        }
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-canvas">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <AmbientBackground mode="ambient" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 overflow-y-auto px-4 py-3">
        <div className="m-auto w-full max-w-[400px] rounded-card bg-surface p-6 shadow-card md:p-7">
          <p className="text-center text-2xl font-bold text-[#B8860B]">Miomika</p>

          <div className="mt-3 flex justify-center">
            <div className="miomi-login-float w-[64px] shrink-0 md:w-[80px]">
              <Image src="/miomi/idle.png" alt="Miomi" width={80} height={80} className="h-auto w-full object-contain" priority />
            </div>
          </div>

          {done ? (
            <>
              <h1 className="mt-4 text-center text-lg font-semibold text-ink">{t.doneTitle}</h1>
              <button
                type="button" onClick={() => router.push("/home")}
                className="mt-5 w-full rounded-full bg-accent py-3 text-sm font-semibold text-white shadow-cta transition hover:opacity-95"
              >
                {t.cont}
              </button>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-center text-xl font-semibold text-ink">{t.title}</h1>
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-muted">{t.body}</p>

              <form className="mt-4 flex flex-col gap-2.5" onSubmit={handleSubmit}>
                {/* hidden username field for accessibility + password managers */}
                <input type="text" name="username" autoComplete="username" className="hidden" tabIndex={-1} aria-hidden="true" defaultValue="" />

                {error ? (
                  <div className="rounded-lg border border-[#E7C9C4] bg-[#FBECEA] px-3 py-2 text-center text-sm text-[#C4564A]" role="alert">
                    <p>{error}</p>
                    {linkExpired ? (
                      <Link href="/reset" className="mt-1 inline-block font-medium underline">{t.requestNew}</Link>
                    ) : null}
                  </div>
                ) : null}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">{t.password}</span>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} name="password" autoComplete="new-password" required
                      value={password} onChange={(ev) => setPassword(ev.target.value)}
                      className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                      placeholder="••••••••"
                    />
                    <button
                      type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t.hidePw : t.showPw}
                      className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-subtle transition-colors hover:text-ink"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">{t.confirm}</span>
                  <input
                    type={showPw ? "text" : "password"} name="confirm" autoComplete="new-password" required
                    value={confirm} onChange={(ev) => setConfirm(ev.target.value)}
                    className="rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
                    placeholder="••••••••"
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
        </div>
      </div>
    </main>
  );
}
