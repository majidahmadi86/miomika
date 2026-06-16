/**
 * Miomika color system — canonical.
 * See /docs/COLOR-SYSTEM.md for full rules.
 *
 * Teal is the primary CTA. Gold is reserved for EARNED moments (medals,
 * achievements, Pro). Pink is the heart fuel bar. Everything else warm neutral.
 */

export const COLORS = {
  // PRIMARY CTA — teal (gold is earned-only)
  ctaGradient: "linear-gradient(135deg, #6ECDB8 0%, #34A98F 100%)",
  ctaSolid: "#34A98F",
  ctaHover: "#2E9580",
  ctaTextColor: "#FFFFFF",
  ctaShadow: "0 4px 16px -4px rgba(52,169,143,0.40)",

  // SECONDARY / ghost
  ghostBorder: "#EDE8E0",
  ghostText: "#1A1A18",
  ghostHover: "#F5F0E8",

  // SURFACES
  bg: "#FAFAF6",
  surface: "#FFFFFF",
  surfaceWarm: "#FFF8F2",

  // TEXT
  textPrimary: "#1A1A18",
  textMuted: "#9A8B73",
  textSubtle: "#C4BDB5",

  // BORDERS
  borderLight: "#EDE8E0",
  borderMedium: "#E8E5DF",

  // FUEL BARS (per MIOMIKA.md §4.2)
  heart: "#F9A8D4",
  zap: "#E8C77A",
  brain: "#7DD3C0",
  star: "#C9A96E",

  // ACCENTS (small uses only)
  pinkAccent: "#F9A8D4",
  goldAccent: "#C9A96E",
  tealAccent: "#7DD3C0",
  coralAccent: "#FF8A80",

  // DESTRUCTIVE (cancel subscription, delete account ONLY)
  destructive: "#8B1A35",
} as const;

export const CTA_GRADIENT = COLORS.ctaGradient;
export const CTA_SOLID = COLORS.ctaSolid;
export const CTA_SHADOW = COLORS.ctaShadow;
