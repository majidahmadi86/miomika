/**
 * Miomika color system — canonical.
 * See /docs/COLOR-SYSTEM.md for full rules.
 *
 * Honey gold is the primary CTA. Pink is reserved for the heart fuel bar
 * and tiny accents only. Everything else is warm neutral.
 */

export const COLORS = {
  // PRIMARY CTA — the new conversion color (honey gold)
  ctaGradient: "linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)",
  ctaSolid: "#C9A96E",
  ctaHover: "#B8985C",
  ctaTextColor: "#FFFFFF",
  ctaShadow: "0 4px 16px -4px rgba(201,169,110,0.40)",

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
