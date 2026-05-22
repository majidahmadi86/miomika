# Miomika Color System

Last verified: 2026-05-23 (RESET-1)

The canonical color rulebook. If a screen disagrees, the screen is the bug.

---

## Primary CTA — Honey Gold

```
linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)
```

Use for: every **Talk to Miomi**, **Sign up free**, **Continue**, **Try again**, **Subscribe**, **Install**, **Start learning**, **Send**, and every other primary-conversion button across the app.

Use **ONCE per screen.** Maximum.

Solid `#C9A96E` for active nav indicators, link text on warm surfaces, and chevron / icon highlights.

Hover state: `#B8985C`. Shadow: `0 4px 16px -4px rgba(201,169,110,0.40)`.

---

## Where pink is allowed

- Heart fuel bar icon (♥) — `#F9A8D4`
- Tiny presence dots (≤8px) on companion button when state is HAPPY/EXCITED — `#F9A8D4`
- Small accent sparkles in celebration burst (mixed with gold) — `#F9A8D4`
- Nowhere else

---

## Where gold is allowed

- Primary CTAs (the honey-gold gradient)
- Miomi Stars icon (✦) — `#C9A96E`
- Achievement badges, level chip
- Pro indicator chip top-right of locked features
- Active state of nav icons (solid `#C9A96E`)
- Brand wordmark on hero surfaces (welcome screen, login)
- Pronunciation `Volume2` icon when audio is playing
- Sparkle accents in celebration burst (with pink)

---

## Where teal is allowed

- Brain / focus fuel bar (`#7DD3C0`)
- LOW_FUEL companion-button presence dot

---

## Where destructive red is allowed

- Cancel subscription button
- Delete account confirmation only

Never as a primary CTA. Never as a generic error color — Miomi delivers errors.

---

## The discipline

Pink earned a reputation as "the Miomika color," but in practice that made everything look the same and reduced the conversion weight of CTAs. The new system:

- **Gold is rare and important.** ONE primary CTA per screen.
- **Pink is the soft heart accent.** Heart fuel, tiny dots, sparkle moments.
- **Everything else is warm neutral.** `#FAFAF6` background, `#FFF8F2` warm surface, `#FFFFFF` cards, `#1A1A18` text, `#9A8B73` muted text.

---

## When in doubt

Build the screen entirely without color first. Add gold only where the user MUST click. Add pink only on heart / mood elements. Everything else stays in warm neutrals.

---

## Token reference

Canonical TypeScript constants live in `lib/design/colors.ts`. Prefer importing `COLORS` over hardcoded hex strings in new code.

```typescript
import { COLORS, CTA_GRADIENT } from "@/lib/design/colors";

style={{ background: CTA_GRADIENT, color: COLORS.ctaTextColor }}
```
