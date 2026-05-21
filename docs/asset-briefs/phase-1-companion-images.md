# Phase 1 — Companion button images

Miomi's head composed specifically for 56px render in the floating companion
button (MIOMIKA.md §2.5). Four states ship with Phase 1; PLAYFUL states ship
with Phase 2.

Final destination: `/public/characters/miomi/companion/{state}.png`

> Until you generate these, the button falls back to `/public/miomi/head-*.png`,
> which work but are not 56px-optimized.

## Master prompt (Midjourney v6 / DALL-E 3)

Run **four times**, varying the expression line in each block. Use the same
underlying composition for visual continuity across states.

```
Tight head-and-collar portrait of Miomi (white cat, pink heart on forehead,
gold bell collar). Camera angle: straight-on, slight chin tilt up by 4 degrees.

Composition (strict):
- Canvas: 512×512, transparent background.
- Head fills the central 70% of the canvas — leaves padding for the button
  border (the asset will render inside a 44×44 area in a 56×56 white circle
  with a 1px #EDE8E0 border).
- High silhouette contrast: ears, eye whites, and bell must be unmistakable
  at 32px. Test by viewing at 32×32 before approving.
- Two-tone shading only (no gradients across the fur). Pure white fur with
  #EDE8E0 soft shadow on jaw and ear undersides.
- Heart sits centered above the eyes, sized so it reads as a single pink
  dot at 32px (~12% of head width).
- Bell collar visible at the bottom edge, gold cap shows ~8% of canvas height.

Color palette (locked):
- Fur: #FFFFFF
- Shadow: #EDE8E0
- Eye fill: #1A1A18
- Heart, nose: #F9A8D4
- Bell collar: #C9A96E
- Cheek blush (idle/happy): #FBEAF0 at 30% opacity

EXPRESSION (varies per state — change one line below):

  // companion-idle.png
  Expression: relaxed, eyes open at 80%, gentle closed-lip smile, ears upright.

  // companion-happy.png
  Expression: bright, eyes 90% open with subtle highlights, lips slightly
  parted in a soft smile, ears slightly forward, blush slightly stronger.

  // companion-listening.png
  Expression: head tilted 6 degrees to the viewer's right, ears clearly forward
  and attentive, eyes 85% open looking slightly off-camera (right), lips closed
  in a calm, attentive line.

  // companion-celebration.png
  Expression: eyes scrunched into joyful crescents (closed-eye smile),
  open-lip smile showing soft warmth, ears upright, blush at full strength,
  tiny optional sparkle dot to one side of the bell (gold #C9A96E).

Style: flat illustration, soft vector edges. NO photorealism, NO 3D, NO outlines.
NO emoji eyes (no hearts, no stars), NO motion lines, NO text, NO watermark.
```

## Deliverables

| File | Size | Format | Use |
|------|------|--------|-----|
| `companion-idle.png` | 256×256 | PNG transparent | Default state, breath animation |
| `companion-happy.png` | 256×256 | PNG transparent | After successful action |
| `companion-listening.png` | 256×256 | PNG transparent | While mic is open |
| `companion-celebration.png` | 256×256 | PNG transparent | Word mastery / streak / level-up moments |

Drop into `/public/characters/miomi/companion/`. The CompanionButton already
references these paths with a `/miomi/head-*` fallback baked in for Phase 1.

## Sanity-check process (do this before committing)

1. Open the PNG at 100%, then at 32×32. The silhouette must still be clearly
   Miomi (ears + heart + bell visible).
2. Place it on a 56×56 white circle with `1px solid #EDE8E0` border. The head
   must center optically (heart aligned with circle center, not geometric).
3. Compare side-by-side with `head-idle.png` already in the repo. Style must
   match — same line weight, same shadow softness, same eye geometry.

## Avoid

- Open mouths showing teeth (Miomi smiles closed-lip in companion sizes)
- Tail visible (this is a HEAD portrait)
- Background color (must be transparent)
- Multiple cats
- Stylized lighting (rim lights, spotlights)
- Halo, sparkle bursts, motion radiating from the head
