"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, X } from "lucide-react";
import { planById, type Bilingual } from "@/lib/billing/tiers";

type Lang = "th" | "en";

type Preview = {
  interval: "monthly" | "yearly";
  proratedNow: number | null;
  currency: string;
  goingForward: number;
};

const sans = { fontFamily: "'Quicksand', sans-serif" } as const;
const ACCENT_GRAD = "linear-gradient(135deg,#6ECDB8 0%,#34A98F 100%)";

const COPY = {
  th: {
    title: "อัปเกรดเป็น Pro Max",
    subtitle: "ประสบการณ์มีโอมิแบบเต็มที่สุด — คุยได้มากขึ้น เสียงนานขึ้น และห้องพูดสดเพิ่มขึ้น",
    dueToday: "ชำระวันนี้ (คิดตามสัดส่วน)",
    thenMonthly: "จากนั้น ฿{n}/เดือน",
    thenYearly: "จากนั้น ฿{n}/ปี",
    prorationNote: "เราคิดเฉพาะส่วนต่างที่เหลือในรอบบิลปัจจุบัน",
    confirm: "ยืนยันอัปเกรด",
    confirming: "กำลังอัปเกรด…",
    cancel: "ยังไม่ใช่ตอนนี้",
    loading: "กำลังโหลดรายละเอียด…",
    loadFail: "โหลดรายละเอียดไม่สำเร็จ ลองอีกครั้งนะ",
    upgradeFail: "อัปเกรดไม่สำเร็จ — ลองอัปเดตบัตรที่จัดการการเรียกเก็บเงิน",
    close: "ปิด",
    cancelAnytime: "ยกเลิกได้ทุกเมื่อ",
  },
  en: {
    title: "Upgrade to Pro Max",
    subtitle: "The fullest Miomi experience — more chat, longer voice, and more live sessions.",
    dueToday: "Due today (prorated)",
    thenMonthly: "Then ฿{n}/month",
    thenYearly: "Then ฿{n}/year",
    prorationNote: "You only pay the difference for the rest of this billing period.",
    confirm: "Confirm upgrade",
    confirming: "Upgrading…",
    cancel: "Not now",
    loading: "Loading details…",
    loadFail: "Couldn't load upgrade details. Please try again.",
    upgradeFail: "Couldn't complete the upgrade — try updating your card in Manage billing.",
    close: "Close",
    cancelAnytime: "Cancel anytime",
  },
} as const;

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function t(b: Bilingual, lang: Lang): string {
  return lang === "th" ? b.th : b.en;
}

export function UpgradeProMaxSheet({
  lang,
  onClose,
  onUpgraded,
}: {
  lang: Lang;
  onClose: () => void;
  onUpgraded: () => void;
}) {
  const c = COPY[lang];
  const plan = planById("pro_max");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/upgrade");
      const j = (await r.json()) as Preview & { error?: string };
      if (!r.ok) {
        setError(j.error ?? c.loadFail);
        setPreview(null);
        return;
      }
      setPreview(j);
    } catch {
      setError(c.loadFail);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [c.loadFail]);

  /* eslint-disable react-hooks/set-state-in-effect -- fetch-on-mount; state updates after await */
  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const confirmUpgrade = async () => {
    if (confirming || loading) return;
    setConfirming(true);
    setError(null);
    try {
      const r = await fetch("/api/billing/upgrade", { method: "POST" });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (r.ok && j.ok) {
        onUpgraded();
        return;
      }
      setError(j.error ?? c.upgradeFail);
    } catch {
      setError(c.upgradeFail);
    }
    setConfirming(false);
  };

  const goingLabel =
    preview?.interval === "yearly"
      ? c.thenYearly.replace("{n}", fmt(preview.goingForward))
      : c.thenMonthly.replace("{n}", fmt(preview?.goingForward ?? 699));

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 md:items-center"
        onClick={onClose}
      >
        <motion.div
          data-horizontal-scroll-zone
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-[20px] bg-[var(--mk-canvas,#FAFAF6)] shadow-float md:max-w-[480px] md:rounded-[20px]"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={c.close}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface shadow-card"
          >
            <X className="h-[18px] w-[18px] text-ink-muted" strokeWidth={1.75} />
          </button>

          <div className="px-6 pb-6 pt-8">
            <div className="mb-5 text-center">
              <Image
                src="/miomi/head-happy.png"
                alt="Miomi"
                width={64}
                height={64}
                className="mx-auto mb-3 object-contain"
                style={{ filter: "drop-shadow(0 6px 14px rgba(52,169,143,0.22))" }}
              />
              <h2 style={{ ...sans }} className="mb-1.5 text-[20px] font-extrabold text-ink">
                {c.title}
              </h2>
              <p style={{ ...sans }} className="mx-auto max-w-[360px] text-[13.5px] leading-relaxed text-ink-muted">
                {c.subtitle}
              </p>
            </div>

            {plan ? (
              <ul className="mb-5 flex flex-col gap-2.5 rounded-card border border-line bg-surface p-4 shadow-card">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#E9F8F4]"
                    >
                      <Check className="h-3 w-3 text-[#2C8E76]" strokeWidth={3} />
                    </span>
                    <span style={{ ...sans }} className="text-[13px] leading-snug text-ink">
                      {t(f, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div
              className="mb-5 rounded-card border-2 border-[#34A98F] bg-surface p-4 shadow-card"
              style={{ boxShadow: "0 10px 26px -10px rgba(52,169,143,0.30)" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white"
                  style={{ background: ACCENT_GRAD }}
                >
                  <Crown className="h-3 w-3" strokeWidth={2.5} />
                  Pro Max
                </span>
              </div>

              {loading ? (
                <p style={{ ...sans }} className="text-[14px] text-ink-muted">
                  {c.loading}
                </p>
              ) : preview ? (
                <>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span style={{ ...sans }} className="text-[13px] font-semibold text-ink-muted">
                      {c.dueToday}
                    </span>
                    <span style={{ ...sans }} className="text-[22px] font-extrabold text-ink">
                      {preview.proratedNow != null ? `฿${fmt(preview.proratedNow)}` : "—"}
                    </span>
                  </div>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <span style={{ ...sans }} className="text-[13px] font-semibold text-ink-muted">
                      {lang === "th" ? "ราคาต่อรอบ" : "Going forward"}
                    </span>
                    <span style={{ ...sans }} className="text-[16px] font-bold text-ink">
                      {goingLabel}
                    </span>
                  </div>
                  <p style={{ ...sans }} className="text-[11.5px] leading-relaxed text-ink-subtle">
                    {c.prorationNote}
                  </p>
                </>
              ) : null}
            </div>

            {error ? (
              <p
                style={{ ...sans }}
                className="mb-4 rounded-[12px] border border-[#F3D2CD] bg-[#FCEEEC] px-3 py-2.5 text-center text-[12.5px] leading-relaxed text-[#B4453C]"
              >
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                disabled={loading || confirming || !preview}
                onClick={() => void confirmUpgrade()}
                style={{ ...sans, background: ACCENT_GRAD }}
                className="h-12 w-full rounded-full text-[15px] font-extrabold text-white shadow-cta disabled:opacity-60"
              >
                {confirming ? c.confirming : c.confirm}
              </button>
              <button
                type="button"
                disabled={confirming}
                onClick={onClose}
                style={{ ...sans }}
                className="h-11 w-full rounded-full border border-line bg-surface-2 text-[14px] font-semibold text-ink-muted disabled:opacity-60"
              >
                {c.cancel}
              </button>
            </div>

            <p style={{ ...sans }} className="mt-4 text-center text-[11px] text-ink-subtle">
              {c.cancelAnytime}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
