"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Globe,
  MapPin,
  Mic,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { useUILanguage } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { COLORS, CTA_GRADIENT } from "@/lib/design/colors";
import { me } from "@/lib/voice/warmth";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";
const CTA_SHADOW =
  "0 2px 6px rgba(201, 169, 110, 0.24), 0 8px 20px rgba(201, 169, 110, 0.18)";
const AVATAR_SHADOW =
  "0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 1)";
const FONT = "'Kanit', 'Quicksand', sans-serif";

type JourneyStage = "tourist" | "student" | "worker" | "resident" | "entrepreneur" | "unspecified";

function capitalizeStage(stage: string): string {
  if (!stage || stage === "unspecified") return "Student";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

function daysWithMiomi(onboardingAt: string | null, lastSeenAt: string | null): number {
  const start = onboardingAt ?? lastSeenAt;
  if (!start) return 0;
  const diff = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function tierLabel(tier: string): string {
  if (tier === "pro_max") return "Miomika Pro Max";
  if (tier === "pro") return "Miomika Pro";
  return "Miomika Free";
}

function tierSummary(tier: string): string {
  if (tier === "pro_max") return "Premium engine, unlimited memory";
  if (tier === "pro") return "Priority AI, 20 sessions memory";
  return "Unlimited library, daily fuel limits";
}

export default function MePage() {
  const router = useRouter();
  const uiLang = useUILanguage();
  const { profile, authReady } = useProfile();
  const [canGoBack] = useState(
    () => typeof window !== "undefined" && window.history.length > 1,
  );
  const [ttsOn, setTtsOn] = useState(() => {
    if (typeof window === "undefined") return true;
    const ttsStored = window.localStorage.getItem("miomika.tts_on");
    return ttsStored === null ? true : ttsStored === "1";
  });
  const [notificationsOn, setNotificationsOn] = useState(false);

  const displayName =
    profile?.display_name ?? profile?.email?.split("@")[0] ?? (uiLang === "en" ? "Friend" : "เพื่อน");
  const tier = profile?.tier ?? "free";
  const isFree = tier === "free" || tier === "guest";
  const showProBadge = tier === "pro" || tier === "pro_max";
  const journeyStage = (profile?.journey_stage ?? "student") as JourneyStage;
  const days = daysWithMiomi(profile?.onboarding_completed_at ?? null, profile?.last_seen_at ?? null);
  const wordsLearned = profile?.level != null ? profile.level * 10 : 0;
  const learningLang = "English";
  const location = "Thailand";
  const voiceCredits = 0;
  const uiLangLabel = profile?.ui_language === "en" ? "English" : "ไทย";
  const hasMemoryRows = Boolean(profile?.display_name);
  const memoriesCount = hasMemoryRows ? 3 : 0;

  const copy = useMemo(
    () => ({
      sectionSub: me.section.pickSubscription(uiLang),
      sectionMem: me.section.pickMemory(uiLang),
      sectionVoice: me.section.pickVoice(uiLang),
      sectionSettings: me.section.pickSettings(uiLang),
      sectionHelp: me.section.pickHelp(uiLang),
      ctaUpgrade: me.cta.pickUpgrade(uiLang),
      ctaManage: me.cta.pickManage(uiLang),
      ctaEditMemory: me.cta.pickEditMemory(uiLang),
      ctaTopupVoice: me.cta.pickTopupVoice(uiLang),
      emptyMemory: me.empty.pickMemory(uiLang),
      logoutLabel: me.logout.pick(uiLang),
      badgePro: me.badge.pickPro(uiLang),
      badgeProMax: me.badge.pickProMax(uiLang),
      settingsVoice: me.settings.pickVoice(uiLang),
      settingsLanguage: me.settings.pickLanguage(uiLang),
      settingsNotifications: me.settings.pickNotifications(uiLang),
      rowVoiceTokens: me.row.pickVoiceTokens(uiLang),
      linkHelp: me.link.pickHelp(uiLang),
      linkPrivacy: me.link.pickPrivacy(uiLang),
      linkTerms: me.link.pickTerms(uiLang),
      linkContact: me.link.pickContact(uiLang),
      growthStory:
        days < 2
          ? me.identity.pickWelcomeBack(uiLang)
          : me.growthStory({ days, memoriesCount, wordsLearned }, uiLang),
      memCallsYou: hasMemoryRows ? me.memory.pickCallsYou(displayName, uiLang) : "",
      memLearning: hasMemoryRows ? me.memory.pickLearning(learningLang, uiLang) : "",
      memLivesIn: hasMemoryRows ? me.memory.pickLivesIn(location, uiLang) : "",
    }),
    [uiLang, days, memoriesCount, wordsLearned, hasMemoryRows, displayName],
  );

  const memoryRows = useMemo(
    () =>
      hasMemoryRows
        ? [
            { id: "name", label: copy.memCallsYou },
            { id: "lang", label: copy.memLearning },
            { id: "loc", label: copy.memLivesIn },
          ]
        : [],
    [hasMemoryRows, copy.memCallsYou, copy.memLearning, copy.memLivesIn],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!profile && typeof window !== "undefined") {
      router.replace("/login");
    }
  }, [authReady, profile, router]);

  const handleLogout = async () => {
    const supabase = createClient();
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("sb-") || k.startsWith("supabase")) localStorage.removeItem(k);
    });
    sessionStorage.clear();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/");
  };

  if (!authReady || !profile) {
    return (
      <div
        style={{
          minHeight: "100svh",
          background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
        padding: "16px 24px 96px",
        overflowX: "hidden",
        width: "100%",
      }}
    >
      {/* Transparent top bar */}
      <div
        style={{
          height: "48px",
          display: "flex",
          alignItems: "center",
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "transparent",
        }}
      >
        {canGoBack && (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ChevronLeft size={24} color={COLORS.textMuted} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Identity hero — no card */}
      <section
        style={{
          marginTop: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "999px",
            overflow: "hidden",
            boxShadow: AVATAR_SHADOW,
          }}
        >
          <Image
            src="/characters/miomi/companion/companion-idle.png"
            alt=""
            width={80}
            height={80}
            style={{ objectFit: "cover", width: "80px", height: "80px" }}
            priority
          />
        </div>

        <h1
          style={{
            fontFamily: FONT,
            fontSize: "24px",
            lineHeight: "32px",
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: "16px 0 0",
            textAlign: "center",
          }}
        >
          {displayName}
        </h1>

        {showProBadge && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              height: "24px",
              padding: "0 10px",
              marginTop: "8px",
              borderRadius: "999px",
              background: CTA_GRADIENT,
              color: COLORS.ctaTextColor,
              fontFamily: FONT,
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} strokeWidth={2} color="#FFFFFF" />
            {tier === "pro_max" ? copy.badgeProMax : copy.badgePro}
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            /* TODO: journey stage picker bottom sheet — Phase 3B */
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            height: "24px",
            padding: "0 10px",
            marginTop: "8px",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.7)",
            border: `1px solid ${COLORS.borderLight}`,
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: COLORS.textPrimary,
            cursor: "pointer",
          }}
        >
          <MapPin size={14} strokeWidth={2} color={COLORS.textMuted} />
          {capitalizeStage(journeyStage)}
        </button>
      </section>

      {/* Growth story — no card */}
      {copy.growthStory && (
        <p
          style={{
            marginTop: "32px",
            maxWidth: "280px",
            marginLeft: "auto",
            marginRight: "auto",
            textAlign: "center",
            fontFamily: FONT,
            fontSize: "16px",
            lineHeight: "24px",
            fontWeight: 500,
            color: COLORS.textMuted,
          }}
        >
          {copy.growthStory}
        </p>
      )}

      {/* Subscription card */}
      <div style={{ marginTop: "48px" }}>
        <SectionHeader label={copy.sectionSub} />
        <GlassCard style={{ marginTop: "8px" }}>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "17px",
            lineHeight: "24px",
            fontWeight: 600,
            color: COLORS.textPrimary,
            margin: 0,
          }}
        >
          {tierLabel(tier)}
        </p>
        <p
          style={{
            fontFamily: "'Quicksand', sans-serif",
            fontSize: "13px",
            lineHeight: "18px",
            fontWeight: 500,
            color: COLORS.textMuted,
            margin: "8px 0 0",
          }}
        >
          {tierSummary(tier)}
        </p>
        <div style={{ marginTop: "16px" }}>
          {isFree ? (
            <Link
              href="/marketplace"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                height: "52px",
                width: "100%",
                borderRadius: "999px",
                background: CTA_GRADIENT,
                color: COLORS.ctaTextColor,
                fontFamily: FONT,
                fontSize: "16px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: CTA_SHADOW,
              }}
            >
              <Sparkles size={18} strokeWidth={1.75} />
              {copy.ctaUpgrade}
            </Link>
          ) : (
            <Link
              href="/me/billing"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "44px",
                width: "100%",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.6)",
                border: `1px solid ${COLORS.borderMedium}`,
                color: COLORS.textPrimary,
                fontFamily: FONT,
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                backdropFilter: "blur(10px)",
              }}
            >
              {copy.ctaManage}
            </Link>
          )}
        </div>
        </GlassCard>
      </div>

      {/* Memory editor card */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.sectionMem} />
        <GlassCard style={{ marginTop: "8px" }}>
          {memoryRows.length > 0 ? (
            memoryRows.map((row, index) => (
              <div key={row.id}>
                {index > 0 && <RowDivider />}
                <MemoryRow label={row.label} />
              </div>
            ))
          ) : (
            <p
              style={{
                fontFamily: FONT,
                fontSize: "16px",
                lineHeight: "24px",
                fontWeight: 500,
                color: COLORS.textMuted,
                textAlign: "center",
                margin: "12px 0",
              }}
            >
              {copy.emptyMemory}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              /* TODO: full memory editor — Phase 3B */
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "44px",
              width: "100%",
              marginTop: "12px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.6)",
              border: `1px solid ${COLORS.borderMedium}`,
              color: COLORS.textPrimary,
              fontFamily: FONT,
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
              backdropFilter: "blur(10px)",
            }}
          >
            {copy.ctaEditMemory}
          </button>
        </GlassCard>
      </div>

      {/* Premium Voice tokens card */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.sectionVoice} />
        <GlassCard style={{ marginTop: "8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              minHeight: "44px",
            }}
          >
            <Mic size={20} color={COLORS.textMuted} strokeWidth={1.75} />
            <span
              style={{
                flex: 1,
                fontFamily: FONT,
                fontSize: "16px",
                color: COLORS.textPrimary,
              }}
            >
              {copy.rowVoiceTokens}
            </span>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "13px",
                fontWeight: 600,
                color: COLORS.textMuted,
                padding: "4px 10px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.7)",
                border: `1px solid ${COLORS.borderLight}`,
              }}
            >
              {voiceCredits}
            </span>
            <Link
              href="/marketplace"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "32px",
                padding: "0 12px",
                borderRadius: "999px",
                background: "rgba(255, 255, 255, 0.6)",
                border: `1px solid ${COLORS.borderMedium}`,
                color: COLORS.textPrimary,
                fontFamily: FONT,
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                backdropFilter: "blur(10px)",
                whiteSpace: "nowrap",
              }}
            >
              {copy.ctaTopupVoice}
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Settings card */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.sectionSettings} />
        <GlassCard style={{ marginTop: "8px" }}>
          <ToggleRow
            label={copy.settingsVoice}
            checked={ttsOn}
            onChange={(v) => {
              setTtsOn(v);
              window.localStorage.setItem("miomika.tts_on", v ? "1" : "0");
            }}
          />
          <RowDivider />
          <button
            type="button"
            onClick={() => {
              /* TODO: language preference sheet */
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 0",
              minHeight: "44px",
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Globe size={20} color={COLORS.textMuted} strokeWidth={1.75} />
            <span
              style={{
                flex: 1,
                fontFamily: FONT,
                fontSize: "16px",
                color: COLORS.textPrimary,
              }}
            >
              {copy.settingsLanguage}
            </span>
            <span
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "13px",
                color: COLORS.textMuted,
                marginRight: "8px",
              }}
            >
              {uiLangLabel}
            </span>
            <ChevronRight size={18} color={COLORS.textSubtle} strokeWidth={1.75} />
          </button>
          <RowDivider />
          <ToggleRow
            icon={Bell}
            label={copy.settingsNotifications}
            checked={notificationsOn}
            onChange={setNotificationsOn}
          />
        </GlassCard>
      </div>

      {/* Help & legal card */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.sectionHelp} />
        <GlassCard tight style={{ marginTop: "8px" }}>
          <NavRow label={copy.linkHelp} href="/help" />
          <RowDivider />
          <NavRow label={copy.linkPrivacy} href="/legal/privacy" />
          <RowDivider />
          <NavRow label={copy.linkTerms} href="/legal/terms" />
          <RowDivider />
          <NavRow label={copy.linkContact} href="mailto:hello@miomika.com" external />
        </GlassCard>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={() => void handleLogout()}
        style={{
          display: "block",
          margin: "48px auto 24px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "15px",
          lineHeight: "24px",
          fontWeight: 500,
          color: COLORS.textMuted,
        }}
      >
        {copy.logoutLabel}
      </button>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: FONT,
        fontSize: "20px",
        lineHeight: "28px",
        fontWeight: 600,
        color: COLORS.textPrimary,
      }}
    >
      {label}
    </h2>
  );
}

function GlassCard({
  children,
  tight,
  style,
}: {
  children: React.ReactNode;
  tight?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "12px",
        border: "1px solid rgba(237, 232, 224, 0.6)",
        padding: tight ? "12px" : "16px",
        boxShadow: CARD_SHADOW,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function RowDivider() {
  return <div style={{ height: "1px", background: COLORS.borderLight }} />;
}

function MemoryRow({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        minHeight: "44px",
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: FONT,
          fontSize: "16px",
          color: COLORS.textPrimary,
        }}
      >
        {label}
      </span>
      <Edit2 size={18} color={COLORS.textSubtle} strokeWidth={1.75} aria-hidden />
    </div>
  );
}

function NavRow({
  label,
  href,
  external,
}: {
  label: string;
  href: string;
  external?: boolean;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        minHeight: "44px",
      }}
    >
      <span
        style={{
          flex: 1,
          fontFamily: FONT,
          fontSize: "16px",
          color: COLORS.textPrimary,
        }}
      >
        {label}
      </span>
      <ChevronRight size={18} color={COLORS.textSubtle} strokeWidth={1.75} />
    </div>
  );

  if (external) {
    return (
      <a href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}

function ToggleRow({
  icon: Icon = Volume2,
  label,
  checked,
  onChange,
}: {
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 0",
        minHeight: "44px",
      }}
    >
      <Icon size={20} color={COLORS.textMuted} strokeWidth={1.75} />
      <span
        style={{
          flex: 1,
          fontFamily: FONT,
          fontSize: "16px",
          color: COLORS.textPrimary,
        }}
      >
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: "44px",
          height: "26px",
          borderRadius: "999px",
          background: checked ? COLORS.ctaSolid : COLORS.borderMedium,
          border: "none",
          position: "relative",
          cursor: "pointer",
          flexShrink: 0,
          transition: "background 180ms cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 2px 4px rgba(26, 26, 24, 0.08)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "2px",
            left: checked ? "20px" : "2px",
            width: "22px",
            height: "22px",
            borderRadius: "999px",
            background: "#FFFFFF",
            boxShadow: "0 2px 4px rgba(26, 26, 24, 0.12)",
            transition: "left 180ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </button>
    </div>
  );
}
