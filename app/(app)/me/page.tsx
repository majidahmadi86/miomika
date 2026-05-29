"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  Globe,
  Heart,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Mic,
  Newspaper,
  Palette,
  RefreshCcw,
  Sparkle,
  Sparkles,
  Star,
  User,
  Volume2,
} from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import {
  storeRedirectTo,
} from "@/lib/auth/redirect-to";
import { useUILanguage } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { COLORS, CTA_GRADIENT } from "@/lib/design/colors";
import { loadTalkConfig, MODE_META } from "@/lib/talk/modes";
import { AvatarEditSheet } from "@/components/me/AvatarEditSheet";
import { NameEditSheet } from "@/components/me/NameEditSheet";
import { me } from "@/lib/voice/warmth";

const CARD_SHADOW =
  "0 1px 2px rgba(26, 26, 24, 0.04), 0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 0.6)";
const CTA_SHADOW =
  "0 2px 6px rgba(201, 169, 110, 0.24), 0 8px 20px rgba(201, 169, 110, 0.18)";
const AVATAR_SHADOW =
  "0 4px 16px rgba(26, 26, 24, 0.06), 0 0 0 1px rgba(237, 232, 224, 1)";
const FONT = "'Kanit', 'Quicksand', sans-serif";
const SOUNDS_KEY = "miomika.sounds_on";

type ProgressData = {
  wordsMastered: number;
  wordsLearning: number;
  conversationCount: number;
  streakDays: number;
  cefrLevel: string | null;
};

type ExtendedProfile = ReturnType<typeof useProfile>["profile"] & {
  avatar_url?: string | null;
  cefr_progress_pct?: number | null;
  premium_voice_credits?: number | null;
  miomi_warmth?: "soft" | "balanced" | "playful" | null;
};

function tierLabel(tier: string): string {
  if (tier === "pro_max") return "Miomika Pro Max";
  if (tier === "pro") return "Miomika Pro";
  return "Miomika Free";
}

function planSummary(tier: string, lang: "th" | "en"): string {
  if (tier === "pro_max") return me.plan.promax.summary(lang);
  if (tier === "pro") return me.plan.pro.summary(lang);
  return me.plan.free.summary(lang);
}

function daysTogether(onboardingAt: string | null): number {
  if (!onboardingAt) return 0;
  const diff = Date.now() - new Date(onboardingAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function readTalkModeLabel(lang: "th" | "en"): string {
  const config = loadTalkConfig();
  const meta = MODE_META[config.mode];
  return lang === "en" ? meta.en : meta.th;
}

function readWarmthLabel(
  warmth: ExtendedProfile["miomi_warmth"],
  lang: "th" | "en",
): string {
  if (warmth === "soft") return me.bond.warmthOptions.soft(lang);
  if (warmth === "playful") return me.bond.warmthOptions.playful(lang);
  return me.bond.warmthOptions.balanced(lang);
}

function buildFeedbackMailto(displayName: string, tier: string): string {
  const subject = encodeURIComponent(`Feedback from /me — ${displayName}`);
  const body = encodeURIComponent(
    `Tier: ${tier}\nUser agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}\n\n`,
  );
  return `mailto:hello@miomika.com?subject=${subject}&body=${body}`;
}

function buildSupportMailto(): string {
  return "mailto:hello@miomika.com?subject=" + encodeURIComponent("Support request");
}

export default function MePage() {
  const router = useRouter();
  const uiLang = useUILanguage();
  const { profile: rawProfile, authReady } = useProfile();
  const profile = rawProfile as ExtendedProfile | null;

  const [canGoBack] = useState(
    () => typeof window !== "undefined" && window.history.length > 1,
  );
  const [soundsOn, setSoundsOn] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SOUNDS_KEY) === "1";
  });
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  const displayName =
    profile?.display_name ??
    profile?.email?.split("@")[0] ??
    (uiLang === "en" ? "Friend" : "เพื่อน");
  const tier = profile?.tier ?? "free";
  const isFree = tier === "free" || tier === "guest";
  const showProBadge = tier === "pro" || tier === "pro_max";
  const days = daysTogether(profile?.onboarding_completed_at ?? null);
  const memoryCount = 0;

  const hasVoiceCreditsField = profile != null && "premium_voice_credits" in profile;

  const wordsValue = progress?.wordsMastered ?? 0;
  const streakValue = progress?.streakDays ?? 0;
  const convosValue = progress?.conversationCount ?? 0;
  const cefrLevel = progress?.cefrLevel ?? null;
  const hasCefr = cefrLevel != null && cefrLevel.length > 0;
  const voiceCredits = hasVoiceCreditsField ? (profile?.premium_voice_credits ?? 0) : 0;
  const starsBalance = profile?.miomi_stars ?? 0;
  const uiLangLabel = profile?.ui_language === "en" ? "English" : "ไทย";
  const talkModeLabel = readTalkModeLabel(uiLang);
  const warmthLabel = readWarmthLabel(profile?.miomi_warmth ?? null, uiLang);
  const voiceLabel =
    voiceCredits > 0 ? me.bond.voicePremium(uiLang) : me.bond.voiceFree(uiLang);

  const copy = useMemo(
    () => ({
      progressTitle: me.progress.title(uiLang),
      planTitle: me.plan.title(uiLang),
      bondTitle: me.bond.title(uiLang),
      appTitle: me.app.title(uiLang),
      privacyTitle: me.privacy.title(uiLang),
      helpTitle: me.help.title(uiLang),
      legalTitle: me.legal.title(uiLang),
      logoutLabel: me.logout(uiLang),
    }),
    [uiLang],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!profile) {
      storeRedirectTo("/me");
      router.replace("/login?redirect_to=%2Fme");
    }
  }, [authReady, profile, router]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void fetch("/api/profile/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProgressData | null) => {
        if (cancelled || !data) return;
        setProgress(data);
      })
      .catch(() => {
        /* warm empty states remain at zero */
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

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
          height: "100%",
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
        height: "100%",
        minHeight: "100svh",
        overflowY: "auto",
        overflowX: "hidden",
        background: "linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)",
        padding: "16px 24px 96px",
        width: "100%",
        WebkitOverflowScrolling: "touch",
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

      {/* Hero */}
      <section
        style={{
          marginTop: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setAvatarSheetOpen(true)}
          aria-label={me.avatar.title(uiLang)}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "999px",
            overflow: "hidden",
            boxShadow: AVATAR_SHADOW,
            padding: 0,
            border: "none",
            cursor: "pointer",
            background: "transparent",
          }}
        >
          <Image
            src={
              profile.avatar_url ??
              "/characters/miomi/companion/companion-idle.png"
            }
            alt=""
            width={80}
            height={80}
            style={{ objectFit: "cover", width: "80px", height: "80px" }}
            priority
          />
        </button>

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

        {showProBadge ? (
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
            {tierLabel(tier)}
          </span>
        ) : (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "24px",
              padding: "0 10px",
              marginTop: "8px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.7)",
              border: `1px solid ${COLORS.borderLight}`,
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "12px",
              fontWeight: 600,
              color: COLORS.textMuted,
            }}
          >
            {tierLabel(tier)}
          </span>
        )}
      </section>

      {/* Card 1 — Progress */}
      <div style={{ marginTop: "32px" }}>
        <SectionHeader label={copy.progressTitle} />
        <GlassCard style={{ marginTop: "8px" }}>
          <p
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "13px",
              lineHeight: "18px",
              fontWeight: 600,
              color: COLORS.textMuted,
              margin: 0,
            }}
          >
            {me.progress.cefrLabel(uiLang)}
          </p>
          {hasCefr ? (
            <>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: "24px",
                  lineHeight: "32px",
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: "8px 0 0",
                }}
              >
                {cefrLevel}
              </p>
              <div
                style={{
                  marginTop: "8px",
                  height: "4px",
                  borderRadius: "999px",
                  background: COLORS.borderLight,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${profile.cefr_progress_pct ?? 0}%`,
                    background: COLORS.ctaSolid,
                    borderRadius: "999px",
                  }}
                />
              </div>
            </>
          ) : (
            <p
              style={{
                fontFamily: FONT,
                fontSize: "24px",
                lineHeight: "32px",
                fontWeight: 600,
                color: COLORS.textPrimary,
                margin: "8px 0 0",
              }}
            >
              {me.progress.cefrEmpty(uiLang)}
            </p>
          )}

          {days >= 2 && (
            <p
              style={{
                marginTop: "16px",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "14px",
                lineHeight: "20px",
                fontWeight: 500,
                color: COLORS.textMuted,
              }}
            >
              {me.progress.daysTogether(days, uiLang)}
            </p>
          )}

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "12px",
            }}
          >
            <StatColumn
              value={wordsValue}
              icon={BookOpen}
              labelDefault={me.progress.statWords(uiLang)}
              labelEmpty={me.progress.statWordsEmpty(uiLang)}
            />
            <StatColumn
              value={streakValue}
              icon={Flame}
              labelDefault={me.progress.statStreak(uiLang)}
              labelEmpty={me.progress.statStreakEmpty(uiLang)}
            />
            <StatColumn
              value={convosValue}
              icon={MessageCircle}
              labelDefault={me.progress.statConvos(uiLang)}
              labelEmpty={me.progress.statConvosEmpty(uiLang)}
            />
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              height: "44px",
              width: "100%",
              marginTop: "16px",
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
            {me.progress.cta(uiLang)}
            <ChevronRight size={18} color={COLORS.textSubtle} strokeWidth={1.75} />
          </button>
        </GlassCard>
      </div>

      {/* Card 2 — Plan & credits */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.planTitle} />
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
            {planSummary(tier, uiLang)}
          </p>

          <div style={{ height: "1px", background: COLORS.borderLight, margin: "12px 0" }} />

          <PlanRow
            icon={<Star size={20} color={COLORS.ctaSolid} strokeWidth={1.75} />}
            label={me.plan.stars(uiLang)}
            value={String(starsBalance)}
            pillLabel={me.plan.topup(uiLang)}
            onPill={() => router.push("/marketplace")}
          />
          <RowDivider />
          <PlanRow
            icon={<Mic size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.plan.voice(uiLang)}
            value={String(voiceCredits)}
            pillLabel={me.plan.topup(uiLang)}
            onPill={() => router.push("/marketplace")}
          />

          <div style={{ marginTop: "16px" }}>
            {isFree ? (
              <button
                type="button"
                onClick={() => router.push("/marketplace")}
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
                  border: "none",
                  cursor: "pointer",
                  boxShadow: CTA_SHADOW,
                }}
              >
                <Sparkles size={18} strokeWidth={1.75} />
                {me.plan.cta.upgrade(uiLang)}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/me/billing")}
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
                  cursor: "pointer",
                  backdropFilter: "blur(10px)",
                }}
              >
                {me.plan.cta.manage(uiLang)}
              </button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Card 3a — Relationship with Miomi */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.bondTitle} />
        <GlassCard style={{ marginTop: "8px" }}>
          <ChevronRow
            icon={<Heart size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.bond.name(uiLang)}
            value="Miomi"
            onClick={() => {
              /* stub: Miomi name picker — Phase 3B */
            }}
          />
          <RowDivider />
          <ChevronRow
            icon={<Mic size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.bond.voice(uiLang)}
            value={voiceLabel}
            onClick={() => {
              /* stub: voice picker */
            }}
          />
          <RowDivider />
          <ChevronRow
            icon={<MessageCircle size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.bond.style(uiLang)}
            value={talkModeLabel}
            onClick={() => {
              /* stub: talk mode picker */
            }}
          />
          <RowDivider />
          <ChevronRow
            icon={<Sparkle size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.bond.warmth(uiLang)}
            value={warmthLabel}
            onClick={() => {
              /* stub: warmth picker */
            }}
          />
          <RowDivider />
          <ChevronRow
            icon={<User size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.bond.callYou(uiLang)}
            value={displayName}
            onClick={() => setNameSheetOpen(true)}
          />
        </GlassCard>
      </div>

      {/* Card 3b — App preferences */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.appTitle} />
        <GlassCard style={{ marginTop: "8px" }}>
          <ChevronRow
            icon={<Palette size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.app.theme(uiLang)}
            value={me.app.themeOptions.light(uiLang)}
            onClick={() => {
              /* stub: theme picker */
            }}
          />
          <RowDivider />
          <ToggleRow
            icon={Volume2}
            label={me.app.sounds(uiLang)}
            checked={soundsOn}
            onChange={(v) => {
              setSoundsOn(v);
              window.localStorage.setItem(SOUNDS_KEY, v ? "1" : "0");
            }}
          />
          <RowDivider />
          <ToggleRow
            icon={Bell}
            label={me.app.notifications(uiLang)}
            checked={notificationsOn}
            onChange={setNotificationsOn}
          />
          <RowDivider />
          <ChevronRow
            icon={<Globe size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.app.uiLang(uiLang)}
            value={uiLangLabel}
            onClick={() => {
              /* stub: language picker */
            }}
          />
        </GlassCard>
      </div>

      {/* Card 4 — Privacy */}
      {/* Phase 3B: wire memory editor backend. Phase 6: wire data export + account reset. */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.privacyTitle} />
        <GlassCard style={{ marginTop: "8px" }}>
          <ChevronRow
            icon={<Brain size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.privacy.learned(memoryCount, uiLang)}
            onClick={() => {
              /* stub: memory list */
            }}
          />
          {memoryCount === 0 && (
            <p
              style={{
                margin: 0,
                paddingLeft: "32px",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "12px",
                lineHeight: "16px",
                color: COLORS.textSubtle,
              }}
            >
              {me.privacy.learnedEmpty(uiLang)}
            </p>
          )}
          <RowDivider />
          <ChevronRow
            icon={<Download size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.privacy.download(uiLang)}
            onClick={() => {
              /* stub: data export — Phase 6 */
            }}
          />
          <RowDivider />
          <ChevronRow
            icon={<RefreshCcw size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.privacy.forget(uiLang)}
            onClick={() => {
              /* stub: account reset — Phase 6 */
            }}
          />
        </GlassCard>
      </div>

      {/* Card 5 — Help & feedback */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.helpTitle} />
        <GlassCard style={{ marginTop: "8px" }}>
          <ChevronRow
            icon={<AlertCircle size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.help.problem(uiLang)}
            href={buildFeedbackMailto(displayName, tier)}
            external
          />
          <RowDivider />
          <ChevronRow
            icon={<HelpCircle size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.help.center(uiLang)}
            onClick={() => router.push("/help")}
          />
          <RowDivider />
          <ChevronRow
            icon={<MessageSquare size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.help.contact(uiLang)}
            href={buildSupportMailto()}
            external
          />
          <RowDivider />
          <ChevronRow
            icon={<Newspaper size={20} color={COLORS.textMuted} strokeWidth={1.75} />}
            label={me.help.changelog(uiLang)}
            href={buildSupportMailto()}
            external
          />
        </GlassCard>
      </div>

      {/* Card 6 — Legal */}
      <div style={{ marginTop: "24px" }}>
        <SectionHeader label={copy.legalTitle} />
        <GlassCard tight style={{ marginTop: "8px" }}>
          <ChevronRow label={me.legal.privacy(uiLang)} onClick={() => router.push("/legal/privacy")} />
          <RowDivider />
          <ChevronRow label={me.legal.terms(uiLang)} onClick={() => router.push("/legal/terms")} />
          <RowDivider />
          <ChevronRow label={me.legal.about(uiLang)} onClick={() => router.push("/legal/about")} />
        </GlassCard>
      </div>

      <AvatarEditSheet
        open={avatarSheetOpen}
        userId={profile.id}
        onClose={() => setAvatarSheetOpen(false)}
      />
      <NameEditSheet
        key={nameSheetOpen ? displayName : "closed"}
        open={nameSheetOpen}
        userId={profile.id}
        currentName={displayName}
        onClose={() => setNameSheetOpen(false)}
      />

      {/* Logout */}
      <button
        type="button"
        onClick={() => void handleLogout()}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          minHeight: "44px",
          margin: "48px 0 24px",
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

function StatColumn({
  value,
  icon: Icon,
  labelDefault,
  labelEmpty,
}: {
  value: number;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  labelDefault: string;
  labelEmpty: string;
}) {
  const populated = value > 0;
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "52px",
        }}
      >
        {populated ? (
          <span
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "20px",
              fontWeight: 600,
              color: COLORS.textPrimary,
              lineHeight: "28px",
            }}
          >
            {value}
          </span>
        ) : (
          <Icon size={24} strokeWidth={1.75} color={COLORS.textSubtle} />
        )}
      </div>
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          color: COLORS.textMuted,
          lineHeight: "16px",
          marginTop: "4px",
        }}
      >
        {populated ? labelDefault : labelEmpty}
      </span>
    </div>
  );
}

function ValueChip({ children }: { children: React.ReactNode }) {
  return (
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
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function TopUpPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "28px",
        padding: "0 12px",
        borderRadius: "999px",
        background: "rgba(255, 255, 255, 0.6)",
        border: `1px solid ${COLORS.borderMedium}`,
        color: COLORS.textPrimary,
        fontFamily: FONT,
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        backdropFilter: "blur(10px)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function PlanRow({
  icon,
  label,
  value,
  pillLabel,
  onPill,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pillLabel: string;
  onPill: () => void;
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
      {icon}
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
      <span
        style={{
          fontFamily: "'Quicksand', sans-serif",
          fontSize: "16px",
          lineHeight: "24px",
          fontWeight: 600,
          color: COLORS.textPrimary,
          marginRight: "8px",
        }}
      >
        {value}
      </span>
      <TopUpPill label={pillLabel} onClick={onPill} />
    </div>
  );
}

function ChevronRow({
  icon,
  label,
  value,
  onClick,
  href,
  external,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
}) {
  const inner = (
    <>
      {icon}
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
      {value ? <ValueChip>{value}</ValueChip> : null}
      <ChevronRight size={18} color={COLORS.textSubtle} strokeWidth={1.75} />
    </>
  );

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 0",
    minHeight: "44px",
    width: "100%",
    background: "transparent",
    border: "none",
    cursor: onClick || href ? "pointer" : "default",
    textAlign: "left",
    textDecoration: "none",
    color: "inherit",
  };

  if (href) {
    if (external) {
      return (
        <a href={href} style={rowStyle}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} style={rowStyle}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} style={rowStyle}>
      {inner}
    </button>
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
