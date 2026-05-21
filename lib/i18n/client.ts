"use client";

/**
 * Client-side UI-language hook. Reads the `ui-language` cookie set by the
 * middleware via useSyncExternalStore for SSR safety + no setState-in-effect.
 *
 * The cookie is set on the first request by /middleware.ts so the value is
 * already present by the time the first client paint happens.
 */

import { useSyncExternalStore } from "react";

export type Language = "th" | "en";

export const UI_LANGUAGE_COOKIE = "ui-language";
export const DEFAULT_LANG: Language = "th";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match?.[1] ?? null;
}

// Cookies don't have a change event. We poll once per visibility change so
// settings updates in another tab show up on focus. Cheap and idiomatic.
function subscribe(callback: () => void) {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function getSnapshot(): Language {
  const value = readCookie(UI_LANGUAGE_COOKIE);
  return value === "en" ? "en" : "th";
}

function getServerSnapshot(): Language {
  return DEFAULT_LANG;
}

export function useUILanguage(): Language {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Write the language cookie from the client. Used by the profile-settings
 * surface when the user explicitly overrides detection.
 */
export function setUILanguageCookie(lang: Language): void {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${UI_LANGUAGE_COOKIE}=${lang}; max-age=${oneYear}; path=/; samesite=lax`;
}
