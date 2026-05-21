MIOMIKA — /talk SCREEN ARCHITECTURE

Document version: OPUS v3.0 — May 21, 2026
Save as: /MIOMIKA_TALK_SCREEN_OPUS.md
Audience: Engineering (Cursor + Claude Sonnet)
Status: Supersedes MIOMIKA_CREATE_SCREEN_OPUS.md and MIOMIKA_UX_CONVERSION_OPUS.md Section 1 entirely. /create route deprecates to /talk.


0. NORTH STAR (UPGRADED)

"I walked into a room where Miomi is waiting for me. She can hear me. She responds to me. She teaches me. I feel myself getting better in real time."

The previous create screen architecture treated Miomi as a chatbot wearing a cat costume. This document treats her as a teacher in a room. The user is in her space, not the other way around. The mic is not an input method — it is speaking to her. The thread is not a transcript — it is what she has shown you so far in this room.
Every spec below is calibrated to that frame.

SECTION 1 — THE /talk SCREEN ARCHITECTURE
1A. Voice-first layout — the mic is the hero
Decision: the mic lives in a floating circular zone at the bottom-center of the screen, 80px diameter, persistently visible. It is the largest interactive element on the screen besides Miomi herself.
Layout at 375×812 (canonical mobile viewport, 100svh):
┌──────────────────────────────────────┐
│ [back]              [meta · streak]  │ ← 44px top bar
├──────────────────────────────────────┤
│                                      │
│                                      │
│         [ Miomi 180px head ]         │ ← 220px stage
│           "พูดอะไรก็ได้ค่า~"            │
│           "Say anything~"            │
│                                      │
├──────────────────────────────────────┤
│                                      │
│  [ conversation canvas, scrollable ] │ ← flex-1, ~400px on 812 viewport
│                                      │
│  ─ Miomi just said ─                 │
│  ─ word card ─                       │
│  ─ exercise ─                        │
│                                      │
├──────────────────────────────────────┤
│       ╲                ╱             │
│        ╲   ┌────┐    ╱               │ ← 120px mic zone
│         ╲  │ 🎙  │   ╱                │
│            └────┘                    │
│         [text] [keyboard]            │
└──────────────────────────────────────┘
Vertical breakdown (375×812):

Top bar: 44px
Miomi stage: 220px (Miomi 180px head + subtitle below)
Conversation canvas: flex-1 (~428px usable)
Mic zone: 120px (mic 80px + secondary controls 32px + safe area)

This is a dramatic upsize of Miomi vs the create-screen 96px head. Miomi here is the room. The user is small in front of her.
The mic — four states, surgical specifications
The mic is a single circular button, 80px diameter, centered horizontally, 24px from the bottom of the safe area.
State: IDLE (default, ready)

Background: white #FFFFFF
Border: 2px solid #E8E5DF
Shadow: 0 4px 16px rgba(26,26,24,0.06)
Icon: Lucide Mic, 32px, strokeWidth 1.75, color #DB2777
Soft pulse animation: scale 1.0 ↔ 1.02 over 2400ms ease-in-out, perpetual (subtle, "ready")
Tap behavior: tap-and-hold for push-to-talk (Thai LINE convention) OR tap-toggle if user enabled in settings

State: LISTENING (user is speaking)

Background: pink gradient linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)
Border: none
Shadow: 0 8px 32px rgba(219,39,119,0.35), 0 0 0 6px rgba(249,168,212,0.20) (the outer 6px ring is the audio-amplitude responder)
Icon: Lucide Mic, 32px, strokeWidth 2.0, color #FFFFFF
The outer ring scales 1.0 ↔ 1.08 ↔ 1.0 in real-time response to audio amplitude (Web Speech API confidence/volume — fallback to oscillating 1.0↔1.04 at 600ms if amplitude unavailable)
Inside the mic circle (below the icon): three vertical waveform bars (4px wide, 8-24px tall each, white, 4px gap, animated heights based on amplitude)
Live transcript overlay: floats 16px above mic, white pill background, max-width 300px, shows what Web Speech is hearing in real-time as muted text #9A8B73, italic. Updates per result.isInterim.

State: PROCESSING (Miomi thinking)

Background: warm white #FFF8F2
Border: 2px solid #C9A96E
Icon: Lucide Mic, 32px, strokeWidth 1.75, color #9A8B73 (muted)
Inside the mic circle (replacing icon for processing state only): a single 24px Lucide Loader2 rotating at 1200ms ease-linear infinite
Outer ring: gold soft pulse 0 0 0 6px rgba(201,169,110,0.25), expand-contract over 1600ms
Mic is NON-interactive in this state (cannot start new recording while processing)

State: SPEAKING (Miomi outputting audio)

Background: white #FFFFFF
Border: 2px solid #F9A8D4
Icon: Lucide Volume2, 32px, strokeWidth 1.75, color #DB2777
Outer ring: pink soft pulse synchronized with Miomi's audio output (each sentence boundary triggers a brief ring expansion 1.0→1.06→1.0 over 320ms)
Tap during speaking: interrupts Miomi (stops audio, stops speech state), reverts to IDLE so user can speak again immediately. This is critical — the user must always be able to interrupt without ceremony.

Secondary controls — text and keyboard
Below the mic, 12px gap, two small ghost buttons sit side-by-side, each 32px tall:
[ text ↗ ]    [ keyboard ↗ ]

"text" button: tiny Lucide Type icon 14px + 11px Kanit label. Tap → opens text input modal sheet (rises from bottom, 56px tall, contains text field + send button). Sheet dismisses on send or backdrop tap.
"keyboard" button: tiny Lucide Keyboard icon 14px + 11px Kanit label. Tap → switches the screen permanently to "keyboard mode" for this session (mic becomes secondary, text input becomes primary at bottom). Persistent toggle.

This serves the rule "voice is primary, text is secondary" without ever making text-preferring users feel demoted. The keyboard button is a soft commitment — once tapped, the screen reconfigures to keyboard-first until the user toggles back (which happens via a "mic ↗" button in the same spot).
Switching mid-conversation
A user can switch between voice and text at any time:

Tap mic at any moment → push-to-talk activates
Tap "text ↗" at any moment → text sheet opens for one-off text input, then closes
Tap "keyboard ↗" → permanent reconfiguration to keyboard-first for this session

No mode confirmation. No "are you sure." Switching is fluid.
Subtitle below Miomi
A persistent 2-line area below Miomi's head shows her current spoken line:

Thai 15px Kanit 500, color #1A1A18, max 2 lines, ellipsis
English 12px Quicksand 500, color #9A8B73, max 1 line below
Centered horizontally, max-width 320px

When mic is in LISTENING state, the subtitle fades to opacity 0.4 (the room is listening to you now, not showing what she said). When mic returns to IDLE, subtitle returns to opacity 1.0.

1B. Miomi's presence — alive, not animated
Decision: Miomi on /talk is 180px head, with continuous micro-animation that makes her feel present even when nothing is happening.
Size justification

Home screen: full body, 62% of screen height — Miomi is the room you walked into
/talk screen: 180px head — Miomi is the teacher you're sitting in front of
Dashboard: 80px head — Miomi looking at your data with you
Create-screen (deprecated): was 96px head — too small, treated her as a sidebar

The 180px head on /talk is large enough to read facial expressions clearly, small enough to leave room for the conversation canvas below. At this size, the existing PNG assets (head-idle.png 1024×1024 source) render sharply on retina displays.
State machine — what she does
State takes priority order: SPEAKING > THINKING > LISTENING > TEACHING > REACTING > IDLE. Each state has a defined animation:
IDLE (resting, waiting for user)

Base image: head-idle.png
Continuous: breathing animation, scale 1.0 ↔ 1.02 over 3200ms sine
Random blink: every 4.2-6.8s, eyelid overlay scaleY 1→0→1 over 280ms total (Framer-bridge: SVG eyelid overlay; Rive: native blink blend)
Random ear flick: every 8-14s, single ear rotation +0° → -8° → 0° over 220ms ease-in-out-back
Tail sway: continuous off-screen tail (do not show tail — head only on this screen)

LISTENING (user is speaking via mic)

Base image: head-idle.png with both ears perked overlay (SVG triangles, +12° rotation each)
Head tilt: micro-sway ±2° at 2400ms sine (curious listening)
Eye behavior: NO blinks during listening (frozen attentive eyes — she is fully focused)
Subtle warm glow effect behind her head: radial gradient #FFE5B4 to transparent, opacity 0.3, scale 1.0 ↔ 1.06 at 2400ms (matches head sway)
Enters when: mic transitions to LISTENING state
Exits when: user releases mic / isFinal returns

THINKING (engine processing)

Base image: head-thinking.png
Head tilt: -8° rotation hold (concentrating)
Eye behavior: slow blink at 2400ms intervals (deliberate, contemplative)
Subtle gold particle: 1-2 small gold dots drift up from the area beside her head (idea bubbles, very subtle, 400ms fade in/out, 1200ms lifetime)
Enters when: API call to engine fires
Exits when: response begins streaming

SPEAKING (response audio playing OR text streaming)

Base image: head-speaking.png
Mouth pulse: head scale 1.0 ↔ 1.012 at 280ms intervals during audio playback (Framer-bridge); in Rive: real mouth phoneme blends
Eye behavior: normal blinks at slightly reduced frequency (every 5-7s)
Head micro-sway: ±2° at 2400ms
Enters when: TTS audio playback starts OR text streaming begins
Exits when: audio ends AND text fully rendered → returns to IDLE for 1.5s → REACTING if user-action pending, else IDLE

TEACHING (about to introduce a word — handoff state)

Base image: head-happy.png
Scale: 1.0 → 1.08 over 320ms spring (stiffness 280, damping 13)
Head tilt: +6° (looking at the user, slightly tilted "look what I have for you")
Glow effect: warm radial gradient behind her head intensifies (opacity 0.3 → 0.5 over 320ms)
Duration: 600ms, then settles back to IDLE base while the word card slides out from beneath her (see 1C)
This is the handoff state — she's about to give something

REACTING (user got something right)

Base image: head-happy.png
Scale: 1.0 → 1.10 → 1.04 → 1.06 spring overshoot (stiffness 340, damping 11) over 400ms
Head bounce: translateY 0 → -6px → 0 over 400ms
Both ears perk +14°
Subtle magic burst behind head: 12 particles, warm palette, 800ms lifetime
Duration: 1200ms, then settles to IDLE

The word-card handoff — what it looks like when she hands you a word
This is the most important visual moment in the entire screen. When Miomi introduces a word, the user must feel she is giving them something, not just showing UI.
Choreography (total 1200ms):
T=0ms:    Miomi enters TEACHING state
          Head scale 1.0 → 1.08
          Glow intensifies behind her
T=200ms:  Word card begins appearing FROM her chest area
          Card initial state: position absolute at center-bottom of Miomi stage,
            scale 0.0, opacity 0
T=320ms:  Word card scales 0 → 1.0 spring (280, 13)
          Simultaneously translates downward toward conversation canvas
          Path: starts at Miomi's chest position (stage y center+40), 
            ends at conversation canvas top, ~180px translation over 480ms
T=400ms:  Subtle gold particle trail follows the card's path
          12 small particles spawn along the trail, lifetime 600ms each
T=800ms:  Card arrives at conversation canvas
          Card scales to 1.0 final size, opacity 1.0
          Trail particles fade
T=900ms:  Miomi head scales back to 1.0
          Glow returns to baseline
T=1200ms: Miomi returns to IDLE
          Audio plays Miomi's introduction sentence (TTS or pre-recorded)
The user's eye tracks the card from Miomi's body down into the conversation space. It is not a card "appearing in a thread" — it is Miomi handing the word to them. This single choreographic detail does more emotional work than any other animation in the product.
Reactions to user success — within 200ms
When the engine confirms a user got something right (correct exercise answer, correct pronunciation, correct usage):

T=0ms: REACTING state triggers immediately
T=0ms: Miomi head image swaps to head-happy.png
T=0ms: scale spring 1.0 → 1.10 starts
T=100ms: speech bubble appears beside her with one short specific praise (rotation pool below)
T=200ms: gold +XP chip slides up from below the exercise card location
T=1200ms: Miomi settles to IDLE

The 200ms latency from confirm-to-reaction is the threshold below which it feels like causation rather than sequence. Above 200ms, the user thinks "I did a thing, then she reacted." Below 200ms, they feel "she's celebrating my action." Engineer must guarantee this latency by computing the reaction client-side immediately on user input, not waiting for an engine roundtrip.

1C. The conversation canvas — not a thread of bubbles
Decision: the canvas is a vertical "river of artifacts" where each item is a discrete teaching object. Miomi's spoken text lives in the subtitle area above the canvas, NOT inside the canvas.
This is the core paradigm shift. The previous design (create-screen) put Miomi's text inline in a thread. That looked like chat. The new design separates Miomi's voice (subtitle, transient) from the artifacts she gives you (canvas, persistent).
Canvas layout
┌──────────────────────────────────────┐
│                                      │
│  ─ User said ─                       │ ← user echo strip (collapsed by default)
│                                      │
│  ┌──────────────────────────────┐   │
│  │ WORD CARD (large, interactive)│   │ ← takes ~280-320px
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ EXERCISE CARD                 │   │ ← takes ~240px
│  └──────────────────────────────┘   │
│                                      │
│  [ +12 XP · "enjoy" mastered ]      │ ← XP chip
│                                      │
│  ─ User said ─                       │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ TRANSLATION CARD              │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
Canvas properties:

Background: solid #FAFAF6 (same as page)
Padding: 16px horizontal, 16px top, 24px bottom
Internal vertical scroll only (the page itself is 100svh fixed)
Auto-scrolls to newest content on append
Smooth scroll (scroll-behavior: smooth)

User echo strip — what the user just said
The user does NOT see large bubbles of their own text. Instead, what they said appears as a small "echo strip":
─ User said ─
"how do you say cafe in thai"

Spec: full-width thin strip, 32px tall, background transparent, 11px Quicksand 500 italic color #9A8B73
"─ User said ─" label: 9px Quicksand 600 uppercase, color #C4BDB5, centered with horizontal lines on either side
The actual user text: 12px italic, color #9A8B73, centered, truncates with ellipsis after 60 chars
Tap to expand: shows full text in 14px non-italic for a brief moment, then auto-collapses
This pattern: the user's text is acknowledged but de-prioritized. The canvas is for Miomi's artifacts, not for showing the user what they typed.

Miomi's verbal responses — where they live
Three places, in priority order:

Subtitle area below Miomi's head (persistent, primary) — current spoken line
Audio playback (when available) — TTS or pre-recorded audio
Inside artifact cards — as miomi_note_th field on word cards, cultural note on translation cards, etc.

The canvas itself does NOT contain naked Miomi text bubbles. If Miomi has something to say without an artifact (just conversational chatter), it appears ONLY in the subtitle area and is spoken via audio. It does not persist in the canvas.
This is the critical decision. The canvas is purely for objects she gives the user. Her conversation is ephemeral, like a real teacher's spoken words. Her artifacts are permanent, like notes she wrote down for you.
Where each artifact type appears
All artifacts appear inline in the canvas, share the same skeleton (per prior brief), differentiated by left-bar color:

Word cards (gold)
Mastered word celebrations (gold, thicker bar)
Translation cards (teal)
Caption cards (coral)
Exercise cards (pink — see Section 1D)
Mini XP/mastery chips (inline, not boxed)

Showing user "what to do"
When an exercise card is active (awaiting user input), it:

Has a subtle pink ambient outline (1.5px solid #F9A8D4 instead of standard #E8E5DF)
Has a soft pink glow (box-shadow: 0 0 0 4px rgba(249,168,212,0.15))
The mic button below adjusts: outer ring pulses slightly faster, hint text appears above mic "ลองพูดคำตอบดูค่า~" (Try saying the answer~)

When the exercise is complete (user answered):

Pink outline transitions to gold (correct) or muted gray (incorrect, face-saving)
Glow fades over 800ms
Mic returns to default state
Hint text disappears

The user always knows: pink-glowing card = "your move." Gold/muted card = "done, scroll on."

1D. The exercise system — five types, all inline
Decision: exercises are first-class artifacts that appear in the canvas, are completed in place, and never navigate the user away.
All exercises share the exercise card skeleton:

Same dimensions as other artifacts (full-width minus 32px gutter)
Pink left-bar 3px wide #F9A8D4 while active, transitions to gold #C9A96E on correct or muted gray #C4BDB5 on incorrect
Header tag at top-left: "ฝึก · X" where X is exercise type in 10px Quicksand 600 uppercase
Bottom: "ข้าม" (skip) link in 11px Kanit muted, far right — face-saving exit
All exercises must be completable single-handed on mobile (no precision tapping)

Exercise 1: FILL_GAP
What it looks like:
┌──────────────────────────────────────┐
│ ▌ฝึก · เติมคำ                         │
│                                      │
│   สวัส___ ค่า                         │
│   "Hello~"                           │
│                                      │
│   ┌──────┐  ┌──────┐  ┌──────┐      │
│   │ ดี   │  │ สด  │  │ จัง │       │
│   └──────┘  └──────┘  └──────┘      │
│                                      │
│   หรือพูดคำที่ขาดดูค่า~                │
│   Or say the missing word~           │
│                                      │
│                          [ ข้าม ]    │
└──────────────────────────────────────┘

Sentence with ___ blank, 18px Kanit 500
3-4 option chips below (44px tall, 14px Kanit, white bg, 1.5px #E8E5DF border, 16px radius)
Voice input also accepted (the mic below the canvas serves the exercise)
Tap chip OR speak answer → engine evaluates
Correct: chip flashes gold (#FFFBF0 bg, #C9A96E border), card left-bar transitions to gold, Miomi enters REACTING, +XP chip appears below card
Incorrect: tapped chip briefly highlights muted gray, then Miomi (in head-thinking) gently says "ลองอีกทีดูค่า~" — the answer chip remains tappable for a retry
After 2 incorrect attempts: Miomi reveals the answer warmly: "คำตอบคือ 'ดี' ค่า~ ลองจำไว้นะคะ" — card transitions to a soft completion state (no XP, but no shame), the correct chip highlights gold

Exercise 2: WORD_CARD_INTERACTION
This is not a stand-alone exercise — it's the interaction layer on every word card. Tap behaviors:

Tap audio icon (Lucide Volume2 top-right): plays audio_key_th or audio_key_en pronunciation, audio icon ripples (scale 1.0→1.15→1.0 over 240ms)
Tap word itself (English/Thai word large text): triggers pronunciation playback (same as audio icon, redundant for ease)
Tap "▶ ตัวอย่างเพิ่ม": expands to show example_th, example_en, example_context — 320ms height transition
Tap "ลองพูดดูค่า~" button: enters pronunciation check sub-exercise (Exercise 3 below) inline

Word cards are persistent in the canvas — user can tap them again days later (in the same session) to hear pronunciation, expand examples.
Exercise 3: PRONUNCIATION_CHECK
Triggered from word card's "ลองพูดดูค่า~" button OR proactively by Miomi after she introduces a word.
What it looks like:
┌──────────────────────────────────────┐
│ ▌ฝึก · ออกเสียง                       │
│                                      │
│   พูดคำนี้ดูค่า~                        │
│   Try saying this word~              │
│                                      │
│   enjoy                              │
│   /ɪnˈdʒɔɪ/                          │
│                                      │
│   [ 🎙  กดค้างเพื่อพูด ]               │ ← inline mic, 48px tall
│                                      │
│                          [ ข้าม ]    │
└──────────────────────────────────────┘

Inline mic button takes the place of normal mic for this exercise (the main bottom mic is dimmed during pronunciation exercises to avoid confusion)
User holds the inline mic and pronounces the word
Web Speech API attempts to recognize the user's pronunciation against the target word
Confidence threshold 0.65 (forgiving — better to false-positive than crush morale)
Correct: card flashes gold, Miomi enters REACTING, +XP chip, voice plays "เก่งมากค่า~ ออกเสียงถูกแล้วนะคะ"
Incorrect: card remains, Miomi (head-thinking) plays "ลองอีกทีดูค่า~ ฟังหนูก่อนนะ" → audio of correct pronunciation plays automatically → user can try again
After 3 attempts regardless of correctness: Miomi accepts the attempt warmly "ลองไปก่อนค่า~ เดี๋ยวจะได้คล่องขึ้นเอง" — partial XP awarded for trying

Exercise 4: QUICK_PICK
What it looks like:
┌──────────────────────────────────────┐
│ ▌ฝึก · เลือกข้อที่ถูก                    │
│                                      │
│   "Have you eaten yet?"              │
│   ภาษาไทยพูดยังไงคะ~?                  │
│                                      │
│   ┌────────────────────────────────┐│
│   │ A · กินข้าวยังคะ                │ │
│   ├────────────────────────────────┤│
│   │ B · ไปไหนมาคะ                  │ │
│   ├────────────────────────────────┤│
│   │ C · สวัสดีค่ะ                    │ │
│   ├────────────────────────────────┤│
│   │ D · หิวข้าวไหมคะ                │ │
│   └────────────────────────────────┘│
│                                      │
│                          [ ข้าม ]    │
└──────────────────────────────────────┘

4 options stacked vertically (not 2×2 grid — single column is single-handed friendly)
Each option: 48px tall, full width, single line, 14px Kanit, white bg, 1.5px #E8E5DF border, 12px radius, 12px vertical gap between options
Tap option → engine evaluates
Correct: tapped option flashes gold and stays highlighted, other options dim to 0.3 opacity
Incorrect: tapped option briefly highlights muted gray, then Miomi gently corrects with "หนูคิดว่าเป็น A นะคะ~ ลองดูอีกที" — only the correct option is highlighted, user can re-tap

Exercise 5: SENTENCE_ARRANGE
What it looks like:
┌──────────────────────────────────────┐
│ ▌ฝึก · เรียงประโยค                     │
│                                      │
│   จัดเรียงให้เป็นประโยคที่ถูกค่า~        │
│   Arrange into a correct sentence~   │
│                                      │
│   ┌────────────────────────────────┐│
│   │ [ ] [ ] [ ] [ ] [ ]            │ │ ← target zone, drop slots
│   └────────────────────────────────┘│
│                                      │
│   [ enjoy ] [ playing ] [ I ]       │
│   [ games ]                          │ ← word chips, tap to add
│                                      │
│   [ × ลบล่าสุด ]                      │
│                                      │
│                          [ ข้าม ]    │
└──────────────────────────────────────┘

Tap word chip → it moves to the next empty slot in the target zone (NOT drag-and-drop — drag is finicky on mobile)
Tap word chip already in target zone → it returns to the source pool
"× ลบล่าสุด" undoes the last placement
When all slots filled, "ตรวจคำตอบ" button appears (pink gradient, 44px tall)
Tap "ตรวจคำตอบ" → engine evaluates
Correct: slots flash gold, sentence reads aloud via TTS, Miomi REACTING, +XP
Incorrect: slots flash muted gray briefly, then Miomi says "ใกล้แล้วค่า~ ลองสลับ word X กับ word Y ดูค่า" (hint engine narrows down problem words) — user adjusts and re-checks

How Miomi introduces exercises naturally
Exercises don't pop up randomly. They're introduced via Miomi's voice in the subtitle area, with a 600ms beat before the card materializes (handed-down from her like word cards):
Exercise typeIntroduction copyFILL_GAP"เติมคำให้หน่อยค่า~ ลองดูนะคะ" / "Fill in the word~ try this"PRONUNCIATION_CHECK"ลองพูดคำนี้ดูค่า~" / "Try saying this word~"QUICK_PICK"อันไหนถูกคะ~?" / "Which one's right~?"SENTENCE_ARRANGE"เรียงคำเป็นประโยคให้หน่อยค่า~" / "Arrange these into a sentence~"
The cadence is: she speaks → 600ms pause → card materializes from her chest → user interacts → she reacts. Never a sudden "POP QUIZ" feeling.
Reactions to correct/incorrect — full spec
Correct:

Card left-bar: pink → gold transition over 240ms
Card border: 1.5px #F9A8D4 → 1px #E8E5DF transition
Card glow: pink glow fades, gold glow appears briefly (4px gold ring, opacity 0→0.4→0 over 800ms)
Miomi: REACTING state for 1200ms (head-happy, scale spring, ears perk, head bounce)
Audio: short "ting" chime 300ms F5 at -22dB
Speech: short specific praise via TTS (rotation pool below)
Inline chip below card: [ +X XP · เก่งมาก! ] slides up 240ms, dwells 2400ms, fades
Magic burst from card center: 18 particles, gold palette, 1000ms

Incorrect (first attempt):

Tapped option (or attempt): muted gray flash for 320ms then returns to normal
Card itself does NOT change state (still pink active)
Miomi: head-thinking state for 1.6s, then back to head-idle expectant
Speech: warm prompt via TTS "ลองอีกทีค่า~" or "ใกล้แล้วนะคะ ลองดู"
No XP penalty, no negative chip

Incorrect (second attempt):

Same as first, but Miomi's speech adds a soft hint: "เริ่มต้นด้วย Y ค่า~"

Incorrect (max attempts reached):

Card transitions to muted state (gray left-bar, no celebration)
Miomi reveals answer warmly via speech + speech subtitle
Correct answer highlights gold on the card
Small XP chip awarded for attempt: [ +2 XP · ลองดู ]
No shame UI, no red, no "wrong" — just continuation

Specific praise rotation pool (for correct answers)
These are spoken AND shown in subtitle:
"เก่งมาก! ออกเสียงถูกแล้วค่า~"
"ตอบถูกเลยค่า~ เก่งจัง"
"ใช่แล้ว! คุณจำได้ดีมากเลย"
"เพอร์เฟกต์ค่า~ พูดถูกแล้ว"
"คุณเก่งขึ้นเร็วมากเลยนะคะ~"
"ดีจังค่า~ ใช้คำนี้ได้ถูกเลย"
Selected by engine, weighted to be specific when possible (e.g., "ออกเสียงถูกแล้วค่า" only after pronunciation, "ใช้คำนี้ได้ถูกเลย" only after correct usage in context).

1E. The session flow — opening to close
The user's journey from /talk mount to natural close, with exact timing and copy.
Opening (T=0 to T=4s)
T=0: User taps "เรียน" (Learn) nav OR opens /talk URL
T=0-200ms: Screen mounts, Miomi fades in (opacity 0→1 over 200ms) at IDLE state
T=200ms: Conversation canvas appears (empty)
T=400ms: Mic button fades in at IDLE state
T=600ms: Engine-driven opener call begins (engine endpoint, see prior briefs)
T=600-1400ms: Miomi enters THINKING state (head-thinking, gold subtle pulse)
T=1400ms: Opener returns from engine
T=1400ms: Miomi enters SPEAKING state
T=1400ms: Subtitle text streams in (Thai first, char-by-char at 28ms/char)
T=1400ms+: TTS audio plays opener (if Pro or library-cached audio available)
T=2800ms (approximately): Opener complete, Miomi enters IDLE
T=3000ms: Subtitle fully settled, English translation appears below Thai
Opener copy varies per user context (engine-driven per prior briefs). Example library responses:
First-ever session, archetype unknown:
สวัสดีค่า~ หนูชื่อมิโอมิค่า
อยากเรียนภาษาอะไรกับหนูดีคะ?
English หรือ Thai?

Hi~ I'm Miomi.
What language would you like to learn?
English or Thai?
(Miomi awaits user's first utterance which the engine uses to detect their archetype: Thai→English vs Foreigner→Thai vs Mixed.)
Returning Thai→English learner, < 24h:
กลับมาแล้วค่า~
วันนี้คุยเรื่องอะไรกันดีคะ?

Welcome back~
What shall we talk about today?
Returning English→Thai learner, < 24h:
Welcome back~ I missed you.
Want to keep practicing Thai today?
ภาษาไทยนะคะ~?
Returning user, streak day 7:
ครบ 7 วันแล้วค่า~! เก่งมากเลยนะ
อยากฉลองด้วยอะไรดีคะ? คำใหม่ หรือบทสนทนา?

A full 7 days~! You're doing so well.
How shall we celebrate? A new word, or a conversation?
First exchange — how teaching begins
Whatever the user says first, the engine routes it through the library-first system (Section 3) before any AI is called. For common first inputs ("teach me English", "teach me Thai", greetings), library serves directly.
For "teach me English":

T=0: User speaks/types "teach me English"
T=200ms: Echo strip "─ User said ─ teach me english" appears in canvas
T=400ms: Engine recognizes intent via classifier → routes to library response TEACH_ME_ENGLISH
T=500ms: Miomi enters THINKING (brief, ~200ms)
T=700ms: Miomi enters SPEAKING with library response (see Section 3)
T=700ms: Subtitle: "ดีค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดก่อนนะคะ"
T=2400ms: Subtitle complete, Miomi enters TEACHING state
T=2400-3600ms: Word card hand-off animation (word "hello") — see 1B handoff
T=3600ms: Word card settled in canvas, Miomi returns to IDLE
T=4200ms: Miomi speaks again: "ลองพูดดูค่า~" → Pronunciation Check exercise appears immediately below word card

The user has, within 8 seconds of saying "teach me English," seen a word card materialize from Miomi and an interactive exercise appear. No menu, no setup, no settings. Just teaching.
Mid-session — exercise pacing
The engine paces exercises so the user gets one every 2-4 exchanges. Pattern:

Miomi introduces concept (conversation or word card)
User responds / interacts
Miomi reacts and continues
Within next 2-3 turns, exercise materializes naturally
User completes exercise → reaction → next concept introduced

No two consecutive exercises (unless user opts for "ทำเพิ่ม" continuation). Conversation breathing rooms between exercise moments.
Peak moment — word mastered
When a word reaches "mastered" stage (3rd correct usage):
T=0: Engine confirms mastery, fires word_mastered event
T=0: Miomi enters REACTING state immediately
T=0: Mastered word card variant materializes in canvas (gold thick left-bar, "MASTERED" header, +10 XP chip embedded)
T=0-200ms: Magic burst — 60 particles from Miomi center, gold + pink palette, 1.6s lifetime
T=200ms: Miomi speaks "เก่งมากค่า~! [word] กลายเป็นคำของคุณแล้วนะคะ"
T=400ms: Subtitle settles
T=1200ms: Mastery card persists in canvas
T=1800ms: Soft chime plays (ascending C5-E5-G5 motif at -20dB)
T=2400ms: Miomi returns to IDLE
The mastery moment is the most expensive animation in the screen. It must feel like a real moment, not a notification.
Session end — how it closes warmly
There is NO explicit "end session" button. The session closes when:

User navigates away (taps nav or back)
User has been idle for 60s after the most recent exchange

If the user navigates away mid-session: nothing extra fires. The session-end summary is captured server-side and presented next time they open /talk OR the dashboard.
If the user has been idle 60s+ AND they've had 5+ exchanges:

A subtle "session summary pull-up handle" appears at the bottom of the canvas, just above the mic zone
Handle: gold pill 36px tall, "ดูสรุปวันนี้กับมิโอมิ~"
Tap → opens session summary sheet (per MIOMIKA_CREATE_SCREEN_OPUS.md Section 1E spec — that part of the previous brief stands)

If the user closes the session abruptly without seeing summary: Miomi's next opening message references it: "ดีใจที่กลับมาค่า~ เมื่อกี้คุณเรียนคำใหม่ได้ 3 คำเลยนะ"

SECTION 2 — VISUAL LANGUAGE
2A. Word card — final definitive design
Replaces all prior word card specs. This is canonical.
┌──────────────────────────────────────┐
│ ▌ A2 · informal              🔊      │ ← header row
│ ▌                                    │
│ ▌  ┌────────┐                        │
│ ▌  │ [img]  │   enjoy                │ ← image area + word
│ ▌  │        │   ɪnˈdʒɔɪ              │ ← IPA below word
│ ▌  └────────┘                        │
│ ▌                                    │
│ ▌  ชื่นชอบ · สนุกกับ                  │ ← Thai meaning + romanization
│ ▌                                    │
│ ▌  ─────                              │
│ ▌                                    │
│ ▌  หนูใช้ตอนรู้สึกดีกับอะไรค่า~        │ ← miomi_note_th
│ ▌  I use it when I feel good         │ ← miomi_note_en (muted, italic)
│ ▌    about something                 │
│ ▌                                    │
│ ▌  ─────                              │
│ ▌                                    │
│ ▌  "I enjoy playing games"           │ ← example_en
│ ▌  "ฉันชอบเล่นเกม"                    │ ← example_th
│ ▌                                    │
│ ▌  💡 ใช้ในบทสนทนาเป็นกันเองค่า         │ ← use_when (if exists in DB)
│ ▌                                    │
│ ▌  ▶ ตัวอย่างเพิ่ม                     │ ← expandable
│ ▌                                    │
│ ▌  [ 🎙 ลองพูดดูค่า~ ]                 │ ← pronunciation check trigger
└──────────────────────────────────────┘
Specifications
Container:

Full width minus 32px gutter (343px on 375 viewport)
Background: #FFFFFF
Border: 1px solid #E8E5DF
Border-radius: 16px (slightly more generous than prior 12px — these cards are larger, more important)
Shadow: 0 2px 8px rgba(26,26,24,0.05)
Internal padding: 20px (more generous than 14px prior)
Left-bar: 4px wide (thicker than prior 3px), #C9A96E, full card height
Minimum height: 280px on 375 viewport (this is a large, important card — not a chat bubble)

Header row:

CEFR badge: 10px Quicksand 600 uppercase, color #C9A96E, +small register tag (lowercase, color #9A8B73) inline
Audio icon (Lucide Volume2): 20px, strokeWidth 1.75, color #DB2777, top-right corner
Tap audio icon → plays audio_key_en for English-learning or audio_key_th for Thai-learning, icon ripples scale 1.0→1.15→1.0 over 240ms

Image area:

80×80px container, left-aligned in main content row
White background with 1px #E8E5DF border, 12px radius
Contents (priority order):

If image_url exists in vocabulary_bank: render image
Else if image_category exists: render mapped Lucide icon (e.g., "food" → UtensilsCrossed, 40px, color #9A8B73)
Else: render emoji field as 48px text (NOTE: emoji here is data from DB, not UI chrome — this is the one exception to the no-emoji rule)



Word and pronunciation:

English word (word_en): clamp(20px, 6vw, 28px) Quicksand 600, color #1A1A18, line-height 1.1
IPA pronunciation (en_ipa): 13px monospace italic, color #9A8B73, displayed below word
For Thai-learning direction: Thai word at top instead, with th_romanization below

Thai meaning (or English meaning if direction reversed):

word_th: 16px Kanit 500, color #1A1A18
Romanization or alternate forms: 13px Kanit 400 italic muted, separated by " · "

Divider: 1px solid #E8E5DF, full width inside card padding, 16px vertical margin above/below
Miomi's note (miomi_note_th + miomi_note_en):

Thai note: 14px Kanit 500, color #1A1A18, line-height 1.5
English note: 12px Quicksand 500 italic, color #9A8B73, 4px margin-top
This is Miomi's voice on this word. Always warm, always personal.

Example (example_en + example_th):

Quoted text: 13px italic
Source language (English for Thai users, Thai for foreign users): color #1A1A18
Translation: color #9A8B73, below source

Use_when hint (if exists in DB):

Lucide Lightbulb icon 14px gold inline-left
12px Kanit 500 italic, color #9A8B73
Appears only if use_when field populated

Cultural warning (if exists):

Lucide AlertCircle icon 14px coral #FF8A80 inline-left
12px Kanit 500, color #1A1A18
Appears only if cultural_warning populated
This is the one place a warning color appears in the screen — used sparingly

Expand more examples:

"▶ ตัวอย่างเพิ่ม" — text link, 12px Kanit 500, color #DB2777
Tap → expands height 240ms, shows additional examples from DB or related phrases from phrases_bank

Pronunciation check button:

Full width inside card padding, 44px tall, pink gradient background, white text, 12px radius
Lucide Mic icon 16px left, 12px gap to text
Text: "ลองพูดดูค่า~" (or "Try saying this~" for foreigners)
Tap → triggers PRONUNCIATION_CHECK exercise inline (see 1D Exercise 3) — exercise card appears directly below this word card

Entry animation (the handoff from Miomi)
Per Section 1B handoff specification — the card materializes from Miomi's chest and translates down into the canvas. The card's internal contents fade in with stagger:

Image area: T=400ms after card arrives at canvas, fades in 240ms
Word: T=480ms, fades in 240ms with scale 0.96→1.0
Meaning: T=560ms, fades 200ms
Miomi note: T=640ms, fades 200ms
Example: T=720ms, fades 200ms
Button: T=800ms, fades 200ms with subtle scale 0.96→1.0

Total reveal: ~1000ms from card materialized to fully populated. Slow on purpose — invites the user to actually read.

2B. Exercise card visual
Specs per Section 1D for each exercise type. Universal exercise card properties:
Container (same skeleton as word card):

Full width minus 32px gutter
Background: #FFFFFF
Border: 1.5px solid #F9A8D4 while active (the pink active signal)
Border-radius: 16px
Shadow: 0 2px 8px rgba(26,26,24,0.05), 0 0 0 4px rgba(249,168,212,0.10) while active
Internal padding: 20px
Left-bar: 3px wide, #F9A8D4 while active, transitions to gold (correct) or muted gray (incorrect-final)

Header:

"ฝึก · [type]" tag: 10px Quicksand 600 uppercase color #DB2777
Skip link "ข้าม" top-right: 11px Kanit muted

Game-like but not childish — design principles:

Generous touch targets (44px minimum for any interactive element)
Single-column layouts (never grids — single hand operation)
Animated state changes (not jarring color flips — 240ms transitions)
No score numbers visible during exercise (XP chip appears after, not during)
No timer (never gamified pressure — Miomi is patient)
No "streak combo" UI (no chain pressure)

Single-hand operation:

All interactive elements within bottom 60% of screen on 812 viewport
Tap targets minimum 44px tall (Apple HIG standard)
Drag interactions: NONE (sentence arrange uses tap-to-place, not drag)
Pinch/swipe: NONE (no gesture conflicts with nav swipe)


2C. The ambient environment
Decision: /talk has its own atmospheric signature — warmer, more focused than home.
Background

Base: #FAFAF6 (same as rest of app for visual continuity)
A SINGLE large ambient blob lives behind Miomi's stage area only (not behind canvas, not behind mic)
This blob is much larger than home screen blobs (~400px diameter) and very subtle (opacity 0.30, single warm-pink color)
It drifts slowly behind Miomi, providing a "halo" / warm room atmosphere
Velocity ×0.4 (slower than home — this is a focused space)

Mode signaling via ambient
The engine detects what kind of session is happening (learning / translating / creating). The single ambient blob's color shifts subtly:
Detected modeBlob colorSaturationlearning (default)#F9A8D4 pink1.0translating#7DD3C0 teal0.85creating#FF8A80 coral1.0mixed/idlewarm gradient (pink + cream)1.0
Transitions: 1200ms ease-out (slow, atmospheric — never abrupt).
This is subliminal mode signaling. The user never consciously notes the color, but their peripheral vision builds an association over many sessions.
Difference from home screen ambient
PropertyHome/talkBlob count8-121PositionAll over screenBehind Miomi onlyVelocity1.0 baseline0.4 (slower)Opacity0.50 baseline0.30 (subtler)Palette4-5 colors active1 color active, mode-keyedBehind canvas?YesNo (flat #FAFAF6 behind canvas)
The /talk screen is a workspace. Ambient is restrained. The home screen is a room. Ambient is generous.

SECTION 3 — LIBRARY-FIRST RESPONSE SYSTEM
This is the cost discipline of the entire product. The library serves the 80% most common interactions for zero AI cost. AI handles only what the library can't.
Architecture
User input
    ↓
Intent classifier (28-intent, already built per handoff)
    ↓
Library lookup (by intent + user context + archetype)
    ↓
   ┌─────────────┴─────────────┐
   ↓                           ↓
Library match found       No library match
   ↓                           ↓
Serve template            AI router (Groq → Gemini)
+ inject vocab/phrase
from bank
   ↓                           ↓
Log interaction           Promote to library if quality
(for analytics)           threshold met
Library response structure (TypeScript):
tstype LibraryResponse = {
  id: string
  intent: string
  user_archetype?: 'thai_learning_english' | 'foreigner_learning_thai' | 'mixed' | 'any'
  trigger_patterns: string[]  // regex or keyword arrays
  response: {
    speech_th: string
    speech_en: string
    audio_key_th?: string
    audio_key_en?: string
  }
  follow_up?: {
    type: 'word_card' | 'exercise' | 'translation_card' | 'caption_card' | 'none'
    payload_resolver: 'first_vocab_at_user_level' | 'specific_word_id' | 'phrase_id' | 'dynamic'
    payload_params?: Record<string, any>
  }
  miomi_state_during: 'idle' | 'speaking' | 'teaching' | 'reacting'
  cost: 0  // always zero
}
The 10 Most Common Response Templates
These cover the 10 highest-frequency user inputs. Implementation in /lib/library/responses.ts.

1. TEACH_ME_ENGLISH
Trigger: "teach me english", "สอนภาษาอังกฤษ", "อยากเรียน english", "i want to learn english"
Archetype: thai_learning_english (or null — defaults from this input)
Miomi response:
TH: "ดีค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดในชีวิตประจำวันก่อนนะคะ
     คำแรก หนูจะสอนคำว่า 'hello' ค่า — เป็นคำทักทายที่ใช้ได้ทุกที่"

EN: "Great~ Let's start with the most common everyday words.
     First, I'll teach you 'hello' — a greeting you can use anywhere"
Follow-up: word_card with vocabulary_bank query WHERE word_en = 'hello' AND cefr_level = 'A1'
After 1.2s pause from word card settled: Miomi triggers PRONUNCIATION_CHECK exercise on "hello"
Which word first? Always "hello" for first session. Engine then selects subsequent words from spiral queue or by CEFR progression. Word selection priority: greetings (A1) → food (A1) → polite phrases (A1) → daily routines (A2). Each session introduces 2-4 words at user's CEFR level.

2. TEACH_ME_THAI
Trigger: "teach me thai", "สอนภาษาไทย", "i want to learn thai", "how do i learn thai"
Archetype: foreigner_learning_thai
Miomi response:
EN: "Yay~ Let's start with the most useful phrase first.
     I'll teach you 'sa-wat-dee' — it means hello, and Thai people use it all day."

TH: "ดีใจค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดนะคะ
     หนูจะสอนคำว่า 'สวัสดี' ค่า — แปลว่า hello ใช้ได้ทั้งวันเลย"
Follow-up: word_card with vocabulary_bank query WHERE word_th = 'สวัสดี' AND cefr_level = 'A1'
After 1.2s pause: PRONUNCIATION_CHECK on "สวัสดี" with romanization shown prominently
Word selection sequence for Thai learners: สวัสดี → ขอบคุณ → ครับ/ค่ะ → กิน → น้ำ. The first 5 words are the survival pack. Engine then expands to scenario-based clusters (taxi, restaurant, market) per the phrases_bank tourism path.

3. WHAT_DOES_X_MEAN
Trigger: "X แปลว่าอะไร", "what does X mean", "ความหมายของ X", "X คืออะไร"
Archetype: any
Lookup flow:

Extract X from input (regex / NER)
Query vocabulary_bank for X (both word_en and word_th columns)
If match found → serve library response with translation
If no match → fallback to AI translation

Miomi response (when match found in DB):
TH: "คำว่า '[word_en]' แปลว่า '[word_th]' ค่า~
     [miomi_note_th]"

EN: "'[word_en]' means '[word_th]'.
     [miomi_note_en]"
Follow-up: word_card with full data for X
Example for X = "tired":
TH: "คำว่า 'tired' แปลว่า 'เหนื่อย' ค่า~
     ใช้บอกว่าตัวเองหรือคนอื่นรู้สึกอ่อนแรงค่า"

EN: "'tired' means 'เหนื่อย'.
     Used to say someone feels exhausted or low-energy."
Followed by word_card with audio, IPA, example sentences from DB.

4. HOW_DO_YOU_SAY_X
Trigger: "X ภาษาไทยว่า", "how do you say X", "X ภาษาอังกฤษว่า", "X เป็นภาษาไทย"
Archetype: any (direction inferred from input language)
Lookup flow:

Detect direction (Thai→English or English→Thai) from sentence structure
Extract X from input
Query vocabulary_bank for target word
If match → serve template + word card
If no match → fallback to AI translation

Miomi response (direction = English → Thai):
TH: "'[X]' พูดว่า '[word_th]' ค่า~
     ออกเสียงว่า '[th_romanization]'"

EN: "'[X]' is '[word_th]' in Thai.
     Pronounced '[th_romanization]'."
Follow-up: word_card with pronunciation focus
Example for X = "thank you":
TH: "'thank you' พูดว่า 'ขอบคุณ' ค่า~
     ออกเสียงว่า 'kòp-kun'"

EN: "'thank you' is 'ขอบคุณ' in Thai.
     Pronounced 'kòp-kun'."
Followed by word_card with audio playback.

5. HELP_ME_WRITE_CAPTION
Trigger: "help me write a caption", "ช่วยเขียนแคปชั่น", "write a caption", "post idea"
Archetype: any
Miomi response:
TH: "ได้เลยค่า~ บอกหนูหน่อยว่าจะโพสต์เรื่องอะไร
     แล้วลงที่ไหน? Instagram, TikTok, Facebook?"

EN: "Sure~ Tell me what you want to post about,
     and where? Instagram, TikTok, Facebook?"
Follow-up: type: 'none' — this is a conversational fork that escalates to AI router on user's next response (creator intent confirmed, AI generates caption).
Note: this is the gateway into creator mode. The library serves the opener free; the actual caption generation is AI (creator output is Pro-tier per conversion brief). For non-Pro users, the AI call is permitted but limited to 3 captions/month (existing free tier policy).

6. TRANSLATE_THIS
Trigger: "translate this", "แปลให้หน่อย", "แปลว่าอะไร" (without specific X)
Archetype: any
Miomi response:
TH: "ได้ค่า~ พิมพ์หรือพูดประโยคที่อยากแปลมาเลยค่า"

EN: "Sure~ Type or say the sentence you want to translate."
Follow-up: type: 'none' — waits for next user input which is then routed to translation logic. If translation is a short phrase already in phrases_bank, library serves it directly. If novel, AI router translates.

7. FIRST_GREETING_OF_SESSION (time-aware)
Trigger: session init, no specific user input yet (engine-initiated)
Archetype: any (engine-provides)
Logic: based on user's local time in Bangkok timezone, OR user's IP-derived timezone:
Time windowThai greetingEnglish greeting05:00-10:59"อรุณสวัสดิ์ค่า~""Good morning~"11:00-13:59"กลางวันแล้วค่า~ กินข้าวยังคะ?""Lunchtime~ have you eaten?"14:00-17:59"บ่ายดีค่า~""Good afternoon~"18:00-21:59"เย็นแล้วค่า~ กลับบ้านหรือยังคะ?""Evening~ back home yet?"22:00-04:59"ดึกแล้วนะคะ~ ยังไม่นอนเหรอ?""It's late~ not sleeping yet?"
Then appended (varies by streak):
User contextAppendFirst session ever"หนูชื่อมิโอมิค่า อยากเรียนภาษาอะไรกับหนูดีคะ?"Returning, < 24h"วันนี้คุยอะไรกันดีคะ?"Returning, 1-7 days"หายไปไหนมาคะ~ คิดถึงค่า"Returning, 7+ days"หายไปนานเลยค่า~ ดีใจที่กลับมานะคะ"Streak day 7"ครบ 7 วันแล้วค่า~ เก่งมาก! อยากฉลองด้วยอะไรดี?"
Follow-up: type: 'none' — Miomi awaits user input.

8. AFTER_CORRECT_ANSWER
Trigger: engine confirms correct exercise answer
Archetype: any
Miomi response (rotated random):
Pool A — generic correct:
TH: "เก่งมาก~ ตอบถูกเลยค่า"
EN: "Great~ that's right"

TH: "ใช่แล้ว! คุณจำได้ดีมากเลย"
EN: "Yes~ you remember it well"

TH: "เพอร์เฟกต์ค่า~"
EN: "Perfect~"

Pool B — specific (use when context-appropriate):
TH: "ออกเสียงถูกเลยค่า~" (for pronunciation correct)
EN: "Pronunciation perfect~"

TH: "ใช้คำว่า '[word]' ได้ถูกแล้วนะคะ~" (for usage correct)
EN: "You used '[word]' correctly~"

TH: "เก่งขึ้นเร็วมากเลย!" (for repeat correct on same word)
EN: "You're improving so fast!"
Follow-up: XP chip slides up. If word mastered (3rd correct use), MASTERY moment fires (see Section 1E peak moment).
State: miomi_state_during = 'reacting'

9. AFTER_INCORRECT_ANSWER
Trigger: engine confirms incorrect exercise answer (1st, 2nd, max attempt)
Archetype: any
Miomi response (varies by attempt count, ALL face-saving):
1st attempt incorrect:
TH (rotated): "ลองอีกทีดูค่า~"
              "ใกล้แล้วนะคะ"
              "ไม่เป็นไรค่า ลองดูใหม่"
              "เกือบถูกแล้ว ลองอีกที"

EN: "Try again~"
    "Almost there~"
    "It's okay, try once more"
    "Very close, try again"
2nd attempt incorrect (with subtle hint):
TH: "ลองคิดถึงคำที่ขึ้นต้นด้วย '[first_letter]' ดูค่า~"
EN: "Try thinking of a word that starts with '[first_letter]'~"

OR

TH: "เริ่มต้นด้วยคำที่แปลว่า '[partial_meaning]' ค่า~"
EN: "Starts with a word that means '[partial_meaning]'~"
Max attempts reached (3rd):
TH: "คำตอบคือ '[correct_answer]' ค่า~ ไม่เป็นไรเลยนะคะ
     เก็บคำนี้ไว้ลองครั้งหน้านะคะ"

EN: "The answer is '[correct_answer]'~ no worries.
     Save this word for next time."
No XP penalty ever. Partial XP (+2) for completed-attempt at max. The user must never feel the app is keeping score against them.
State: miomi_state_during = 'idle' (head-thinking expression — gentle, not REACTING)

10. END_OF_SESSION
Trigger: session summary sheet appears (per Section 1E)
Archetype: any (engine-provided)
Miomi response — top of session summary sheet, varies by session quality:
Strong session (3+ words mastered, 8+ exchanges):
TH: "วันนี้คุณเก่งมากเลยค่า~
     เรียนใหม่ได้ตั้ง [N] คำ — หนูภูมิใจมากเลยนะคะ"

EN: "You did so well today~
     Learned [N] new words — I'm so proud of you"
Steady session (1-2 words mastered, 5-7 exchanges):
TH: "ดีค่า~ วันนี้ก็เรียนไปได้อีกค่า
     ทุกครั้งที่คุยกัน คุณก็เก่งขึ้นเรื่อยๆ นะคะ"

EN: "Nice~ another step forward today.
     Every time we talk, you get a little better."
Brief session (under 5 exchanges):
TH: "ขอบคุณที่แวะมาค่า~
     คราวหน้ามาคุยกันนานๆ นะคะ หนูรออยู่ค่า"

EN: "Thanks for stopping by~
     Next time let's chat longer, I'll be waiting."
Follow-up: session summary sheet displays as designed per prior brief.

Library schema for storage
These templates live in Supabase library_entries table (already exists per handoff). The structure stores the template + matches to vocabulary_bank/phrases_bank for follow-up payloads dynamically. Engine logs interactions for self-improvement queue per existing infrastructure.
When library does NOT serve
Library covers ~80% of common interactions. AI router serves the rest:

Novel translations not in phrases_bank
Open-ended conversation about user's day
Caption generation
Roleplay scenarios
User's personal questions ("what should I do this weekend")
Complex follow-ups not anticipated by templates

For these, Groq is primary (free tier), Gemini is backup, with library failover if both fail.

SECTION 4 — IMPLEMENTATION PRIORITIES
Element-by-element ranking
ElementUser impactEng hoursLocal vs AI/talk route + base layout104LocalVoice mic — 4 states with animations108LocalMiomi 180px head + state machine bridge96LocalWord card v3 (with audio playback)108LocalWord-card handoff animation from Miomi84LocalSubtitle area + state-aware fades73LocalLibrary response system (10 templates)106LocalLibrary template: TEACH_ME_ENGLISH92LocalLibrary template: TEACH_ME_THAI92LocalFILL_GAP exercise96LocalQUICK_PICK exercise84LocalPRONUNCIATION_CHECK exercise98Local + browser APISENTENCE_ARRANGE exercise78LocalWord card audio playback (TTS or pre-recorded)96Local + cacheAmbient single-blob mode-keyed53LocalUser echo strip41LocalTime-aware greeting (Library #7)72LocalEngine-driven opener call84AI (1 call/session)REACTING state with magic burst84LocalTEACHING state handoff84LocalSession end pull-up handle63LocalInline mic for pronunciation check95Local + browser APICard glow active/inactive states62LocalWord card interaction (tap audio, expand)83LocalEngine routing: library-first then AI106MixedText input modal sheet (one-off text)53LocalKeyboard mode toggle (persistent)44LocalLibrary template: WHAT_DOES_X_MEAN83LocalLibrary template: HOW_DO_YOU_SAY_X83LocalLibrary template: TRANSLATE_THIS62LocalLibrary template: HELP_ME_WRITE_CAPTION62LocalAFTER_CORRECT and AFTER_INCORRECT93LocalEND_OF_SESSION variants72Local
Phased plan
Phase 1 — This week (makes it feel ALIVE)
Goal: user opens /talk, sees a living teacher, can talk to her by voice, gets one word card and one exercise. Library serves the core interactions.
Order:

Create /talk route with skeletal layout (Miomi 180px head + subtitle + canvas + mic at bottom) — 4 hours
Mic 4-state animations (IDLE / LISTENING / PROCESSING / SPEAKING) with push-to-talk — 8 hours
Web Speech API integration with isFinal handling, language toggle TH/EN/AUTO — included in mic work
Miomi state machine bridge (Framer Motion overlay for blinks/ears/breathing — per the v1 brief Framer bridge spec) — 6 hours
Library template engine (lib/library/responses.ts + intent matcher → template) — 6 hours
Templates 1, 2, 7, 8, 9, 10 (TEACH_ME_ENGLISH, TEACH_ME_THAI, FIRST_GREETING, AFTER_CORRECT, AFTER_INCORRECT, END_OF_SESSION) — 8 hours
Word card v3 with audio playback, image area, miomi_note rendering — 8 hours
Word-card handoff animation from Miomi's chest to canvas — 4 hours
PRONUNCIATION_CHECK exercise inline (Web Speech API for user) — 8 hours
REACTING + TEACHING states for Miomi (handoff and reaction choreography) — 4 hours
User echo strip + subtitle area state-aware fades — 4 hours

Total Phase 1: ~60 hours engineering (1 week for solo founder working full-time)
By end of Phase 1: user opens /talk, gets time-aware greeting, says "teach me English," sees a word card hand off from Miomi, hears the word pronounced, tries it themselves, gets a warm reaction. The room feels alive.
Phase 2 — Next week (makes it feel INTELLIGENT)
Goal: more exercise variety, more library coverage, smoother conversation flow.

FILL_GAP exercise — 6 hours
QUICK_PICK exercise — 4 hours
Templates 3, 4, 5, 6 (WHAT_DOES_X_MEAN, HOW_DO_YOU_SAY_X, HELP_ME_WRITE_CAPTION, TRANSLATE_THIS) — 10 hours
Engine-driven opener (call session/init endpoint, server-built opener) — 4 hours
Card glow active/inactive states — 2 hours
Ambient single-blob mode-keyed for /talk — 3 hours
Engine library-first routing (intent classify → library → AI fallback) — 6 hours
Mastered word celebration (magic burst from word card, 60 particles, etc.) — 4 hours
Session pull-up handle + summary sheet integration — 3 hours

Total Phase 2: ~42 hours
By end of Phase 2: most user interactions hit library (zero AI cost), exercises vary, conversation feels intentional and paced.
Phase 3 — Week 3 (makes it feel COMPLETE)
Goal: polish, full coverage, the remaining exercise types.

SENTENCE_ARRANGE exercise — 8 hours
Text input modal sheet (one-off text input button) — 3 hours
Keyboard mode toggle (persistent reconfiguration) — 4 hours
Library self-improvement loop (promote high-quality AI responses to library) — 6 hours
Pre-recorded audio for top 200 vocabulary words (ElevenLabs batch, store in Supabase storage) — 8 hours + $20-40 audio gen cost (worth it; user perceives "Miomi has her own voice")
Image assets for top 50 vocabulary words (image_url populated) — 8 hours of curation
Performance optimization — auto-scroll, render virtualization for long canvases, image lazy-load — 6 hours
Analytics events — exercise completion rates, library hit rate, AI fallback rate per session — 4 hours

Total Phase 3: ~47 hours
By end of Phase 3: /talk is the canonical surface for learning. Library serves 80%+ of interactions free. Audio + images make Miomi feel real. Founder has data on what's working.

CURSOR PROMPTS
These are ready to paste in order. Each is self-contained.
Prompt 1 — Create /talk route with skeletal layout
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 1A and 1B entirely.
BUILD MODE — direct, no speeches.

GOAL: Create /talk route that replaces /create. Skeletal layout per Section 1A.

CREATE /app/(app)/talk/page.tsx:

LAYOUT (375x812 canonical):
- Top bar: 44px tall, fixed top, white bg, 1px bottom border #E8E5DF
  - Left: Lucide ArrowLeft 24px (back nav), 16px from left
  - Right: meta row showing "Lv.X · ✦ XP" for signed-in users OR "เหลือ X ครั้ง" for guests
- Miomi stage: 220px tall, below top bar
  - Centered Miomi head 180px (use head-idle.png as default state)
  - 12px gap below head
  - Subtitle area: max-width 320px, centered, 2 lines Thai + 1 line English below
- Conversation canvas: flex-1 (between stage and mic zone)
  - Internal scroll only (overflow-y-auto)
  - Padding 16px horizontal, 16px top, 24px bottom
  - Empty state (Phase 1): no content yet
- Mic zone: 120px tall at bottom
  - Mic button 80px circle, centered, 24px from bottom of safe-area
  - Below mic: row of 2 ghost buttons "text ↗" and "keyboard ↗", 32px tall each, 12px gap from mic

ROUTING:
- Add /talk to nav in BottomNav.tsx — replaces /create reference
- The middle pill (เรียน) now navigates to /talk
- Keep /create route alive as redirect to /talk for now (no broken links)

STATE (skeletal):
- micState: 'idle' | 'listening' | 'processing' | 'speaking' (default 'idle')
- subtitleText: { th: string, en: string }
- canvasItems: any[] (empty array for Phase 1)

USE:
- Existing Supabase client (singleton)
- Framer Motion (already installed)
- Lucide React (already installed)

DO NOT:
- Build mic interaction yet — that's prompt 2
- Build word cards yet — that's prompt 4
- Wire to engine yet — that's prompt 6
- Delete /create route — keep as redirect

Verify: /talk loads on mobile viewport (375x812), Miomi visible at 180px centered, mic button visible at bottom, no overflow, no scroll on page.
Prompt 2 — Mic 4-state animations with push-to-talk
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 1A (mic states) entirely.
BUILD MODE — direct, no speeches.

GOAL: Build the 4-state mic button with push-to-talk and Web Speech API.

CREATE /components/talk/MicButton.tsx:

PROPS:
- state: 'idle' | 'listening' | 'processing' | 'speaking'
- onTranscript: (text: string, isFinal: boolean) => void
- onStateChange: (state: MicState) => void
- language: 'th-TH' | 'en-US' | 'auto'

IMPLEMENTATION:

STATE: IDLE
- 80px circle, bg #FFFFFF, border 2px solid #E8E5DF
- shadow: 0 4px 16px rgba(26,26,24,0.06)
- Lucide Mic icon 32px strokeWidth 1.75, color #DB2777
- Continuous breathing: scale 1.0 ↔ 1.02 over 2400ms ease-in-out (Framer Motion animate prop)
- Tap-and-hold OR tap-toggle (read from user.settings.micMode, default 'hold')

STATE: LISTENING
- bg: linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)
- border: none
- box-shadow: 0 8px 32px rgba(219,39,119,0.35), 0 0 0 6px rgba(249,168,212,0.20)
- Lucide Mic icon 32px strokeWidth 2.0 white
- Outer 6px ring (the rgba part) scales 1.0 ↔ 1.08 ↔ 1.0 based on audio amplitude (read from SpeechRecognition events) — fallback 1.0↔1.04 at 600ms if amplitude not available
- Inside circle BELOW icon: 3 waveform bars (4px wide, 8-24px tall, white, 4px gap) — heights animate based on amplitude
- Live transcript: floating pill 16px above mic, white bg, max-width 300px, italic muted #9A8B73, updates from SpeechRecognition interim results

STATE: PROCESSING
- bg: #FFF8F2, border 2px solid #C9A96E
- Inside: Lucide Loader2 icon 24px color #9A8B73, rotating 1200ms linear infinite
- Outer ring: gold soft pulse, 0 0 0 6px rgba(201,169,110,0.25), expand-contract over 1600ms
- Non-interactive (cursor-not-allowed, click handler returns early)

STATE: SPEAKING
- bg: #FFFFFF, border 2px solid #F9A8D4
- Lucide Volume2 icon 32px color #DB2777
- Outer ring pulses on each sentence boundary (1.0→1.06→1.0 over 320ms) — sentence boundaries detected from TTS audio events or text-stream punctuation
- Tap during speaking: interrupts (stop TTS, fire onStateChange('idle'))

WEB SPEECH API:
- Use window.webkitSpeechRecognition (Chrome/Android default)
- recognition.continuous = false
- recognition.interimResults = true
- recognition.lang = language prop value
- Set recognition.maxAlternatives = 1
- On 'start' → fire onStateChange('listening')
- On 'result' → fire onTranscript(result.transcript, result.isFinal)
- On isFinal → recognition.stop(), fire onStateChange('processing')
- On 'error' → fire onStateChange('idle'), log error
- On 'end' → if no isFinal received → fire onStateChange('idle')

AUDIO AMPLITUDE (for ring scaling):
- Use Web Audio API: navigator.mediaDevices.getUserMedia → AnalyserNode
- Read getByteFrequencyData → compute average amplitude
- Map amplitude 0-255 → ring scale 1.0-1.08
- Throttle to requestAnimationFrame
- Cleanup audio context on unmount

PUSH-TO-TALK INTERACTION:
- onMouseDown / onTouchStart: start recognition
- onMouseUp / onTouchEnd: stop recognition (triggers isFinal)
- Prevent context menu on long-press (e.preventDefault on touchstart)

INTEGRATION in /app/(app)/talk/page.tsx:
- Wire MicButton to page state
- onTranscript with isFinal=true: log for now (Phase 1) — Prompt 6 will wire to engine
- Test all 4 states by manually toggling state prop

DO NOT:
- Wire to engine yet (Phase 6)
- Add TTS playback yet (Prompt 7)
- Add toggle mode setting UI (Phase 3)

Verify on mobile: tap-and-hold mic → state transitions to listening → ring responds to voice → release → state goes to processing.
Prompt 3 — Miomi state machine bridge (Framer Motion overlays)
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 1B (Miomi state machine) entirely.
BUILD MODE — direct, no speeches.

GOAL: Make Miomi feel alive on /talk via Framer Motion overlay system on existing PNGs.

CREATE /components/talk/MiomiCharacter.tsx:

PROPS:
- state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'teaching' | 'reacting'
- size: number (default 180)

EXPRESSION MAP:
const EXPRESSIONS = {
  idle: '/miomi/head-idle.png',
  listening: '/miomi/head-idle.png',  // same image, animation differs
  thinking: '/miomi/head-thinking.png',
  speaking: '/miomi/head-speaking.png',
  teaching: '/miomi/head-happy.png',
  reacting: '/miomi/head-happy.png',
};

LAYERED STRUCTURE:
1. Outer container (motion.div) — handles scale, translateY, headTilt rotation
2. Glow layer (positioned absolute behind, radial gradient warm pink, opacity varies by state)
3. Image layer (motion.img with AnimatePresence for crossfade between expressions, 240ms)
4. Ear overlay layer (two absolutely positioned SVG triangles, rotation animated independently)
5. Eyelid overlay layer (two absolutely positioned SVG ovals/rectangles, scaleY animated for blinks)
6. Particle layer (positioned absolute, used by Magic Moments — empty for now)

EAR OVERLAY:
- Two SVG triangle shapes positioned at top-left and top-right of head
- Approximate pixel positions on the 180px head image: left ear at x=40, y=20; right ear at x=140, y=20 (tune visually)
- Triangle dimensions: 24x32px each, fill the pink ear color from PNG (#F9A8D4 or eyedrop from existing image)
- Rotation pivot: bottom-center of triangle
- Default rotation: 0°

EYELID OVERLAY:
- Two small SVG ovals positioned over each eye on head image
- Approximate positions (tune visually): left eye at x=60 y=80, right eye at x=110 y=80, each 20x12px
- Fill matches surrounding cat fur (#FFF or #FFEEEE)
- Default scaleY: 0 (invisible — eyes "open")
- Blink: scaleY 0 → 1 → 0 over 280ms with timing 140ms close, 0ms hold, 140ms open

STATE BEHAVIORS:

IDLE:
- Image: head-idle.png
- Outer scale: animate 1.0 ↔ 1.02 with transition duration 3.2, repeat Infinity, ease 'easeInOut'
- Random blink: useEffect with setTimeout, random interval 4200-6800ms, scaleY 0→1→0 over 280ms total
- Random ear flick: useEffect with setTimeout, random interval 8000-14000ms, one ear rotation 0 → -8 → 0 over 220ms
- Glow opacity: 0

LISTENING:
- Image: head-idle.png
- Ear rotation: both ears +12° hold (animate to this value over 220ms ease-out)
- Outer head tilt: animate 0 ↔ ±2° over 2400ms sine, repeat Infinity
- Blink: PAUSE (clear timeout, no blinks)
- Glow opacity: animate to 0.3 over 320ms, with subtle scale 1.0 ↔ 1.06 over 2400ms

THINKING:
- Image: head-thinking.png (crossfade from previous over 240ms)
- Outer headTilt: animate to -8° over 280ms ease-out, hold
- Blink interval: 2400ms (slower deliberate blinks)
- Ear: return to 0°
- Glow: 0
- Small gold particle: use Framer Motion <motion.div> with 2-3 dots floating up from beside head, 400ms fade in/out, 1200ms lifetime, spawn every 800ms

SPEAKING:
- Image: head-speaking.png
- Outer headTilt: animate 0 ↔ ±2° at 2400ms sine
- Outer scale: animate 1.0 ↔ 1.012 at 280ms intervals (mouth pulse — driven by text streaming or audio playback; for Phase 1 just animate continuously)
- Blink interval: 5000-7000ms (reduced frequency)
- Ear: return to 0°
- Glow: 0

TEACHING:
- Image: head-happy.png (crossfade over 240ms)
- Outer scale: 1.0 → 1.08 over 320ms spring (stiffness 280, damping 13)
- Outer headTilt: animate to +6° over 320ms ease-out
- Glow: animate opacity 0 → 0.5 over 320ms, scale 1.0
- Hold for 600ms total in this state, then auto-transition back via prop change

REACTING:
- Image: head-happy.png
- Outer scale: spring sequence 1.0 → 1.10 → 1.04 → 1.06 over 400ms (stiffness 340, damping 11) — use keyframes array
- Outer translateY: 0 → -6 → 0 over 400ms (keyframes)
- Both ears: +14° over 200ms, hold, return to 0° over 240ms with 800ms delay
- Glow: animate opacity to 0.4 over 200ms, settle to 0 over 800ms

CROSSFADE BETWEEN IMAGES:
- Use Framer AnimatePresence mode='popLayout' with crossfade
- Old image fades out 240ms while new image fades in 240ms
- Stagger 80ms: new image starts fading in at 80ms after old begins fading out

INTEGRATION in /app/(app)/talk/page.tsx:
- Replace static Miomi head img with <MiomiCharacter state={miomiState} />
- Add miomiState to page state, default 'idle'
- Wire from micState: when micState='listening' → miomiState='listening', etc.

DO NOT:
- Build magic burst particles yet (Phase 2)
- Build word handoff animation yet — Prompt 5
- Auto-trigger TEACHING or REACTING — those are driven by other components

Verify: Miomi blinks every 4-7s, ear flicks occasionally, breathing visible. Switching state prop transitions smoothly with proper image swap.
Prompt 4 — Word card v3 with audio and pronunciation check
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 2A (word card final design) and 1D Exercise 3 (pronunciation check) entirely.
BUILD MODE — direct, no speeches.

GOAL: Build the canonical word card v3 component, with audio playback and pronunciation check button.

CREATE /components/talk/WordCardV3.tsx:

PROPS:
- word: VocabularyEntry (from Supabase vocabulary_bank)
- direction: 'th_to_en' | 'en_to_th'
- onPronunciationCheck: (word: VocabularyEntry) => void
- onAudioPlay: () => void

VocabularyEntry type (matches DB):
{
  id, word_en, word_th, th_romanization, en_ipa,
  miomi_note_th, miomi_note_en,
  example_en, example_th, example_context,
  cultural_warning, use_when, do_not_use_when,
  emoji, image_category, image_url?,
  audio_key_th, audio_key_en,
  cefr_level, register
}

LAYOUT per Section 2A spec:
- Full width minus 32px gutter
- Background #FFFFFF, 1px solid #E8E5DF, 16px radius, shadow 0 2px 8px rgba(26,26,24,0.05)
- Min-height 280px
- Internal padding 20px
- Left-bar 4px wide, color #C9A96E, full height absolute left

HEADER ROW:
- CEFR badge: 10px Quicksand 600 uppercase, color #C9A96E
- Register tag (lowercase, color #9A8B73, prefixed with " · ")
- Audio button right-aligned: Lucide Volume2 20px, color #DB2777
- Tap audio button → play audio via Audio API (audio_key_en for thai-learners, audio_key_th for foreign-learners). If audio not available, fallback to Web Speech synthesis with appropriate lang.

CONTENT ROW (flex):
- Image area: 80x80px, white bg, 1px #E8E5DF border, 12px radius, flex-shrink-0
  - Priority 1: if image_url exists → render <Image>
  - Priority 2: if image_category exists → render mapped Lucide icon (build mapping in /lib/talk/imageCategoryMap.ts — e.g., 'food': UtensilsCrossed, 'greeting': Hand, 'work': Briefcase, 'family': Users) at 40px color #9A8B73
  - Priority 3: render word.emoji as 48px text (this is data, exception to no-emoji rule)
- Word column to the right of image (16px gap):
  - Primary word (based on direction): clamp(20px, 6vw, 28px) Quicksand 600 color #1A1A18 (for English) or Kanit 600 (for Thai)
  - Pronunciation below: 13px monospace italic color #9A8B73 (en_ipa or th_romanization based on direction)

MEANING ROW:
- 16px margin-top from content row
- Translation: 16px Kanit 500 (Thai meaning) or Quicksand 500 (English meaning) color #1A1A18

DIVIDER: 1px solid #E8E5DF full width, 16px vertical margin

MIOMI NOTE:
- miomi_note_th: 14px Kanit 500 line-height 1.5 color #1A1A18
- miomi_note_en: 12px Quicksand 500 italic color #9A8B73, 4px margin-top

DIVIDER

EXAMPLES:
- example_en: 13px italic
- example_th: 13px italic muted below
- Wrap in quotation marks

USE_WHEN (conditional):
- If use_when exists, render row with Lucide Lightbulb 14px gold + 12px Kanit italic muted

CULTURAL_WARNING (conditional):
- If cultural_warning exists, render row with Lucide AlertCircle 14px color #FF8A80 + 12px Kanit color #1A1A18

EXPAND MORE EXAMPLES:
- Toggle: "▶ ตัวอย่างเพิ่ม" / "▼ ซ่อน" — 12px Kanit 500 #DB2777
- Below it, when expanded: show 2-3 more example sentences from related phrases_bank entries (query WHERE phrases.related_word_id = word.id LIMIT 3)
- Height transition 240ms ease-out on expand/collapse

PRONUNCIATION CHECK BUTTON (at bottom of card):
- Full width inside padding, 44px tall
- bg: linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)
- color: white
- 12px border-radius
- Lucide Mic icon 16px left, 12px gap, "ลองพูดดูค่า~" (or "Try saying this~" for foreigners) 14px Kanit 500
- Tap → fires onPronunciationCheck(word)

ENTRY ANIMATION (when card mounts in canvas):
- Use Framer Motion initial/animate
- Container: height 0 → auto over 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 0 → 1
- Left-bar: width 0 → 4px over 240ms with delay 200ms
- Content stagger (with delays):
  - Image area: delay 400ms, fade-in 240ms
  - Word: delay 480ms, fade + scale 0.96 → 1.0 over 240ms
  - Meaning: delay 560ms, fade 200ms
  - Miomi note: delay 640ms, fade 200ms
  - Examples: delay 720ms, fade 200ms
  - Button: delay 800ms, fade + scale 0.96 → 1.0 over 200ms

INTEGRATION in /app/(app)/talk/page.tsx:
- Add canvas state: items: Array<{ type, payload }>
- Render word cards in canvas via items.filter(i => i.type === 'word_card').map(...)
- Sort by createdAt ascending (newest at bottom)
- Auto-scroll canvas to bottom on new item (use ref + scrollIntoView)

DO NOT:
- Build the handoff animation FROM Miomi yet — Prompt 5
- Wire pronunciation check exercise yet — Prompt 5

Verify: render a hardcoded test word card in canvas → all fields visible, audio button works (Web Speech synthesis fallback), expand button works.
Prompt 5 — Word card handoff animation + pronunciation check exercise
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 1B (handoff choreography) and 1D Exercise 3.
BUILD MODE — direct, no speeches.

GOAL: When a word card appears, it materializes FROM Miomi's chest and translates into the canvas. Build pronunciation check as inline exercise.

PART A — Handoff animation

CREATE /components/talk/WordCardHandoff.tsx:

This is a transient wrapper that handles the entry animation. Once animation completes, the card "settles" into the canvas as a normal WordCardV3.

PROPS:
- word: VocabularyEntry
- direction
- onComplete: () => void
- miomiStageRect: DOMRect (position/size of Miomi's stage container)

CHOREOGRAPHY (use Framer Motion):

T=0ms (mount):
- Position absolute, z-index above canvas
- Initial position: based on miomiStageRect — start at center-bottom of Miomi stage (stage left + stage width/2, stage top + 220 - 40)
- Initial scale: 0
- Initial opacity: 0

T=0 → 320ms:
- Animate scale 0 → 1.0 spring (stiffness 280, damping 13)
- Animate opacity 0 → 1.0

T=200ms → 800ms (overlap with scale):
- Animate translateY from current position downward to top of canvas (~180px translation on 812 viewport)
- Use cubic-bezier(0.4, 0, 0.2, 1) ease
- Throughout: spawn gold particles along path (12 particles, lifetime 600ms each, stagger 50ms)

T=800ms:
- Card arrives at canvas top
- Settle position becomes the natural flow position in canvas
- Trigger onComplete()

PARTICLE TRAIL:
- Each particle: 4px circle, gold #C9A96E, opacity 0.8 → 0 over 600ms, scale 1.0 → 0.4
- Spawn from card center as it moves
- Use Framer Motion <motion.div> spawned via array map

PART B — Update page integration

In /app/(app)/talk/page.tsx:
- When adding a word card to canvas items, also set miomiState to 'teaching'
- After 600ms TEACHING state hold, fire the handoff animation
- After handoff onComplete, set miomiState back to 'idle' and add WordCardV3 to canvas

Pseudo flow:
1. User says "teach me english"
2. Library returns word card payload
3. setMiomiState('teaching')
4. Wait 600ms
5. Render <WordCardHandoff /> at miomi position
6. After handoff onComplete (T=1200ms total)
7. Add WordCardV3 to canvas items
8. setMiomiState('idle')

PART C — Pronunciation check exercise

CREATE /components/talk/PronunciationExercise.tsx:

PROPS:
- word: VocabularyEntry
- onComplete: (success: boolean, attempts: number) => void

LAYOUT per Section 1D Exercise 3:
- Card skeleton (same as WordCardV3 dimensions)
- Border 1.5px solid #F9A8D4 (active pink)
- Shadow: 0 2px 8px rgba(26,26,24,0.05), 0 0 0 4px rgba(249,168,212,0.15)
- Left-bar 3px #F9A8D4 active

HEADER: "ฝึก · ออกเสียง" 10px Quicksand 600 uppercase #DB2777

CONTENT:
- "พูดคำนี้ดูค่า~" 14px Kanit 500 #1A1A18, 4px gap
- "Try saying this word~" 12px Quicksand muted

WORD DISPLAY:
- Word large: 24px Quicksand 600 #1A1A18 (or Kanit for Thai)
- IPA/romanization: 14px monospace italic muted

INLINE MIC BUTTON:
- 48px tall, full width inside padding
- bg #FFFFFF border 1.5px #F9A8D4 8px radius
- Lucide Mic 18px #DB2777 + "กดค้างเพื่อพูด" 13px Kanit 500
- While listening: bg pink gradient white text, waveform inside

PRONUNCIATION ATTEMPT LOGIC:
- Use SpeechRecognition (separate instance from main mic — pause main mic when this exercise is active)
- recognition.lang = 'en-US' for English words, 'th-TH' for Thai words
- On isFinal: compare result.transcript to target word using:
  - Levenshtein distance ratio (1 - distance/maxLength)
  - Threshold 0.65 for correct (forgiving)
  - Lowercase + trim both before comparison

OUTCOMES:
- Correct (confidence ≥ 0.65):
  - Card flashes gold (left-bar transitions to #C9A96E, border to #C9A96E, glow gold)
  - Fire onComplete(true, attempts)
- Incorrect (confidence < 0.65):
  - Card briefly flashes muted gray (border #C4BDB5 for 320ms then back to pink)
  - Increment attempts counter
  - If attempts < 3: play target audio, allow retry
  - If attempts === 3: reveal answer, fire onComplete(false, 3)

SKIP LINK:
- "ข้าม" 11px Kanit muted, top-right of card
- Tap: fire onComplete(false, attempts) with attempts unchanged

INTEGRATION:
- Add to canvas items as type 'pronunciation_exercise'
- When word card's "ลองพูดดูค่า~" button is tapped, add PronunciationExercise to canvas
- onComplete: trigger Miomi reaction (REACTING for true, idle+thinking for false) and add XP chip

DO NOT:
- Wire to engine yet (Prompt 6)
- Build other exercise types yet (Phase 2)

Verify: tap pronunciation check button on word card → exercise card appears below → tap inline mic → say the word → card flashes gold (or muted on incorrect) → Miomi reacts.
Prompt 6 — Library response system + engine integration
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 3 entirely and the 10 templates in detail.
BUILD MODE — direct, no speeches.

GOAL: Wire user input → library lookup → response with follow-up payload (word card, exercise, etc.) → canvas update.

CREATE /lib/library/responses.ts:

Define 10 templates exactly per Section 3 (TEACH_ME_ENGLISH through END_OF_SESSION).

Template structure:
```ts
export const LIBRARY_TEMPLATES: LibraryResponse[] = [
  {
    id: 'teach_me_english',
    intent: 'teach_me_english',
    user_archetype: 'any',
    trigger_patterns: [
      /teach me english/i,
      /สอนภาษาอังกฤษ/,
      /อยากเรียน english/i,
      /i want to learn english/i,
    ],
    response: {
      speech_th: 'ดีค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดในชีวิตประจำวันก่อนนะคะ คำแรก หนูจะสอนคำว่า \'hello\' ค่า — เป็นคำทักทายที่ใช้ได้ทุกที่',
      speech_en: 'Great~ Let\'s start with the most common everyday words. First, I\'ll teach you \'hello\' — a greeting you can use anywhere',
    },
    follow_up: {
      type: 'word_card',
      payload_resolver: 'specific_word_id',
      payload_params: { word_en: 'hello', cefr_level: 'A1' },
    },
    miomi_state_during: 'teaching',
    cost: 0,
  },
  // ... 9 more templates per Section 3
]
```

CREATE /lib/library/matcher.ts:

Export `matchLibrary(input: string, userContext): LibraryResponse | null`

Logic:
1. Normalize input: lowercase, trim, strip punctuation
2. Iterate LIBRARY_TEMPLATES
3. For each template, test if any trigger_pattern matches input
4. Filter by user_archetype (any matches any; otherwise must match userContext.archetype)
5. Return first match or null

UPDATE /lib/library/resolver.ts (or create):

Export `resolveFollowUp(template, userContext): Promise<FollowUpPayload | null>`

For each follow_up.payload_resolver type, fetch the actual payload:
- 'specific_word_id': query vocabulary_bank WHERE word_en = params.word_en
- 'first_vocab_at_user_level': query vocabulary_bank WHERE cefr_level = userContext.cefr ORDER BY frequency LIMIT 1, excluding already-seen
- 'phrase_id': query phrases_bank WHERE id = params.phrase_id
- 'dynamic': returns null, AI router takes over

UPDATE /app/api/miomi/route.ts (or wherever the chat endpoint lives):

Pseudo flow on each user message:
1. Receive { user_id, message, session_state }
2. Build userContext from user_id + session_state
3. matchLibrary(message, userContext) → template or null
4. If template:
   a. resolveFollowUp(template, userContext) → payload
   b. Log to library_interactions table (intent, input, template_id)
   c. Return { source: 'library', speech: template.response, follow_up: payload, miomi_state: template.miomi_state_during, cost: 0 }
5. If no template:
   a. Call AI router (Groq → Gemini → library failover)
   b. Parse response for any artifacts
   c. Return { source: 'ai', ... }

INTEGRATION in /app/(app)/talk/page.tsx:

When mic returns isFinal transcript:
1. setMiomiState('thinking')
2. POST /api/miomi with { message, session_state }
3. On response:
   a. setSubtitle({ th: response.speech.speech_th, en: response.speech.speech_en })
   b. setMiomiState('speaking')
   c. Stream subtitle text char-by-char (28ms per char) — OR if response is from library, render immediately
   d. After subtitle complete: if response.follow_up:
      - type 'word_card': trigger TEACHING state and WordCardHandoff animation → adds to canvas
      - type 'exercise': add exercise card to canvas with active state
   e. Set miomiState to 'idle' after all transitions complete

USER ECHO STRIP:
- Add component /components/talk/UserEchoStrip.tsx per Section 1C spec
- Renders user's last transcript in canvas with "─ User said ─" label
- Append to canvas items as type 'user_echo'

DO NOT:
- Build all exercise types yet (Phase 2)
- Build TTS playback yet (next prompt)

Verify: say "teach me english" → echo strip appears in canvas → Miomi thinks → speaks → word card hands off from her to canvas → pronunciation exercise follows.
Prompt 7 — Audio playback + time-aware greeting + library templates 7,8,9,10
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 3 templates 7, 8, 9, 10 entirely.
BUILD MODE — direct, no speeches.

GOAL: Wire audio playback (TTS for Phase 1), time-aware session opener, and reaction copy.

PART A — TTS audio playback

CREATE /lib/talk/speech.ts:

Export functions:
- speakText(text, lang): plays via window.speechSynthesis
- playAudioKey(key): if Supabase storage has audio file for key, play it; otherwise fallback to speakText

Implementation:
- For Phase 1, use Web Speech Synthesis API directly
- speechSynthesisUtterance with appropriate voice (find Thai female voice for lang='th-TH', English female for 'en-US')
- Voice selection: prefer voices with 'Female' in name, fall back to first available
- Rate 1.0, pitch 1.1 (slightly higher = more youthful, matches Miomi voice)
- Return Promise that resolves on 'end' event

Integration:
- When library response returns: play audio via playAudioKey if available, otherwise speakText with speech_th first then speech_en after 200ms gap
- Wire to MicButton state: while speech is playing, micState = 'speaking'
- On speech end: micState = 'idle'

Word card audio:
- Update WordCardV3.onAudioPlay: call playAudioKey(direction === 'th_to_en' ? word.audio_key_en : word.audio_key_th)

PART B — Library template 7: FIRST_GREETING_OF_SESSION

In /lib/library/responses.ts, add template that's NOT input-triggered but engine-invoked at session start.

CREATE /lib/library/sessionOpener.ts:

Export getSessionOpener(userContext): { speech_th, speech_en }

Logic:
1. Get user's local time (use Intl.DateTimeFormat with timezone)
2. Determine time window per Section 3 #7 table
3. Build base greeting (อรุณสวัสดิ์ค่า~ / etc.)
4. Append user context line per the second table in Section 3 #7
5. Return combined { speech_th, speech_en }

In /app/(app)/talk/page.tsx:
- On mount, call getSessionOpener client-side (or via API for accuracy)
- Wait 600ms after mount, then setSubtitle and play TTS, set miomiState to 'speaking'
- After speech ends, miomiState to 'idle'

PART C — Templates 8, 9, 10 (after_correct, after_incorrect, end_of_session)

These are NOT input-triggered. They're invoked by other components on specific events.

CREATE /lib/library/reactions.ts:

Export:
- getCorrectReaction(context): returns one rotation pool entry per Section 3 #8
- getIncorrectReaction(attempts, context): returns appropriate copy per Section 3 #9
- getEndOfSessionMessage(sessionStats): returns appropriate variant per Section 3 #10

Usage:
- PronunciationExercise.onComplete(true) → call getCorrectReaction → play TTS + show subtitle
- PronunciationExercise.onComplete(false) → call getIncorrectReaction(attempts) → play TTS + show subtitle
- Session summary sheet open → use getEndOfSessionMessage(stats) as the praise line

WIRING:

In page.tsx, after exercise complete:
```ts
if (success) {
  setMiomiState('reacting')
  const reaction = getCorrectReaction(context)
  setSubtitle(reaction)
  await speakText(reaction.speech_th, 'th-TH')
  // XP chip slides up
  setTimeout(() => setMiomiState('idle'), 1200)
}
```

DO NOT:
- Build session summary sheet UI in this prompt (use existing component)
- Build remaining library templates (3, 4, 5, 6) yet — Phase 2

Verify on /talk:
1. Open at 14:30 → Miomi greets with "บ่ายดีค่า~"
2. Say "teach me english" → Miomi teaches, word card hands off
3. Try pronunciation correctly → Miomi celebrates with audio + subtitle
4. Try pronunciation incorrectly → Miomi gently encourages with audio
Prompt 8 — Polish: subtitle fades, user echo strip, mic position fix
You are technical co-founder of Miomika.
Read MIOMIKA_TALK_SCREEN_OPUS.md Section 1A (subtitle behavior) and 1C (user echo strip).
BUILD MODE — direct, no speeches.

GOAL: Polish remaining Phase 1 details — subtitle fade behaviors, user echo strip, mic state-aware secondary controls.

PART A — Subtitle state-aware fades

In /app/(app)/talk/page.tsx:
- The Miomi subtitle text (below 180px head) has dynamic opacity based on micState:
  - micState 'idle' / 'speaking': opacity 1.0
  - micState 'listening': opacity 0.4 (user is talking — Miomi's past speech is de-emphasized)
  - micState 'processing': opacity 0.6
- Use Framer Motion animate prop on the subtitle container
- Transition: 200ms ease-out

PART B — Subtitle text streaming

When Miomi has a new spoken line:
- Old subtitle fades out (opacity 1 → 0 over 200ms)
- After 200ms: update text content
- New text streams in char-by-char at 28ms per char (Thai first, then EN after 200ms gap, EN appears fully formed not typed)
- During streaming, miomiState = 'speaking'
- Implementation: useEffect that listens to subtitle text change, splits Thai into chars, animates appearance with setInterval

PART C — User echo strip component

CREATE /components/talk/UserEchoStrip.tsx:

PROPS:
- text: string

LAYOUT per Section 1C:
- Full-width container, 32px tall
- "─ User said ─" label centered: 9px Quicksand 600 uppercase color #C4BDB5 with two 1px lines of color #E8E5DF on either side
- User text below label: 12px italic color #9A8B73, centered, truncate ellipsis after 60 chars
- Tap to expand: shows full text in 14px non-italic for 3 seconds then auto-collapses

Add to canvas items as type 'user_echo' when user transcript is finalized. Render in canvas above any artifacts that resulted from that input.

PART D — Mic secondary controls

Below the 80px mic button (12px gap), add row of 2 ghost buttons:

CREATE /components/talk/MicSecondaryControls.tsx:

PROPS:
- onTextMode: () => void  (opens text modal sheet)
- onKeyboardMode: () => void  (toggles persistent keyboard mode)

LAYOUT:
- Row, 32px tall, centered horizontally, 16px gap between buttons
- Each button: 32px tall, auto width, padding 10px horizontal, transparent bg, no border
- Button 1: Lucide Type icon 14px + "text ↗" 11px Kanit color #9A8B73
- Button 2: Lucide Keyboard icon 14px + "keyboard ↗" 11px Kanit color #9A8B73

PART E — Text modal sheet

CREATE /components/talk/TextInputSheet.tsx:

When user taps "text ↗":
- Sheet slides up from bottom of mic zone, 56px tall, white bg, top corners 16px radius
- Contains: text input field (full width minus padding) + Lucide ArrowUp send button 32px circle pink gradient
- Auto-focus input on open
- On send: fire onSubmit(text), close sheet
- On backdrop tap or input blur with empty: close sheet
- Animation: slide up 280ms ease-out, slide down 240ms ease-in

INTEGRATION:
- Wire text submit to same flow as voice transcript (POST /api/miomi → engine routes)

PART F — Persistent keyboard mode

When user taps "keyboard ↗":
- Save preference to localStorage: 'miomika-talk-keyboard-mode' = '1'
- Re-render screen with keyboard-first layout:
  - Mic button shrinks to 48px (was 80px)
  - Mic moves to right side, 16px from right edge
  - Text input takes left side as primary, 48px tall pill
  - Secondary controls row shows "mic ↗" button (toggles back to voice-first)
- Same engine routing for inputs

State management:
- Read localStorage on mount, set initial layoutMode state
- Toggle layoutMode on button tap, update localStorage

DO NOT:
- Build remaining exercise types yet (Phase 2)
- Build mode-keyed ambient blob yet (Phase 2)

Verify:
1. Subtitle fades to 0.4 when listening
2. New subtitles stream char-by-char
3. User echo strip appears in canvas
4. Text mode sheet opens and submits
5. Keyboard mode toggle persists across reloads

LOCAL RESPONSE LIBRARY
Final, ready-to-paste TypeScript constants for /lib/library/responses.ts. Implementation includes all 10 templates from Section 3.
ts// /lib/library/responses.ts

export type LibraryResponse = {
  id: string
  intent: string
  user_archetype: 'thai_learning_english' | 'foreigner_learning_thai' | 'mixed' | 'any'
  trigger_patterns: RegExp[]
  response: {
    speech_th: string
    speech_en: string
    audio_key_th?: string
    audio_key_en?: string
  }
  follow_up?: {
    type: 'word_card' | 'exercise' | 'translation_card' | 'caption_card' | 'none'
    payload_resolver: 'first_vocab_at_user_level' | 'specific_word_id' | 'phrase_id' | 'dynamic' | 'extract_from_input'
    payload_params?: Record<string, any>
  }
  miomi_state_during: 'idle' | 'speaking' | 'teaching' | 'reacting' | 'thinking'
  cost: 0
}

export const LIBRARY_TEMPLATES: LibraryResponse[] = [
  // 1. TEACH_ME_ENGLISH
  {
    id: 'teach_me_english',
    intent: 'teach_me_english',
    user_archetype: 'any',
    trigger_patterns: [
      /teach me english/i,
      /สอนภาษาอังกฤษ/,
      /อยากเรียน english/i,
      /i want to learn english/i,
      /สอน english/i,
    ],
    response: {
      speech_th: 'ดีค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดในชีวิตประจำวันก่อนนะคะ คำแรก หนูจะสอนคำว่า \'hello\' ค่า — เป็นคำทักทายที่ใช้ได้ทุกที่',
      speech_en: 'Great~ Let\'s start with the most common everyday words. First, I\'ll teach you \'hello\' — a greeting you can use anywhere',
    },
    follow_up: {
      type: 'word_card',
      payload_resolver: 'specific_word_id',
      payload_params: { word_en: 'hello', cefr_level: 'A1' },
    },
    miomi_state_during: 'teaching',
    cost: 0,
  },

  // 2. TEACH_ME_THAI
  {
    id: 'teach_me_thai',
    intent: 'teach_me_thai',
    user_archetype: 'any',
    trigger_patterns: [
      /teach me thai/i,
      /สอนภาษาไทย/,
      /i want to learn thai/i,
      /how do i learn thai/i,
      /สอน thai/i,
    ],
    response: {
      speech_th: 'ดีใจค่า~ เริ่มจากคำที่ใช้บ่อยที่สุดนะคะ หนูจะสอนคำว่า \'สวัสดี\' ค่า — แปลว่า hello ใช้ได้ทั้งวันเลย',
      speech_en: 'Yay~ Let\'s start with the most useful phrase first. I\'ll teach you \'sa-wat-dee\' — it means hello, and Thai people use it all day.',
    },
    follow_up: {
      type: 'word_card',
      payload_resolver: 'specific_word_id',
      payload_params: { word_th: 'สวัสดี', cefr_level: 'A1' },
    },
    miomi_state_during: 'teaching',
    cost: 0,
  },

  // 3. WHAT_DOES_X_MEAN
  {
    id: 'what_does_x_mean',
    intent: 'what_does_x_mean',
    user_archetype: 'any',
    trigger_patterns: [
      /(.+) แปลว่าอะไร/,
      /what does (.+) mean/i,
      /ความหมายของ (.+)/,
      /(.+) คืออะไร/,
      /(.+) แปลว่า/,
    ],
    response: {
      // Templated — X is replaced at runtime by resolver
      speech_th: 'คำว่า \'{word_en}\' แปลว่า \'{word_th}\' ค่า~ {miomi_note_th}',
      speech_en: '\'{word_en}\' means \'{word_th}\'. {miomi_note_en}',
    },
    follow_up: {
      type: 'word_card',
      payload_resolver: 'extract_from_input',
      payload_params: { lookup_table: 'vocabulary_bank' },
    },
    miomi_state_during: 'teaching',
    cost: 0,
  },

  // 4. HOW_DO_YOU_SAY_X
  {
    id: 'how_do_you_say_x',
    intent: 'how_do_you_say_x',
    user_archetype: 'any',
    trigger_patterns: [
      /(.+) ภาษาไทยว่า/,
      /how do you say (.+)/i,
      /(.+) ภาษาอังกฤษว่า/,
      /(.+) เป็นภาษาไทย/,
      /พูด (.+) ยังไง/,
    ],
    response: {
      speech_th: '\'{x}\' พูดว่า \'{translation}\' ค่า~ ออกเสียงว่า \'{romanization}\'',
      speech_en: '\'{x}\' is \'{translation}\'. Pronounced \'{romanization}\'.',
    },
    follow_up: {
      type: 'word_card',
      payload_resolver: 'extract_from_input',
      payload_params: { lookup_table: 'vocabulary_bank' },
    },
    miomi_state_during: 'teaching',
    cost: 0,
  },

  // 5. HELP_ME_WRITE_CAPTION
  {
    id: 'help_me_write_caption',
    intent: 'help_me_write_caption',
    user_archetype: 'any',
    trigger_patterns: [
      /help me write a caption/i,
      /ช่วยเขียนแคปชั่น/,
      /write a caption/i,
      /post idea/i,
      /แคปชั่น/,
    ],
    response: {
      speech_th: 'ได้เลยค่า~ บอกหนูหน่อยว่าจะโพสต์เรื่องอะไร แล้วลงที่ไหน? Instagram, TikTok, Facebook?',
      speech_en: 'Sure~ Tell me what you want to post about, and where? Instagram, TikTok, Facebook?',
    },
    follow_up: {
      type: 'none',
      payload_resolver: 'dynamic',
    },
    miomi_state_during: 'speaking',
    cost: 0,
  },

  // 6. TRANSLATE_THIS
  {
    id: 'translate_this',
    intent: 'translate_this',
    user_archetype: 'any',
    trigger_patterns: [
      /^translate this$/i,
      /^แปลให้หน่อย$/,
      /^แปลว่าอะไร$/,
      /^translate$/i,
    ],
    response: {
      speech_th: 'ได้ค่า~ พิมพ์หรือพูดประโยคที่อยากแปลมาเลยค่า',
      speech_en: 'Sure~ Type or say the sentence you want to translate.',
    },
    follow_up: {
      type: 'none',
      payload_resolver: 'dynamic',
    },
    miomi_state_during: 'speaking',
    cost: 0,
  },

  // 7. FIRST_GREETING_OF_SESSION
  // (Engine-invoked — not user-triggered. See /lib/library/sessionOpener.ts)
  // Stored separately because it's compound (time-window + user-context appended)

  // 8. AFTER_CORRECT_ANSWER
  // (Event-invoked from exercises. See /lib/library/reactions.ts → getCorrectReaction)
  // Multiple pools defined separately due to context-specific selection

  // 9. AFTER_INCORRECT_ANSWER
  // (Event-invoked. See /lib/library/reactions.ts → getIncorrectReaction)

  // 10. END_OF_SESSION
  // (Event-invoked on session summary open. See /lib/library/reactions.ts → getEndOfSessionMessage)
]

// Session opener (Template 7) — invoked by /lib/library/sessionOpener.ts
export const GREETING_BY_TIME = {
  morning:    { th: 'อรุณสวัสดิ์ค่า~', en: 'Good morning~' },           // 05:00-10:59
  lunch:      { th: 'กลางวันแล้วค่า~ กินข้าวยังคะ?', en: 'Lunchtime~ have you eaten?' }, // 11:00-13:59
  afternoon:  { th: 'บ่ายดีค่า~', en: 'Good afternoon~' },              // 14:00-17:59
  evening:    { th: 'เย็นแล้วค่า~ กลับบ้านหรือยังคะ?', en: 'Evening~ back home yet?' }, // 18:00-21:59
  night:      { th: 'ดึกแล้วนะคะ~ ยังไม่นอนเหรอ?', en: 'It\'s late~ not sleeping yet?' }, // 22:00-04:59
}

export const GREETING_APPENDS = {
  first_session_ever: {
    th: 'หนูชื่อมิโอมิค่า อยากเรียนภาษาอะไรกับหนูดีคะ?',
    en: 'I\'m Miomi. What language would you like to learn?'
  },
  returning_under_24h: {
    th: 'วันนี้คุยอะไรกันดีคะ?',
    en: 'What shall we talk about today?'
  },
  returning_1_to_7_days: {
    th: 'หายไปไหนมาคะ~ คิดถึงค่า',
    en: 'Where have you been~ I missed you'
  },
  returning_7_plus_days: {
    th: 'หายไปนานเลยค่า~ ดีใจที่กลับมานะคะ',
    en: 'It\'s been so long~ I\'m glad you\'re back'
  },
  streak_day_7: {
    th: 'ครบ 7 วันแล้วค่า~ เก่งมาก! อยากฉลองด้วยอะไรดี?',
    en: 'A full 7 days~ amazing! How shall we celebrate?'
  },
}

// Template 8: Correct reactions
export const CORRECT_REACTIONS = {
  generic: [
    { th: 'เก่งมาก~ ตอบถูกเลยค่า', en: 'Great~ that\'s right' },
    { th: 'ใช่แล้ว! คุณจำได้ดีมากเลย', en: 'Yes~ you remember it well' },
    { th: 'เพอร์เฟกต์ค่า~', en: 'Perfect~' },
    { th: 'ดีมาก! ใช้คำได้ถูกเลย', en: 'Great! you used the word correctly' },
  ],
  pronunciation: [
    { th: 'ออกเสียงถูกเลยค่า~', en: 'Pronunciation perfect~' },
    { th: 'เพราะมากค่า~ ออกเสียงดี', en: 'Beautiful~ great pronunciation' },
  ],
  usage: [
    // Use {word} placeholder for runtime substitution
    { th: 'ใช้คำว่า \'{word}\' ได้ถูกแล้วนะคะ~', en: 'You used \'{word}\' correctly~' },
  ],
  repeat_correct: [
    { th: 'เก่งขึ้นเร็วมากเลย!', en: 'You\'re improving so fast!' },
    { th: 'คุณจำได้แม่นมากเลยค่า~', en: 'You remember it so well~' },
  ],
}

// Template 9: Incorrect reactions
export const INCORRECT_REACTIONS = {
  first_attempt: [
    { th: 'ลองอีกทีดูค่า~', en: 'Try again~' },
    { th: 'ใกล้แล้วนะคะ', en: 'Almost there~' },
    { th: 'ไม่เป็นไรค่า ลองดูใหม่', en: 'It\'s okay, try once more' },
    { th: 'เกือบถูกแล้ว ลองอีกที', en: 'Very close, try again' },
  ],
  second_attempt_with_hint: [
    // {hint} placeholder for runtime substitution
    { th: 'ลองคิดถึงคำที่ขึ้นต้นด้วย \'{hint}\' ดูค่า~', en: 'Try thinking of a word that starts with \'{hint}\'~' },
    { th: 'เริ่มต้นด้วยคำที่แปลว่า \'{hint}\' ค่า~', en: 'Starts with a word that means \'{hint}\'~' },
  ],
  max_attempts: {
    // {correct_answer} placeholder
    th: 'คำตอบคือ \'{correct_answer}\' ค่า~ ไม่เป็นไรเลยนะคะ เก็บคำนี้ไว้ลองครั้งหน้านะคะ',
    en: 'The answer is \'{correct_answer}\'~ no worries. Save this word for next time.',
  },
}

// Template 10: End of session
export const END_OF_SESSION_MESSAGES = {
  strong_session: {
    // {n} placeholder for words mastered count
    th: 'วันนี้คุณเก่งมากเลยค่า~ เรียนใหม่ได้ตั้ง {n} คำ — หนูภูมิใจมากเลยนะคะ',
    en: 'You did so well today~ Learned {n} new words — I\'m so proud of you',
  },
  steady_session: {
    th: 'ดีค่า~ วันนี้ก็เรียนไปได้อีกค่า ทุกครั้งที่คุยกัน คุณก็เก่งขึ้นเรื่อยๆ นะคะ',
    en: 'Nice~ another step forward today. Every time we talk, you get a little better.',
  },
  brief_session: {
    th: 'ขอบคุณที่แวะมาค่า~ คราวหน้ามาคุยกันนานๆ นะคะ หนูรออยู่ค่า',
    en: 'Thanks for stopping by~ Next time let\'s chat longer, I\'ll be waiting.',
  },
}
Also create /lib/library/sessionOpener.ts:
ts// /lib/library/sessionOpener.ts
import { GREETING_BY_TIME, GREETING_APPENDS } from './responses'

export function getSessionOpener(userContext: {
  isFirstSession: boolean
  hoursSinceLastSession: number | null
  streakDays: number
  timezone?: string
}): { speech_th: string; speech_en: string } {
  // Determine time window
  const now = new Date()
  const tz = userContext.timezone ?? 'Asia/Bangkok'
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      hour12: false,
    }).format(now)
  )
  
  let timeKey: keyof typeof GREETING_BY_TIME
  if (hour >= 5 && hour < 11) timeKey = 'morning'
  else if (hour >= 11 && hour < 14) timeKey = 'lunch'
  else if (hour >= 14 && hour < 18) timeKey = 'afternoon'
  else if (hour >= 18 && hour < 22) timeKey = 'evening'
  else timeKey = 'night'
  
  const baseGreeting = GREETING_BY_TIME[timeKey]
  
  // Determine append
  let appendKey: keyof typeof GREETING_APPENDS
  if (userContext.isFirstSession) appendKey = 'first_session_ever'
  else if (userContext.streakDays === 7) appendKey = 'streak_day_7'
  else if (userContext.hoursSinceLastSession === null || userContext.hoursSinceLastSession < 24) appendKey = 'returning_under_24h'
  else if (userContext.hoursSinceLastSession < 24 * 8) appendKey = 'returning_1_to_7_days'
  else appendKey = 'returning_7_plus_days'
  
  const append = GREETING_APPENDS[appendKey]
  
  return {
    speech_th: `${baseGreeting.th} ${append.th}`,
    speech_en: `${baseGreeting.en} ${append.en}`,
  }
}
And /lib/library/reactions.ts:
ts// /lib/library/reactions.ts
import { CORRECT_REACTIONS, INCORRECT_REACTIONS, END_OF_SESSION_MESSAGES } from './responses'

export function getCorrectReaction(context: {
  type: 'generic' | 'pronunciation' | 'usage' | 'repeat_correct'
  word?: string
}): { speech_th: string; speech_en: string } {
  const pool = CORRECT_REACTIONS[context.type] ?? CORRECT_REACTIONS.generic
  const choice = pool[Math.floor(Math.random() * pool.length)]
  return {
    speech_th: choice.th.replace('{word}', context.word ?? ''),
    speech_en: choice.en.replace('{word}', context.word ?? ''),
  }
}

export function getIncorrectReaction(
  attempt: 1 | 2 | 3,
  context: { correctAnswer?: string; hint?: string }
): { speech_th: string; speech_en: string } {
  if (attempt === 1) {
    const pool = INCORRECT_REACTIONS.first_attempt
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (attempt === 2) {
    const pool = INCORRECT_REACTIONS.second_attempt_with_hint
    const choice = pool[Math.floor(Math.random() * pool.length)]
    return {
      speech_th: choice.th.replace('{hint}', context.hint ?? ''),
      speech_en: choice.en.replace('{hint}', context.hint ?? ''),
    }
  }
  // attempt === 3
  return {
    speech_th: INCORRECT_REACTIONS.max_attempts.th.replace('{correct_answer}', context.correctAnswer ?? ''),
    speech_en: INCORRECT_REACTIONS.max_attempts.en.replace('{correct_answer}', context.correctAnswer ?? ''),
  }
}

export function getEndOfSessionMessage(stats: {
  wordsMastered: number
  exchangeCount: number
}): { speech_th: string; speech_en: string } {
  if (stats.wordsMastered >= 3 && stats.exchangeCount >= 8) {
    return {
      speech_th: END_OF_SESSION_MESSAGES.strong_session.th.replace('{n}', stats.wordsMastered.toString()),
      speech_en: END_OF_SESSION_MESSAGES.strong_session.en.replace('{n}', stats.wordsMastered.toString()),
    }
  }
  if (stats.exchangeCount >= 5) {
    return END_OF_SESSION_MESSAGES.steady_session
  }
  return END_OF_SESSION_MESSAGES.brief_session
}

End of MIOMIKA_TALK_SCREEN_OPUS.md.
Save to project root. Run prompts in order. Prompt 1 lands today (the new route). Prompts 2-5 ship within 4 days (the alive room). Prompts 6-8 close Phase 1 (library + flow + polish).
By end of Phase 1, the user opens /talk, hears Miomi greet them with the right phrase for their time of day, says "teach me English," watches a word card glide down from Miomi's chest into the canvas, hears the word, tries it themselves, and feels Miomi celebrate. That entire experience costs zero AI dollars and runs from local library + Web Speech API.
This is the product.