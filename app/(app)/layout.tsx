"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Copy,
  Home,
  LayoutDashboard,
  Lock,
  Sparkles,
  User,
} from "lucide-react";
import {
  GuestExplorationProvider,
  useGuestExploration,
} from "@/components/guest/GuestExplorationContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/home", Icon: Home, thai: "หน้าหลัก", english: "Home" },
  { href: "/create", Icon: Sparkles, thai: "สร้าง", english: "Create" },
  {
    href: "/dashboard",
    Icon: LayoutDashboard,
    thai: "แดชบอร์ด",
    english: "Dashboard",
  },
  { href: "/profile", Icon: User, thai: "ฉัน", english: "Me" },
] as const;

const recentOutputs = [
  {
    platform: "Instagram",
    hook: "ค้นพบคาเฟ่ในฝันที่คุณต้องไปสักครั้งในชีวิต",
  },
  {
    platform: "TikTok",
    hook: "3 วินาทีแรกที่ทำให้คนหยุดสกรอล",
  },
  {
    platform: "YouTube",
    hook: "รีวิวตรงไปตรงมา ไม่เก็บกด",
  },
] as const;

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <GuestExplorationProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </GuestExplorationProvider>
  );
}

function AppLayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { isGuest, authReady, openLockedTabPrompt } = useGuestExploration();

  return (
    <div className="min-h-screen w-full md:flex md:h-screen md:bg-[#F2EEF0] md:overflow-hidden">
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#EAD0DB] bg-white md:flex">
        <div className="flex flex-col items-center px-4 pb-4 pt-6">
          <p className="text-base font-medium text-[#8B1A35]">Miomika</p>
          <div className="miomi-login-float mt-4 flex justify-center">
            <Image
              src="/miomi/idle.png"
              alt="Miomi"
              width={120}
              height={120}
              className="h-[120px] w-[120px] object-contain"
            />
          </div>
          <p className="mt-3 rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-3 py-1 text-[10px] font-medium text-neutral-800">
            Miomi
          </p>
          <div className="mt-4 w-full space-y-2 px-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[7px] font-medium text-[#D4537E]">
                Mood
              </span>
              <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-[2px] bg-[#F0E0E8]">
                <div className="h-[3px] w-[82%] rounded-[2px] bg-[#D4537E]" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[7px] font-medium text-[#B8860B]">
                Energy
              </span>
              <div className="h-[3px] min-w-0 flex-1 overflow-hidden rounded-[2px] bg-[#F0E0E8]">
                <div className="h-[3px] w-[65%] rounded-[2px] bg-[#B8860B]" />
              </div>
            </div>
          </div>
        </div>
        <div className="mx-4 border-t border-[#EAD0DB]" />
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-4">
          {navItems.map(({ href, Icon, thai, english }) => {
            const active = pathname === href;
            const navClass = cn(
              "flex items-center gap-2 rounded-lg py-2.5 pl-4 pr-4 transition-colors",
              active
                ? "border-l-2 border-[#8B1A35] bg-[#FBEAF0]"
                : "border-l-2 border-transparent hover:bg-[#FAFAFA]",
            );
            const guestLocked =
              authReady &&
              isGuest &&
              (href === "/create" || href === "/dashboard");
            const guestMe = authReady && isGuest && href === "/profile";

            if (guestLocked) {
              return (
                <button
                  key={href}
                  type="button"
                  onClick={() => openLockedTabPrompt()}
                  className={cn(navClass, "w-full text-left")}
                >
                  <span className="relative shrink-0">
                    <Icon
                      className={cn(
                        "h-4 w-4 blur-[0.35px] contrast-75",
                        active ? "text-[#8B1A35]" : "text-neutral-600",
                      )}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <Lock
                      className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[#8B1A35]"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex flex-col gap-0.5 opacity-60">
                    <span
                      className={cn(
                        "text-[11px] font-medium leading-none",
                        active ? "text-[#8B1A35]" : "text-neutral-900",
                      )}
                    >
                      {thai}
                    </span>
                    <span className="text-[9px] leading-none text-[#888888]">
                      {english}
                    </span>
                  </span>
                </button>
              );
            }

            const linkHref = guestMe ? "/signup" : href;

            return (
              <Link key={href} href={linkHref} className={navClass}>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-[#8B1A35]" : "text-neutral-600",
                  )}
                  strokeWidth={2}
                />
                <span className="min-w-0 flex flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[11px] font-medium leading-none",
                      active ? "text-[#8B1A35]" : "text-neutral-900",
                    )}
                  >
                    {thai}
                  </span>
                  <span className="text-[9px] leading-none text-[#888888]">
                    {english}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2 border-t border-[#EAD0DB] px-4 py-4">
          <p className="text-center text-[9px] font-medium text-[#B8860B]">
            Streak 7 วัน
          </p>
          <p className="text-center text-[8px] font-medium text-[#B8860B]">
            Lv.3
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col bg-white md:min-h-0 md:h-full md:overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-[680px]">{children}</div>
        </div>
      </div>

      <aside className="hidden h-screen w-72 shrink-0 flex-col border-l border-[#EAD0DB] bg-white md:flex">
        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <p className="text-[11px] font-semibold text-neutral-900">
            ประวัติล่าสุด
          </p>
          <p className="text-[9px] text-[#888888]">Recent outputs</p>
          <ul className="mt-3 space-y-2">
            {recentOutputs.map((item) => (
              <li
                key={`${item.platform}-${item.hook.slice(0, 12)}`}
                className="rounded-lg border border-[#EAD0DB] bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full border border-[#EAD0DB] bg-[#FAFAFA] px-2 py-0.5 text-[8px] font-medium text-[#8B1A35]">
                      {item.platform}
                    </span>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-snug text-neutral-800">
                      {item.hook}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(item.hook);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-[#8B1A35] transition-colors hover:bg-[#FBEAF0]"
                    aria-label="Copy"
                  >
                    <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <p className="text-[11px] font-semibold text-neutral-900">
              บันทึกไว้
            </p>
            <p className="text-[9px] text-[#888888]">Saved</p>
            <p className="mt-3 rounded-lg border border-dashed border-[#EAD0DB] bg-[#FAFAFA] px-3 py-6 text-center text-[10px] text-neutral-700">
              <span className="block font-medium">ยังไม่มีที่บันทึกค่า</span>
              <span className="mt-1 block text-[9px] text-[#888888]">
                Nothing saved yet
              </span>
            </p>
          </div>
        </div>

        <div className="border-t border-[#EAD0DB] px-4 py-4">
          <div className="rounded-lg border border-[#B8860B]/35 bg-[#fdf5e0] px-3 py-3">
            <p className="text-[8px] font-semibold uppercase tracking-wide text-[#B8860B]">
              Miomi tip
            </p>
            <p className="mt-1.5 text-[10px] font-medium leading-snug text-neutral-900">
              เปิดคลิปด้วยคำถามสั้นๆ ก่อนบอกสาระ จะช่วยเรียกยอดจบค่า
            </p>
            <p className="mt-1 text-[8px] leading-snug text-[#888888]">
              Open with a quick question before the payoff to boost retention.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
