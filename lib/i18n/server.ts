/**
 * Server-side UI-language detection.
 *
 * The middleware sets a `ui-language` cookie on first visit by parsing the
 * Accept-Language header. Server components read it via getUILanguage().
 *
 * Thai is the default (primary market). English when explicitly preferred.
 *
 * MIOMIKA.md §1 (Thai users first, kreng jai is law),
 *           §8 Phase 2 (browser language auto-detection).
 */

import { cookies } from "next/headers";

export type Language = "th" | "en";

export const UI_LANGUAGE_COOKIE = "ui-language";
export const SUPPORTED_LANGS: readonly Language[] = ["th", "en"] as const;
export const DEFAULT_LANG: Language = "th";

export async function getUILanguage(): Promise<Language> {
  const store = await cookies();
  const value = store.get(UI_LANGUAGE_COOKIE)?.value;
  return value === "en" ? "en" : "th";
}

/**
 * Parse an Accept-Language header and pick the highest-q supported language.
 * Falls back to DEFAULT_LANG (Thai) when no header or no supported match.
 */
export function pickLanguageFromAcceptLanguage(
  acceptLang: string | null | undefined,
): Language {
  if (!acceptLang) return DEFAULT_LANG;

  type Ranked = { code: string; q: number };
  const ranked: Ranked[] = [];
  for (const part of acceptLang.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [tagRaw, ...rest] = trimmed.split(";");
    const tag = tagRaw?.trim().toLowerCase() ?? "";
    if (!tag) continue;
    let q = 1.0;
    for (const piece of rest) {
      const [k, v] = piece.split("=").map((s) => s.trim());
      if (k === "q") {
        const parsed = Number(v);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    const base = tag.split("-")[0] ?? tag;
    ranked.push({ code: base, q });
  }
  ranked.sort((a, b) => b.q - a.q);
  for (const { code } of ranked) {
    if ((SUPPORTED_LANGS as readonly string[]).includes(code)) {
      return code as Language;
    }
  }
  return DEFAULT_LANG;
}
