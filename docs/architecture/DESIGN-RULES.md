# DESIGN-RULES.md

> **Locked visual design rules for every Miomika screen.**
> Version: 1.0 — May 26, 2026
> Read alongside `/MIOMIKA.md` v6 and `/docs/architecture/SCREENS.md`.
> If this document disagrees with anything older, this wins. If it disagrees with `/MIOMIKA.md` v6 design tokens, `/MIOMIKA.md` v6 wins.

---

## 0. The emotional truth behind these rules

Every Miomika user has been judged before — by bad teachers, by family pressure, by a system that took their parents' money and gave them shame. Miomi is the opposite. She never judges. She never punishes. She never paywalls cruelly. Limits are warm ("I want to remember you longer"), not punitive ("UPGRADE NOW").

These rules exist so every pixel serves that truth. Honey-gold says welcome, not commerce. Pink belongs to the heart alone. Lock icons are forbidden — they feel like rejection to a user who has been rejected enough. Warm phrases live in `lib/voice/warmth.ts` so the cat speaks consistently from every surface.

If a design choice makes a Thai mom feel scolded, a Thai teenager feel watched, or a Thai content creator feel sold-to — that choice is wrong, no matter how technically correct it is.

Design from this truth. Then technical correctness follows.

---

## A. Visual rules (locked, immutable)

### A.1 Color system

Source of truth: `lib/design/colors.ts`. Mirror values below. Never hardcode hex elsewhere.

**Honey-gold gradient — PRIMARY CTA ONLY**
```
linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)
```
- Used for: the ONE primary CTA on a screen. Upgrade button, primary action button, signup CTA.
- NEVER used for: backgrounds, pills, nav fills, badges, banners, chrome surfaces, decorative accents, section headers, hover states on non-CTA elements.
- Why scarce: gold earns weight by rarity. If five things are gold, nothing is gold.

**Solid honey-gold tokens**
```
Primary solid:    #C9A96E   (CTA fallback, focus rings on CTAs)
CTA hover:        #B8985C
Gold achievement: #C9A96E   (badges, stars, mastery indicators only)
```

**Pink — HEART FUEL ONLY**
```
Pink mood:        #F9A8D4
Pink deep:        #DB2777   (icon stroke when heart fuel is active)
```
- Used for: the heart fuel icon ♥ in the fuel bar. The presence dot on the companion button when state = HAPPY / EXCITED. The deepest emotional micro-accents (e.g. mood emoji underline on Home).
- NEVER used for: CTAs, buttons, gradients, backgrounds, badges, pricing, conversion surfaces, anywhere commerce lives.
- Why sacred: pink is the emotional signal. If pink shows up next to a "BUY NOW" button, the signal is corrupted forever.

**Warm cream background — the canvas**
```
App shell:        #FCFCFA
Screen gradient:  linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)
Background:       #FAFAF6
Surface white:    #FFFFFF
Surface warm:     #FFF8F2   (Pro tier identity accent only)
```
- Every authenticated screen uses the gradient. No flat white screens. The cream tells the eye: "you are home, you are safe."
- App shell `#FCFCFA` blends seamlessly with the bottom nav so nothing feels boxed.

**Secondary accent colors**
```
Teal focus:       #7DD3C0   (Brain ✦ fuel icon, focus state indicators)
Coral accent:     #FF8A80   (small accents only — sparingly)
```
- NEVER used for: primary CTAs, backgrounds, large fills, anything that competes with honey-gold.

**Text colors**
```
Primary:          #1A1A18   (headings, body)
Muted:            #9A8B73   (secondary labels, metadata)
Subtle:           #C4BDB5   (placeholder, disabled)
```

**Borders**
```
Light:            #EDE8E0   (default card/row dividers)
Medium:           #E8E5DF   (slightly heavier separation)
```

**Destructive — single use only**
```
Destructive:      #8B1A35   (Cancel Subscription button only)
```
- NEVER used as: primary CTA, error toast (Miomi delivers errors), warning state.
- Errors don't go red. Miomi delivers them warmly.

### A.2 Typography

Three fonts. Each has one job. Never mix outside its job.

**Kanit** — Thai chrome (UI labels, headings, body when Thai is primary)
- Weight 500 default, 600 for screen-hero headings, 400 for body when paragraph-length
- Used in: nav labels, screen titles, card headers, button labels when uiLang = Thai

**Quicksand** — English chrome + universal secondary labels
- Weight 600 default for headings/labels, 500 for body
- Used in: nav labels, button labels, headings when uiLang = English; also numerical labels (Stars balance, streak count) regardless of language

**Sarabun** — Thai learning content readability ONLY
- Weight 500 default, 400 for long-form reading content
- Used in: vocabulary cards, practice cards, e-book content, anything the user reads in Thai *to learn*, not to navigate
- NEVER used in: nav, buttons, chrome, headers. Sarabun belongs to content, not interface.

**Type scale (mobile primary, 375×812 base):**

| Role | Font | Size / Line height | Weight |
|---|---|---|---|
| Screen hero (h1) | Kanit / Quicksand | 28 / 36 | 600 |
| Section header (h2) | Kanit / Quicksand | 20 / 28 | 600 |
| Card title (h3) | Kanit / Quicksand | 17 / 24 | 600 |
| Body | Kanit / Quicksand | 16 / 24 | 400–500 |
| Secondary label | Quicksand | 13 / 18 | 600 (often uppercase tracking 0.04em) |
| Caption / metadata | Quicksand | 12 / 16 | 500 |
| Numeric (counters, balances) | Quicksand | 24 / 28 (hero) or 16 / 20 (inline) | 600 |
| Learning content (Thai vocab card) | Sarabun | 24 / 32 hero word, 16 / 24 explanation | 500 |

**Forbidden:**
- Mixing Sarabun into chrome
- Kanit at very small sizes below 12px (poor Thai legibility)
- All-caps headings (feels cold/punitive — Mike's audience has been shouted at enough)

### A.3 Spacing scale

Engineering contract wins. **Allowed values only:**
```
4, 8, 12, 16, 24, 32, 48, 64, 96
```
Never 6, 10, 14, 18, 20, 28, 36, 40, 56, 72.

**Usage:**
- `4` — icon-to-label gap inside a chip, tight inline gaps
- `8` — element gap inside a card (label → value)
- `12` — between stacked rows inside a card; inner card padding tight
- `16` — default card padding; default vertical rhythm between sibling elements
- `24` — between sections (card → card); standard horizontal screen padding
- `32` — between major regions on a screen (hero → first section)
- `48` — between hero block and content below it on calm surfaces (Home, Me)
- `64` — top of screen to first content on auth/celebration surfaces
- `96` — large empty-state vertical breathing room

**Cleanup debt:** The failed `/me` rebuild used 14 and 20 in places. Strip these wherever found.

### A.4 Border radius

Engineering contract wins.
```
Cards:        12px
Sheets:       16px (modals, bottom sheets, drawers)
Pills/buttons:999px (fully rounded for CTAs, chips, fuel bars)
Avatars:      999px (circle) or 12px (squircle, for character tiles)
Input fields: 12px
```
- NEVER use 18, 20, 24 for cards. (Cleanup debt: the failed `/me` used 18 and 24 on cards.)
- NEVER use sharp corners (0px). Miomika is soft. Sharp corners feel administrative.

### A.5 Shadows — the "floating glass" formula

Every interactive element floats. Nothing sits in a box. This is the `/talk` standard.

**Card / floating panel:**
```
box-shadow:
  0 1px 2px rgba(26, 26, 24, 0.04),
  0 4px 16px rgba(26, 26, 24, 0.06),
  0 0 0 1px rgba(237, 232, 224, 0.6);
```

**Primary CTA button (honey-gold):**
```
box-shadow:
  0 2px 6px rgba(201, 169, 110, 0.24),
  0 8px 20px rgba(201, 169, 110, 0.18);
```

**Companion button / floating orb:**
```
box-shadow:
  0 4px 16px rgba(26, 26, 24, 0.06),
  0 0 0 1px rgba(237, 232, 224, 1);
```

**Modal / bottom sheet:**
```
box-shadow:
  0 -8px 32px rgba(26, 26, 24, 0.08),
  0 -2px 8px rgba(26, 26, 24, 0.04);
backdrop-filter: blur(20px);
background: rgba(255, 255, 255, 0.92);
```

**Pressed state (any button):** subtract one shadow layer + scale 0.98.

**Forbidden:**
- Hard shadows (e.g. `0 2px 0 #000`)
- Dark / heavy shadows (opacity > 0.12)
- Shadows on text
- Inner shadows on inputs (feels embossed/dated)

### A.6 Iconography

**Library:** `lucide-react` only. No other icon libraries. No inline SVG except the one Adjust icon already in `/talk`.

**Stroke widths:**
- Default chrome icons: `strokeWidth={1.75}`
- Fuel icons (♥ heart, ⚡ zap, ✦ brain/spark): `strokeWidth={2.0}`
- Tiny icons (≤14px): `strokeWidth={2.0}` (legibility)

**Sizes by context:**
| Context | Size (px) |
|---|---|
| Bottom nav | 24 |
| Section header inline icon | 18 |
| Row icon (settings, list item) | 20 |
| Chip leading icon | 14 |
| Button leading icon | 18 |
| Floating action / companion button | 24–28 |
| Fuel bar icon | 16 |
| Pro badge | 14 |

**Color:** Icons inherit `currentColor` from text. Default text-primary `#1A1A18`. Muted icons use `#9A8B73`. Honey-gold icons reserved for CTA-internal use.

**ABSOLUTELY FORBIDDEN: emojis in UI chrome.**
- No 🎁, ✨, 🛍️, 🔥, 💎, 👑, anywhere in JSX, buttons, labels, headings, navigation, card titles, section headers.
- Emojis live ONLY in: (1) user-generated content, (2) data fields like `vocabulary.emoji`, (3) `lib/voice/warmth.ts` strings that Miomi "speaks". They are content, not interface.
- The SCREENS.md spec for Marketplace shows `🎁 Refer & Earn`, `✨ Upgrade`, `🛍️ Characters` — those are **wireframe shorthand for what the section is about, not a directive to ship emojis**. Real implementation uses lucide-react icons (`Gift`, `Sparkles`, `ShoppingBag` or equivalent).

### A.7 Imagery

**Only Miomi PNGs are used for character imagery.** Located at `/public/characters/miomi/{full,head,companion,widget}/`.

**Allowed image content:**
- Miomi at her documented sizes (§1.2 of MIOMIKA.md v6)
- Future characters from `characters/{slug}/` (K-pop Bunny, Anime Hero, etc — Phase 7+)
- User avatar (uploaded by user)

**Forbidden:**
- Stock photos (Unsplash, Pexels, etc)
- Decorative illustrations not part of the Miomi character set
- Brand mascot variations not in `/characters/miomi/`
- AI-generated illustrations not produced via the asset-brief process in MIOMIKA.md v6 §8.6

**Miomi presentation rules (from MIOMIKA.md v6 §1.2):**
- Always on pure transparent background. No frame. No circle behind her. No container around her stage.
- Speech bubbles beside her, never over her face.
- Largest visual element on Home (≥58% of stage height).
- Specific head sizes per screen (Home 62%, /talk PersistentMiomi 96px head, companion button 56px, dashboard inline 80px).

---

## B. Tone & language rules

### B.1 All user-facing strings come from `lib/voice/warmth.ts`

**Forbidden in components:**
```tsx
Welcome back!          // ❌ hardcoded
Get started     // ❌ hardcoded
You have 3 hearts left   // ❌ hardcoded
```

**Required:**
```tsx
{warmth.greeting(profile)}
{warmth.cta.continue()}
{warmth.fuel.heartRemaining(3)}
```

If a warm phrase needed for a new surface doesn't exist in `warmth.ts` yet, **add it to `warmth.ts` first**, then import. Never inline-write a warm string in a component "just this once."

### B.2 Language separation

- When `uiLang === 'th'`: every chrome string in Thai. No English mixed in unless it's a proper noun (Miomi, Pro, Pro Max, Stars).
- When `uiLang === 'en'`: every chrome string in English. No Thai mixed in unless mode is Translate (where Thai vocabulary is content the user is studying).
- Mixed Thai-English chrome on a single surface = bug. The cat speaks one language at a time, like a real person would.

### B.3 Voice perspective

Miomi speaks from her own POV. The interface mirrors that:

- ✓ "I remember you" (Miomi speaking)
- ✗ "Your profile" (system speaking)

- ✓ "Things I know about you" (memory editor heading)
- ✗ "Memory Database"

- ✓ "Let's keep going" (Continue CTA)
- ✗ "Continue Session"

- ✓ "I missed you" (returning user greeting)
- ✗ "Welcome back"

Warm. Charming. Companion voice. Never robotic. Never transactional. Never imperative ("CLICK HERE", "BUY NOW"). She invites, she doesn't command.

### B.4 Forbidden phrasings (from MIOMIKA.md v6 §3.5)

Never use: "wrong", "incorrect", "ผิด", "ไม่ถูก", generic "good job", "great work", transactional toasts like "Saved!" / "Updated successfully" / "Error: Invalid input."

When something fails, Miomi delivers it with care: "หนูยังทำไม่ได้ค่า ลองอีกครั้งได้ไหม~?" not "Error 500."

---

## C. Layout rules per surface type

Five surface types. Each has a feeling, a mandatory anatomy, a forbidden anatomy.

### C.1 Companion surface — `/home`

**Feels like:** "she's happy I'm here." Warm, alive, low-pressure, like opening the door to a friend's apartment.

**Mandatory anatomy (top to bottom):**
1. Transparent top bar (logo or back, no heavy chrome)
2. **Miomi hero** — full-body or 3/4 body, ≥58% of stage height, no container, no frame, no circle. Mood-driven animation (breath, occasional react).
3. Warm greeting from `warmth.ts` (ice-breaker style, never repeating consecutively)
4. Fuel bars (heart ♥ pink, zap ⚡ gold, brain ✦ teal) — soft floating row, transparent background, fuel-tap interactions
5. Soft verb tiles or gentle reminders ("3 words to practice", "1 draft pending") — ignorable, not demanding
6. Bottom nav

**Forbidden anatomy:**
- Dashboard stats (numbers, charts, "minutes today")
- Pricing pressure / upgrade banner above the fold
- Cold metrics displayed prominently
- Verb tiles dominating Miomi's space — she must be hero
- Lock icons or "Pro only" badges anywhere on this surface
- Boxed containers around Miomi or fuel bars

**Reference from /talk:** the PersistentMiomi pattern (no circle bg, no frame, mood animation) — apply at Home's larger scale.

### C.2 Workspace surface — `/dashboard`

**Feels like:** "I'm getting things done." Productive, in-control, the surface a creator returns to on day 7+.

**Mandatory anatomy:**
1. Transparent top bar with screen title from warmth.ts
2. **Verb-aware sections** that adapt to user type (creator / learner / professional)
3. Each section is a **floating glass card** (see §D.1), surfacing one kind of work-in-progress
4. Every element answers "what did I do?" or "what should I do next?"
5. ONE primary CTA per visible section maximum (and only ONE across the whole screen is honey-gold)
6. Bottom nav

**Forbidden anatomy:**
- Cold metric tiles ("Minutes practiced: 42") with no story
- Generic charts that don't drive an action
- "Welcome to your dashboard" framing
- Stats for stats' sake
- Empty states that say "No data" — always a warm invitation from Miomi instead

**Reference from /talk:** carousel pattern for equivalent items (e.g. recent drafts can scroll horizontally); separate cards for non-equivalent sections.

### C.3 AI hub surface — `/talk` (SEALED REFERENCE)

**Feels like:** "she gets me." Intelligent, responsive, voice-first, the heart of the product.

**Status: SEALED at commit `8d030b4`.** Do not modify without explicit founder approval. Every other screen matches this visual standard.

**Anatomy (locked):**
1. Transparent top bar (back, mode label, transparent chrome)
2. PersistentMiomi 96px head, mood animation, no circle bg
3. Conversation transcript (user + Miomi bubbles)
4. Carousel MicRow (selected mode centers in orb; 2 left + 2 right rotate)
5. Toolbox right column (transparent icons: keyboard / Aa / globe / TTS)
6. Bottom nav

**Why this is the reference:**
- Transparent chrome (top bar and bottom areas blend into warm cream gradient)
- Floating glass elements with soft shadows
- Carousel pattern for equivalent verbs (Talk modes are all "conversation")
- Bottom area: characters/orbs/inputs float, never in boxed containers
- Mode-state animation (orb pulses when listening, icon swaps when idle)

### C.4 Economy surface — `/marketplace`

**Feels like:** "look at all the things she can be." Delightful, optional, never forced.

**Mandatory anatomy (scrollable, NOT a carousel):**
1. Transparent top bar with screen title
2. **Stars wallet card** (top, persistent context) — balance + top-up entry
3. **Refer & Earn card** — invite friends, both get Stars
4. **Upgrade to Pro card** — tier comparison, current tier indicated
5. **Characters & Items card** — scrollable, browse-able
6. Bottom nav

Each card is a floating glass card (§D.1) with a clear secondary CTA or chevron. The **single honey-gold primary CTA** on this screen is **Upgrade to Pro** (because conversion is the screen's economic priority); Refer & Earn uses a secondary outline button; Stars top-up uses an inline pill.

**Why card list, not carousel:** Talk's carousel works because all five modes are equivalent verbs of one intent (conversation). Marketplace's actions are fundamentally different contexts. A carousel would force users to swipe between unrelated actions = friction. Cards visible at once = clarity.

**Forbidden anatomy:**
- Carousel between economy sections (different intents, not equivalent verbs)
- Subscription **management** UI (cancel, billing history) — that lives in `/me`
- Aggressive "BUY NOW" framing
- Multiple honey-gold CTAs (only Upgrade is primary)
- Lock icons on Pro features (use Pro badge, not lock)

### C.5 Relationship surface — `/me` (UI label: "Profile")

**Feels like:** "this is mine, and she knows me." Warm, personal, in-control. The relationship surface — NOT iOS Settings.

**Mandatory anatomy (top to bottom):**
1. Transparent top bar (no title, the hero IS the identity)
2. **Identity hero** (no container, floating on cream):
   - User avatar (circle, 80px)
   - Display name (Kanit/Quicksand 600, 24/32)
   - Pro badge if applicable (small honey-gold pill, NOT a CTA — identity)
   - Journey stage chip (Tourist / Student / Worker / Resident / Entrepreneur — tappable to change)
3. **Growth story snippet** — one warm sentence from warmth.ts ("You've been with me 24 days. I remember 47 things about you.") — no card, just floating text on cream
4. **Subscription card** (glass card): current tier, plan benefits, "Manage" → opens billing detail. If Free, this card's CTA is the single honey-gold "Upgrade" routing to Marketplace § Upgrade.
5. **Memory editor card** (glass card): "Things I know about you" — list of memory rows, each editable/deletable. Trust signal. Heading uses Miomi's voice.
6. **Premium Voice tokens card** (glass card): balance + top-up entry routing to Marketplace
7. **Settings card** (glass card): voice toggle, language preference, notifications, theme (future). Settings rows use §D.3 row pattern.
8. **Help & legal card** (glass card): help, privacy, terms, contact. Small, calm.
9. **Logout** — text link at bottom, muted, no destructive styling
10. Bottom nav

**Single honey-gold CTA on this screen:** "Upgrade" if Free, otherwise "Manage subscription" (which is secondary outline, not gold).

**Forbidden anatomy:**
- iOS Settings cold list aesthetic — flat rows directly on the screen background with no breathing room
- "Delete Account" red button in a punitive way (use a calm muted link, confirm with warmth)
- Bureaucratic forms (date of birth fields, address forms — none of that lives here)
- Emojis in section headers (the failed /me had emojis — never again)
- Section headers in ALL CAPS gray (feels like a phone settings app)
- Multiple honey-gold buttons (only Upgrade or single primary CTA)
- Lock icons on Pro-tier identity (Pro badge instead — celebration, not gating)

**Why this is the relationship surface:** Profile in most apps is admin (forms, settings, billing). In Miomika, Profile is where Miomi shows the user "I see you, I remember you, you are mine and I am yours." Settings live here but they don't dominate. Memory editor is the most important card because control over what AI remembers is the deepest trust signal.

**Reference from /talk:**
- Floating glass cards (no flat list rows)
- Transparent top bar
- Warm cream gradient background
- Bottom area blends into nav
- One primary CTA only

---

## D. Component conventions

### D.1 Card (floating glass card)

The base building block of every non-`/talk` surface.

```css
.card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(237, 232, 224, 0.6);
  padding: 16px;
  box-shadow:
    0 1px 2px rgba(26, 26, 24, 0.04),
    0 4px 16px rgba(26, 26, 24, 0.06);
}
```

**When to use:** any grouped content on Dashboard, Marketplace, /me. Wraps a section.

**When NOT to use:** Home (Miomi floats free, no card wraps her); `/talk` (already sealed, transparent chrome). Don't card-wrap a single CTA button — buttons float on their own shadow.

**Inner spacing:**
- Card padding: 16px default, 12px on tight cards (Settings rows-only card)
- Title to content gap inside card: 12px
- Between rows inside a card: 12px

### D.2 Section header pattern

Small label above the card, optional subtitle, never inside the card.

```tsx

  
    {warmth.section.memory()}
  
  {subtitle && (
    
      {subtitle}
    
  )}

...
```

**Forbidden:** ALL CAPS section headers (cold), bold dark headers (steals attention from Miomi), section dividers (hr lines — cards already separate).

### D.3 Row pattern (settings, list items, memory rows)

```
[icon 20]   [label]                    [optional value chip]  [chevron 18 →]
```

```css
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  min-height: 44px;
}
.row + .row {
  border-top: 1px solid #EDE8E0;
}
.row__icon { color: #9A8B73; }
.row__label {
  flex: 1;
  font-family: Kanit, Quicksand, sans-serif;
  font-size: 16;
  color: #1A1A18;
}
.row__value {
  font-family: Quicksand;
  font-size: 13;
  color: #9A8B73;
}
.row__chevron { color: #C4BDB5; }
```

**When to use:** Settings card, memory editor card, billing detail.

**When NOT to use:** as the entire screen aesthetic. Rows live INSIDE cards, never directly on the cream background. (The failed /me put rows directly on the screen — that's iOS Settings aesthetic. Forbidden.)

### D.4 Toggle switch

```
On state:  background = honey-gold solid #C9A96E,    thumb white, soft shadow
Off state: background = #E8E5DF (border-medium gray),  thumb white, soft shadow
Size: 44 × 26, thumb 22, animated transition 180ms cubic-bezier(0.4, 0, 0.2, 1)
```
- Honey-gold ONLY on the toggle. Not pink. Not teal.
- Tap target wraps the toggle area to a 44×44 hit zone even though the visual is 26 tall.

### D.5 Primary CTA button (honey-gold)

```css
.cta-primary {
  height: 52px;
  padding: 0 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%);
  color: #FFFFFF;
  font-family: Kanit, Quicksand, sans-serif;
  font-size: 16;
  font-weight: 600;
  box-shadow:
    0 2px 6px rgba(201, 169, 110, 0.24),
    0 8px 20px rgba(201, 169, 110, 0.18);
  transition: transform 180ms cubic-bezier(0.4,0,0.2,1);
}
.cta-primary:active {
  transform: scale(0.98);
  box-shadow: 0 2px 6px rgba(201, 169, 110, 0.24);
}
```

**Rules:**
- ONE per screen, period. Count gradient buttons before commit.
- Full-width on mobile when it's the conversion moment (signup, upgrade); pill-width when it's a continue-action.
- Label is short and warm, from `warmth.ts`. Never "SUBMIT" or "CONFIRM" — "ตกลงค่า" / "Let's go" / "I'm in".
- No leading icon unless it earns the space (e.g. Sparkles for "Upgrade" in Marketplace).

### D.6 Secondary button (outline / ghost)

```css
.cta-secondary {
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #E8E5DF;
  color: #1A1A18;
  font-family: Kanit, Quicksand, sans-serif;
  font-size: 15;
  font-weight: 600;
  backdrop-filter: blur(10px);
}
```
- Used for: non-primary actions inside cards (Manage, Edit, See more).
- Never gold. Never pink.

### D.7 Chip / pill

Small rounded labels for tags, categories, status, Pro badge.

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #EDE8E0;
  font-family: Quicksand;
  font-size: 12;
  font-weight: 600;
  color: #1A1A18;
}
.chip--pro {
  background: linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%);
  color: #FFFFFF;
  border: none;
}
.chip--free {
  background: rgba(255, 255, 255, 0.7);
  color: #9A8B73;
}
```

**Pro badge is a chip, NOT a button.** It signals identity, not action.

### D.8 Fuel bar (heart / zap / brain)

```
[♥ pink-stroke icon 16]  [value]  separator  [⚡ gold icon 16]  [value]  separator  [✦ teal icon 16]  [value]
```
- Floating row, transparent background, no card wrapper.
- Heart icon = pink #DB2777 stroke (the only pink in chrome).
- Zap icon = gold #C9A96E stroke.
- Brain icon = teal #7DD3C0 stroke.
- Tap any fuel = warm Miomi reaction + value updates.

---

## E. Pre-commit checklist

**Every screen-build Composer prompt must include this block and Composer must verify and check each box before committing.**

```
DESIGN-RULES CHECKLIST (must verify before commit):
- [ ] No emojis in UI chrome (grep JSX for emoji unicode outside warmth.ts imports)
- [ ] No hardcoded user-facing strings (all warm phrases imported from lib/voice/warmth.ts; new strings added to warmth.ts first)
- [ ] Honey-gold gradient used for exactly ONE primary CTA on this screen
- [ ] Pink (#F9A8D4 / #DB2777) used only for heart fuel icon, nowhere else
- [ ] Only lucide-react icons used (no SVG inlined except the existing Adjust icon in /talk)
- [ ] Card pattern matches DESIGN-RULES §D.1: rgba(255,255,255,0.7) bg, backdrop-blur(20px), 1px soft border, rounded 12px, soft shadow
- [ ] Border radius uses only 12 (cards), 16 (sheets), 999 (pills/buttons). No 18, 20, 24 on cards.
- [ ] Spacing uses only 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96. No 14, 18, 20, 28.
- [ ] Mobile-first verified at 375×812 viewport in head
- [ ] Surface anatomy matches its type per DESIGN-RULES §C
- [ ] No iOS Settings cold-list aesthetic on relationship surfaces (/me, /home)
- [ ] Fonts: Kanit / Quicksand for chrome only. Sarabun only on Thai learning content.
- [ ] Lock icons not used for Pro gating (use Pro badge chip instead)
- [ ] Voice perspective ("I remember you" not "Your profile") on relationship/companion surfaces
- [ ] One primary CTA per screen (count gradient buttons — must be exactly 1, or 0 on calm surfaces)
- [ ] Errors / empty states deliver via warm Miomi, never red toasts or "No data"
```

If any box can't be checked, do not commit. Either fix the issue or escalate the rule conflict to Mike.

---

## F. The /talk visual standard (sealed reference)

These specific decisions /talk got right at commit `8d030b4`. Every screen must follow them where applicable.

1. **Persistent character header.** Miomi PNG, mood animation, no cage/box/circle behind her. She is the most alive thing on the screen.

2. **Warm cream gradient background.** `linear-gradient(180deg, #FEFCF7 0%, #FDFAF2 100%)` or app-shell `#FCFCFA`. Never pure white. Never gray. The cream tells the eye "safe."

3. **Transparent chrome.** Top bar has no fill, no border, no shadow — it blends into the gradient. Bottom areas (mic row, toolbox) blend into the app shell.

4. **Floating glass elements with soft shadows.** Everything that's interactive floats. Nothing sits in a box. Cards, buttons, orbs — all have the §A.5 shadow formula.

5. **Carousel for equivalent verbs, card list for distinct intents.** Talk's mode carousel works because Auto/Teach/Social/Translate/Chat are all "conversation." Marketplace doesn't use a carousel because Refer/Upgrade/Characters are distinct intents.

6. **Bottom area floats.** Inputs, orbs, mic row — none of them in boxed containers. The horizon between content and chrome dissolves.

7. **Mode-state animation.** The orb pulses when listening. The icon swaps to AudioWaveform when active, mode icon when idle. State is visible without being loud.

8. **No emojis anywhere in the chrome.** /talk has zero emoji in its UI. Every other screen matches that.

9. **Warm phrases everywhere.** Ice-breaker on session start, never repeating consecutively, sourced from `warmth.ts`. Every screen follows.

10. **One honey-gold moment.** /talk doesn't have a screen-level primary CTA because conversation IS the action. When upgrade is needed (after 5th guest exchange), it appears in a sheet with one honey-gold button. Match that discipline: gold is rare, gold is the moment.

---

## End of DESIGN-RULES.md v1.0

If a future Claude or Cursor session is reading this: every Miomika screen must pass §E checklist before commit. The /talk surface at commit `8d030b4` is the visual standard. The relationship surface (/me) is the trust surface. The economy surface (/marketplace) is the conversion surface. The companion surface (/home) is the bond surface. The workspace surface (/dashboard) is the return surface. The AI hub (/talk) is the heart.

Honey-gold is welcome, not commerce. Pink is the heart, never the wallet. Warm phrases live in `warmth.ts`. Miomi speaks; the interface listens.
