"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COLORS } from "@/lib/design/colors";
import { setUILanguageCookie, useUILanguage } from "@/lib/i18n/client";
import { useProfile } from "@/lib/auth/use-profile";

// TODO(phase-6): full settings UI with preview and persistence sync
export default function ProfileLanguagePage() {
  const router = useRouter();
  const lang = useUILanguage();
  const { profile } = useProfile();
  const [saving, setSaving] = useState<"th" | "en" | null>(null);

  async function selectLanguage(next: "th" | "en") {
    if (saving || !profile) return;
    setSaving(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ ui_language: next })
      .eq("id", profile.id);
    if (!error) {
      setUILanguageCookie(next);
      window.dispatchEvent(new Event("miomika:profile-refresh"));
    }
    router.push("/me");
    router.refresh();
  }

  const current = profile?.ui_language ?? lang;

  return (
    <div style={{
      minHeight: "100svh",
      background: COLORS.bg,
      padding: "16px",
      paddingBottom: "100px",
    }}>
      <button
        type="button"
        onClick={() => router.push("/me")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "transparent",
          border: "none",
          color: COLORS.ctaSolid,
          fontFamily: "Kanit, sans-serif",
          fontSize: "14px",
          cursor: "pointer",
          padding: "8px 0",
          marginBottom: "16px",
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} />
        {lang === "th" ? "กลับ" : "Back"}
      </button>

      <h1 style={{
        fontSize: "20px",
        fontWeight: 600,
        color: COLORS.textPrimary,
        fontFamily: "Kanit, sans-serif",
        margin: "0 0 4px",
      }}>
        {lang === "th" ? "ภาษา" : "Language"}
      </h1>
      <p style={{
        fontSize: "13px",
        color: COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        margin: "0 0 24px",
      }}>
        {lang === "th" ? "Language" : "ภาษา"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {(["th", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            disabled={saving !== null}
            onClick={() => void selectLanguage(code)}
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "12px",
              border: `1px solid ${current === code ? COLORS.ctaSolid : COLORS.borderLight}`,
              background: current === code ? COLORS.surfaceWarm : COLORS.surface,
              cursor: saving ? "wait" : "pointer",
              textAlign: "left",
            }}
          >
            <p style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 500,
              fontFamily: "Kanit, sans-serif",
              color: COLORS.textPrimary,
            }}>
              {code === "th" ? "ไทย" : "English"}
            </p>
            <p style={{
              margin: "2px 0 0",
              fontSize: "12px",
              fontFamily: "Quicksand, sans-serif",
              color: COLORS.textMuted,
            }}>
              {code === "th" ? "Thai" : "อังกฤษ"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
