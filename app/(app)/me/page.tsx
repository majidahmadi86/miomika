"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  Camera,
  ChevronRight,
  Compass,
  CreditCard,
  Download,
  FileText,
  Gift,
  Globe,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Pencil,
  Shield,
  Sparkles,
  Star,
  User,
  Volume2,
} from "lucide-react";
import { useProfile } from "@/lib/auth/use-profile";
import { usePaywall } from "@/components/billing/Paywall";
import { storeRedirectTo } from "@/lib/auth/redirect-to";
import { useUILanguage, setUILanguageCookie } from "@/lib/i18n/client";
import { createClient } from "@/lib/supabase/client";
import { getStoredTheme, setTheme, type ThemeId } from "@/lib/theme";
import { AvatarEditSheet } from "@/components/me/AvatarEditSheet";
import { UpgradeProMaxSheet } from "@/components/billing/UpgradeProMaxSheet";
import { NameEditSheet } from "@/components/me/NameEditSheet";
import { SmartGuide, openSmartGuide } from "@/components/onboarding/SmartGuide";

const DEFAULT_AVATAR = "/characters/miomi/companion/companion-idle.png";

const CEFR: { id: string; pro: boolean }[] = [
  { id: "A1", pro: false },
  { id: "A2", pro: false },
  { id: "B1", pro: true },
  { id: "B2", pro: true },
  { id: "C1", pro: true },
  { id: "C2", pro: true },
];

const THEMES: { id: ThemeId; key: "warm" | "cool" | "blush"; a: string; b: string }[] = [
  { id: "warm", key: "warm", a: "#FAFAF6", b: "#34A98F" },
  { id: "cool", key: "cool", a: "#F2F6FA", b: "#3E8FB0" },
  { id: "blush", key: "blush", a: "#FBF2F5", b: "#C75C86" },
];

const COPY = {
  th: {
    title: "ฉัน",
    days: (n: number) => `อยู่ด้วยกัน ${n} วัน`,
    learningGroup: "การเรียนรู้",
    imLearning: "ฉันกำลังเรียน",
    thai: "ภาษาไทย",
    english: "ภาษาอังกฤษ",
    myLevel: "ระดับของฉัน",
    levelProNote: "B1 ขึ้นไปปลดล็อกด้วย Pro",
    preferences: "การตั้งค่า",
    appLanguage: "ภาษาแอป",
    theme: "ธีม",
    sound: "เสียง",
    notifications: "การแจ้งเตือน",
    thingsLearned: "สิ่งที่ฉันเรียนรู้แล้ว",
    words: "คำ",
    plan: "แพ็กเกจ",
    currentPlan: "แพ็กเกจปัจจุบัน",
    stars: "ดาว Miomi",
    upgrade: "อัปเกรดเป็น Pro",
    upgradeProMax: "อัปเกรดเป็น Pro Max",
    upgradeProMaxSub: "คุยกับ Miomi ได้มากขึ้น เสียงนานขึ้น และห้องสนทนาเพิ่มขึ้น",
    upgradeBusy: "กำลังอัปเกรด…",
    upgradeDone: "ยินดีด้วย ตอนนี้คุณคือ Pro Max แล้ว!",
    upgradeFail: "อัปเกรดไม่สำเร็จ ลองที่จัดการการเรียกเก็บเงินดูนะ",
    manageBilling: "จัดการการเรียกเก็บเงิน",
    manageBillingSub: "อัปเดตการชำระเงิน แพ็กเกจ หรือใบเสร็จ",
    inviteFriend: "ชวนเพื่อน",
    account: "บัญชี",
    email: "อีเมล",
    help: "ศูนย์ช่วยเหลือ",
    replayGuide: "แนะนำการใช้งาน",
    replayGuideSub: "ดูอีกครั้ง",
    privacy: "นโยบายความเป็นส่วนตัว",
    terms: "ข้อกำหนดการให้บริการ",
    yourData: "ข้อมูลของคุณ",
    yourDataSub: "ขอเข้าถึงหรือลบข้อมูล",
    signOut: "ออกจากระบบ",
    signingOut: "กำลังออก…",
    free: "ฟรี",
  },
  en: {
    title: "Me",
    days: (n: number) => `${n} ${n === 1 ? "day" : "days"} together`,
    learningGroup: "Learning",
    imLearning: "I'm learning",
    thai: "Thai",
    english: "English",
    myLevel: "My level",
    levelProNote: "B1 and above unlock with Pro",
    preferences: "Preferences",
    appLanguage: "App language",
    theme: "Theme",
    sound: "Sound",
    notifications: "Notifications",
    thingsLearned: "Things I've learned",
    words: "words",
    plan: "Plan",
    currentPlan: "Current plan",
    stars: "Miomi stars",
    upgrade: "Upgrade to Pro",
    upgradeProMax: "Upgrade to Pro Max",
    upgradeProMaxSub: "More chat, longer voice, and more conversation rooms",
    upgradeBusy: "Upgrading…",
    upgradeDone: "You're on Pro Max now — enjoy!",
    upgradeFail: "Couldn't upgrade — try Manage billing",
    manageBilling: "Manage billing",
    manageBillingSub: "Update payment, plan, or invoices",
    inviteFriend: "Invite friends",
    account: "Account",
    email: "Email",
    help: "Help center",
    replayGuide: "Welcome guide",
    replayGuideSub: "Take the tour again",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    yourData: "Your data",
    yourDataSub: "Request access or deletion",
    signOut: "Sign out",
    signingOut: "Signing out…",
    free: "Free",
  },
};

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      {title ? (
        <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-subtle">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-card bg-surface shadow-card [&>*+*]:border-t [&>*+*]:border-line">
        {children}
      </div>
    </section>
  );
}

function Row({
  icon,
  label,
  sub,
  right,
  onClick,
  danger,
}: {
  icon?: ReactNode;
  label: string;
  sub?: string;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const body = (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon ? <span className={danger ? "text-[#C4564A]" : "text-accent"}>{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <div className={"text-[14px] font-medium " + (danger ? "text-[#C4564A]" : "text-ink")}>{label}</div>
        {sub ? <div className="truncate text-[12px] text-ink-subtle">{sub}</div> : null}
      </div>
      {right}
    </div>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left transition hover:bg-surface-2">
        {body}
      </button>
    );
  }
  return body;
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: { id: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-tile bg-surface-2 p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={
              "rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition " +
              (active ? "bg-accent text-white shadow-cta" : "text-ink-muted hover:text-ink")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={"relative h-6 w-11 shrink-0 rounded-full transition " + (on ? "bg-accent" : "bg-surface-2")}
    >
      <span
        className={
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all " + (on ? "left-[22px]" : "left-0.5")
        }
      />
    </button>
  );
}

export default function MePage() {
  const router = useRouter();
  const { open: openPaywall } = usePaywall();
  const supabase = useMemo(() => createClient(), []);
  const { profile, authReady } = useProfile();
  const lang = useUILanguage();
  const t = COPY[lang === "th" ? "th" : "en"];

  const profileId = profile?.id ?? null;

  // ---- auth gate (preserved) ----
  useEffect(() => {
    if (!authReady) return;
    if (!profile) {
      storeRedirectTo("/me");
      router.replace("/login?redirect_to=%2Fme");
    }
  }, [authReady, profile, router]);

  // ---- avatar (fetched directly so we don't depend on the Profile type) ----
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const refreshAvatar = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", profileId).single();
      setAvatarUrl((data as { avatar_url?: string | null } | null)?.avatar_url ?? null);
    } catch {
      /* ignore */
    }
  }, [profileId, supabase]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAvatar();
  }, [refreshAvatar]);
  useEffect(() => {
    const h = () => refreshAvatar();
    window.addEventListener("miomika:profile-refresh", h);
    return () => window.removeEventListener("miomika:profile-refresh", h);
  }, [refreshAvatar]);

  // ---- words mastered ----
  const [wordsMastered, setWordsMastered] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setWordsMastered(typeof d.wordsMastered === "number" ? d.wordsMastered : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- local prefs ----
  const [soundsOn, setSoundsOn] = useState(true);
  const [notifyOn, setNotifyOn] = useState(false);
  const [theme, setThemeState] = useState<ThemeId>("warm");
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setSoundsOn(localStorage.getItem("miomika.sounds_on") !== "false");
      setNotifyOn(localStorage.getItem("miomika.notifications_on") === "true");
      setThemeState(getStoredTheme());
    } catch {
      /* ignore */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ---- optimistic mirrors of server-backed fields ----
  const [learningTarget, setLearningTarget] = useState<string | null>(null);
  const [cefr, setCefr] = useState<string | null>(null);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (profile) {
      setLearningTarget(profile.learning_target_language ?? null);
      setCefr(profile.cefr_level ?? null);
    }
  }, [profile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [levelOpen, setLevelOpen] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const openBillingPortal = useCallback(async () => {
    if (billingBusy) return;
    setBillingBusy(true);
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" });
      const j = (await r.json()) as { url?: string };
      if (j.url) {
        window.location.assign(j.url);
        return; // navigating away
      }
    } catch {
      // fall through to re-enable
    }
    setBillingBusy(false);
  }, [billingBusy]);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [now] = useState(() => Date.now());

  const isFree = profile?.tier === "free";
  const isPro = !!profile && profile.tier !== "free";

  // ---- handlers ----
  const handleTheme = (id: ThemeId) => {
    setTheme(id);
    setThemeState(id);
  };

  const handleSound = (on: boolean) => {
    setSoundsOn(on);
    try {
      localStorage.setItem("miomika.sounds_on", on ? "true" : "false");
    } catch {
      /* ignore */
    }
  };

  const handleNotify = async (on: boolean) => {
    if (on && typeof Notification !== "undefined") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setNotifyOn(false);
          try {
            localStorage.setItem("miomika.notifications_on", "false");
          } catch {
            /* ignore */
          }
          return;
        }
      } catch {
        /* ignore */
      }
    }
    setNotifyOn(on);
    try {
      localStorage.setItem("miomika.notifications_on", on ? "true" : "false");
    } catch {
      /* ignore */
    }
  };

  const handleUiLanguage = async (next: string) => {
    if (next === lang || (next !== "th" && next !== "en")) return;
    if (profileId) {
      try {
        await supabase.from("profiles").update({ ui_language: next }).eq("id", profileId);
      } catch {
        /* ignore */
      }
    }
    setUILanguageCookie(next as "th" | "en");
    window.location.reload();
  };

  const handleLearningTarget = async (next: string) => {
    if (!profileId || next === learningTarget) return;
    setLearningTarget(next);
    try {
      await supabase.from("profiles").update({ learning_target_language: next }).eq("id", profileId);
      window.dispatchEvent(new Event("miomika:profile-refresh"));
    } catch {
      /* ignore */
    }
  };

  const handleCefr = async (lvl: string) => {
    if (!profileId) return;
    const locked = ["B1", "B2", "C1", "C2"].includes(lvl) && !isPro;
    if (locked) {
      openPaywall("generic");
      return;
    }
    setCefr(lvl);
    try {
      await supabase.from("profiles").update({ cefr_level: lvl }).eq("id", profileId);
      window.dispatchEvent(new Event("miomika:profile-refresh"));
    } catch {
      /* ignore */
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const daysTogether = useMemo(() => {
    if (!profile?.onboarding_completed_at) return null;
    const start = new Date(profile.onboarding_completed_at).getTime();
    if (Number.isNaN(start)) return null;
    return Math.max(1, Math.floor((now - start) / 86_400_000) + 1);
  }, [profile?.onboarding_completed_at, now]);

  if (!authReady || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-[var(--mk-accent)]" />
      </div>
    );
  }

  const displayName = profile.display_name?.trim() || (lang === "th" ? "เพื่อน" : "friend");
  const tierLabel = profile.tier === "pro_max" ? "Pro Max" : profile.tier === "pro" ? "Pro" : t.free;
  const stars = profile.miomi_stars ?? 0;
  const avatarSrc = avatarUrl || DEFAULT_AVATAR;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[920px] px-4 py-6 pb-16 md:px-6 md:py-10">
      <h1 className="sr-only">{t.title}</h1>

      {/* Header */}
      <section className="mb-6 flex flex-col items-center rounded-card bg-surface px-6 py-7 text-center shadow-card md:flex-row md:gap-5 md:text-left">
        <button type="button" onClick={() => setAvatarOpen(true)} className="relative shrink-0">
          <span className="block h-[88px] w-[88px] overflow-hidden rounded-full border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full bg-accent text-white shadow-cta">
            <Camera className="h-3.5 w-3.5" />
          </span>
        </button>
        <div className="mt-3 md:mt-0">
          <button
            type="button"
            onClick={() => setNameOpen(true)}
            className="inline-flex items-center gap-1.5 text-[20px] font-semibold text-ink transition hover:text-accent"
          >
            {displayName}
            <Pencil className="h-3.5 w-3.5 text-ink-subtle" />
          </button>
          <div className="mt-1.5 flex items-center justify-center gap-2 md:justify-start">
            <span className="rounded-full bg-earned-soft px-2.5 py-0.5 text-[12px] font-semibold text-earned-strong">
              {tierLabel}
            </span>
            {daysTogether ? <span className="text-[12px] text-ink-muted">{t.days(daysTogether)}</span> : null}
          </div>
        </div>
      </section>

      <div className="md:grid md:grid-cols-2 md:items-start md:gap-x-6">
        <div>
      {/* Learning */}
      <Group title={t.learningGroup}>
        <Row
          icon={<Globe className="h-[18px] w-[18px]" />}
          label={t.imLearning}
          right={
            <Segmented
              value={learningTarget}
              onChange={handleLearningTarget}
              options={[
                { id: "th", label: t.thai },
                { id: "en", label: t.english },
              ]}
            />
          }
        />
        <Row
          icon={<BookOpen className="h-[18px] w-[18px]" />}
          label={t.myLevel}
          onClick={() => setLevelOpen((v) => !v)}
          right={
            <span className="flex items-center gap-1 text-[13px] font-semibold text-ink-muted">
              {cefr ?? "A1"}
              <ChevronRight className={"h-4 w-4 transition " + (levelOpen ? "rotate-90" : "")} />
            </span>
          }
        />
        {levelOpen ? (
          <div className="px-4 pb-3 pt-1">
            <div className="flex flex-wrap gap-2">
              {CEFR.map(({ id, pro }) => {
                const active = id === cefr;
                const locked = pro && !isPro;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleCefr(id)}
                    className={
                      "inline-flex items-center rounded-tile px-3 py-1.5 text-[13px] font-semibold transition " +
                      (active
                        ? "bg-accent text-white"
                        : locked
                          ? "bg-surface-2 text-ink-subtle"
                          : "bg-surface-2 text-ink hover:bg-accent-soft")
                    }
                  >
                    {id}
                    {locked ? <Lock className="ml-1 h-3 w-3" /> : null}
                  </button>
                );
              })}
            </div>
            {!isPro ? <p className="mt-2 text-[12px] text-ink-subtle">{t.levelProNote}</p> : null}
          </div>
        ) : null}
      </Group>

      {/* Preferences */}
      <Group title={t.preferences}>
        <Row
          icon={<Globe className="h-[18px] w-[18px]" />}
          label={t.appLanguage}
          right={
            <Segmented
              value={lang}
              onChange={handleUiLanguage}
              options={[
                { id: "th", label: "ไทย" },
                { id: "en", label: "English" },
              ]}
            />
          }
        />
        <Row
          icon={<Palette className="h-[18px] w-[18px]" />}
          label={t.theme}
          right={
            <div className="flex items-center gap-2">
              {THEMES.map((th) => {
                const active = th.id === theme;
                return (
                  <button
                    key={th.id}
                    type="button"
                    aria-label={th.key}
                    onClick={() => handleTheme(th.id)}
                    className={
                      "h-7 w-7 rounded-full border-2 transition " +
                      (active ? "scale-110 border-[var(--mk-accent)]" : "border-line")
                    }
                    style={{ background: `linear-gradient(135deg, ${th.a} 50%, ${th.b} 50%)` }}
                  />
                );
              })}
            </div>
          }
        />
        <Row
          icon={<Volume2 className="h-[18px] w-[18px]" />}
          label={t.sound}
          right={<Switch on={soundsOn} onChange={handleSound} label={t.sound} />}
        />
        <Row
          icon={<Bell className="h-[18px] w-[18px]" />}
          label={t.notifications}
          right={<Switch on={notifyOn} onChange={handleNotify} label={t.notifications} />}
        />
      </Group>

      {/* Things learned */}
      <Group>
        <Row
          icon={<Sparkles className="h-[18px] w-[18px]" />}
          label={t.thingsLearned}
          onClick={() => router.push("/dashboard")}
          right={
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-muted">
              <span className="text-[15px] font-bold text-earned-strong">{wordsMastered ?? "—"}</span>
              {t.words}
              <ChevronRight className="h-4 w-4" />
            </span>
          }
        />
      </Group>

        </div>
        <div>
      {/* Plan */}
      <Group title={t.plan}>
        <Row
          icon={<Star className="h-[18px] w-[18px]" />}
          label={t.currentPlan}
          right={<span className="text-[13px] font-semibold text-ink">{tierLabel}</span>}
        />
        <Row
          icon={<Sparkles className="h-[18px] w-[18px]" />}
          label={t.stars}
          right={<span className="text-[13px] font-bold text-earned-strong">{stars}</span>}
        />
        {isFree ? (
          <Row
            icon={<Sparkles className="h-[18px] w-[18px]" />}
            label={t.upgrade}
            onClick={() => openPaywall("generic")}
            right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
          />
        ) : (
          <>
            {profile.tier === "pro" ? (
              <Row
                icon={<Sparkles className="h-[18px] w-[18px]" />}
                label={t.upgradeProMax}
                sub={t.upgradeProMaxSub}
                onClick={() => setUpgradeOpen(true)}
                right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
              />
            ) : null}
            <Row
              icon={<CreditCard className="h-[18px] w-[18px]" />}
              label={t.manageBilling}
              sub={t.manageBillingSub}
              onClick={openBillingPortal}
              right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
            />
          </>
        )}
        <Row
          icon={<Gift className="h-[18px] w-[18px]" />}
          label={t.inviteFriend}
          onClick={() => router.push("/invite")}
          right={
            <span className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold text-earned-strong">+฿30</span>
              <ChevronRight className="h-4 w-4 text-ink-subtle" />
            </span>
          }
        />
      </Group>

      {/* Account */}
      <Group title={t.account}>
        <Row icon={<User className="h-[18px] w-[18px]" />} label={t.email} sub={profile.email ?? undefined} />
        <Row
          icon={<HelpCircle className="h-[18px] w-[18px]" />}
          label={t.help}
          onClick={() => router.push("/help")}
          right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
        />
        <Row
          icon={<Compass className="h-[18px] w-[18px]" />}
          label={t.replayGuide}
          sub={t.replayGuideSub}
          onClick={openSmartGuide}
          right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
        />
        <Row
          icon={<Shield className="h-[18px] w-[18px]" />}
          label={t.privacy}
          onClick={() => router.push("/legal/privacy")}
          right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
        />
        <Row
          icon={<FileText className="h-[18px] w-[18px]" />}
          label={t.terms}
          onClick={() => router.push("/legal/terms")}
          right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
        />
        <Row
          icon={<Download className="h-[18px] w-[18px]" />}
          label={t.yourData}
          sub={t.yourDataSub}
          onClick={() => router.push("/me/data")}
          right={<ChevronRight className="h-4 w-4 text-ink-subtle" />}
        />
        <Row danger icon={<LogOut className="h-[18px] w-[18px]" />} label={signingOut ? t.signingOut : t.signOut} onClick={handleSignOut} />
      </Group>

        </div>
      </div>

      <AvatarEditSheet open={avatarOpen} userId={profile.id} onClose={() => setAvatarOpen(false)} />
      {upgradeOpen ? (
        <UpgradeProMaxSheet
          lang={lang === "th" ? "th" : "en"}
          onClose={() => setUpgradeOpen(false)}
          onUpgraded={() => window.location.reload()}
        />
      ) : null}
      <NameEditSheet open={nameOpen} userId={profile.id} currentName={profile.display_name ?? ""} onClose={() => setNameOpen(false)} />
      <SmartGuide autoShow={false} />
      </div>
    </div>
  );
}
