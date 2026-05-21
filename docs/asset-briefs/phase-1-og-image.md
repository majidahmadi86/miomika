# Phase 1 — Open Graph + Twitter share cards

Single composition reused for every social share. Generate one master, export
two crops.

## Master prompt (ChatGPT 4o / DALL-E 3)

```
A wide social card showing Miomi (a white cat with a pink heart on her
forehead and a gold bell collar) on the left third, looking gently toward
the viewer.

Composition rules (strict):
- Canvas: 1600×900, exported as PNG.
- Background: #FAFAF6 (warm off-white).
- Miomi sits on the left third, full head + upper body visible, ~62% of
  canvas height.
- Right two-thirds: blank for typography (we add it post-render in Figma).
  Keep this region clean — no shapes, no patterns, no gradient backgrounds.
- Soft pink radial gradient behind Miomi only: linear-gradient(135deg, #FBEAF0 0%,
  rgba(249,168,212,0.0) 60%).

Color palette (locked, MIOMIKA.md §4.2):
- Background: #FAFAF6
- Pink halo: #F9A8D4 at 18% opacity
- Miomi fur: #FFFFFF with #EDE8E0 shadows
- Heart: #F9A8D4
- Bell collar: #C9A96E

Style: minimal, calm, premium. No motion lines, no sparkles, no other
characters. Print-quality clean.
```

## Typography layer (added in Figma / by hand)

Right two-thirds receives:

Line 1 (Thai, primary):
```
เพื่อนที่จำคุณได้
Font: Kanit 600, size 88px, color #1A1A18
```

Line 2 (English, secondary):
```
A friend who remembers you and grows with you.
Font: Quicksand 500, size 32px, color #9A8B73
```

Brand stamp (bottom-right, 48px margin):
```
miomika.com
Font: Quicksand 700, size 20px, color #DB2777, letter-spacing 0.18em
```

## Deliverables

| File | Size | Notes |
|------|------|-------|
| `og-image.png` | 1200×630 | Crop from master 1600×900, keep Miomi + tagline visible |
| `twitter-card.png` | 1200×600 | Same composition, slightly tighter vertical crop |

Both go in `/public/`. Reference them in `app/layout.tsx` `metadata.openGraph`
and `metadata.twitter` (Phase 6 task — assets ship in Phase 1).

## Avoid

- Emoji
- Stock-photo cat
- More than one Miomi
- "Powered by AI" / "Beta" badges
- Drop shadow on the typography
