"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Plus,
  Volume2,
  VolumeX,
  Globe,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  Mail,
  LogOut,
  Sparkles,
  Heart,
} from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { useUILanguage } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { pickMePhrase } from "@/lib/voice/warmth";

type JourneyStage = "tourist" | "student" | "worker" | "resident" | "entrepreneur";

const JOURNEY_LABELS: Record<JourneyStage, { th: string; en: string; emoji: string }> = {
  tourist: { th: "นักท่องเที่ยว", en: "Tourist", emoji: "🧳" },
  student: { th: "นักเรียน", en: "Student", emoji: "📚" },
  worker: { th: "คนทำงาน", en: "Worker", emoji: "💼" },
  resident: { th: "ผู้อยู่อาศัย", en: "Resident", emoji: "🏠" },
  entrepreneur: { th: "ผู้ประกอบการ", en: "Entrepreneur", emoji: "✨" },
};

export default function MePage() {
  const router = useRouter();
  const { profile } = useProfile();
  const uiLang = useUILanguage();
  const [ttsOn, setTtsOn] = useState(() => {
    if (typeof window === "undefined") return true;
    const ttsStored = window.localStorage.getItem("miomika.tts_on");
    return ttsStored === null ? true : ttsStored === "1";
  });
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [voiceLang, setVoiceLang] = useState<"th" | "en" | "both">("both");
  const [heroGreeting] = useState(() => pickMePhrase("hero_greeting"));
  const [memoryEmpty] = useState(() => pickMePhrase("memory_empty"));
  const [growthFirstDay] = useState(() => pickMePhrase("growth_first_day"));
  const [voiceTokensEmpty] = useState(() => pickMePhrase("voice_tokens_empty"));

  const displayName = profile?.display_name
    ?? profile?.email?.split("@")[0]
    ?? (uiLang === "en" ? "Friend" : "เพื่อน");
  const tier = profile?.tier ?? "free";
  const journeyStage = (profile?.journey_stage ?? "student") as JourneyStage;
  const journey = JOURNEY_LABELS[journeyStage] ?? JOURNEY_LABELS.student;
  const isPro = tier === "pro" || tier === "pro_max";

  const handleLogout = async () => {
    const confirmPhrase = pickMePhrase("logout_confirm");
    const message = uiLang === "en" ? confirmPhrase.en : confirmPhrase.th;
    if (typeof window !== "undefined" && window.confirm(message)) {
      const supabase = createClient();
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.startsWith("supabase")) localStorage.removeItem(k);
      });
      sessionStorage.clear();
      await supabase.auth.signOut({ scope: "global" });
      router.push("/");
    }
  };

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "54px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 16px",
          paddingTop: "calc(env(safe-area-inset-top, 0px))",
          background: "transparent",
        }}
      >
        <h1
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "16px",
            fontWeight: 500,
            color: "#3D352B",
            margin: 0,
          }}
        >
          {uiLang === "en" ? heroGreeting.en : heroGreeting.th}
        </h1>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "8px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 16px 24px",
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(10px)",
            border: "0.5px solid rgba(237,232,224,0.6)",
            borderRadius: "24px",
            boxShadow: "0 6px 18px rgba(26,26,24,0.05)",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FFF4E8 0%, #FFE8D6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
              boxShadow: "0 6px 16px rgba(249,168,212,0.18)",
            }}
          >
            <Image
              src="/characters/miomi/head/idle.png"
              alt="Avatar"
              width={92}
              height={92}
              style={{ objectFit: "contain", borderRadius: "50%" }}
              priority
            />
            {isPro && (
              <div
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 10px rgba(201,169,110,0.4)",
                  border: "2px solid #FFFFFF",
                }}
                aria-label={tier === "pro_max" ? "Pro Max" : "Pro"}
              >
                <Sparkles size={16} color="#FFFFFF" strokeWidth={2.5} />
              </div>
            )}
          </div>

          <p
            style={{
              fontFamily: "'Kanit', sans-serif",
              fontSize: "20px",
              fontWeight: 500,
              color: "#1A1A18",
              margin: "0 0 4px",
            }}
          >
            {displayName}
          </p>

          {isPro ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
                fontFamily: "'Kanit', sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                color: "#FFFFFF",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}
            >
              <Sparkles size={11} strokeWidth={2.5} />
              {tier === "pro_max" ? "PRO MAX" : "PRO"}
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "rgba(237,232,224,0.5)",
                border: "0.5px solid rgba(237,232,224,0.8)",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "10.5px",
                fontWeight: 600,
                color: "#9A8B73",
                letterSpacing: "0.04em",
                marginBottom: "12px",
              }}
            >
              {uiLang === "en" ? "FREE" : "ฟรี"}
            </div>
          )}

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center" }}>
            <Chip>
              <span style={{ fontSize: "13px" }}>{journey.emoji}</span>
              <span>{uiLang === "en" ? journey.en : journey.th}</span>
            </Chip>
            <Chip>
              <Globe size={11} color="#9A8B73" strokeWidth={2} />
              <span>{uiLang === "en" ? "TH ↔ EN" : "ไทย ↔ อังกฤษ"}</span>
            </Chip>
          </div>
        </motion.section>

        <Section title={uiLang === "en" ? "Your plan" : "แพ็คเกจของคุณ"}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "15px", fontWeight: 500, color: "#1A1A18", margin: "0 0 2px" }}>
                  {tier === "pro_max" ? "Pro Max" : tier === "pro" ? "Pro" : (uiLang === "en" ? "Free" : "ฟรี")}
                </p>
                <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11.5px", color: "#9A8B73", margin: 0 }}>
                  {isPro
                    ? (uiLang === "en" ? "Unlimited memory · premium voice · more intelligent" : "ความจำไม่จำกัด · เสียงพรีเมียม · ฉลาดกว่า")
                    : (uiLang === "en" ? "5 exchanges per session · basic voice" : "5 ครั้งต่อรอบ · เสียงพื้นฐาน")}
                </p>
              </div>
            </div>
            {!isPro && (
              <Link
                href="/pricing"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "44px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
                  fontFamily: "'Kanit', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#FFFFFF",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(201,169,110,0.3)",
                  marginTop: "14px",
                }}
              >
                <Sparkles size={16} strokeWidth={2.5} style={{ marginRight: "6px" }} />
                {uiLang === "en" ? "Upgrade to Pro" : "อัปเกรดเป็น Pro"}
              </Link>
            )}
            {isPro && (
              <Row label={uiLang === "en" ? "Manage subscription" : "จัดการแพ็คเกจ"} href="/pricing" />
            )}
          </Card>
        </Section>

        <Section title={uiLang === "en" ? "Premium voice" : "เสียงพรีเมียม"}>
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: "'Kanit', sans-serif", fontSize: "13.5px", fontWeight: 500, color: "#1A1A18", margin: "0 0 2px" }}>
                  {uiLang === "en" ? "Voice tokens" : "โทเค็นเสียง"}
                </p>
                <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11.5px", color: "#9A8B73", margin: 0 }}>
                  0 {uiLang === "en" ? "tokens" : "โทเค็น"}
                </p>
              </div>
              <div style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "11px", color: "#C9A96E", fontWeight: 600 }}>
                {uiLang === "en" ? voiceTokensEmpty.en : voiceTokensEmpty.th}
              </div>
            </div>
          </Card>
        </Section>

        <Section
          title={uiLang === "en" ? "What Miomi remembers" : "สิ่งที่หนูจำได้"}
          subtitle={uiLang === "en" ? "Edit, add, or remove anytime" : "แก้ไข เพิ่ม หรือลบได้ทุกเมื่อ"}
        >
          <Card>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                padding: "8px 0",
              }}
            >
              <Heart size={28} color="#F9A8D4" strokeWidth={1.5} />
              <p
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "12.5px",
                  color: "#9A8B73",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.5,
                  maxWidth: "260px",
                }}
              >
                {uiLang === "en" ? memoryEmpty.en : memoryEmpty.th}
              </p>
              <button
                type="button"
                disabled
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  marginTop: "4px",
                  padding: "6px 14px",
                  borderRadius: "999px",
                  background: "rgba(237,232,224,0.4)",
                  border: "0.5px solid rgba(237,232,224,0.6)",
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#9A8B73",
                  cursor: "not-allowed",
                  opacity: 0.7,
                }}
                aria-label="Add memory"
              >
                <Plus size={12} strokeWidth={2.5} />
                {uiLang === "en" ? "Add (soon)" : "เพิ่ม (เร็วๆ นี้)"}
              </button>
            </div>
          </Card>
        </Section>

        <Section title={uiLang === "en" ? "Settings" : "การตั้งค่า"}>
          <Card>
            <ToggleRow
              icon={ttsOn ? Volume2 : VolumeX}
              label={uiLang === "en" ? "Voice on" : "เสียงเปิด"}
              hint={uiLang === "en" ? "Miomi speaks her replies" : "หนูจะพูดคำตอบ"}
              checked={ttsOn}
              onChange={(v) => {
                setTtsOn(v);
                if (typeof window !== "undefined") window.localStorage.setItem("miomika.tts_on", v ? "1" : "0");
              }}
            />
            <Divider />
            <CycleRow
              icon={Globe}
              label={uiLang === "en" ? "Voice language" : "ภาษาเสียง"}
              value={voiceLang === "both" ? (uiLang === "en" ? "Auto" : "อัตโนมัติ") : voiceLang === "th" ? "ไทย" : "English"}
              onCycle={() => setVoiceLang((p) => (p === "both" ? "th" : p === "th" ? "en" : "both"))}
            />
            <Divider />
            <ToggleRow
              icon={Bell}
              label={uiLang === "en" ? "Notifications" : "แจ้งเตือน"}
              hint={uiLang === "en" ? "Daily reminders from Miomi" : "เตือนรายวันจากหนู"}
              checked={notificationsOn}
              onChange={setNotificationsOn}
            />
          </Card>
        </Section>

        <Section title={uiLang === "en" ? "Our story so far" : "เรื่องราวของเรา"}>
          <Card>
            <p
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "12.5px",
                color: "#9A8B73",
                margin: "0 0 12px",
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              {uiLang === "en" ? growthFirstDay.en : growthFirstDay.th}
            </p>
            <Row label={uiLang === "en" ? "See full progress" : "ดูความก้าวหน้าทั้งหมด"} href="/dashboard" />
          </Card>
        </Section>

        <Section title={uiLang === "en" ? "Help & info" : "ช่วยเหลือ & ข้อมูล"}>
          <Card>
            <Row label={uiLang === "en" ? "Help & FAQ" : "ช่วยเหลือ & คำถามที่พบบ่อย"} icon={HelpCircle} href="/help" />
            <Divider />
            <Row label={uiLang === "en" ? "Privacy" : "ความเป็นส่วนตัว"} icon={Shield} href="/legal/privacy" />
            <Divider />
            <Row label={uiLang === "en" ? "Terms" : "ข้อกำหนด"} icon={FileText} href="/legal/terms" />
            <Divider />
            <Row label={uiLang === "en" ? "Contact" : "ติดต่อ"} icon={Mail} href="mailto:hello@miomika.com" external />
          </Card>
        </Section>

        <button
          type="button"
          onClick={() => void handleLogout()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            height: "44px",
            borderRadius: "999px",
            background: "transparent",
            border: "0.5px solid rgba(154,139,115,0.3)",
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "13px",
            fontWeight: 600,
            color: "#9A8B73",
            cursor: "pointer",
            marginTop: "8px",
          }}
        >
          <LogOut size={14} strokeWidth={2} />
          {uiLang === "en" ? "Log out" : "ออกจากระบบ"}
        </button>

        <div style={{ height: "8px" }} />
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 12px",
        borderRadius: "999px",
        background: "rgba(255,255,255,0.8)",
        border: "0.5px solid rgba(237,232,224,0.7)",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: "11.5px",
        fontWeight: 500,
        color: "#5A4F40",
        boxShadow: "0 1px 3px rgba(26,26,24,0.04)",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section>
      <div style={{ padding: "0 4px 8px" }}>
        <h2
          style={{
            fontFamily: "'Kanit', sans-serif",
            fontSize: "13px",
            fontWeight: 500,
            color: "#5A4F40",
            margin: 0,
            letterSpacing: "0.01em",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "11px",
              color: "#9A8B73",
              margin: "2px 0 0",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(10px)",
        border: "0.5px solid rgba(237,232,224,0.6)",
        borderRadius: "18px",
        padding: "14px 16px",
        boxShadow: "0 4px 14px rgba(26,26,24,0.04)",
      }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  icon: Icon,
  href,
  external,
}: {
  label: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  href: string;
  external?: boolean;
}) {
  const content = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 0",
        cursor: "pointer",
        textDecoration: "none",
      }}
    >
      {Icon && <Icon size={16} color="#9A8B73" strokeWidth={2} />}
      <span
        style={{
          flex: 1,
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "13px",
          color: "#3D352B",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <ChevronRight size={16} color="#9A8B73" strokeWidth={2} />
    </div>
  );

  if (external) {
    return (
      <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {content}
    </Link>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
      <Icon size={16} color="#9A8B73" strokeWidth={2} />
      <div style={{ flex: 1 }}>
        <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "13px", fontWeight: 500, color: "#3D352B", margin: 0 }}>{label}</p>
        {hint && (
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "10.5px", color: "#9A8B73", margin: "2px 0 0" }}>{hint}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: "38px",
          height: "22px",
          borderRadius: "999px",
          background: checked ? "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)" : "rgba(154,139,115,0.25)",
          border: "none",
          position: "relative",
          cursor: "pointer",
          transition: "background 200ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: checked ? "18px" : "2px",
            width: "18px",
            height: "18px",
            borderRadius: "50%",
            background: "#FFFFFF",
            boxShadow: "0 2px 4px rgba(26,26,24,0.15)",
            transition: "left 200ms ease",
          }}
        />
      </button>
    </div>
  );
}

function CycleRow({
  icon: Icon,
  label,
  value,
  onCycle,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  onCycle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCycle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 0",
        background: "transparent",
        border: "none",
        width: "100%",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Icon size={16} color="#9A8B73" strokeWidth={2} />
      <span style={{ flex: 1, fontFamily: "'Quicksand', sans-serif", fontSize: "13px", fontWeight: 500, color: "#3D352B" }}>{label}</span>
      <span
        style={{
          padding: "4px 10px",
          borderRadius: "999px",
          background: "rgba(232,199,122,0.12)",
          border: "0.5px solid rgba(232,199,122,0.3)",
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          color: "#B8985C",
        }}
      >
        {value}
      </span>
    </button>
  );
}

function Divider() {
  return <div style={{ height: "0.5px", background: "rgba(237,232,224,0.6)", margin: "0" }} />;
}
