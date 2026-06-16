"use client";
import { useState } from "react";
import { THEMES, SWATCH, getStoredTheme, setTheme, type ThemeId } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<ThemeId>(() => getStoredTheme());
  const pick = (id: ThemeId) => {
    setTheme(id);
    setThemeState(id);
  };
  return (
    <div className="flex flex-col items-center gap-1.5" role="group" aria-label="Theme">
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            aria-label={t.label}
            aria-pressed={active}
            className="h-5 w-5 rounded-full transition"
            style={{
              background: SWATCH[t.id],
              border: active ? "2px solid var(--mk-accent)" : "1px solid #E5E0D8",
            }}
          />
        );
      })}
    </div>
  );
}
