"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COLORS } from "@/lib/design/colors";
import { useUILanguage } from "@/lib/i18n/client";
import { useProfile } from "@/lib/auth/use-profile";

const FONT = "'Kanit', 'Quicksand', sans-serif";

type Cefr = "A1" | "A2" | "B1" | "B2";

export default function ProfileLevelPage() {
  const router = useRouter();
  const uiLang = useUILanguage();
  const { profile } = useProfile();
  const [saving, setSaving] = useState<Cefr | null>(null);

  const targetName =
    profile?.learning_target_language === "th"
      ? uiLang === "th"
        ? "ภาษาไทย"
        : "Thai"
      : uiLang === "th"
        ? "ภาษาอังกฤษ"
        : "English";

  const title = uiLang === "th" ? "ระดับของคุณ" : "Your level";
  const subtitle =
    uiLang === "th"
      ? `คุณรู้${targetName}มากแค่ไหน? หนูจะได้สอนให้พอดีกับคุณ`
      : `How much ${targetName} do you know? She'll teach to match.`;

  const options: { code: Cefr; label: string; desc: string }[] =
    uiLang === "th"
      ? [
          { code: "A1", label: "เพิ่งเริ่ม", desc: "เริ่มจากคำพื้นฐาน" },
          { code: "A2", label: "รู้บ้าง", desc: "รู้คำและประโยคง่าย ๆ" },
          { code: "B1", label: "พอคล่อง", desc: "คุยเรื่องทั่วไปได้" },
          { code: "B2", label: "คล่องแล้ว", desc: "มั่นใจแล้ว — ท้าหนูเลย" },
        ]
      : [
          { code: "A1", label: "Just starting", desc: "New — start with the essentials" },
          { code: "A2", label: "Know some", desc: "I know basic words and phrases" },
          { code: "B1", label: "Comfortable", desc: "I can hold everyday conversations" },
          { code: "B2", label: "Fluent", desc: "I'm confident — challenge me" },
        ];

  const current = (profile?.cefr_level as Cefr | null) ?? null;

  async function selectLevel(next: Cefr) {
    if (saving || !profile) return;
    setSaving(next);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ cefr_level: next })
      .eq("id", profile.id);
    if (!error && typeof window !== "undefined") {
      window.dispatchEvent(new Event("miomika:profile-refresh"));
    }
    router.push("/me");
    router.refresh();
  }

  return (
    <div
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "16px 20px 48px",
        minHeight: "100dvh",
      }}
    >
      <button
        type="button"
        onClick={() => router.push("/me")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "8px 0",
          color: COLORS.textMuted,
          fontFamily: FONT,
          fontSize: "15px",
        }}
      >
        <ChevronLeft size={20} strokeWidth={1.75} color={COLORS.textMuted} />
        {uiLang === "th" ? "กลับ" : "Back"}
      </button>

      <h1
        style={{
          margin: "12px 0 4px",
          fontFamily: FONT,
          fontSize: "24px",
          lineHeight: "32px",
          fontWeight: 600,
          color: COLORS.textPrimary,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: "0 0 24px",
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "14px",
          lineHeight: "20px",
          color: COLORS.textMuted,
        }}
      >
        {subtitle}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {options.map((opt) => {
          const selected = current === opt.code;
          const isSaving = saving === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              disabled={saving !== null}
              onClick={() => void selectLevel(opt.code)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "2px",
                width: "100%",
                padding: "16px 18px",
                borderRadius: "14px",
                textAlign: "left",
                cursor: saving !== null ? "default" : "pointer",
                background: selected
                  ? "rgba(110, 205, 184, 0.12)"
                  : "rgba(255, 255, 255, 0.7)",
                border: `1.5px solid ${selected ? COLORS.ctaSolid : COLORS.borderLight}`,
                boxShadow: selected
                  ? "0 2px 8px rgba(52, 169, 143, 0.15)"
                  : "0 1px 2px rgba(26, 26, 24, 0.04)",
                opacity: saving !== null && !isSaving ? 0.55 : 1,
                transition: "all 160ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: "17px",
                  fontWeight: 600,
                  color: selected ? COLORS.ctaSolid : COLORS.textPrimary,
                }}
              >
                {opt.label}
              </span>
              <span
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "13px",
                  lineHeight: "18px",
                  color: COLORS.textMuted,
                }}
              >
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
