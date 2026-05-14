"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  LogOut,
  Palette,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type UserRow = {
  cat_name: string | null;
  email: string | null;
  tier: string | null;
  xp: number | null;
  level: number | null;
  outputs_used: number | null;
  outputs_limit: number | null;
  language: string | null;
  personality: string | null;
};

const DEFAULT_PROFILE: UserRow = {
  cat_name: "Miomi",
  email: null,
  tier: "free",
  xp: 340,
  level: 3,
  outputs_used: 3,
  outputs_limit: 10,
  language: "thai",
  personality: "sweet",
};

function languageLabel(lang: string | null): { th: string; en: string } {
  switch (lang) {
    case "english":
      return { th: "อังกฤษ", en: "English" };
    case "both":
      return { th: "ทั้งคู่", en: "Both" };
    default:
      return { th: "ไทย", en: "Thai" };
  }
}

function personalityLabel(id: string | null): { th: string; en: string } {
  switch (id) {
    case "cheeky":
      return { th: "ซน", en: "Cheeky" };
    case "dreamy":
      return { th: "ฝัน", en: "Dreamy" };
    default:
      return { th: "หวาน", en: "Sweet" };
  }
}

function tierDisplayName(tier: string | null): string {
  if (tier === "paid" || tier === "creator") return "Creator";
  return "Free";
}

function xpForNextLevel(level: number): number {
  if (level <= 1) return 500;
  return 500 + (level - 1) * 100;
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserRow>(DEFAULT_PROFILE);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    setAuthEmail(user.email ?? null);

    const full = await supabase
      .from("users")
      .select(
        "cat_name, email, tier, language, personality, xp, level, outputs_used, outputs_limit",
      )
      .eq("id", user.id)
      .maybeSingle();

    const base =
      full.error || !full.data
        ? await supabase
            .from("users")
            .select("cat_name, email, tier, language, personality")
            .eq("id", user.id)
            .maybeSingle()
        : { data: full.data, error: null as null };

    const row = base.data;
    const err = base.error;

    if (!err && row) {
      const ext = full.data && !full.error ? full.data : null;
      setProfile({
        cat_name: row.cat_name ?? DEFAULT_PROFILE.cat_name,
        email: row.email ?? user.email ?? null,
        tier: row.tier ?? DEFAULT_PROFILE.tier,
        xp: ext?.xp ?? DEFAULT_PROFILE.xp,
        level: ext?.level ?? DEFAULT_PROFILE.level,
        outputs_used: ext?.outputs_used ?? DEFAULT_PROFILE.outputs_used,
        outputs_limit: ext?.outputs_limit ?? DEFAULT_PROFILE.outputs_limit,
        language: row.language ?? DEFAULT_PROFILE.language,
        personality: row.personality ?? DEFAULT_PROFILE.personality,
      });
    } else {
      setProfile({
        ...DEFAULT_PROFILE,
        email: user.email ?? null,
      });
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleDeleteAccount() {
    const ok = window.confirm(
      "ต้องการลบบัญชีจริงหรือไม่คะ? การกระทำนี้ไม่สามารถย้อนกลับได้",
    );
    if (!ok) return;
    window.alert("ฟีเจอร์ลบบัญชียังไม่พร้อมค่า ติดต่อทีมงานได้นะคะ");
  }

  const catName = profile.cat_name?.trim() || DEFAULT_PROFILE.cat_name!;
  const email = profile.email ?? authEmail ?? "—";
  const tierKey = (profile.tier ?? "free").toLowerCase();
  const isPaid = tierKey === "paid" || tierKey === "creator";
  const level = profile.level ?? 3;
  const xp = profile.xp ?? 0;
  const xpNext = xpForNextLevel(level);
  const xpPct = Math.min(100, Math.round((xp / xpNext) * 100));
  const used = profile.outputs_used ?? 0;
  const limit = profile.outputs_limit ?? 10;
  const usagePct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const lang = languageLabel(profile.language);
  const pers = personalityLabel(profile.personality);

  return (
    <AppShell>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[390px] flex-col overflow-hidden bg-white px-3 pt-2">
        {loading ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <p className="text-sm font-medium text-neutral-700">กำลังโหลด...</p>
            <p className="mt-1 text-xs text-nav-muted">Loading profile</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] pb-2">
            {/* Identity card */}
            <section className="mb-2 rounded-2xl border border-rose-border bg-white p-3">
              <div className="flex gap-4">
                <div className="h-[60px] w-[60px] shrink-0">
                  <Image
                    src="/miomi/idle.png"
                    alt="Miomi"
                    width={60}
                    height={60}
                    className="h-[60px] w-[60px] object-contain object-left"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-rose-accent">{catName}</p>
                  <p className="mt-0.5 truncate text-[10px] text-nav-muted">
                    {email}
                  </p>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full border border-gold-border bg-gold-light px-2.5 py-0.5 text-[10px] font-semibold text-gold",
                    )}
                  >
                    {tierDisplayName(profile.tier)}
                  </span>
                  <p className="mt-2 text-[10px] font-medium text-gold">
                    Lv.{level} — {xp} / {xpNext} XP
                  </p>
                  <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-bar-track">
                    <div
                      className="h-full rounded-full bg-gold transition-all"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Usage */}
            <section className="mt-1">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                การใช้งาน
              </p>
              <p className="mb-2 text-[8px] text-nav-muted">Usage</p>
              <div className="rounded-xl border border-rose-border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Zap
                      className="h-4 w-4 shrink-0 text-rose-accent"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <div>
                      <p className="text-[11px] font-medium text-neutral-800">
                        Outputs ที่ใช้ไปแล้ว
                      </p>
                      <p className="text-[9px] text-nav-muted">Outputs used</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-rose-accent">
                    {used} / {limit}
                  </span>
                </div>
                <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-bar-track">
                  <div
                    className="h-full rounded-full bg-rose-accent transition-all"
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <Link
                  href="/upgrade"
                  className="mt-2 inline-block text-[9px] text-rose-accent underline underline-offset-2"
                >
                  อัพเกรดเพื่อใช้งานไม่จำกัด
                  <span className="mt-0.5 block text-[8px] text-rose-accent/90">
                    Upgrade for unlimited outputs
                  </span>
                </Link>
              </div>
            </section>

            {/* Plan */}
            <section className="mt-3">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                แพลน
              </p>
              <p className="mb-2 text-[8px] text-nav-muted">Plan</p>
              <div className="rounded-xl border border-rose-border bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-neutral-900">
                    {isPaid ? "Creator Plan" : "Free Plan"}
                  </p>
                  {!isPaid ? (
                    <Link
                      href="/upgrade"
                      title="Upgrade"
                      className="shrink-0 whitespace-nowrap rounded-full bg-rose-accent px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-rose-mid"
                    >
                      อัพเกรด
                    </Link>
                  ) : null}
                </div>
                <p className="mt-2 text-[9px] text-nav-muted">
                  {isPaid
                    ? "Outputs ไม่จำกัด · ทุกแพลตฟอร์ม"
                    : "10 outputs/เดือน · 1 platform"}
                </p>
                <p className="mt-0.5 text-[8px] text-nav-muted">
                  {isPaid
                    ? "Unlimited outputs · all platforms"
                    : "10 outputs per month · 1 platform"}
                </p>
              </div>
            </section>

            {/* Settings */}
            <section className="mt-3">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                ตั้งค่า
              </p>
              <p className="mb-2 text-[8px] text-nav-muted">Settings</p>
              <div className="overflow-hidden rounded-xl border border-rose-border bg-white">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <User
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      ชื่อแมวของฉัน
                    </p>
                    <p className="text-[9px] text-nav-muted">My cat&apos;s name</p>
                    <p className="mt-0.5 text-[10px] text-rose-deep">{catName}</p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-nav-muted"
                    aria-hidden
                  />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <Globe
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      ภาษา
                    </p>
                    <p className="text-[9px] text-nav-muted">Language</p>
                    <p className="mt-0.5 text-[10px] text-rose-deep">
                      {lang.th} · {lang.en}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-nav-muted" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <Palette
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      บุคลิก Miomi
                    </p>
                    <p className="text-[9px] text-nav-muted">
                      Miomi&apos;s personality
                    </p>
                    <p className="mt-0.5 text-[10px] text-rose-deep">
                      {pers.th} · {pers.en}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-nav-muted" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <Bell
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      การแจ้งเตือน
                    </p>
                    <p className="text-[9px] text-nav-muted">Notifications</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-nav-muted" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <Shield
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      ความเป็นส่วนตัว
                    </p>
                    <p className="text-[9px] text-nav-muted">Privacy</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-nav-muted" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <HelpCircle
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-900">
                      ช่วยเหลือ
                    </p>
                    <p className="text-[9px] text-nav-muted">Help &amp; Support</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-nav-muted" />
                </button>
              </div>
            </section>

            {/* Account */}
            <section className="mt-3">
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-gold">
                บัญชี
              </p>
              <p className="mb-2 text-[8px] text-nav-muted">Account</p>
              <div className="overflow-hidden rounded-xl border border-rose-border bg-white">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-3 border-b border-rose-border px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <LogOut
                    className="h-4 w-4 shrink-0 text-rose-accent"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-rose-accent">
                      ออกจากระบบ
                    </p>
                    <p className="mt-0.5 text-[9px] text-rose-accent/85">
                      Log out
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#FAFAFA]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-neutral-500">
                      ลบบัญชี
                    </p>
                    <p className="mt-0.5 text-[9px] text-nav-muted">
                      Delete account
                    </p>
                  </div>
                </button>
              </div>
            </section>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
