# Phase 1 — Favicons + manifest icons + safari-pinned-tab

Produces every browser-tab and home-screen icon Phase 1 ships. Generate masters
in ChatGPT or Midjourney, export to the dimensions below, and drop them in
`/public/`.

## Master prompt (ChatGPT 4o / DALL-E 3 / Midjourney v6)

```
A minimal, soft-shaded portrait of a white cat character "Miomi" facing forward.

Composition rules (strict):
- Pure transparent background. No frame, no circle around the head, no shadow drop.
- Head fills 80% of the canvas with even padding on all sides.
- Symmetric, calm expression — gentle smile, large round eyes, pink nose.
- Pink heart on the forehead, just above the eyes (small, soft, ~8% of canvas).
- Gold bell collar at the base of the neck, ~10% of canvas wide.
- High contrast silhouette — ears must read clearly at 16px.
- Two-tone shading only: pure white fur with very soft pink-grey shadow on
  underside of jaw, ears, and cheek.

Color palette (locked, MIOMIKA.md §4.2):
- Fur: #FFFFFF
- Shadow: #EDE8E0 (very subtle)
- Eye fill: #1A1A18
- Eye highlight: #FFFFFF
- Nose / heart: #F9A8D4
- Bell collar: #C9A96E
- Cheek blush: #FBEAF0 (extremely subtle)

Style: flat illustration, soft vector-like edges, gentle anti-aliasing.
NO photorealism, NO 3D rendering, NO outlines, NO emoji, NO emoji eyes,
NO text, NO watermark, NO multiple cats, NO accessories beyond the bell collar.

Render at 1024×1024 with transparent background.
```

## Deliverables and dimensions

Once the 1024×1024 master is generated, derive every variant by downscaling
(bicubic) and re-cropping where needed. Save into `/public/`:

| File | Size | Format | Notes |
|------|------|--------|-------|
| `favicon.ico` | multi: 16, 32, 48 | ICO | Use ImageMagick or favicon.io |
| `favicon-16.png` | 16×16 | PNG transparent | Compose specifically — features must be readable at 16px |
| `favicon-32.png` | 32×32 | PNG transparent | |
| `apple-touch-icon.png` | 180×180 | PNG with #FAFAF6 bg | Rounded corners safe-zone (iOS adds its own mask) |
| `manifest-icon-192.png` | 192×192 | PNG transparent | Replaces existing `/miomi/icon-192.png` reference |
| `manifest-icon-512.png` | 512×512 | PNG transparent | Replaces existing `/miomi/icon-512.png` reference |
| `safari-pinned-tab.svg` | scalable | SVG monochrome | Single-color silhouette, color set via CSS by Safari |

## After dropping the files

Update `app/layout.tsx` `metadata.icons` to point at the new files, and add
`apple-touch-icon` + `safari-pinned-tab` mask-icon entries.

## Avoid list

- Photorealistic cat features (whiskers must be stylized lines, not photo-real fur)
- Black outline strokes (we use shading, not outlines)
- Cartoon eyes with star highlights or anime-style sparkles
- Tongue out, fang showing — Miomi is calm-warm, not playful in icons
- Asymmetry (eyes/ears must mirror)
- Drop shadow outside the head silhouette
