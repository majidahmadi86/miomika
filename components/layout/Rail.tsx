"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThreadsPanel } from "@/components/talk/ThreadsPanel";
import { useCallback, useState } from "react";
import { BookOpen, Home, Sparkles, TrendingUp, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUILanguage, setUILanguageCookie, type Language } from "@/lib/i18n/client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type NavItem = { href: string; Icon: LucideIcon; labelTh: string; labelEn: string };

const navItems: NavItem[] = [
  { href: "/home", Icon: Home, labelTh: "หน้าหลัก", labelEn: "Home" },
  { href: "/learn", Icon: BookOpen, labelTh: "เรียน", labelEn: "Learn" },
  { href: "/talk", Icon: Sparkles, labelTh: "คุย", labelEn: "Talk" },
  { href: "/dashboard", Icon: TrendingUp, labelTh: "ความก้าวหน้า", labelEn: "Growth" },
  { href: "/me", Icon: User, labelTh: "ฉัน", labelEn: "Me" },
];

const RAIL_KEY = "miomika-rail-expanded";

function getRailExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

function LangToggle({ compact = false }: { compact?: boolean }) {
  const lang = useUILanguage();
  const switchTo = (l: Language) => {
    if (l === lang) return;
    setUILanguageCookie(l);
    window.location.reload();
  };
  if (compact) {
    const other: Language = lang === "en" ? "th" : "en";
    return (
      <button
        type="button"
        onClick={() => switchTo(other)}
        aria-label="Switch language"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E0D8] bg-white/70 text-[11px] font-semibold uppercase text-[#6B6256] transition hover:bg-white"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        {lang}
      </button>
    );
  }
  return (
    <div className="flex items-center rounded-full border border-[#E5E0D8] bg-white/70 p-0.5">
      {(["th", "en"] as Language[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-pressed={lang === l}
          className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition", lang === l ? "text-white" : "text-[#9A8B73]")}
          style={{ fontFamily: "'Quicksand', sans-serif", background: lang === l ? "var(--mk-accent)" : "transparent" }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Rail() {
  const pathname = usePathname();
  const lang = useUILanguage();
  const [expanded, setExpanded] = useState(() => getRailExpanded());

  const toggle = useCallback(() => {
    setExpanded((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(RAIL_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  return (
    <aside
      className={cn(
        "relative z-10 hidden h-screen shrink-0 flex-col border-r border-[#EFE9E0]/60 bg-white/55 py-5 backdrop-blur-xl transition-[width] duration-300 ease-out md:flex",
        expanded ? "w-[240px] px-3" : "w-[80px] items-center",
      )}
    >
      {expanded ? (
        <div className="mb-5 flex items-center gap-2 px-1">
          <Link href="/home" className="text-[20px] font-medium leading-none text-[#C9A96E]" aria-label="Miomika">m</Link>
          <Link href="/home" className="flex-1 text-[17px] font-semibold leading-none text-[#C9A96E]" style={{ fontFamily: "'Quicksand', sans-serif" }}>miomika</Link>
          <button type="button" onClick={toggle} aria-label="ย่อแถบเมนู" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A89C88] transition hover:bg-[#F4F1EA]">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="9" y1="4" x2="9" y2="20" /></svg>
          </button>
        </div>
      ) : (
        <div className="mb-5 flex flex-col items-center gap-2.5">
          <Link href="/home" className="text-[19px] font-medium leading-none text-[#C9A96E]" aria-label="Miomika">m</Link>
          <button type="button" onClick={toggle} aria-label="ขยายแถบเมนู" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A89C88] transition hover:bg-[#F4F1EA]">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5" /><line x1="9" y1="4" x2="9" y2="20" /></svg>
          </button>
        </div>
      )}

      <nav className={cn("flex w-full flex-col gap-1", expanded ? "" : "items-center px-1.5")}>
        {navItems.map(({ href, Icon, labelTh, labelEn }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const label = lang === "en" ? labelEn : labelTh;
          return (
            <Link
              key={href}
              href={href}
              aria-label={labelEn}
              className={cn(
                "flex items-center transition",
                expanded ? "gap-3 rounded-[14px] px-2.5 py-1.5" : "flex-col gap-1 py-1",
                expanded && active && "bg-accent-soft",
              )}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-colors"
                style={
                  active
                    ? { background: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)", boxShadow: "0 6px 14px -5px rgba(52,169,143,0.45)" }
                    : undefined
                }
              >
                <Icon className={cn("h-[22px] w-[22px]", active ? "text-white" : "text-[#A89C88]")} strokeWidth={active ? 2.1 : 1.85} aria-hidden />
              </span>
              <span
                className={cn(expanded ? "text-[14px] leading-none" : "leading-none", active ? "font-medium text-[#34A98F]" : "text-[#A89C88]")}
                style={{ fontFamily: lang === "en" ? "'Quicksand', sans-serif" : "'Kanit', sans-serif", fontSize: expanded ? undefined : "9.5px" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {expanded ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 h-px bg-[#EFE9E0]" />
          <ThreadsPanel lang={lang} variant="rail" />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className={cn("pt-3", expanded ? "flex items-center justify-between gap-2 px-1" : "flex flex-col items-center gap-2.5")}>
        <div className={cn("flex items-center gap-2", expanded ? "" : "flex-col gap-2.5")}>
          <ThemeToggle expanded={false} />
          <LangToggle compact={!expanded} />
        </div>
        <Link href="/me" aria-label="Me" className="shrink-0">
          <Image src="/miomi/idle.png" alt="Miomi" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
        </Link>
      </div>
    </aside>
  );
}
