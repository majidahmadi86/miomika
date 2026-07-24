"use client";

/**
 * ShareSessionSheet — the branded share moment after a Confident Speaking room.
 * Replaces the bare OS share sheet with Miomika's own card: Miomi, the session
 * title, the member's PERSONAL invite link + QR (the lesson itself is the
 * referral), one-tap social buttons, copy, and the native sheet as "More".
 * Guests without a referral code share the plain site link.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, X } from "lucide-react";
import { useUILanguage } from "@/lib/i18n/client";

const font = { fontFamily: "'Quicksand', 'Kanit', sans-serif" } as const;

export function ShareSessionSheet({
  open,
  onClose,
  sessionTitle,
}: {
  open: boolean;
  onClose: () => void;
  sessionTitle: string;
}) {
  const isThai = useUILanguage() === "th";
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || code) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (!res.ok) return;
        const data = (await res.json()) as { code?: string | null };
        if (active && data.code) setCode(data.code);
      } catch {
        /* guest or offline — plain link below */
      }
    })();
    return () => {
      active = false;
    };
  }, [open, code]);

  if (!open) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://miomika.com";
  const link = code ? `${origin}/invite/${code}` : "https://miomika.com";
  const text = isThai
    ? `เพิ่งจบห้องฝึกพูด "${sessionTitle}" กับมีโอมิมาค่ะ มาเรียนด้วยกันนะ`
    : `I just finished a "${sessionTitle}" speaking session with Miomi. Come learn with me!`;
  const enc = encodeURIComponent;

  const socials: Array<{ label: string; href: string; bg: string; color: string }> = [
    { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${enc(link)}`, bg: "#06C755", color: "#fff" },
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${link}`)}`, bg: "#25D366", color: "#fff" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`, bg: "#1877F2", color: "#fff" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(link)}`, bg: "#1A1A18", color: "#fff" },
  ];

  const copyLink = () => {
    try {
      void navigator.clipboard?.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the link stays visible to select */
    }
  };

  const nativeShare = () => {
    try {
      void navigator.share?.({ title: "Miomika", text, url: link });
    } catch {
      /* optional */
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(43,37,28,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 400, background: "#FFFFFF", borderRadius: 24, padding: "22px 20px 18px", boxShadow: "0 24px 60px rgba(26,26,24,.28)", position: "relative", maxHeight: "92dvh", overflowY: "auto" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={isThai ? "ปิด" : "Close"}
          style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: "50%", border: "none", background: "#F6F1E7", color: "#9A8B73", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <X size={16} strokeWidth={2.2} />
        </button>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <Image src="/miomi/happy.png" alt="Miomi" width={76} height={76} style={{ width: 76, height: 76, objectFit: "contain" }} />
          <p style={{ ...font, fontSize: 17, fontWeight: 800, color: "#3C352B", margin: "8px 0 2px" }}>
            {isThai ? "แชร์ความสำเร็จของคุณ" : "Share your session"}
          </p>
          <p style={{ ...font, fontSize: 12, fontWeight: 600, color: "#9A8B73", margin: 0, lineHeight: 1.5 }}>
            {isThai
              ? `คุณเพิ่งฝึกพูดจบห้อง "${sessionTitle}" ชวนเพื่อนมาเรียนด้วยกัน รับเครดิตคนละ ฿30 เมื่อเพื่อนสมัคร`
              : `You just finished "${sessionTitle}". Invite a friend and you BOTH get ฿30 credit when they subscribe.`}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 10px" }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #EDE8E0", borderRadius: 16, padding: 10 }}>
            <QRCodeSVG value={link} size={128} level="M" fgColor="#1A1A18" bgColor="#ffffff" />
          </div>
        </div>

        <div style={{ ...font, fontSize: 12, fontWeight: 700, color: "#3C352B", background: "#FBF7EE", border: "1px solid #EDE8E0", borderRadius: 12, padding: "9px 11px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {link}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7, marginTop: 11 }}>
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...font, display: "flex", alignItems: "center", justifyContent: "center", background: s.bg, color: s.color, borderRadius: 11, padding: "9px 4px", fontSize: 10.5, fontWeight: 800, textDecoration: "none" }}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
          <button
            type="button"
            onClick={copyLink}
            style={{ ...font, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1.5px solid #E3DCCE", background: "#FFFFFF", color: "#3C352B", borderRadius: 12, padding: "10px 8px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            {copied ? <Check size={14} strokeWidth={2.4} color="#34A98F" /> : <Copy size={14} strokeWidth={2.2} />}
            {copied ? (isThai ? "คัดลอกแล้ว" : "Copied") : (isThai ? "คัดลอกลิงก์" : "Copy link")}
          </button>
          <button
            type="button"
            onClick={nativeShare}
            style={{ ...font, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", color: "#FFFFFF", borderRadius: 12, padding: "10px 8px", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 2px 10px rgba(52,169,143,.3)" }}
          >
            <Share2 size={14} strokeWidth={2.2} />
            {isThai ? "แชร์เพิ่มเติม" : "More"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareSessionSheet;
