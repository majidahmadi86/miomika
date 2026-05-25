"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Plane, GraduationCap, Briefcase, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { COLORS } from "@/lib/design/colors";
import { useUILanguage } from "@/lib/i18n/client";
import { useProfile, type JourneyStage } from "@/lib/auth/use-profile";

const STAGES: {
  id: JourneyStage;
  icon: typeof Plane;
  th: string;
  en: string;
}[] = [
  { id: "tourist", icon: Plane, th: "นักท่องเที่ยว", en: "Tourist" },
  { id: "student", icon: GraduationCap, th: "นักเรียน", en: "Student" },
  { id: "worker", icon: Briefcase, th: "คนทำงาน", en: "Worker" },
  { id: "resident", icon: Home, th: "อาศัยอยู่", en: "Resident" },
];

// TODO(phase-6): full settings UI with curriculum preview per stage
export default function ProfileJourneyPage() {
  const router = useRouter();
  const lang = useUILanguage();
  const { profile } = useProfile();
  const [saving, setSaving] = useState<JourneyStage | null>(null);

  async function selectStage(stage: JourneyStage) {
    if (saving || !profile) return;
    setSaving(stage);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ journey_stage: stage })
      .eq("id", profile.id);
    if (!error) {
      window.dispatchEvent(new Event("miomika:profile-refresh"));
    }
    router.push("/me");
    router.refresh();
  }

  const current = profile?.journey_stage;

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
        {lang === "th" ? "ขั้นการเดินทาง" : "Journey stage"}
      </h1>
      <p style={{
        fontSize: "13px",
        color: COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        margin: "0 0 24px",
      }}>
        {lang === "th" ? "Journey stage" : "ขั้นการเดินทาง"}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {STAGES.map(({ id, icon: Icon, th, en }) => (
          <button
            key={id}
            type="button"
            disabled={saving !== null}
            onClick={() => void selectStage(id)}
            style={{
              width: "100%",
              padding: "16px 20px",
              borderRadius: "12px",
              border: `1px solid ${current === id ? COLORS.ctaSolid : COLORS.borderLight}`,
              background: current === id ? COLORS.surfaceWarm : COLORS.surface,
              cursor: saving ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textAlign: "left",
            }}
          >
            <Icon size={20} strokeWidth={1.75} color={COLORS.ctaSolid} />
            <div>
              <p style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 500,
                fontFamily: "Kanit, sans-serif",
                color: COLORS.textPrimary,
              }}>
                {lang === "th" ? th : en}
              </p>
              <p style={{
                margin: "2px 0 0",
                fontSize: "12px",
                fontFamily: "Quicksand, sans-serif",
                color: COLORS.textMuted,
              }}>
                {lang === "th" ? en : th}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
