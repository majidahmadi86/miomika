"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Settings,
  Sparkles,
  Flame,
  TrendingUp,
  Globe,
  Plane,
  GraduationCap,
  Briefcase,
  Home,
  Gift,
  LogOut,
  ChevronRight,
  Crown,
} from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { useUILanguage } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { COLORS } from "@/lib/design/colors";

export default function ProfilePage() {
  const { profile, authReady, loading } = useProfile();
  const lang = useUILanguage();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  // DIAGNOSTIC: remove after verifying profile loads correctly
  useEffect(() => {
    console.log("[ProfilePage]", {
      authReady,
      loading,
      profile: profile ? { id: profile.id, email: profile.email, tier: profile.tier } : null,
    });
  }, [authReady, loading, profile]);

  // STATE 1: Auth not resolved yet — show cream screen, NOT guest view
  if (!authReady) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: COLORS.bg,
        }}
        aria-hidden="true"
      />
    );
  }

  // STATE 2: Auth resolved, no profile → guest view (true guest, no session)
  if (!profile) {
    return <GuestProfileView lang={lang} router={router} />;
  }

  // STATE 3: Auth resolved, profile.tier = guest → guest view
  if (profile.tier === "guest") {
    return <GuestProfileView lang={lang} router={router} />;
  }

  // STATE 4: Logged-in user (free / pro / pro_max) → hybrid view
  return (
    <LoggedInProfileView
      profile={profile}
      lang={lang}
      router={router}
      signingOut={signingOut}
      setSigningOut={setSigningOut}
    />
  );
}

function GuestProfileView({ lang, router }: { lang: "th" | "en"; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{
      minHeight: "100svh",
      background: COLORS.bg,
      padding: "16px",
      paddingBottom: "100px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    }}>
      <PageHeader lang={lang} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: COLORS.surface,
          borderRadius: "16px",
          padding: "32px 24px",
          border: `1px solid ${COLORS.borderLight}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div style={{ position: "relative", width: "120px", height: "120px" }}>
          <Image
            src="/miomi/happy.png"
            alt="Miomi"
            fill
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        <div style={{ textAlign: "center" }}>
          <h2 style={{
            fontSize: "20px",
            fontWeight: 500,
            color: COLORS.textPrimary,
            fontFamily: "Kanit, sans-serif",
            margin: 0,
            marginBottom: "6px",
          }}>
            {lang === "th" ? "อยากให้หนูจำชื่อคุณได้ไหมคะ~" : "Want me to remember your name?"}
          </h2>
          <p style={{
            fontSize: "13px",
            color: COLORS.textMuted,
            fontFamily: "Quicksand, sans-serif",
            margin: 0,
          }}>
            {lang === "th"
              ? "Sign up so Miomi can remember you forever"
              : "ลงทะเบียนเพื่อให้มิโอมิจำคุณได้ตลอดไป"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/signup")}
          style={{
            width: "100%",
            padding: "16px 24px",
            background: COLORS.ctaGradient,
            color: "#FFFFFF",
            border: "none",
            borderRadius: "999px",
            fontSize: "15px",
            fontWeight: 600,
            fontFamily: "Kanit, sans-serif",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(201, 169, 110, 0.25)",
          }}
        >
          {lang === "th" ? "สมัครฟรี — ไม่มีค่าใช้จ่าย" : "Sign up free — no card needed"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/login")}
          style={{
            background: "transparent",
            border: "none",
            color: COLORS.ctaSolid,
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "Quicksand, sans-serif",
            cursor: "pointer",
          }}
        >
          {lang === "th" ? "มีบัญชีแล้ว? เข้าสู่ระบบค่า →" : "Already have an account? Sign in →"}
        </button>
      </motion.div>

      <div style={{
        background: COLORS.surface,
        borderRadius: "16px",
        padding: "20px",
        border: `1px solid ${COLORS.borderLight}`,
      }}>
        <p style={{
          fontSize: "12px",
          color: COLORS.textMuted,
          fontFamily: "Quicksand, sans-serif",
          marginTop: 0,
          marginBottom: "16px",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}>
          {lang === "th" ? "เมื่อสมัครแล้วคุณจะได้รับ" : "When you sign up, you get"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <BenefitRow
            icon={<Sparkles size={18} strokeWidth={1.75} color={COLORS.ctaSolid} />}
            titleTh="มิโอมิจำชื่อและความชอบของคุณ"
            titleEn="Miomi remembers you across sessions"
            lang={lang}
          />
          <BenefitRow
            icon={<TrendingUp size={18} strokeWidth={1.75} color={COLORS.ctaSolid} />}
            titleTh="ติดตามคำศัพท์ที่เรียนได้"
            titleEn="Track vocabulary and progress"
            lang={lang}
          />
          <BenefitRow
            icon={<Flame size={18} strokeWidth={1.75} color={COLORS.ctaSolid} />}
            titleTh="ระบบ streak และ level up"
            titleEn="Streak and level progression"
            lang={lang}
          />
          <BenefitRow
            icon={<Gift size={18} strokeWidth={1.75} color={COLORS.ctaSolid} />}
            titleTh="ระบบ referral และรางวัล"
            titleEn="Referral rewards system"
            lang={lang}
          />
        </div>
      </div>

      <div style={{
        background: COLORS.surfaceWarm,
        borderRadius: "16px",
        padding: "20px",
        textAlign: "center",
      }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 500,
          color: COLORS.textPrimary,
          fontFamily: "Kanit, sans-serif",
          margin: 0,
          marginBottom: "4px",
        }}>
          {lang === "th" ? "แชร์ Miomika ให้เพื่อน" : "Share Miomika with friends"}
        </p>
        <p style={{
          fontSize: "13px",
          color: COLORS.textMuted,
          fontFamily: "Quicksand, sans-serif",
          margin: 0,
        }}>
          miomika.com
        </p>
      </div>
    </div>
  );
}

function BenefitRow({ icon, titleTh, titleEn, lang }: {
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  lang: "th" | "en";
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        background: COLORS.surfaceWarm,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 500,
          color: COLORS.textPrimary,
          fontFamily: "Kanit, sans-serif",
          margin: 0,
        }}>
          {lang === "th" ? titleTh : titleEn}
        </p>
        <p style={{
          fontSize: "11px",
          color: COLORS.textMuted,
          fontFamily: "Quicksand, sans-serif",
          margin: 0,
          marginTop: "2px",
        }}>
          {lang === "th" ? titleEn : titleTh}
        </p>
      </div>
    </div>
  );
}

function LoggedInProfileView({
  profile,
  lang,
  router,
  signingOut,
  setSigningOut,
}: {
  profile: NonNullable<ReturnType<typeof useProfile>["profile"]>;
  lang: "th" | "en";
  router: ReturnType<typeof useRouter>;
  signingOut: boolean;
  setSigningOut: (v: boolean) => void;
}) {
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.startsWith("supabase")) localStorage.removeItem(k);
      });
      sessionStorage.clear();
    }
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/";
  };

  const isFree = profile.tier === "free";

  return (
    <div style={{
      minHeight: "100svh",
      background: COLORS.bg,
      padding: "16px",
      paddingBottom: "100px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    }}>
      <PageHeader lang={lang} />

      <div style={{
        background: COLORS.surface,
        borderRadius: "16px",
        padding: "24px 20px",
        border: `1px solid ${COLORS.borderLight}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: COLORS.surfaceWarm,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <Image
              src="/characters/miomi/companion/companion-happy.png"
              alt=""
              width={56}
              height={56}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              fontSize: "18px",
              fontWeight: 600,
              color: COLORS.textPrimary,
              fontFamily: "Kanit, sans-serif",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {profile.display_name ?? (lang === "th" ? "เพื่อนใหม่" : "Friend")}
            </h2>
            <p style={{
              fontSize: "12px",
              color: COLORS.textMuted,
              fontFamily: "Quicksand, sans-serif",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {profile.email}
            </p>
          </div>

          <TierBadge tier={profile.tier} />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
        }}>
          <StatCell
            icon={<TrendingUp size={16} strokeWidth={1.75} color={COLORS.ctaSolid} />}
            value={String(profile.level ?? 1)}
            label="Level"
          />
          <StatCell
            icon={<Sparkles size={16} strokeWidth={2} color={COLORS.ctaSolid} />}
            value={String(profile.miomi_stars ?? 0)}
            label="Stars"
          />
          <StatCell
            icon={<Flame size={16} strokeWidth={1.75} color={COLORS.coralAccent} />}
            value={String(profile.streak ?? 0)}
            label="Streak"
          />
          <StatCell
            icon={<JourneyIcon stage={profile.journey_stage} />}
            value={journeyShort(profile.journey_stage, lang)}
            label={lang === "th" ? "ตอนนี้" : "Stage"}
          />
        </div>
      </div>

      <div style={{
        background: COLORS.surface,
        borderRadius: "16px",
        border: `1px solid ${COLORS.borderLight}`,
        overflow: "hidden",
      }}>
        <SectionLabel lang={lang} th="บัญชี" en="Account" />

        <AccountRow
          icon={<Globe size={18} strokeWidth={1.75} color={COLORS.textMuted} />}
          titleTh="ภาษา"
          titleEn="Language"
          value={profile.ui_language === "en" ? "English" : "ไทย"}
          onClick={() => router.push("/profile/language")}
          lang={lang}
        />
        <AccountRow
          icon={<JourneyIcon stage={profile.journey_stage} muted />}
          titleTh="ขั้นการเดินทาง"
          titleEn="Journey stage"
          value={journeyLabel(profile.journey_stage, lang)}
          onClick={() => router.push("/profile/journey")}
          lang={lang}
        />
        <AccountRow
          icon={<Gift size={18} strokeWidth={1.75} color={COLORS.textMuted} />}
          titleTh="โค้ดเชิญเพื่อน"
          titleEn="Referral code"
          value={lang === "th" ? "เร็วๆ นี้" : "Coming soon"}
          onClick={() => router.push("/invite")}
          lang={lang}
        />
      </div>

      {isFree && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1], delay: 0.08 }}
          onClick={() => router.push("/pricing")}
          style={{
            width: "100%",
            padding: "20px 24px",
            background: COLORS.ctaGradient,
            color: "#FFFFFF",
            border: "none",
            borderRadius: "16px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 4px 16px rgba(201, 169, 110, 0.28)",
          }}
        >
          <Crown size={28} strokeWidth={1.75} />
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{
              fontSize: "16px",
              fontWeight: 600,
              fontFamily: "Kanit, sans-serif",
              margin: 0,
            }}>
              {lang === "th" ? "อัปเกรดเป็น Pro Miomi" : "Upgrade to Pro Miomi"}
            </p>
            <p style={{
              fontSize: "12px",
              fontWeight: 400,
              fontFamily: "Quicksand, sans-serif",
              margin: 0,
              marginTop: "2px",
              opacity: 0.92,
            }}>
              {lang === "th" ? "299 บาท/เดือน — เริ่มได้เลย" : "299 THB/mo — start anytime"}
            </p>
          </div>
          <ChevronRight size={20} strokeWidth={2} />
        </motion.button>
      )}

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: "12px",
          color: COLORS.textMuted,
          fontSize: "14px",
          fontWeight: 500,
          fontFamily: "Kanit, sans-serif",
          cursor: signingOut ? "not-allowed" : "pointer",
          opacity: signingOut ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginTop: "8px",
        }}
      >
        <LogOut size={16} strokeWidth={1.75} />
        {signingOut
          ? (lang === "th" ? "กำลังออก..." : "Signing out...")
          : (lang === "th" ? "ออกจากระบบ" : "Sign out")
        }
      </button>
    </div>
  );
}

function PageHeader({ lang }: { lang: "th" | "en" }) {
  return (
    <div style={{ paddingTop: "8px", paddingBottom: "4px" }}>
      <h1 style={{
        fontSize: "24px",
        fontWeight: 600,
        color: COLORS.textPrimary,
        fontFamily: "Kanit, sans-serif",
        margin: 0,
        lineHeight: 1.2,
      }}>
        {lang === "th" ? "ฉัน" : "Me"}
      </h1>
      <p style={{
        fontSize: "13px",
        color: COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        margin: 0,
        marginTop: "2px",
      }}>
        {lang === "th" ? "Me" : "ฉัน"}
      </p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const isPro = tier === "pro" || tier === "pro_max";
  const label = tier === "pro_max" ? "Pro Max"
    : tier === "pro" ? "Pro"
    : tier === "free" ? "Free"
    : "Guest";

  return (
    <div style={{
      padding: "4px 10px",
      borderRadius: "999px",
      background: isPro ? COLORS.ctaGradient : COLORS.surfaceWarm,
      border: isPro ? "none" : `1px solid ${COLORS.borderMedium}`,
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      flexShrink: 0,
    }}>
      {isPro && <Crown size={12} strokeWidth={2} color="#FFFFFF" />}
      <span style={{
        fontSize: "11px",
        fontWeight: 600,
        color: isPro ? "#FFFFFF" : COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        letterSpacing: "0.4px",
      }}>
        {label}
      </span>
    </div>
  );
}

function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{
      background: COLORS.surfaceWarm,
      borderRadius: "10px",
      padding: "10px 6px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "2px",
    }}>
      {icon}
      <p style={{
        fontSize: "15px",
        fontWeight: 600,
        color: COLORS.textPrimary,
        fontFamily: "Kanit, sans-serif",
        margin: 0,
        marginTop: "2px",
      }}>
        {value}
      </p>
      <p style={{
        fontSize: "10px",
        color: COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        margin: 0,
        letterSpacing: "0.3px",
        textTransform: "uppercase",
      }}>
        {label}
      </p>
    </div>
  );
}

function SectionLabel({ lang, th, en }: { lang: "th" | "en"; th: string; en: string }) {
  return (
    <p style={{
      fontSize: "11px",
      color: COLORS.textMuted,
      fontFamily: "Quicksand, sans-serif",
      letterSpacing: "0.5px",
      textTransform: "uppercase",
      margin: 0,
      padding: "16px 20px 8px",
    }}>
      {lang === "th" ? `${th} · ${en}` : `${en} · ${th}`}
    </p>
  );
}

function AccountRow({ icon, titleTh, titleEn, value, onClick, lang }: {
  icon: React.ReactNode;
  titleTh: string;
  titleEn: string;
  value: string;
  onClick: () => void;
  lang: "th" | "en";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        padding: "14px 20px",
        background: "transparent",
        border: "none",
        borderTop: `1px solid ${COLORS.borderLight}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        textAlign: "left",
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 500,
          color: COLORS.textPrimary,
          fontFamily: "Kanit, sans-serif",
          margin: 0,
        }}>
          {lang === "th" ? titleTh : titleEn}
        </p>
      </div>
      <p style={{
        fontSize: "13px",
        color: COLORS.textMuted,
        fontFamily: "Quicksand, sans-serif",
        margin: 0,
        flexShrink: 0,
      }}>
        {value}
      </p>
      <ChevronRight size={16} strokeWidth={1.75} color={COLORS.textSubtle} style={{ flexShrink: 0 }} />
    </button>
  );
}

function JourneyIcon({ stage, muted = false }: { stage: string | null; muted?: boolean }) {
  const color = muted ? COLORS.textMuted : COLORS.ctaSolid;
  if (stage === "tourist") return <Plane size={16} strokeWidth={1.75} color={color} />;
  if (stage === "student") return <GraduationCap size={16} strokeWidth={1.75} color={color} />;
  if (stage === "worker") return <Briefcase size={16} strokeWidth={1.75} color={color} />;
  if (stage === "resident") return <Home size={16} strokeWidth={1.75} color={color} />;
  return <Settings size={16} strokeWidth={1.75} color={color} />;
}

function journeyShort(stage: string | null, lang: "th" | "en"): string {
  if (stage === "tourist") return lang === "th" ? "เที่ยว" : "Tourist";
  if (stage === "student") return lang === "th" ? "เรียน" : "Student";
  if (stage === "worker") return lang === "th" ? "ทำงาน" : "Worker";
  if (stage === "resident") return lang === "th" ? "อยู่" : "Resident";
  return "—";
}

function journeyLabel(stage: string | null, lang: "th" | "en"): string {
  if (stage === "tourist") return lang === "th" ? "นักท่องเที่ยว" : "Tourist";
  if (stage === "student") return lang === "th" ? "นักเรียน" : "Student";
  if (stage === "worker") return lang === "th" ? "คนทำงาน" : "Worker";
  if (stage === "resident") return lang === "th" ? "อาศัยอยู่" : "Resident";
  return lang === "th" ? "ยังไม่ได้ระบุ" : "Not specified";
}
