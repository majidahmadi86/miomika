export type ThemeId = "warm" | "cool" | "blush";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "blush", label: "Blush" },
];

export const SWATCH: Record<ThemeId, string> = {
  warm: "#34A98F",
  cool: "#2C9CB0",
  blush: "#C75C86",
};

const KEY = "miomika-theme";
const VALID: ThemeId[] = ["warm", "cool", "blush"];

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "warm";
  try {
    const v = window.localStorage.getItem(KEY) as ThemeId | null;
    return v && VALID.includes(v) ? v : "warm";
  } catch {
    return "warm";
  }
}

export function setTheme(id: ThemeId): void {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = id;
  }
}
