"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, Trash2 } from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { storeRedirectTo } from "@/lib/auth/redirect-to";
import { createClient } from "@/lib/supabase/client";
import { useUILanguage } from "@/lib/i18n/client";

export default function DataPage() {
  const router = useRouter();
  const { profile, authReady } = useProfile();
  const lang = useUILanguage();
  const t = {
    th: {
      back: "ฉัน",
      title: "ข้อมูลของคุณ",
      intro: "ดาวน์โหลดหรือลบข้อมูลของคุณได้ตลอดเวลา ตามสิทธิ์ของคุณภายใต้ PDPA",
      exportTitle: "ดาวน์โหลดข้อมูลของคุณ",
      exportSub: "รับสำเนาข้อมูลทั้งหมดที่เราเก็บไว้ ในรูปแบบไฟล์ JSON",
      exportBtn: "ดาวน์โหลดข้อมูล",
      dangerTitle: "ลบบัญชี",
      dangerSub: "การลบบัญชีจะลบข้อมูลการสนทนา การเรียนรู้ และการเข้าสู่ระบบของคุณอย่างถาวร และย้อนกลับไม่ได้",
      confirmLabel: "พิมพ์ DELETE เพื่อยืนยัน",
      deleteBtn: "ลบบัญชีของฉันอย่างถาวร",
      deleting: "กำลังลบ…",
      error: "ลบไม่สำเร็จ ลองอีกครั้งหรืออีเมล privacy@miomika.com",
    },
    en: {
      back: "Me",
      title: "Your data",
      intro: "Download or delete your data anytime — your rights under the PDPA.",
      exportTitle: "Download your data",
      exportSub: "Get a copy of everything we hold on you, as a JSON file.",
      exportBtn: "Download my data",
      dangerTitle: "Delete account",
      dangerSub: "Deleting your account permanently removes your conversations, learning data, and login. This can't be undone.",
      confirmLabel: "Type DELETE to confirm",
      deleteBtn: "Permanently delete my account",
      deleting: "Deleting…",
      error: "Delete failed. Try again, or email privacy@miomika.com",
    },
  }[lang === "th" ? "th" : "en"];

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!profile) {
      storeRedirectTo("/me/data");
      router.replace("/login?redirect_to=%2Fme%2Fdata");
    }
  }, [authReady, profile, router]);

  const handleDelete = async () => {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const supabase = createClient();
      await supabase.auth.signOut({ scope: "global" });
      router.push("/");
    } catch {
      setError(t.error);
      setDeleting(false);
    }
  };

  if (!authReady || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--mk-accent)]" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[640px] px-4 py-6 pb-16 md:px-6 md:py-10">
        <button type="button" onClick={() => router.push("/me")} className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </button>
        <h1 className="text-[24px] font-semibold text-ink">{t.title}</h1>
        <p className="mt-1 mb-6 text-[14px] text-ink-muted">{t.intro}</p>

        <section className="mb-5 rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="text-accent"><Download className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-ink">{t.exportTitle}</h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">{t.exportSub}</p>
              <a href="/api/account/export" download className="mt-3 inline-flex h-10 items-center rounded-full bg-surface-2 px-4 text-[14px] font-semibold text-ink transition hover:bg-accent-soft">
                {t.exportBtn}
              </a>
            </div>
          </div>
        </section>

        <section className="rounded-card border border-[#E7C9C4] bg-surface p-5 shadow-card">
          <div className="flex items-start gap-3">
            <span className="text-[#C4564A]"><Trash2 className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-[#C4564A]">{t.dangerTitle}</h2>
              <p className="mt-0.5 text-[13px] text-ink-muted">{t.dangerSub}</p>
              <label className="mt-3 block text-[12px] font-medium text-ink-subtle">{t.confirmLabel}</label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                className="mt-1 w-full max-w-[240px] rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-[14px] text-ink outline-none focus:border-[#C4564A]"
              />
              <button
                type="button"
                disabled={confirm !== "DELETE" || deleting}
                onClick={() => void handleDelete()}
                className="mt-3 inline-flex h-10 items-center rounded-full bg-[#C4564A] px-4 text-[14px] font-semibold text-white transition disabled:opacity-40"
              >
                {deleting ? t.deleting : t.deleteBtn}
              </button>
              {error ? <p className="mt-2 text-[13px] text-[#C4564A]">{error}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
