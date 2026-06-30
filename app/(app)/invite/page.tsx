"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2 } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";

export default function InvitePage() {
  const isThai = useUILanguage() === "th";
  const [code, setCode] = useState<string | null>(null);
  const [invitedCount, setInvitedCount] = useState(0);
  const [creditBaht, setCreditBaht] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "guest">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (res.status === 401) {
          if (active) setStatus("guest");
          return;
        }
        const data = await res.json();
        if (!active) return;
        setCode(data.code ?? null);
        setInvitedCount(data.invitedCount ?? 0);
        setCreditBaht(data.creditBaht ?? 0);
        setStatus("ready");
      } catch {
        if (active) setStatus("guest");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const link =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/invite/${code}`
      : "";

  const t = isThai
    ? {
        title: "ชวนเพื่อนมาเรียนด้วยกัน",
        subtitle: "เมื่อเพื่อนสมัครแพ็กเกจ คุณทั้งคู่รับเครดิต ฿30",
        yourLink: "ลิงก์ของคุณ",
        copy: "คัดลอกลิงก์",
        copied: "คัดลอกแล้ว",
        share: "แชร์",
        invited: (n: number) =>
          n === 0 ? "ยังไม่มีเพื่อนเข้าร่วม" : `เพื่อนเข้าร่วมแล้ว ${n} คน`,
        credit: (n: number) => `เครดิตของคุณ ฿${n}`,
        scan: "ให้เพื่อนสแกนเพื่อเข้าร่วม",
        guestTitle: "เข้าสู่ระบบเพื่อรับลิงก์ชวนเพื่อน",
        login: "เข้าสู่ระบบ",
        loading: "กำลังโหลด...",
        shareText: "มาเรียนภาษากับมีโอมิที่ Miomika สิ",
      }
    : {
        title: "Invite friends to learn together",
        subtitle: "When a friend subscribes, you both get ฿30 credit",
        yourLink: "Your link",
        copy: "Copy link",
        copied: "Copied",
        share: "Share",
        invited: (n: number) =>
          n === 0 ? "No friends joined yet" : `${n} friend${n === 1 ? "" : "s"} joined`,
        credit: (n: number) => `Your credit ฿${n}`,
        scan: "Friends can scan this to join",
        guestTitle: "Log in to get your invite link",
        login: "Log in",
        loading: "Loading…",
        shareText: "Come learn languages with Miomi on Miomika!",
      };

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  async function handleShare() {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Miomika", text: t.shareText, url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      void handleCopy();
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6">
      <div className="mx-auto w-full max-w-[420px]">
        {status === "guest" ? (
          <div className="rounded-card bg-surface p-7 text-center shadow-card">
            <h1 className="text-lg font-semibold text-ink">{t.guestTitle}</h1>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:opacity-95"
            >
              {t.login}
            </Link>
          </div>
        ) : (
          <div className="rounded-card bg-surface p-6 text-center shadow-card md:p-7">
            <h1 className="text-xl font-bold text-ink">{t.title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{t.subtitle}</p>

            <div className="mt-6 flex justify-center">
              <div className="rounded-2xl bg-white p-4 shadow-card">
                {link ? (
                  <QRCodeSVG value={link} size={168} level="M" fgColor="#1A1A18" bgColor="#ffffff" />
                ) : (
                  <div className="h-[168px] w-[168px] animate-pulse rounded-xl bg-surface-2" />
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-subtle">{t.scan}</p>

            <div className="mt-6 text-left">
              <p className="mb-1 text-xs font-medium text-ink-muted">{t.yourLink}</p>
              <div className="flex items-center rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="flex-1 truncate text-sm text-ink">
                  {status === "loading" ? t.loading : link}
                </span>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!link}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-line bg-surface py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
              >
                {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                {copied ? t.copied : t.copy}
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={!link}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent py-2.5 text-sm font-semibold text-white shadow-cta transition hover:opacity-95 disabled:opacity-50"
              >
                <Share2 className="h-4 w-4" />
                {t.share}
              </button>
            </div>

            <p className="mt-5 text-sm font-medium text-earned-strong">
              {t.invited(invitedCount)}
            </p>
            {creditBaht > 0 ? (
              <p className="mt-1.5 inline-block rounded-full bg-earned-soft px-3 py-1 text-sm font-semibold text-earned-strong">
                {t.credit(creditBaht)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
