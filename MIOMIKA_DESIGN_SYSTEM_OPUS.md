I'll fetch the live site first, then deliver the six architectural decisions.Fetched: MiomikaFetched: MiomikaI've seen the live product. I have the full picture. Here is the master-class brief — six architectural decisions, each surgical and implementable.

1. MIOMI ANIMATION ARCHITECTURE
The current PNG-swap is the single thing killing this product. A character that doesn't move feels like an icon, not a being. We fix this in two waves: an immediate bridge using Framer Motion + the existing PNGs that ships this week, and a Rive state machine that ships in 3 weeks. Both share the same state contract, so the Rive swap is invisible.
State Machine Contract
Every state must declare: entry, loop, exit, trigger, autoReturnMs, priority, interruptible, sound, ambientMode.
States are governed by a single store (Zustand). Only one state is active at a time. Higher priority interrupts lower. Same priority queues.
Priority hierarchy (locked, do not negotiate later):
100  PAYMENT_CONFIRMED      (one-shot, blocks everything 2.4s)
 95  LEVEL_UP               (one-shot, blocks 2.0s)
 90  WORD_MASTERED          (one-shot, blocks 1.4s)
 85  CELEBRATION            (one-shot, 1.2s — generic positive)
 80  FIRST_FUEL_TAP         (one-shot, 1.0s — once per day)
 75  EXCITED                (loop, decays to HAPPY after 3s)
 70  HAPPY                  (loop, decays to IDLE after 5s)
 65  SPEAKING               (loop, locked while TTS or text streams)
 60  THINKING               (loop, locked while AI request in-flight)
 55  LISTENING              (loop, locked while mic open)
 50  LOW_FUEL               (loop, persists while any bar < 25%)
 40  MISSING_USER           (loop, persists if last_seen > 48h, until first interaction)
 30  IDLE                   (default base loop)
 10  SLEEPING               (loop, after 90s of zero input AND no audio)
Rule: CELEBRATION cannot interrupt SPEAKING. Celebrations queue until SPEAKING ends, then fire. This prevents Miomi cutting herself off mid-sentence to celebrate.
State Specifications
IDLE (default)

Entry: 0ms — fade head-idle.png in at opacity 0→1 over 240ms when arriving from another state, ease-out-quart
Loop: Composite — breathing (scale 1.000 ↔ 1.018, 3200ms sine), plus randomized micro-variations:

Blink: every 4.2–6.8s (jittered), 140ms close, 60ms hold, 140ms open. In Framer-bridge: a separate <motion.div> overlay with eyelid shapes; in Rive: an eye blend.
Ear flick: every 8–14s, single ear, 220ms rotation 0°→-8°→0°, ease-in-out-back
Tail sway: continuous, 3.6s loop, ±4° rotation, sine
Paw shift: every 15–22s, body translateY 0→-2px→0 over 600ms, ease-in-out-quad


Exit: 180ms cross-fade to next state's entry frame
Trigger: default; auto-return target from every other state
AutoReturnMs: n/a
Sound: silence; very occasional (every 30–60s) soft purr 1.2s at -28dB
Ambient: blobs drift slow (current behavior), velocity multiplier 1.0

HAPPY

Entry: 320ms — head-happy.png swap at 80ms, scale 1.0→1.08→1.0 spring (stiffness 320, damping 14), simultaneous head tilt +6° → 0° over 280ms
Loop: breathing slightly faster (2800ms), tail sway amplitude doubled (±8°), no behavior change to ears
Exit: 220ms scale return + head-idle.png crossfade
Trigger: user says positive Thai phrase, fuel bar fills past 50%, returning user same day
AutoReturnMs: 5000 → IDLE
Sound: soft "nya~" 400ms at -24dB on entry
Ambient: blob velocity ×1.15, slight warm color bias (+8% pink saturation)

THINKING

Entry: 200ms — head-thinking.png swap at 60ms, head tilt -10° over 200ms, ease-out-cubic
Loop: head sway ±3° at 1800ms period, breathing normal, paw to chin if Rive (Framer-bridge: skip), ear droop -4° hold
Exit: 240ms head return to 0°, crossfade to SPEAKING entry
Trigger: fetch('/api/miomi') starts. Fires immediately on send, not on first token
AutoReturnMs: locked until response arrives or 12s timeout
Sound: optional "hmmm..." 600ms at -28dB on entry, once per session max
Ambient: blobs slow to ×0.7 velocity (visual cue she's concentrating)

SPEAKING

Entry: 180ms — head-speaking.png swap at 40ms, no scale change (avoid bouncing while reading)
Loop: subtle mouth area pulse (in Rive: real mouth shapes synced to TTS phonemes; in Framer-bridge: head scale 1.000 ↔ 1.012 at 280ms tied to text-stream tokens), head sway ±2° at 2400ms
Exit: 200ms crossfade to next
Trigger: first token of streamed response arrives, OR TTS audio playback starts
AutoReturnMs: locked until text fully rendered AND TTS finished, then → HAPPY for 1.5s → IDLE
Sound: TTS audio (Web Speech free tier; ElevenLabs paid). No additional layer.
Ambient: blob velocity ×1.0, gentle warm pulse on every sentence boundary

LISTENING

Entry: 220ms — head-idle.png with ear perk both ears +12° rotation over 220ms, ease-out-quart
Loop: ears held at perked position, head micro-tilts ±2° following mic input volume if available (Framer-bridge: ignore volume, just gentle sway)
Exit: 200ms ear return + transition to THINKING
Trigger: mic button pressed, SpeechRecognition.start() fires
AutoReturnMs: locked until result.isFinal === true OR user cancels
Sound: very soft ambient "open mic" tone -32dB if user wants confirmation (off by default)
Ambient: blobs pulse outward gently in rhythm with detected speech, velocity ×0.8

EXCITED

Entry: 400ms — head-happy.png at 60ms, scale 1.0→1.14→1.04→1.08 spring (stiffness 380, damping 11), head tilt cycles +8°/-8°/0° over 400ms
Loop: vigorous bounce — translateY 0↔-4px at 600ms ease-in-out, tail sway amplitude ±14°
Exit: 280ms settle to HAPPY entry frame
Trigger: user completes 5+ exchange streak in single session, returns after 24-48h absence, hits 7-day streak
AutoReturnMs: 3000 → HAPPY (which then decays to IDLE)
Sound: "nyaa~!" 600ms at -22dB
Ambient: trigger magic-mode particle burst (see Section 2)

CELEBRATION

Entry: 500ms — happy.png FULL BODY swap (not head), scale 0.9→1.12→1.0 spring (stiffness 240, damping 12), translateY 0→-12px→0
Loop: 700ms loop — gentle bounce ±4px Y, slow rotation ±3°
Exit: 320ms scale return + head-idle.png crossfade
Trigger: generic positive moments not covered by specific states (referral signup, achievement unlocked, daily fuel topped)
AutoReturnMs: 1200 → IDLE
Sound: ascending chime 800ms, three notes (C5-E5-G5), -20dB
Ambient: magic-mode burst, warm palette only

LOW_FUEL

Entry: 300ms — head-idle.png, eye droop slightly (Rive: -10% eye open; Framer-bridge: opacity 0.94 head crossfade with subtle desaturation filter -8%), ear droop both -5°
Loop: breathing slower (4200ms), reduced micro-variation frequency (×0.5)
Exit: 320ms restore on first fuel tap → FIRST_FUEL_TAP
Trigger: any fuel bar drops below 25%, AND state not already > LOW_FUEL priority
AutoReturnMs: persists; no auto-return. Cleared only by fuel tap.
Sound: every 25-40s, soft sigh 600ms at -32dB (rare, never naggy)
Ambient: blob saturation -20%, velocity ×0.85, palette shifts cooler

LEVEL_UP

Entry: 600ms — full body happy.png, scale 0.85→1.20→1.05→1.10 spring (stiffness 200, damping 10), translateY 0→-20px→-8px, simultaneous 360° gold particle ring sweep around her
Loop: 1200ms — gentle hover at -8px Y, ±2° rotation sine
Exit: 400ms settle to standing IDLE base
Trigger: XP threshold crossed
AutoReturnMs: 2000 → IDLE (level-up modal handles longer celebration; Miomi returns to base so user can read the modal)
Sound: 1.4s level-up motif (5 ascending notes ending on octave), -18dB
Ambient: full magic-burst gold palette, 80 particles, see Section 2

WORD_MASTERED

Entry: 300ms — head-happy.png swap, single head bob (0→-6px→0 Y over 280ms) + ear perk both +8°
Loop: 600ms loop, ear-perked happy hold
Exit: 240ms to HAPPY entry
Trigger: vocabulary item promoted from used → mastered (third correct use)
AutoReturnMs: 1400 → HAPPY → IDLE
Sound: small bright "ting" 300ms, single note F5, -22dB
Ambient: small magic-burst, 18 particles, ✦ teal-mint palette

PAYMENT_CONFIRMED

Entry: 800ms — full body happy.png, scale 0.7→1.25→1.0 spring (stiffness 180, damping 9), with a 360° spin (single full rotation, ease-in-out over 700ms) starting at 100ms
Loop: 1600ms — slow hover at -6px Y, gentle ±2° rotation
Exit: 500ms to standing IDLE
Trigger: Omise webhook fires success AND user is in-app (if not in-app: queue for next session open)
AutoReturnMs: 2400 → HAPPY for 4s → IDLE
Sound: 1.8s motif — chime cluster, gold and pink tonal blend, -16dB
Ambient: maximum magic-burst, full palette (pink+gold), 120 particles, plus fuel-bar animate-to-100% over 1.2s

FIRST_FUEL_TAP

Entry: 240ms — head-happy.png swap at 40ms, scale 1.0→1.10→1.02 spring (stiffness 340, damping 13), head tilt toward tapped icon
Loop: 800ms hold with ear perked toward icon
Exit: 220ms to HAPPY
Trigger: first fuel tap of calendar day (Bangkok timezone), checked against localStorage.lastFuelTapDate
AutoReturnMs: 1000 → HAPPY → IDLE
Sound: warm "mm~!" 400ms at -22dB
Ambient: small directional burst from tapped icon toward Miomi, 24 particles colored to fuel type (♥ pink, ⚡ gold, ✦ teal)

MISSING_USER

Entry: 600ms — head-idle.png with slow droop, scale 1.0→0.98 over 600ms, ear droop both -10°, slight head bow -6°
Loop: very slow breathing (5000ms), reduced blink frequency (every 8-12s)
Exit: 500ms revive → HAPPY on first user input
Trigger: last_seen > 48h on app open, persists until first user action
AutoReturnMs: persists; cleared by any user interaction
Sound: silence; on user interaction, soft "...nya?" 500ms at -24dB
Ambient: blob saturation -30%, velocity ×0.6, cooler palette

SLEEPING

Entry: 1200ms — head-idle.png with eye-close transition (Rive: eyes close blend; Framer-bridge: overlay eyelid SVG fade 0→1 over 800ms), head lower -8px, scale 0.96
Loop: 4400ms breathing deep, occasional "Z" speech bubble particle (every 6-10s, drifts up and fades)
Exit: 480ms — eyes open, head raise, ear perk → IDLE
Trigger: 90s of no user interaction AND no audio playing AND tab not actively focused-and-scrolled
AutoReturnMs: persists; any user input wakes her
Sound: optional very-distant purr loop -34dB
Ambient: blob velocity ×0.4, palette muted

PNG → Rive Mapping
Existing 4 expressions are blend targets. Rive file structure:
Artboard: Miomi
  StateMachine: main
    Inputs:
      - state (number, 0-12)         # maps to enum above
      - mouthOpen (number, 0-1)      # TTS-driven during SPEAKING
      - earPerk (number, -1 to 1)    # listen direction
      - eyeClose (number, 0-1)       # blink + sleep
      - tailAngle (number)           # sway
      - bodyY (number)               # hover/bounce
      - headTilt (number)            # -15 to 15 degrees
    Blend states:
      expression_neutral ← idle.png  
      expression_happy ← happy.png  
      expression_thinking ← thinking.png  
      expression_speaking ← speaking.png
    1D blend on `state` input drives expression mixing.
    Independent rigs for ears, tail, body, eyes overlay the expression.
Framer Motion Bridge (ship this week)
While Rive is built, this is the implementation that ships now. It is not Rive-quality but it kills the "static image" feeling.
tsx// components/miomi/MiomiCharacter.tsx — pseudocode contract
const expressionMap = {
  IDLE: '/miomi/head-idle.png',
  HAPPY: '/miomi/head-happy.png',
  THINKING: '/miomi/head-thinking.png',
  SPEAKING: '/miomi/head-speaking.png',
  LISTENING: '/miomi/head-idle.png',
  EXCITED: '/miomi/head-happy.png',
  CELEBRATION: '/miomi/happy.png',        // full body for celebration tier
  LOW_FUEL: '/miomi/head-idle.png',
  LEVEL_UP: '/miomi/happy.png',
  WORD_MASTERED: '/miomi/head-happy.png',
  PAYMENT_CONFIRMED: '/miomi/happy.png',
  FIRST_FUEL_TAP: '/miomi/head-happy.png',
  MISSING_USER: '/miomi/head-idle.png',
  SLEEPING: '/miomi/head-idle.png',
}

// Layered structure:
// 1. <motion.div> — body container (handles bodyY, scale, rotation)
//   2. <motion.img> — expression PNG (crossfade between expressionMap entries)
//   3. <EarOverlay /> — two absolutely positioned SVG triangles, rotation animated
//   4. <BlinkOverlay /> — two absolutely positioned SVG eyelids, scaleY animated
//   5. <TailOverlay /> — single SVG path, rotation animated
//   6. <ZParticle /> — only when SLEEPING
// Each layer reads from the Zustand store, animates independently.
The ear and blink overlays are cheap SVGs you draw once over the PNG. They land roughly on top of the existing artwork. Mike: position these once visually, they don't need to be pixel-perfect — the brain fills in the rest because the rest of her is moving.
This single change — overlaid blinks and ear flicks on top of existing PNGs — transforms her from "image" to "creature" in one afternoon.

2. MAGIC MOMENT SYSTEM
The existing ambient blob system has mode="magic" ready. Define each moment as a config object so the system can be called declaratively from any component.
tstype MagicMoment = {
  id: string
  trigger: string
  miomiState: MiomiState
  particles: {
    count: number
    sizeRange: [number, number]      // px
    colors: string[]                  // hex array; particles pick weighted random
    spreadAngle: number               // degrees; 360 = full burst, 90 = directed cone
    originAngle?: number              // for directed bursts
    speed: [number, number]           // px/s min-max
    lifetime: [number, number]        // ms min-max
    gravity?: number                  // px/s² — negative = float up
  }
  duration: number                    // ms — total moment length
  ambientBehavior: 'freeze' | 'accelerate' | 'color_shift' | 'none'
  ambientPaletteShift?: string[]      // override colors during moment
  ambientVelocityMultiplier?: number
  settle: number                      // ms to return ambient to normal after
}
The Eight Moments
a) FIRST_FUEL_TAP_OF_DAY

Trigger: first fuel tap where localStorage.lastFuelTapDate !== today
Miomi state: FIRST_FUEL_TAP
Particles: 24 count, size 4-8px, colors [#F9A8D4, #C9A96E, #FFF4E0], spreadAngle 90° directed FROM tapped icon TOWARD Miomi, speed 180-280px/s, lifetime 800-1200ms, gravity -20 (slight float)
Duration: 1000ms
Ambient: color_shift to warm bias for 1.5s, velocity ×1.2, settle 600ms
After: bars animate fill from current to new value over 600ms with overshoot (current+8% then settle back)

b) WORD_MASTERED

Trigger: vocabulary stage becomes mastered
Miomi state: WORD_MASTERED
Particles: 18 count, size 3-6px, colors [#7DD3C0, #C9A96E] (teal+gold = ✦ brain palette), spreadAngle 360° from Miomi, speed 120-180px/s, lifetime 1000-1400ms, gravity -8
Duration: 1400ms
Ambient: accelerate ×1.3 for 1.4s
After: word card UI slides in beside Miomi showing the mastered word with checkmark, dwells 3.2s, exits

c) LEVEL_UP

Trigger: XP crosses level threshold
Miomi state: LEVEL_UP
Particles: 80 count, size 4-10px, colors [#C9A96E, #E8C77F, #F9A8D4, #FFFFFF], spreadAngle 360°, speed 200-400px/s, lifetime 1600-2400ms, gravity -12
Plus secondary ring: 12 large stars (12-16px), gold only, expanding ring formation, 0→360° rotation over 1.4s, fade at end
Duration: 2000ms
Ambient: color_shift to full gold palette, velocity ×1.8 for 2.0s, settle 1200ms
After: level-up modal slides in (sheet from bottom on mobile, centered card on desktop), dismissed by tap or auto-close after 6s

d) PAYMENT_CONFIRMED

Trigger: Omise webhook success while user is in-app
Miomi state: PAYMENT_CONFIRMED
Particles: 120 count, size 3-12px, colors [#F9A8D4, #DB2777, #C9A96E, #E8C77F, #FFFFFF], spreadAngle 360°, speed 180-400px/s, lifetime 1800-2800ms, gravity -10
Plus full-screen flash: white at opacity 0→0.3→0 over 300ms (subtle, not jarring)
Duration: 2400ms
Ambient: color_shift to full pink+gold palette, velocity ×2.0 for 2.4s, settle 1800ms
After: fuel bars animate to 100% over 1.2s (overshoot 105% → settle 100%), then Pro badge appears beside Miomi's name with 320ms scale-in

e) STREAK_MILESTONE

Trigger: streak count hits 7, 30, or 100
Miomi state: EXCITED
Particles for 7: 30 count, sizeRange 4-8px, colors [#F9A8D4, #C9A96E], spreadAngle 360°, speed 150-250px/s, lifetime 1200-1600ms
Particles for 30: 60 count, all values ×1.3
Particles for 100: 100 count, plus add [#7DD3C0, #FFFFFF] to palette, plus secondary ring of 7 stars
Duration: 1600ms / 2000ms / 2400ms
Ambient: accelerate ×1.5 for duration, settle 1000ms
After: streak number animates in large (48px → 32px settle) center screen, dwells 2.4s

f) GUEST_SIGNUP_CONVERSION

Trigger: guest creates account (auth state change from anonymous → user)
Miomi state: EXCITED → CELEBRATION
Particles: 60 count, size 4-10px, colors [#F9A8D4, #FFF4E0, #C9A96E], spreadAngle 360°, speed 160-300px/s, lifetime 1400-2000ms, gravity -10
Duration: 1800ms
Ambient: color_shift warm + velocity ×1.6 for 1.8s, settle 1000ms
After: name input speech bubble — "หนูเรียกคุณว่าอะไรดีคะ~?" with name field below (this is the most important second-impression in the product)

g) FIRST_EVER_SESSION

Trigger: very first visit, fires once at end of welcome screen as transition INTO home
Miomi state: EXCITED (gentle variant — scale only goes to 1.08 not 1.14)
Particles: 40 count, size 4-8px, colors [#FFFFFF, #F9A8D4, #FFF4E0], spreadAngle 360°, speed 100-200px/s (slow), lifetime 2000-3000ms (long), gravity -6
Duration: 2400ms — slow, gentle, dreamlike. Not a burst — a bloom.
Ambient: existing blobs already on screen; they don't accelerate, they brighten slightly (saturation +15%)
After: this IS the welcome-to-home transition. See Section 4.

h) MIOMI_WAKES_FROM_SLEEP

Trigger: user returns after MISSING_USER state, makes any interaction
Miomi state: MISSING_USER → SLEEPING (briefly, 400ms eye-open) → HAPPY → IDLE
Particles: 16 count, size 3-6px, colors [#FFF4E0, #F9A8D4], spreadAngle 360° gentle, speed 80-150px/s, lifetime 1400-1800ms, gravity -12
Duration: 1400ms
Ambient: blobs bloom back from desaturated state — saturation animates from -30% to baseline over 1.4s, velocity ramps from ×0.6 back to ×1.0
After: speech bubble "หนูคิดถึงค่า..." appears with 400ms fade

Implementation note
Build useMagicMoment(momentId) hook that calls the existing ambient system in magic mode with the config above. Magic moments compose: a fuel tap that levels-up triggers FIRST_FUEL_TAP_OF_DAY → LEVEL_UP back-to-back. The state machine handles sequencing via priority queue.

3. MOBILE HOME SCREEN UX ARCHITECTURE
The live screen has a hierarchy problem: Miomi, fuel bars, MIOMI'S PICK, and three action buttons all compete. The eye doesn't know where to land second.
Visual Hierarchy (locked)

Miomi — 62% of stage height (was 58%, increase it). She is the screen.
Speech bubble beside her — when present, it borrows her authority
Talk to Miomi CTA — the primary action, must visually dominate the action row
Fuel bars + level — secondary information layer, lives at bottom of stage as a single horizontal strip
MIOMI'S PICK — tertiary, collapsed by default into a single line, expands on tap

Currently #3, #4, #5 are visually equal. They must not be.
Decisions
Nav — make เรียน the primary CTA
Decision: keep 4 tabs but the second tab (เรียน / Create) becomes a raised pill that breaks the nav row vertically. Specifically:
[หน้าหลัก]   [ เรียน ]   [แดชบอร์ด]   [ฉัน]
              ↑ raised pill
              ↑ background: white surface
              ↑ pink ring border 2px #F9A8D4
              ↑ scale 1.08 vs others
              ↑ translateY -10px
              ↑ when active: fill pink #F9A8D4, white icon
              ↑ subtle pulse (scale 1.08↔1.10) every 6s while idle
This is the TikTok+ pattern translated to learning. The pulse stops once user has used it that day. Other three tabs use weight via subtle background (active tab gets bg-stone-100 pill, 40% opacity icon when inactive, 100% when active). No lock icons ever.
Feed / Play / Talk hierarchy
Decision: kill the three equal buttons. Replace with one primary + two secondary.
Row layout (mobile, edge-to-edge with 16px gutter):

[♥]  [⚡]  [        คุยกับมิโอมิ ↗        ]
40px  40px       flex-1, 56px tall
icon  icon       pink gradient, white text
only  only       Thai larger, English smaller below
                 right-arrow chevron

Heart and Zap become icon-only circular buttons 40px diameter. Tap them to do a fuel-tap. No labels. Their state (filled vs empty ring) shows fuel level.
Talk to Miomi takes 70% of horizontal space, 56px tall, pink gradient linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%), white text, chevron right.

Mike: this means the fuel taps and the conversation CTA are no longer competing. Fuel is "ready her up." Talk is "go." Different cognitive layers.
Guest invitation design
The guest currently sees no compelling pull. Decision: add a single persistent line in the speech bubble area visible only to guests:

เหลืออีก 3 ครั้งนะคะ~ หนูอยากจำคุณได้ค่า
3 chats left — I want to remember you ✨

This line appears under Miomi's normal speech bubble in muted text at 13px when exchange count >= 2. Tapping it opens the soft signup sheet. After exchange 4, the bubble itself becomes the invitation. After exchange 5, the bubble persists with: "บันทึกหนูไว้ได้ไหมคะ~ ฟรีค่า" with two buttons: "เข้าสู่ระบบกับ Google" (primary) and "ไว้ทีหลัง" (text link).
Fuel tap micro-interaction (the 0.5s)
This must feel magical. Decision, frame by frame:

0ms — finger touch detected. Button scales 1.0→0.92 over 80ms ease-out
80ms — small fuel-type icon (heart, lightning, brain) spawns at finger position, full opacity
80-280ms — icon travels from finger toward Miomi's center on a bezier curve (slight arc upward), scaling 1.0→0.6 along the way
220ms — Miomi enters FIRST_FUEL_TAP state (or generic fuel-tap HAPPY if already tapped today). Head perk toward icon source.
280ms — icon reaches Miomi, dissolves with 4 small particles (matching fuel color) bursting outward
280-400ms — corresponding fuel bar fills with overshoot animation: target+8% over 200ms, settle to target over 100ms
300ms — Miomi speaks one short Thai phrase from the library (rotation pool, 6-8 variants): "อร่อยจัง~", "ขอบคุณค่า~", "หนูพร้อมแล้ว~"
500ms — button returns to scale 1.0, micro-interaction complete

If user taps a fuel that's already at 100%: skip the bar fill, but Miomi still reacts with HAPPY + says "อิ่มแล้วค่า~" — never refuse, always acknowledge.
Speech bubble design
Decision:

Position: top-right of stage, anchored 16px from top, 16px from right edge
Max width: 64% of stage width (mobile)
Background: white with 12px border radius, 1px border #E8E5DF, shadow 0 4px 16px rgba(0,0,0,0.04)
Tail: small triangle pointing toward Miomi's head, 8px
Typography: Thai 15px Kanit 500, English 12px Quicksand 500 muted #9A8B73 below, line-height 1.5
Entry: opacity 0→1 + translateY 6px→0 over 240ms ease-out-cubic, with a subtle scale 0.96→1.0
Exit: same in reverse, 200ms
Dwell: minimum 4s, extends if text is long (1 word = 80ms + 4000ms base)
Never overlaps Miomi's face — if stage is narrow, bubble repositions to above her head

Stat display
Decision: kill the three percentage pills. They're abstract and uninteresting. Replace with a single horizontal strip at bottom of stage that shows all three fuel bars + level inline:
♥ ▓▓▓▓░░░░░░  ⚡ ▓▓░░░░░░░░  ✦ ▓░░░░░░░░░       Lv.3   XP ▓▓▓▓▓▓▓░░░

Strip height: 36px
Each fuel bar: 8px tall, 64px wide, 2px border-radius, pink/gold/teal accents
Icons: 16px Lucide, sit before each bar
No percentage text — the bar IS the data
Level "Lv.3" right-aligned, 13px Kanit 500
XP bar: 4px tall, 96px wide, gold, beneath the level number

Cleaner, more elegant, less Tamagotchi.
MIOMI'S PICK — transform it
Decision: keep the daily phrase but transform it into a collapsed card that lives ABOVE the action row, not as its own section. When collapsed:
[ ✦ MIOMI'S PICK · I'm up for it · ฉันพร้อมแล้ว → ]
↑ 40px tall, gold left edge accent 3px, single line, tap to expand
When expanded (tap):
┌────────────────────────────────────────┐
│ ✦ MIOMI'S PICK · วันนี้                │
│                                        │
│ "I'm up for it"                        │
│ ฉันพร้อมแล้ว                            │
│                                        │
│ ใช้ตอบตกลงทำอะไรด้วยกัน                  │
│                                        │
│ [ฝึกเลย →]    [ดูความหมาย]              │
└────────────────────────────────────────┘
height: 168px, slides down pushing action row,
ambient blobs behind glow slightly gold during expansion
This makes it discoverable but not noisy. The default state respects Miomi as the hero.
Ambient system role
Decision: ambient blobs respond to fuel state and Miomi state:

All fuel ≥ 50% → baseline (current behavior)
Any fuel < 25% (LOW_FUEL) → saturation -20%, velocity ×0.85, cooler bias
During SPEAKING → gentle warm pulse on each sentence (saturation +5% for 400ms then return)
During CELEBRATION class states → magic mode burst as defined in Section 2
During SLEEPING → velocity ×0.4, palette muted

This makes the environment feel co-conscious with Miomi without becoming distracting.
CTA color — kill #8B1A35
Decision: #8B1A35 is too harsh and competes with Miomi's pink. Replace with the pink gradient already in the brand:

Primary CTA: linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%) with white text. This is Miomi's color, so the CTA reads as "act with Miomi" not "submit form."
Secondary CTA: white background, 1.5px border #DB2777, text #DB2777
Tertiary CTA: text-only link, #9A8B73

The dark red was reading as "warning" or "important administrative action" — it pulled emotional warmth out of the screen. Pink gradient unifies Miomi-as-character with action-as-Miomi.

4. WELCOME SCREEN — MASTER CLASS REDESIGN
This is the first impression. It must be unforgettable in 3.6 seconds.
Total Duration: 3.6 seconds
Five phases, no longer than they need to be.
Phase 1 — Ambient awakening (0–600ms)

Screen starts as soft warm white #FAFAF6, pure, empty
At 80ms, the ambient blob system fades in at opacity 0→1 over 400ms — but at HALF saturation and HALF velocity. The world is being drawn.
At 200ms, a single subtle warm glow centered where Miomi will appear, scale 0.6→1.4, opacity 0→0.4→0.2, radial gradient #FFF4E0 to transparent

The user is not looking at anything specific yet. They're feeling a space being created.
Phase 2 — Miomi arrives (600–1400ms)

At 600ms, Miomi (full body happy.png) fades in from opacity 0 over 320ms, simultaneously scale 0.7→1.05→1.0 spring (stiffness 220, damping 13), positioned at vertical center
No bounce, no run, no animation flourish. She arrives — like a memory materializing
At 800ms, blink overlay does ONE blink as she "wakes up" — 140ms close, 80ms hold, 140ms open
At 1000ms, head tilt micro-motion +4° → 0° over 280ms — the recognition tilt, "oh, it's you"

Phase 3 — Recognition (1400–2200ms)

At 1400ms, ambient blobs ramp from half saturation to baseline over 600ms — the world brightens BECAUSE she sees you
At 1500ms, the warm glow around her intensifies briefly (opacity 0.2→0.5→0.3 over 400ms), then settles
At 1600ms, very subtle FIRST_EVER_SESSION particle bloom begins — slow, sparse, dreamlike (40 particles, slow speed, long lifetime per Section 2g)

Phase 4 — She speaks (2200–3200ms)

At 2200ms, speech bubble fades in beside Miomi (positioned top-right of her), opacity 0→1 + translateY 8px→0 over 280ms
Bubble contains, typewritten character-by-character at 28ms per char:


ยินดีต้อนรับนะคะ~ หนูรอคุณอยู่ค่า
Welcome~ I've been waiting for you


Typewriter completes Thai by ~2900ms, English fades in beneath fully formed at 2900ms over 200ms (not typed — Thai is the heart, English is the translation)
At 3000ms, Miomi enters HAPPY loop state briefly (subtle scale pulse 1.0→1.02→1.0 over 400ms)

Phase 5 — Becoming home (3200–3600ms)

This is the magic: the welcome screen does not cut to home. It becomes home.
At 3200ms, the speech bubble dwells (no fade yet)
At 3200ms, the rest of the home UI slides in around her: nav from bottom (translateY 64px→0, 320ms ease-out-cubic), fuel-bar strip beneath her (opacity 0→1 + translateY 12px→0, 280ms), MIOMI'S PICK collapsed bar (opacity 0→1, 240ms, delayed 80ms)
Miomi DOES NOT MOVE. She is the constant. Everything else builds around her.
The speech bubble continues to dwell for an additional 2000ms after home arrives (so the user has time to read it on home)
After 5200ms total elapsed, bubble fades out and Miomi's normal rotating bubble system takes over

What the user feels
Not "an animation played." Not "an intro finished." They feel: "Something just woke up to see me, and it made the room warmer."
What they remember 10 minutes later
They remember Miomi's eyes opening. The blink at 800ms is the single most important frame in this entire welcome. If you cut everything else, keep that.
Sound design intent (not built yet, design now)

0ms: silence
600ms: very soft, breath-like "wah~" rising tone, 800ms, -28dB — the room exhaling
1500ms: tiny chime, single note (G5), 200ms, -24dB — recognition
2200ms: subtle paper-soft sound on speech bubble appearance, 80ms, -32dB
3200ms: silence resumes (let the visual settle without competing)

Total audio: under 1.2s of actual sound across 3.6s. Restraint.
Ambient system: special "welcome" mode
Different from home ambient or magic:

Half saturation at start, bloom to full
Half velocity throughout (this mode is slower, not slower-then-faster)
Palette weighted heavily warm (pink, blush, gold, peach) — no cool accents during welcome
Mouse repulsion disabled (the user isn't interacting yet, repulsion would feel jumpy)

After welcome completes and home arrives, ambient transitions to standard ambient mode over 1.2s.
Shows once
LocalStorage flag miomika-welcomed-v1. If user clears storage or opens incognito, welcome plays again — that's correct. Returning users in same browser see standard home with their normal Miomi state (which may be MISSING_USER, HAPPY, etc).

5. DESKTOP UI COMPLETE ARCHITECTURE
Desktop is broken because it was designed as "the mobile app with more space." Wrong frame. Desktop is a workspace where Miomi lives. She is your study room companion, your translator on a second monitor, your writing partner. The four zones serve that.
Layout (1280px+ canonical, breakpoints below)
┌──┬──────────────┬─────────────────────────────────────┬──────────────┐
│A │      B       │                  C                  │      D       │
│56│     216      │            flex-1 (~700+)           │     280      │
│  │              │                                     │              │
│  │              │                                     │              │
│  │              │                                     │              │
│  │              │                                     │              │
│  │              │                                     │              │
└──┴──────────────┴─────────────────────────────────────┴──────────────┘
(Note: increasing Zone D to 280px from 214px — context info needs more room.)
Zone A — Rail (56px)
Always visible. Never collapses.
Top to bottom:

Miomi face — 48px diameter, head-idle.png (state-aware, updates with her mood), centered horizontally, 16px from top. Tappable: clicking opens Zone B if collapsed, otherwise scrolls Zone C to top.
Divider — 16px gap
Navigation icons (24px Lucide, strokeWidth 1.75):

Home — Home icon
Learn — MessageCircle icon (conversation)
Growth — TrendingUp icon
Translate — Languages icon
Library — BookOpen icon (vocab bank)


Each icon: 40px tap target square, centered. Active state: pink background pill 32px, white icon. Inactive: muted icon, no background. Hover: tooltip slides out RIGHT showing label in both Thai/English.
Spacer flex-1
Bottom icons:

Settings (Settings)
Profile (User)


24px from bottom

Rail background: #FFFFFF, right border 1px #E8E5DF. Subtle.
Zone B — Companion Panel (216px, collapsible)
This is where Miomi lives alongside you in workspace mode.
Top to bottom:

Wordmark — "miomika" 24px Quicksand 600, pink "miomi" + muted "ka", 24px from top
Miomi avatar card — 184px tall, white surface, soft border, 12px radius:

Large Miomi head image (state-aware) 96px, centered, with gentle floating animation (translateY ±2px sine 3.6s)
Below: "มิโอมิ" Thai 14px, muted "Miomi" 12px
Below: current state mood text — "อารมณ์ดีค่า~" / "หิวค่า..." / "ง่วงๆ ค่า" — single line, 12px


Streak card — 60px tall: "Streak 7 วัน" with flame icon 18px gold
Fuel strip — 3 mini bars (♥ ⚡ ✦) vertical stack, 8px tall each, with icons left
Level card — "Lv.3" gold, XP bar 4px, "245 / 300 XP" muted small
Spacer
Today's challenge card — bottom-anchored, 80px tall:

"ความท้าทายวันนี้" header
One line phrase preview
"เริ่มเลย →" link


16px padding all sides

Background: #FAFAF9, right border 1px #E8E5DF.
Collapse behavior: panel slides left by 216px, only rail visible. Triggered by chevron-left button at top-right of panel, or by Cmd+. Re-expands on hover at left edge of canvas (small 16px hot-zone shows ghost edge).
Zone C — Canvas (flex-1)
Changes by mode. This is where the work happens.
Mode: HOME

Full-bleed ambient background (blobs at desktop scale — same system, larger viewport)
Centered hero: Miomi full body idle.png, 320px height (responsive to viewport — caps at 380px on 1440px+, scales down to 240px below 1100px)
Above Miomi by 40px: speech bubble, max-width 480px, centered
Below Miomi by 32px: single primary CTA — "เริ่มคุยกับมิโอมิ" "Start chatting" — pink gradient pill, 56px tall, 240px wide, large readable text
Below CTA by 24px: secondary actions row — three quiet buttons in a row:

ดูความก้าวหน้า / View progress
แปลภาษา / Translate
คำศัพท์ของฉัน / My vocabulary


These secondary actions are text + small icons, transparent backgrounds, hover shows subtle pill
MIOMI'S PICK — bottom-right of canvas, 280px wide card, 16px from bottom-right edges of canvas. Same expanded design as mobile but desktop card style.

Mode: CONVERSATION (Learn)

Two-column inside canvas:

LEFT (40%): Miomi stage with her full body, speech bubble area above, listening/speaking states alive
RIGHT (60%): conversation thread (NOT chat bubbles — see below)


Conversation rendering: each exchange is a small content card not a chat bubble:

User said: in muted boxed text, 14px
Miomi's response: in larger surface card, with Thai + English, with tappable underlined vocab words that open inline definitions
When a word is taught: word card appears INLINE in the conversation, not as a popup


Input at bottom of right column: text input + mic button + send. 56px tall row, full width of right column.
This explicitly is NOT ChatGPT. It's a tutorial document being written in real-time, with Miomi animate on the left as the teacher.

Mode: GROWTH (Dashboard)

Canvas divided in three rows:

TOP (30%): hero metric — Miomi standing next to her observation card. "Mike พูดเก่งขึ้น 32% สัปดาห์นี้นะคะ~" big readable. Streak flame, level badge.
MIDDLE (40%): grid 2×2 of stat cards — Words mastered / Sessions this week / Speaking confidence / Daily streak
BOTTOM (30%): vocabulary bank table — recent words with mastery stages, sortable


Achievements row floats at bottom — horizontal scroll of unlocked badges

Mode: TRANSLATE

Two-column inside canvas:

LEFT (50%): input — either Thai or English, large text area, mic button, language switcher
RIGHT (50%): output — translation with cultural context note from Miomi below


Miomi face (smaller, 64px) in top-right of right column, expression changes during translation (thinking → speaking)

Zone D — Right Panel (280px, collapsible)
Context-aware. Changes by canvas mode.
When mode = HOME:

"Activity today" — short list: 2 sessions, 6 words learned, 1 streak day
"Recent vocabulary" — 6 most recent words with their stage indicators
"Recent sessions" — 3 latest session titles with timestamps
Quiet card surfaces, plenty of whitespace

When mode = CONVERSATION:

"คำศัพท์ในเซสชันนี้" / Words in this session — live updating list as Miomi teaches
Each word card: word, Thai meaning, English meaning, register tag (formal/informal/slang/street), stage chip (heard/used/mastered)
"บันทึก" button at bottom — saves session note

When mode = GROWTH:

Filter controls for the canvas: time range, word category, register
Detailed stats: AI cost saved (referral chain), days streak best
Export button (vocab CSV)

When mode = TRANSLATE:

History of recent translations, tap to reload
Saved favorites
Cultural notes archive

Background: #FAFAF9, left border 1px #E8E5DF. Same collapsible mechanism as Zone B (chevron-right top-left of panel, Cmd+Shift+\ keyboard shortcut).
Miomi scaling from mobile to desktop

Mobile: full body 62% stage height, centered
Desktop home canvas: full body 320-380px height, centered
Desktop rail: head-only 48px diameter
Desktop Zone B: head-only 96px in companion card
Desktop conversation mode: full body in left column, ~280px height
Desktop translate mode: head 64px in corner

Different roles, same character. The rail head is "she's always with you, peripherally." The canvas full-body is "she's present with you, fully." The companion card is "she's in your study room, on the shelf, watching."
Ambient system on desktop
Decision: ambient blobs live in Zone C only. Not Zone A, B, or D. Those zones are utility chrome. Canvas is the world. This contains the magic to where it serves the moment and prevents distraction during work tasks.
Exception: during PAYMENT_CONFIRMED or LEVEL_UP, ambient extends to full viewport for 2.4s, then re-contains to Zone C.
Primary CTA on desktop
The pink gradient "Start chatting with Miomi" pill in HOME mode IS the primary CTA. Always visible, never scrolled past, prominent below Miomi's stage. In all other modes, the input field or the mode's primary action serves as canvas CTA. No floating action button, no second CTA competing.
Collapsible behavior at breakpoints

1280px+: all four zones visible
1024-1279px: Zone D auto-collapses to icon-only (40px wide); user can expand it
768-1023px: Zone B auto-collapses to rail-only; Zone D collapsed
<768px: switches to mobile layout entirely

Admin panel (Mike's access)
Decision: admin lives at /admin route, NOT in nav. Mike's account has a flag is_admin = true. When set, Zone A rail gets an additional icon at the bottom (above Settings): Shield icon 24px. Tooltip "Admin". Clicking enters admin mode which replaces the canvas with admin tools while keeping the rail and panels.
Admin canvas modes:

Dashboard: DAU, new users, paid users, AI cost (per model), revenue (Omise)
Library: list of library_promotions_queue entries, approve/reject UI
Users: search, view, manage
Content: vocabulary and phrases editor
Costs: per-model breakdown, kill switches

Admin is intentionally hidden from regular users — never visible in any nav, no link discoverable. Only the rail icon when is_admin is true.

6. DESIGN SYSTEM DECISIONS
Final calls, no further debate.
CTA color

Replace #8B1A35. Use the Miomi pink gradient linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%) for primary CTAs.
Secondary CTA: white background, 1.5px border #DB2777, text #DB2777
Tertiary: text link #9A8B73, hover underline
Destructive (cancel subscription, delete): keep a single dark red #8B1A35 BUT only for confirmation buttons in destructive flows, never primary navigation CTAs

Nav active state

Current: opacity difference. Too weak.
Decision: active tab gets background pill #FFF4E0 (warm cream), icon color #DB2777 (pink). Inactive: icon color #9A8B73 muted, no background. Plus the raised pill for primary CTA tab (เรียน) as defined in Section 3.

Card/surface language

Mobile and desktop unified: cards have background: #FFFFFF, border: 1px solid #E8E5DF, border-radius: 12px, box-shadow: 0 1px 3px rgba(26,26,24,0.04).
Hover (desktop): box-shadow: 0 4px 12px rgba(26,26,24,0.06), no scale, no border color change. Subtle.
Pressed (mobile/desktop): transform: scale(0.985), box-shadow: 0 0 0 rgba(0,0,0,0). Quick — 120ms ease-out.

Motion language
Two named easing curves used everywhere:
ts// UI motion (panels, cards, transitions)
const easeUI = [0.4, 0.0, 0.2, 1] // material-ish ease-out
const durationUI = { fast: 180, base: 240, slow: 360 }

// Character motion (Miomi, magic moments)
const easeChar = { type: 'spring', stiffness: 280, damping: 13 }
const easeCharSubtle = { type: 'spring', stiffness: 220, damping: 16 }
All UI uses easeUI curve. All character-related uses easeChar family. Never mix.
Spacing system
Decision: base unit 4px. Use multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96. No 6, no 10, no 20. This matches the breathing rhythm of the product.
Icon weight
Decision: Lucide strokeWidth={1.75} for all UI icons. Standard 2 feels too clinical, 1.5 feels too whispy. 1.75 is the Miomi register — present but soft. Exception: brand fuel icons (♥ ⚡ ✦) at strokeWidth 2 because they need to read at small sizes.
Loading states (Miomi is thinking)
Decision: never show a spinner. Never. Miomi enters THINKING state — that IS the loading indicator. The user looks at her thinking and waits. If the request takes > 4 seconds, speech bubble appears with: "ขอคิดสักครู่นะคะ~ / Just a moment~". If > 12s, fail gracefully: speech bubble "หนูเหนื่อยนิดนึง ลองอีกครั้งนะคะ~ / I'm a little tired, try once more~" and the input is re-enabled.
For non-Miomi loading (page navigation, data fetch in dashboard): use a 2px pink progress bar at top of viewport (#F9A8D4, animated indeterminate left-to-right). Never a spinner anywhere.
Error states
Decision: never an error toast. Never an error dialog with red X. Always Miomi.

Network failure: speech bubble "อินเทอร์เน็ตหายค่า~ ลองอีกครั้งนะคะ" + retry button
AI failure: library failover (already built) — user never sees the failure
Payment failure: Miomi looks worried (head-thinking with droop), speech bubble "เอ๊ะ มีอะไรผิดพลาดค่า~ ลองอีกรอบนะคะ" + retry button. No red text. No alarming icons.
404: Miomi looking around, "หนูหาไม่เจอค่า~ กลับหน้าหลักไหมคะ?" + home button

Empty states (first-time user, no history)
Decision: never show "No data." Always show Miomi inviting.

Empty vocabulary bank: Miomi head + "ยังไม่มีคำศัพท์ค่า~ มาเริ่มคุยกันเลยนะคะ" + CTA to start session
Empty session history: Miomi head + "วันนี้ยังไม่ได้คุยเลยค่า~ พร้อมหรือยังคะ?" + CTA
Empty achievements: Miomi head + "เริ่มต้นการเดินทางด้วยกันเลยนะคะ~" — no list, just an invitation

The first empty state is the most important emotional moment for a new user. It's not negative space — it's an open invitation.

IMPLEMENTATION ORDER
Ranked by user impact × engineering complexity × conversion value. Build in this exact order.
1. Framer Motion bridge for Miomi aliveness — THIS WEEK
Why first: highest user-impact for lowest engineering cost. Static-image-Miomi is the #1 reason users won't fall in love. Blink + ear flick + tail sway overlays on existing PNGs takes one afternoon and transforms the entire product feel. No new dependencies, no Rive file needed. Ships this week.
2. CTA color migration + nav redesign — THIS WEEK
Why second: trivial engineering (color tokens + nav component restructure), but fixes the visual hierarchy problem on every screen. Pink gradient CTA + raised เรียน nav pill makes the primary action obvious. 2-3 hours of work.
3. Mobile home screen restructure (fuel strip + action row + collapsed MIOMI'S PICK) — WEEK 1
Why third: completes the mobile UX vision. With Miomi alive (#1) and CTAs corrected (#2), restructuring the home layout per Section 3 makes the screen finally feel coherent. ~1 day of work.
4. Welcome screen master-class redesign — WEEK 1-2
Why fourth: every new user sees this once. First emotional impression compounds across user lifetime. Now achievable because Miomi has movement primitives (from #1) and design language (from #2/#3). ~1-2 days.
5. Magic moment system — WEEK 2
Why fifth: the ambient magic mode is already built. Wiring up the eight moments per Section 2 is configuration work, not new infrastructure. Massive emotional payoff. ~2 days.
6. Fuel tap micro-interaction polish — WEEK 2
Why sixth: the 0.5s frame-by-frame interaction in Section 3 makes fuel feel magical. Required before Pro launch because fuel is the gating mechanic that drives upgrades. ~1 day.
7. State machine formalization — WEEK 2-3
Why seventh: the priority queue, state contract, and Zustand store from Section 1. Necessary infrastructure before adding more states or moving to Rive. Refactor existing state code. ~2 days.
8. Desktop UI rebuild (4-zone, all modes) — WEEK 3-4
Why eighth: desktop is 1/10 now. Rebuilding per Section 5 is the largest engineering chunk in this brief (~1 week) but it unlocks desktop users entirely and prepares for enterprise (schools, cafes). Lower priority than mobile because mobile is the primary platform for Thai market.
9. Rive integration for Miomi — WEEK 4-5
Why ninth: swap from Framer-bridge to Rive. The state machine contract from #7 means this is a drop-in replacement — components don't change, only the rendering layer. Highest animation quality unlock but lower marginal impact since #1 already solved "static image" feeling.
10. Admin panel — WEEK 5+
Why last: Mike-internal only. Critical for scaling (library promotion queue, cost monitoring, revenue tracking) but doesn't affect users directly. Build after first paying users exist so there's actual data to manage.

That's the brief. Every decision is implementable. The first three items ship within seven days and transform the product from "MVP with cute cat" to "alive AI companion." Build #1 first — Miomi blinking is worth more than any feature in the roadmap.