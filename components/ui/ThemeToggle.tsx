"use client";
import { useEffect, useRef, useState } from "react";
import { THEMES, SWATCH, getStoredTheme, setTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const pick = (id: ThemeId) => {
    setTheme(id);
    setThemeState(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="ธีม"
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-full border border-[#E5E0D8] bg-white/70 transition hover:bg-white",
          expanded ? "px-3 py-1.5" : "h-9 w-9 justify-center",
        )}
      >
        <span className="h-4 w-4 rounded-full" style={{ background: SWATCH[theme], boxShadow: "0 0 0 1.5px #fff" }} />
        {expanded ? (
          <span className="text-[12px] text-[#6B6256]" style={{ fontFamily: "'Kanit', sans-serif" }}>ธีม</span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 flex-col gap-1 rounded-2xl border border-[#EFE9E0] bg-white p-1.5 shadow-float">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pick(t.id)}
                aria-label={t.label}
                aria-pressed={active}
                className={cn("flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-[#F4F1EA]", expanded ? "" : "justify-center")}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full"
                  style={{ background: SWATCH[t.id], boxShadow: active ? "0 0 0 2px #fff, 0 0 0 4px var(--mk-accent)" : "0 0 0 1px #E5E0D8" }}
                />
                {expanded ? (
                  <span className="text-[12.5px] text-[#1A1A18]" style={{ fontFamily: "'Kanit', sans-serif" }}>{t.label}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
