MIOMIKA CREATE SCREEN — MASTER ARCHITECTURE

Document version: OPUS v1.0 — May 20, 2026
Save as: /MIOMIKA_CREATE_SCREEN_OPUS.md
Audience: Engineering (Cursor + Claude Sonnet)


0. NORTH STAR
Every decision in this document serves one feeling:

"I am in Miomi's world. She is teaching me. I can feel myself growing."

If a decision does not directly serve that feeling, it is wrong, no matter how clever it is.

SECTION 1 — CREATE SCREEN MASTER ARCHITECTURE
1A. Mode switching system
Decision: a horizontal mode strip lives directly beneath the Miomi stage, NOT inside the input bar, NOT in a hamburger menu, NOT as a tab bar replacement.
The strip is one row of pill-buttons, scrollable horizontally if needed (overflow ok but designed not to require it on 320px+). Four modes at launch, with enterprise modes injected contextually for enterprise accounts.
Strip anatomy
┌──────────────────────────────────────────────────┐
│  เรียน    แปลภาษา    สร้างคอนเทนต์    บทบาท     │
│  Learn   Translate   Create          Roleplay    │
│  [●]      [ ]         [ ] PRO         [ ] PRO    │
└──────────────────────────────────────────────────┘

Position: directly below Miomi stage, 8px gap above, 16px gap below to thread
Height: 44px including padding
Background: transparent (sits on the create-screen ambient background)
Each pill: 36px tall, auto width, 12px horizontal padding, 18px border-radius, white surface, 1px border #E8E5DF
Active pill: pink gradient fill, white text, no border, soft glow 0 4px 12px rgba(219,39,119,0.20)
Pro-gated pills (Create, Roleplay for non-Pro users): muted text #9A8B73, tiny gold "Pro" badge inside the pill (right of label, 9px Quicksand 600), tapping it does NOT lock — it opens the Pro invitation sheet
Typography: Thai 13px Kanit 500, English 10px Quicksand 500 muted on a second line below

Mode list and what each does
ModeThaiLucide iconTierDefault opener (Miomi)LearnเรียนMessageCircleGuest+Cultural opener per time of day ("กินข้าวยังคะ~?")TranslateแปลภาษาLanguagesGuest+"อยากแปลอะไรคะ~ พิมพ์มาเลยค่า"Createสร้างคอนเทนต์SparklesPro"อยากโพสต์เรื่องอะไรวันนี้คะ~?"RoleplayบทบาทDramaPro"อยากซ้อมสถานการณ์ไหนดีคะ~?"
Icons sit to the LEFT of the Thai label inside each pill, 14px Lucide stroke 1.75. For the active pill the icon goes white; inactive it inherits the muted text color.
Mode switching behavior

Tap pill → 240ms crossfade transition. The mode strip itself doesn't move; thread content fades out (200ms) → mode-context fades in (200ms, 40ms overlap)
Miomi's expression and the ambient blob palette shift smoothly during the 240ms (see Section 1B + 2A)
Conversation history is preserved per-mode in memory but threads are not mixed. Switching mode shows that mode's history. This is critical — Translate history and Learn history are different mental contexts. Mixing them feels like ChatGPT, not Miomi.
Session state (XP earned this open, words taught this open, fuel state) persists across all modes
A small breadcrumb appears in top-right of thread for 1.6s after a switch: "เปลี่ยนเป็นโหมดแปลแล้วค่า~" (Switched to Translate mode) — then fades. This is Miomi acknowledging the switch, not a system notification.

What persists across switches

User identity, tier, fuel state, XP, level, streak
Vocabulary bank (universal)
Current session start timestamp (for end-of-session summary)
"Active topic" hint — if user was talking about food in Learn, switching to Translate primes Miomi: "ใช่เรื่องอาหารต่อไหมคะ~?"

What does NOT persist

The conversation thread visible in one mode does not appear in another
Mode-specific UI state (e.g., translation language direction)


1B. The Miomi stage (top zone)
Decision: Miomi shrinks to 96px head-only on this screen by default, expands to 160px during specific teaching moments. She is NOT the size of the home screen here.
Why smaller than home: this screen's purpose is active work between user and Miomi. The home screen is being with Miomi. The thread needs vertical real estate to be a real learning environment. Currently the 140px stage with subtitle is taking ~220px of vertical — that's 25% of mobile viewport for decoration. Cut it to 144px total stage height.
Stage layout
┌──────────────────────────────────────┐
│ [back]                       [meta]  │  ← 44px top bar
├──────────────────────────────────────┤
│                                      │
│           [Miomi 96px head]          │  ← stage 100px
│                                      │
│  "หิวมั้ยคะ~ กินข้าวยัง?"             │  ← subtitle area
│  "Are you hungry yet?"               │     12px below Miomi
├──────────────────────────────────────┤
│  [LEARN] [TRANS] [CREATE] [ROLEPLAY] │  ← mode strip 44px
├──────────────────────────────────────┤
│                                      │
│         (thread takes rest)          │
│                                      │

Stage container: 144px tall total (top bar 44px + Miomi area 100px)
Miomi head: 96px diameter, vertically centered in the 100px area
The current 140px head in screenshots is too dominant — cut to 96px
Top bar: left = back chevron 24px + small Lucide-ArrowLeft, right = meta info (exchange counter for guests, "Lv.3 · ✦ 245" for users)

Expression system per mode
Miomi's expression is keyed to mode AND state machine (from previous brief). When idle in each mode, she has a default expression bias:
ModeDefault expressionWhyLearnhead-happy (warm, encouraging)She's the teacher, warm baselineTranslatehead-thinking (focused, attentive)She's the interpreter, listeningCreatehead-speaking (animated, creative)She's the brainstorm partnerRoleplayhead-idle (neutral)She's about to become someone else
These are biases, not locks. State machine still takes priority. Mode bias just determines her resting expression when in IDLE state within that mode.
Stage subtitle — when text appears below Miomi vs in thread
This is the most-debated decision in this entire document and it must be made surgically.
Decision: the subtitle below Miomi shows ONE thing — her latest spoken line, persistently. The thread shows the FULL conversation. They are not duplicates.
The subtitle is Miomi speaking now. It updates with her latest message and stays put. The thread is Miomi's history with you. The subtitle is "live voice." The thread is "transcript."
Behavioral rules:

When Miomi has a new message: subtitle fades out (200ms) → new line types in below her (Thai first, English appears after 200ms gap, both at 26ms per char)
Subtitle persists between exchanges so she always has presence — not just "the last bubble in the thread"
Subtitle max 2 lines Thai + 1 line English. Truncate with ellipsis if longer. Tap subtitle to "Miomi repeats" — fires TTS if Pro, otherwise rebriefs in thread.
Subtitle disappears completely during user typing (focus on input) — the screen says "now you're talking."

Thinking state
When AI request is in flight:

Miomi enters THINKING state (head-thinking expression)
Subtitle area shows three dots Miomi-style: "หนูคิดอยู่..." with three muted dots animating in opacity 0.3→1.0→0.3 in sequence at 400ms intervals
Below the dots, after 2 seconds of thinking time only, a tiny gold spinner-line (4px bar, pink gradient, animated left-to-right) appears for additional patience signal
This is the ONLY place a loading indicator appears in the app. Everywhere else, Miomi's state IS the indicator.

Ambient blob behavior
Decision: ambient blobs DO live on this screen, but with restraint.

Blobs occupy only the area BEHIND the Miomi stage (top 144px) — not behind the thread
Velocity ×0.6 vs home (this is a workspace, not a leisure space)
Palette shifts per mode:

Learn: warm pink + gold + peach
Translate: cool teal + lavender + soft blue (signals "this is a different space")
Create: gold + coral + hot pink (energetic, creative)
Roleplay: muted lavender + mint + soft gold (theatrical, neutral)


During THINKING: blob velocity ×0.4, slight desaturation -10%
During WORD_MASTERED: small magic burst from Miomi's center, blobs accelerate ×1.3 for 1.4s, then settle

The thread sits on flat solid background (#FAFAF6) — no blobs visible behind text. This is a critical readability decision. Blobs are atmosphere for Miomi, not for content.
Stage vs home — clear differences
AspectHome stageCreate stageSize62% of screen144px (~15% of screen)PoseFull bodyHead-onlySpeech bubbleTop-right, floatingSubtitle below her, persistentAnimationIdle micro-variations all activeReduced micro-variations (focus mode)AmbientBehind whole screenOnly behind Miomi areaMode signalingn/aExpression bias + palette shiftPurposeCompanion presenceActive teaching partner

1C. The learning thread (middle zone)
Decision: this is a learning document, not a chat log. Architecture below.
Currently the screenshots show user-message-right (pink) + Miomi-message-left (white card with Thai + English). That's chat-bubble pattern. Wrong frame. Replace.
The new thread structure
A thread is a vertical scroll of typed exchanges, where each exchange has a clear visual rhythm:
┌────────────────────────────────────────┐
│  ➜  Midnight Club                      │  ← user input row
│     ─────────                           │
│                                        │
│     หนูชอบเกม Midnight Club จริงๆ ค่า~  │  ← Miomi response
│     I like Midnight Club too           │
│                                        │
│     ┌──────────────────────────────┐  │  ← word card (when teaching)
│     │ ✦ A2  ❤️ formal              │  │
│     │   to enjoy                    │  │
│     │   ชื่นชอบ                       │  │
│     │   "I enjoy playing games"     │  │
│     └──────────────────────────────┘  │
│                                        │
│     ─────────                           │
│                                        │
│  ➜  I played it many times             │
│     ─────────                           │
│                                        │
│     เก่งจังเลยค่า~ ใช้คำว่า "many"     │
│     ถูกแล้วนะคะ~                       │
│     Good job using "many" correctly~   │
│                                        │
│     [ ✦ +5 XP · "many" mastered ]      │  ← micro celebration chip
│                                        │
Differentiating user vs Miomi
User input row:

Right-aligned, ONE line by default (truncates with ellipsis if very long, tap to expand)
Prefix: small Lucide ArrowUpRight 12px in muted gold #C9A96E — the "you said" mark
Text: 14px Quicksand 500 (English) or Kanit 500 (Thai), color #1A1A18
NO bubble background. NO pink fill. The pink-bubble pattern in current screenshots reads as ChatGPT. Kill it.
A subtle horizontal divider beneath: 1px #E8E5DF, 24px wide, indented left by 16px

The decision to remove the pink user-bubble is contentious because the current screenshots show it works visually. But it's the signal that this is chat-app paradigm. Removing it shifts the mental model from "I sent a message" to "I said something to my teacher, and now she's responding." That shift is the whole point.
Miomi response:

Left-aligned, full-width container, but content stays within 88% of width (12% right gutter)
NO card background. NO border. Just text on the page background.
Thai 15px Kanit 500, color #1A1A18, line-height 1.6
English 12px Quicksand 500, color #9A8B73, line-height 1.5, 4px top margin from Thai
The lack of a card around Miomi's words is intentional — her voice IS the page. Cards are reserved for artifacts (word cards, content cards, translation results).

This is the single most important visual decision in the document. The current screenshots have Miomi's text in white cards, making her voice feel "boxed in" — one of many things on the screen. Removing that box makes her voice the substrate of the screen, with the user's input as the punctuation.
Word cards — when and how they appear
Word cards are artifacts. They appear when Miomi explicitly teaches a word, not for every vocabulary word in the conversation.
Trigger rules:

Miomi's session engine flags a word as "introducing" (first deliberate introduction at appropriate CEFR level)
The word card appears INLINE, immediately after Miomi's message that contains it
One word card per exchange max (don't overwhelm)
Word card stays in thread permanently — it IS the lesson record

Word card design (final):
┌────────────────────────────────────────────┐
│ ✦ A2 · informal              👂 listen      │  ← header: CEFR badge + register + listen icon
│                                            │
│   enjoy                                    │  ← English word, 22px Quicksand 600
│   ชื่นชอบ · ชอบ-ชม                          │  ← Thai meaning + pronunciation hint
│                                            │
│   "I enjoy playing games"                  │  ← example, 13px italic muted
│                                            │
│   ▶ ตัวอย่างเพิ่ม                           │  ← expand for more examples, tap reveal
└────────────────────────────────────────────┘
Specs:

Background: white #FFFFFF
Border: 1px #E8E5DF, 12px radius
Shadow: 0 1px 3px rgba(26,26,24,0.04)
Width: 100% of thread content area minus 32px (16px gutter each side)
Inline padding: 14px
The ✦ gold accent at left is a 3px wide vertical bar #C9A96E running the full height of the card — visual cue this is a learning artifact, distinct from conversation content
Listen icon (Lucide Volume2, 16px) top-right — Pro plays TTS, free shows "Pro" sheet softly
Tap example sentence → expand to show 2-3 more example sentences with 240ms ease-out height transition
NO emoji ever. The 👂 in the spec is a placeholder for the Lucide listen icon.

Celebration variant of word card
When user uses a previously-taught word correctly (3rd correct usage = mastered):
┌────────────────────────────────────────────┐
│ ✓ MASTERED                                 │  ← gold strip top, replaces CEFR header
│                                            │
│   enjoy ✓                                  │  ← English word with check
│   ชื่นชอบ                                   │
│                                            │
│   "เก่งมาก! ใช้ถูก 3 ครั้งแล้วนะคะ~"        │  ← Miomi's specific praise
│                                            │
│   [ +10 XP ]                               │  ← XP chip, gold
└────────────────────────────────────────────┘

Gold left bar (3px) becomes 6px wide on this variant
Background: very subtle gold tint #FFFBF0
Border: #E8C77F (gold)
Triggers a small magic burst from the card (18 particles, teal+gold, 1.4s) — see Magic Moments
Miomi enters WORD_MASTERED state simultaneously

Teaching moment vs conversation moment
Teaching moment: Miomi introduces a new word, asks a check-question, echoes a correction, or names something specific the user did. These are followed by either a word card, a correction chip, or a praise chip (see micro-chips below).
Conversation moment: Miomi just talks. No artifact appears. Pure dialogue.
The visual distinction: teaching moments are followed by an artifact (card or chip). Conversation moments are not. The eye learns this rhythm — "Miomi spoke, then she gave me a thing" = lesson; "Miomi spoke, then she asked a question" = chat.
Translation output styling
Translation mode produces a different artifact — the translation card:
┌────────────────────────────────────────────┐
│  TH → EN              ↻ swap  ⋯ more       │  ← direction strip
├────────────────────────────────────────────┤
│  วันนี้กินข้าวยังคะ                          │  ← source, 14px Kanit
├────────────────────────────────────────────┤
│  Have you eaten today?                     │  ← target, 16px Quicksand 600
├────────────────────────────────────────────┤
│  💡 cultural note                          │
│  ในไทยใช้ทักทายแทน "สบายดีไหม"             │  ← cultural context from Miomi
│  Used as greeting, like "how are you"      │
├────────────────────────────────────────────┤
│  [ คัดลอก ]  [ บันทึก ]  [ 🔊 ]              │  ← copy / save / listen
└────────────────────────────────────────────┘

Full-width card, white background, 12px radius
Source row: muted background #FAFAF6, smaller text
Target row: white background, larger, primary text color
Cultural note: small lightbulb (Lucide Lightbulb) Miomi-specific section, italic 12px muted
Action row at bottom: 3 small ghost buttons

Translation cards do NOT have the gold left-bar (that's reserved for learning artifacts). They use a teal left-bar #7DD3C0 instead — the translate mode's signature color.
Content creation cards
When in Create mode, Miomi produces content cards:
┌────────────────────────────────────────────┐
│ Instagram · Caption                        │  ← platform tag
├────────────────────────────────────────────┤
│                                            │
│  ค้นพบคาเฟ่ในฝันที่คุณต้องไปสักครั้ง 💭     │
│                                            │
│  ─────                                     │
│                                            │
│  #cafebkk #cafehopping #weekendvibes       │  ← hashtags
│                                            │
└────────────────────────────────────────────┘
│  [ คัดลอก ]  [ ปรับใหม่ ]  [ บันทึก ]        │
└────────────────────────────────────────────┘

Coral left-bar #FF8A80 — create mode signature
Platform tag at top (Instagram, TikTok, Facebook, YouTube, LINE OA)
Content body with proper formatting (line breaks preserved)
Action row: copy, regenerate, save

Vocabulary highlighting — tappable underlines
Decision: yes, but ONLY for words the user has been taught in past sessions.
In any Miomi response, words that exist in the user's vocabulary bank are visually marked:

New words being taught right now: NO underline (the word card below handles teaching)
Words from user's bank, status = "heard": dotted underline, color #9A8B73
Words from user's bank, status = "used": solid 1px underline, color #C9A96E (gold)
Words from user's bank, status = "mastered": NO underline (mastered words are invisible — they're yours now)

Tap any underlined word → quick popup (small card, 200ms fade-in, dismissible by tap outside):

Word, meaning, register
"หนูสอนเมื่อ X วันก่อนค่า~" (I taught this X days ago~)
Mini-button "ลองใช้คำนี้" (try using this word) — closes popup and adds the word as a draft chip in the input bar

This is the Spiral Method made visible. The user sees their vocabulary breathing in real-time as Miomi speaks. They see words they own. They see words on their way. It is a constant, ambient growth-feedback loop.
Session progress indicator
Decision: a thin 2px bar at the very top of the thread area, NOT a separate progress section.

Position: directly under the mode strip, full thread width
Default state: invisible (0 opacity)
During session: appears at opacity 0.4, gold gradient fill that grows left-to-right based on session "completeness" (defined below)
Session "completeness" formula: clamp((exchange_count / 8) + (words_taught * 0.15) + (corrections_made * 0.10), 0, 1)
At completeness 1.0, the bar pulses gently — invitation to wrap up session for full credit
Tap the bar → opens session summary peek (see 1E)

This is the only progress UI in the thread itself. Everything else is conveyed through Miomi's voice and artifacts.
Micro-chips (XP, mastery, corrections)
Small inline chips appear in the thread for moments:

+5 XP · "many" mastered — gold chip, after a mastery moment
+20 XP · session checkpoint — gold chip, every 5 exchanges
แก้ไขแล้วค่า~ — soft pink chip, when Miomi echo-corrects (more on this below)

Chip styling:

Inline-block, max-width 200px, 28px tall, 14px radius
Gold variant: background #FFFBF0, border #E8C77F, text #9A6B00
Pink variant: background #FFF1F8, border #F9A8D4, text #DB2777
Typography: 11px Kanit 500
Entry: 240ms scale 0.8→1.0 with slight spring

Echo correction visual
Decision: echo correction is invisible by default, with a tiny optional reveal.
When Miomi echo-corrects (user says "I goed", Miomi says "ใช่ค่า~ went ของวันวานเลยนะคะ"), the corrected word in Miomi's response gets a subtle visual marker:

1px solid underline in soft pink #F9A8D4 (NOT red — red = wrong, we never say wrong)
11px superscript heart icon (Lucide Heart, filled, pink) appears at the end of the corrected sentence
Tap the heart → tiny popup: "หนูแก้ตรงนี้นิดนึงค่า~ ไม่ผิดเลยนะคะ" + show original vs corrected gently

The user has to opt in to seeing the correction. Default reading just shows Miomi's correct form. This is Mirror Teaching made visible without violating face-saving.
How the thread feels different from WhatsApp/ChatGPT
PropertyWhatsApp/ChatGPTMiomika CreateBubblesBoth sides in bubblesNeither side in bubblesUser messageFilled colored bubbleSubtle one-line with prefix icon, divider beneathAssistant messageFilled gray/white bubbleNaked text on page, Miomi's voice IS the pageArtifactsMixed inline with messagesDistinct cards with colored left-bar codingProgressHidden/noneThin gold bar above threadVocabularyUntrackedUnderlined words = your knowledge graph visibleEcho correctionNo conceptHidden by default, opt-in reveal via heartRhythmSend → reply → send → replySay → response → (artifact?) → say → response → (artifact?)

1D. The input system (bottom zone)
Decision: the input bar is mode-aware and Miomi-aware.
Current: text input + EN voice toggle + mic + send. Functional but generic.
Base anatomy (Learn mode)
┌────────────────────────────────────────────────┐
│  ┌──────────────────────────────┐  EN  🎙  ●  │
│  │ พูดหรือพิมพ์กับมิโอมิ...        │           │
│  └──────────────────────────────┘             │
└────────────────────────────────────────────────┘

Container height: 72px (input area 48px + 12px padding top/bottom)
Input field: rounded-full pill, #FFFFFF background, 1.5px solid #E8E5DF, 48px tall, 20px horizontal padding
Placeholder: 14px Kanit 400 muted, copy varies by mode (table below)
Language indicator (EN/TH): small 32px pill to the right of input, white background, 1px border, tap to cycle EN→TH→AUTO
Mic button: 40px circle, soft white background with subtle shadow, Lucide Mic icon 18px, tap to enter LISTENING state
Send button: 40px circle, pink gradient when input has text, muted gray when empty, Lucide ArrowUp 18px white

Placeholder copy per mode
ModePlaceholderLearn"พูดหรือพิมพ์กับมิโอมิ..."Translate"พิมพ์ข้อความที่อยากแปล..."Create"อยากโพสต์เรื่องอะไร?"Roleplay"ตอบกลับลูกค้า..." (with scenario context)
Mode-specific additions
Translate mode — language direction toggle:
Replaces the EN/TH indicator. Instead, a two-button pill above the input:
┌────────────────────────────────────────────┐
│  [ TH ▼ ]  ↔  [ EN ▼ ]                     │  ← 32px tall, language toggle row
│  ┌──────────────────────────────┐         │
│  │ พิมพ์ข้อความที่อยากแปล...      │  🎙  ●   │
│  └──────────────────────────────┘         │
└────────────────────────────────────────────┘

Each language pill: tap → dropdown of supported languages (TH, EN, JP, KR, CN, VN initially)
Swap arrows in middle: tap to swap source/target
The language toggle ADDS 40px to input zone height (112px total in translate mode)
Dialogue mode toggle: small Users icon Lucide at far right of toggle row → opens dialogue mode

Translate dialogue mode:
When activated, the screen splits horizontally:

Top half: rotated 180° for the partner across the table
Bottom half: for the device holder
Each half has its own mic button (large, 64px) — tap to speak
Each half's text appears in its own zone in real-time
Miomi translates immediately on isFinal of each speaker's input
This mode persists until tapped off (Users icon shows active state)

Create mode — platform selector:
A row of platform pills appears above the input:
┌────────────────────────────────────────────┐
│ [ IG ] [ TT ] [ FB ] [ YT ] [ LINE ]       │  ← platform selector
│  ┌──────────────────────────────┐         │
│  │ อยากโพสต์เรื่องอะไร?            │  🎙  ●   │
│  └──────────────────────────────┘         │
└────────────────────────────────────────────┘

Platforms: Instagram, TikTok, Facebook, YouTube, LINE OA
Each platform pill: 32px tall, small platform icon (Lucide approximation — Instagram, Music2 for TikTok, Facebook, Youtube, MessageSquare for LINE), tap to select
Selected pill: pink gradient fill, white icon
Platform selection injects context to AI prompt (caption length, hashtag style, hook style per platform)

Roleplay mode — scenario context:
A persistent scenario bar appears above input showing current role-play:
┌────────────────────────────────────────────┐
│  🎭 Hotel front desk — angry guest    [×]  │  ← scenario header
│  ┌──────────────────────────────┐         │
│  │ ตอบกลับลูกค้า...              │  🎙  ●   │
│  └──────────────────────────────┘         │
└────────────────────────────────────────────┘

Scenario bar: 32px tall, muted lavender background #F4F1FA, lavender left-bar 3px, 11px Kanit text
"×" closes scenario, returns to scenario picker
Mic active in this mode auto-shifts to listening mode persistently — you're practicing

Voice input — feels like talking TO Miomi, not recording audio
Decision: tap-and-hold mic for push-to-talk (default), with toggle option in settings for tap-to-start/stop.
When mic is active:

Miomi enters LISTENING state immediately (ears perk, head slight tilt toward viewer)
Mic button transforms: circle expands to oval, fills pink gradient, white waveform animation inside (3 vertical bars pulsing with detected audio level)
Input field shows live transcription as you speak (greyed text showing what Miomi is hearing — calibration trust)
Audio level around the mic button: a soft pink glow ring expands/contracts with input amplitude
Release (push-to-talk) or tap-off (toggle) → 200ms morph back to standard mic, isFinal result processes
If isFinal returns gibberish: Miomi says "อ๊ะ~ ไม่ทันได้ยินค่า ลองใหม่นะคะ?" — never "Sorry I didn't understand" cold-machine voice

The push-to-talk pattern teaches "this is a conversation, not a recording session." LINE voice messages in Thailand use this pattern.
Quick actions — reduce friction
Decision: a horizontal scrollable strip of "suggestion chips" appears ABOVE the input, contextual to current Miomi message.
┌────────────────────────────────────────────┐
│ [ ใช่ค่า ] [ ไม่ค่ะ ] [ บอกอีกที ] [ ขอตัวอย่าง ]│  ← suggestion chips
│  ┌──────────────────────────────┐         │
│  │ พูดหรือพิมพ์กับมิโอมิ...        │  🎙  ●   │
│  └──────────────────────────────┘         │
└────────────────────────────────────────────┘

3-4 chips per Miomi response, generated by AI as part of the response payload
Each chip: 32px tall, white background, 1px #E8E5DF border, 11px Kanit text, 12px horizontal padding
Tap chip → text fills the input, user can tap send or edit first
Chips disappear when user starts typing manually
Specific intents per chip: agreement ("ใช่ค่า"), disagreement ("ไม่ค่ะ"), clarification ("บอกอีกที"), expansion ("ขอตัวอย่าง"), topic change ("เปลี่ยนเรื่อง")

This is the Three-Door Exit made visible. The user always sees they can: continue ("ใช่ค่า"), ask for help ("บอกอีกที"), or change topic ("เปลี่ยนเรื่อง"). One of the three is always one tap away.
Input bar signals Miomi's state
The input bar visually reflects Miomi's state via the small status dot to the right of the input:
Miomi stateDot colorDot animationIDLEnonehiddenLISTENING#7DD3C0 tealgentle pulse 1.2sTHINKING#C9A96E goldthree-dot rotationSPEAKING#F9A8D4 pinkbreathing 1.6s
The dot lives where the send button is when input is empty, and slides left of send when input has text. Small, subtle, present.

1E. The session summary
Decision: appears when user taps the gold progress bar at top of thread, OR auto-appears after 8+ exchanges with a soft pull-up sheet.
This is the emotional payoff of a session. It must feel like Miomi looking at you and saying "look what we did together."
Auto-trigger rules

After 8+ exchanges, when there's a 30+ second pause in user activity
A soft pull-up handle appears at the bottom edge of the thread (above input)
Handle text: "ดูสรุปวันนี้กับมิโอมิ~" — gold pill, 36px tall, gentle bounce animation
Tap → 320ms slide-up sheet, takes 80% of viewport height

Summary sheet layout
┌────────────────────────────────────────────┐
│  ╲╱   ← drag handle                        │
│                                            │
│  [Miomi happy.png 140px, centered]         │
│                                            │
│  วันนี้คุณเก่งมากเลยนะคะ~                  │
│  You did so well today~                    │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                            │
│  ✦ เรียนรู้ใหม่ · 4 คำ                      │
│  enjoy · ชื่นชอบ                            │
│  practice · ฝึกฝน                           │
│  weekend · สุดสัปดาห์                       │
│  routine · กิจวัตร                          │
│                                            │
│  ✓ ใช้ถูกแล้ว · 2 คำ                        │
│  many · enjoy                              │
│                                            │
│  ⏱  12 นาที                                  │
│  💬 14 แลกเปลี่ยน                            │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                            │
│  [ Lv.3 ▓▓▓▓▓▓▓░░ 78% to Lv.4 ]           │
│  +45 XP วันนี้                              │
│                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│                                            │
│  [ บันทึก & แชร์ ↗ ]   ← share certificate  │
│  [ คุยต่อกับมิโอมิ ]    ← continue           │
│                                            │
└────────────────────────────────────────────┘

Miomi at top in happy.png pose, 140px
One sentence specific praise (AI-generated per session: "วันนี้พูดเก่งเรื่องคาเฟ่มากเลยค่า~" — names a specific thing)
New words taught: bullet list, Thai-English pairs
Words mastered (newly): bullet list
Quick stats row: duration + exchange count
Level + XP visualization
Two CTAs: share certificate (pink gradient primary) and continue (text link secondary)

Shareable certificate
Tap "บันทึก & แชร์" → generates a 1080×1920 (IG story dimensions) shareable image:

Top: Miomi happy.png 380px centered
Middle: "วันนี้ฉันเรียนกับมิโอมิ" / "Today I studied with Miomi"
Big metric: "4 คำใหม่ · 12 นาที"
New words list
Bottom: miomika.com handle + small QR
Background: warm gradient with subtle blob shapes

User can save image, share to IG/LINE/Facebook directly. This is the viral mechanic.

SECTION 2 — VISUAL DESIGN LANGUAGE
2A. Color and surface decisions
Decision: same base background #FAFAF6 but with mode-keyed accent atmospheres.
The base substrate must feel continuous with the rest of the app (home, dashboard). What changes per mode is the ambient blob palette and the artifact color (the left-bar color on each card type).
Per-mode color signatures
ModeBlob paletteArtifact left-barStatus dotLearnWarm: #F9A8D4 pink, #FFE5B4 peach, #FFF4E0 cream, #C9A96E goldGold #C9A96E (3px)Pink #F9A8D4TranslateCool: #7DD3C0 teal, #C5C8E0 lavender, #B8D8E8 soft blueTeal #7DD3C0 (3px)Teal #7DD3C0CreateEnergetic: #C9A96E gold, #FF8A80 coral, #FF6BB8 hot pinkCoral #FF8A80 (3px)Coral #FF8A80RoleplayTheatrical: #C5C8E0 lavender, #B5E5C8 mint, #E8C77F muted goldLavender #C5C8E0 (3px)Lavender #C5C8E0
This is subliminal color — users won't consciously notice it shifts. They'll just feel "translation feels different from learning." That's the goal.
Surfaces

Page background: #FAFAF6 (universal)
Cards (word, translation, create, scenario): #FFFFFF with 1px solid #E8E5DF, 12px radius
Subtle backgrounds (source row in translation card, etc): #FAFAF6
Celebration backgrounds (mastered word): #FFFBF0 gold tint
Chips: per chip type (see 1C)


2B. Typography in context
Decision: a single hierarchy table governs everything on this screen.
ElementThaiEnglishColorWeightNotesMiomi subtitle (under stage)15px Kanit12px Quicksand#1A1A18 Thai / #9A8B73 EN500 / 500Two lines max Thai, one line ENMiomi response (thread)15px Kanit12px Quicksand#1A1A18 Thai / #9A8B73 EN500 / 500line-height 1.6User input line (thread)14px Kanit14px Quicksand#1A1A18500Single line, ellipsis truncateWord card — word (English)n/a22px Quicksand#1A1A18600The biggest text in any cardWord card — Thai meaning14px Kanitn/a#1A1A18500Below wordWord card — pronunciation hint12px Kanitn/a#9A8B73400ItalicWord card — example sentence13px Kanit13px Quicksand#9A8B73400 italicWord card — CEFR badge10px Quicksandn/a#C9A96E600UPPERCASETranslation source14px Kanit14px Quicksand#9A8B73400Muted, the inputTranslation target16px Kanit16px Quicksand#1A1A18600Primary, the outputCultural note12px Kanit12px Quicksand#9A8B73500 italicSystem chip (XP, mastery)11px Kanit11px Quicksandper chip variant500Mode pill (active)13px Kanit10px Quicksandwhite500 / 500Two linesMode pill (inactive)13px Kanit10px Quicksand#1A1A18 Thai / #9A8B73 EN500 / 500Section header (summary sheet)14px Kanitn/a#9A8B73600UPPERCASE ThaiInput placeholder14px Kanitn/a#9A8B73400
Mixed-language tolerance: Thai users mix English words constantly (เด้ง, ปัง, 555, idk, omg, lol, Midnight Club). The user input row must render mixed scripts without awkward kerning. Use font-feature-settings: "kern" 1; and rely on font-stack fallback: font-family: 'Kanit', 'Quicksand', sans-serif; — Kanit handles Thai glyphs, Quicksand handles Latin glyphs in a Kanit-flavored shape.

2C. The word card — final design decision
The word card design above (1C) is the final design. To make the screenshots-vs-this-spec comparison explicit:

Currently in screenshots: no word cards visible (the system is built but not wired — per the handoff doc)
This spec: word cards appear inline after Miomi's teaching messages, with the gold left-bar, CEFR badge top-left, register tag, listen icon top-right, English word large, Thai below, example italic muted, expand for more

Mobile rendering at 320px
At minimum viewport (320px), the card is 288px wide (16px gutter each side). The English word at 22px takes ~120px for a single average word — fits comfortably. For long words ("conversation", "international"), text auto-shrinks one step to 18px at 11+ characters via a CSS clamp.
css.word-card-word {
  font-size: clamp(18px, 5vw, 22px);
  line-height: 1.2;
  font-family: 'Quicksand', sans-serif;
  font-weight: 600;
  color: #1A1A18;
}
Celebration variant — magic moment integration
When a word becomes mastered, the regular word card in the thread (already there from initial teaching) does NOT mutate. Instead, a NEW celebration card appears in the thread at the moment of mastery. The original word card remains historical record. The new card is the celebration moment.
The celebration card triggers a magic burst (small variant from previous brief, Section 2 of original document):

18 particles, size 3-6px, colors [#7DD3C0, #C9A96E], 360° spread from card center, lifetime 1000-1400ms
Card itself has entry animation: scale 0.92→1.04→1.0 spring (stiffness 280, damping 13), 400ms
Miomi enters WORD_MASTERED state simultaneously
Soft "ting" sound 300ms F5


2D. Animation language for this screen
Word introduction animation
When a word card appears inline:

Card height collapses from 0 to natural over 320ms cubic-bezier(0.4, 0, 0.2, 1)
Card content fades in 0→1 opacity over 280ms with 80ms delay
Gold left-bar slides in from 0 width to 3px over 240ms with 200ms delay (this is the last thing to settle — it's the "stamp" moment)
Subtle scale on the English word: 0.96→1.0 over 180ms with 240ms delay

Total animation: 520ms from trigger to settled state.
Echo correction reveal animation
When user taps the heart icon to see correction:

Small popup card scales in 0.8→1.0 spring (stiffness 320, damping 14) at the heart position
Inside: original (struck-through 1px gray) above correct (pink 1px underline) below
Animated via Framer Motion AnimatePresence, dismiss on tap-outside or after 6s

Level detection feedback
Silent CEFR level estimation runs in the background after each exchange. When the system detects a level shift (e.g., A1→A2 confidence crossed threshold):

The gold progress bar at top of thread pulses ONCE — width animates +4% over 200ms then settles back
NO text. NO modal. NO interruption.
The user simply sees the bar grow slightly. They feel progress without being told.

This is silent assessment made visible without violating it.
Mode transition animation
Tapping a mode pill:

Active pill background fades from current mode color to new mode color over 200ms
Simultaneously, thread content fades out (200ms) with translateY -8px
New thread content fades in (200ms, 40ms after old begins fading) with translateY 8px → 0
Miomi expression crossfades (200ms) to new mode's bias expression
Ambient blob palette interpolates colors over 800ms — slower than UI for atmospheric feel
Breadcrumb chip "เปลี่ยนเป็นโหมด X แล้วค่า~" slides down from top-right, dwells 1.6s, slides up

Session end animation
When session summary sheet opens:

Pull-up handle animates to fully extended (480ms spring, stiffness 240 damping 28)
Sheet slides up from bottom (translateY 100% → 0) over 380ms cubic-bezier(0.4, 0, 0.2, 1)
Backdrop behind fades to rgba(26,26,24,0.3) over 320ms
Inside the sheet: Miomi at top scales in 0.85→1.0 (320ms spring), with 200ms delay
Then content cascades: praise line (380ms delay, 240ms fade), word list (520ms delay), stats row (700ms delay), level bar (880ms with 600ms fill animation), CTAs (1100ms delay)
Total reveal: ~1.4s — paced like a slow exhale

If level-up occurred during session: a single gold star bursts from the level bar at 1100ms, magic burst with 40 gold particles, 1.6s.

SECTION 3 — DASHBOARD CONNECTION
3A. What gets tracked per session
Decision: every exchange writes to sessions and session_events tables.
sql-- sessions table (one row per session start)
sessions (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  mode text,  -- 'learn' | 'translate' | 'create' | 'roleplay'
  exchange_count int,
  words_introduced int,
  words_mastered int,
  corrections_count int,
  xp_earned int,
  cefr_level_estimate text,  -- 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  topics text[],  -- ['food', 'work', 'travel']
  created_at timestamptz DEFAULT now()
)

-- session_events table (one row per significant event)
session_events (
  id uuid PRIMARY KEY,
  session_id uuid REFERENCES sessions(id),
  user_id uuid REFERENCES users(id),
  event_type text,  -- 'word_introduced' | 'word_used' | 'word_mastered' | 'correction' | 'mode_switch'
  payload jsonb,
  created_at timestamptz DEFAULT now()
)

-- vocabulary_bank already exists per handoff doc — extends with:
vocabulary_user_state (
  user_id uuid,
  word_id uuid REFERENCES vocabulary_bank(id),
  stage text,  -- 'heard' | 'used' | 'mastered'
  times_introduced int,
  times_used_correctly int,
  last_seen_at timestamptz,
  mastered_at timestamptz,
  PRIMARY KEY (user_id, word_id)
)
Each session emits events as they happen. The cron job or post-session handler aggregates into sessions summary.
Face-saving: corrections store COUNT only, never content. The user never sees a "you got these wrong" list. The system knows the count for adaptive difficulty.

3B. Dashboard data visualization
The dashboard already exists per handoff. Here is the architecture for connecting this create-screen data to it:
Vocabulary bank widget (dashboard)
Three-stage funnel visualization:
[ Heard 42 ]  →  [ Used 18 ]  →  [ Mastered 7 ]
Each stage shows count + small underline progress bar. Tap any stage → expanded list with words and last-seen dates. Mastered words have gold checkmark.
CEFR trajectory (visual, not numeric)
A horizontal ladder visualization:
A1 ─── A2 ─── B1 ─── B2 ─── C1 ─── C2
       ●═══════                       ← user is between A2 and B1, slightly closer to B1

Each segment between two CEFR letters is a 60px wide rail
A pink Miomi-marker icon (small head, 24px) sits on the rail at the user's interpolated position
The marker animates subtly when new data comes in (slides 2-4px right when level edges up)
Below the rail: small caption "ระดับปัจจุบันของคุณ A2.6 → B1" — readable but not the focus

This avoids the gamification trap of "you are level 3" while showing real progress.
Topic map
A pill-cloud visualization — pills sized by topic frequency:
[ FOOD ]  [ work ]  [ Travel ]  [ family ]  [ tech ]  [ feelings ]
Each topic pill is sized 0.8x-1.4x based on count(sessions where topic in topics). Tap → see all sessions that touched that topic. Tap+hold → "ให้มิโอมิเริ่มจากหัวข้อนี้" (let Miomi start from this topic) → opens Create with topic primed.
Streak + consistency

Streak: large number with flame icon (the standard pattern)
Below it: 7-day calendar dot strip — each day either gold filled (session that day), gold ring (partial: opened app but no session), or gray (nothing)
Tap any day → mini stats for that day

Shareable certificate trigger points
Auto-generated certificates at:

Lv.5 — "First Milestone"
Lv.10 — "Conversation Ready"
Lv.15 — "Confident Speaker"
Lv.20 — "Fluent Friend"
Every 30-day streak
100 words mastered
500 words mastered
1000 words mastered

Each certificate is generated server-side (Node + canvas or Vercel OG image) at the triggering moment, stored in certificates table, and pushed to user via in-app celebration + notification.

3C. Dashboard → Create connection
Decision: when user opens Create, the system pre-loads three primers.

Spaced repetition word queue — vocabulary_user_state query: words where stage = 'heard' OR stage = 'used' AND last_seen_at < now() - interval matching stage. These words are flagged for re-introduction in this session. The session engine knows to weave them in naturally.
Intervals:

Heard, not seen for 24h → eligible for spiral
Used, not seen for 72h → eligible
Used 2x correctly, not seen for 7d → eligible


Level calibration — current CEFR estimate determines the difficulty band Miomi opens at. If user is A2.6, Miomi opens with A2-level vocabulary and probes B1 at exchange 3-4.
Topic suggestion — pull recent topics, exclude any from last 24h (no repetition fatigue). If user has unfinished session topics (e.g., they stopped mid-conversation about cafés yesterday), Miomi may open with "เมื่อวานคุยเรื่องคาเฟ่ค้างนะคะ~ อยากคุยต่อไหม?" — continuity feels like memory.

This loop is the heart of the product. The session is not a fresh chat each time. It is a continuing relationship.

SECTION 4 — ENTERPRISE CONSIDERATIONS
4A. School package
Decision: enterprise contexts inject via user_context server-side. Same screen, different system prompt and UI affordances.
For students (school accounts):

A small purple-tinted strip appears above the mode strip: "📚 บทที่ 3: At the Market — สัปดาห์ที่ 2"
Strip is tappable — opens curriculum tree (lesson 3 of 20 visible)
Homework mode: when teacher assigns specific topic, that topic is locked at top of strip with "การบ้าน" tag
Certificate generation: triggers at curriculum milestones (lesson 5, 10, 15, 20 complete) — auto-emailed to teacher

Teacher portal (separate web view at /teacher, not part of this screen):

Student roster, weekly progress reports
Session transcripts (READ-ONLY, marked clearly "นักเรียนรู้ว่าคุณดูได้") — students see in their profile that their teacher has visibility
Anonymized class-wide vocab gaps and strengths

The student-facing UI never changes substantially from consumer — same Miomi, same warmth, same Mirror Teaching. The only addition is the curriculum strip + transparency that teacher can see transcripts.

4B. Cafe/hospitality package
Decision: a "scenario library" prepopulated for the industry, accessed via Roleplay mode.
For a hotel staff training account:

Default mode is set to Roleplay
Scenario picker shows hospitality-specific scenarios: check-in, check-out, complaint handling, room service, concierge requests, emergency
Each scenario has industry vocabulary pack pre-loaded
Sessions score on completion: politeness markers, key vocab used, response time
Manager portal: per-staff scores, aggregate trends, weakest scenarios for team training

The Roleplay mode in consumer-tier is a light version. Enterprise unlocks industry packs + scoring + manager portal.

4C. How these modes are accessed
Decision: enterprise features are injected by account type, never visible in consumer UI.

A consumer never sees "school mode" or "hospitality mode" in any selector
An enterprise account user sees their context naturally embedded — they don't think of it as a "mode" at all, it's just how the app works for them
This is critical: enterprise should not pollute consumer experience visually, AND should not feel "bolted on" to enterprise users

Implementation:
ts// On session create, server reads user.account_type
const accountContext = {
  type: user.account_type,  // 'consumer' | 'school_student' | 'enterprise_staff'
  organization_id: user.organization_id,
  curriculum_id: user.curriculum_id,
  scenario_pack: user.organization.scenario_pack,
}
// Inject into system prompt + UI context
UI conditional rendering based on accountContext.type. No feature flags exposed to user.

SECTION 5 — IMPLEMENTATION PRIORITY
Scoring matrix
ElementUser impactEng complexityRevenue impactRemove user-message bubbles, restyle thread926Fix Supabase multiple-client error (blocking vocab)1027Wire vocabulary_bank to matcher1047Word card inline rendering947Miomi stage resize (140→96px) + subtitle system725Mode strip (Learn/Translate stub)838Echo correction visual (hearts)635Vocabulary highlighting in thread856Suggestion chips above input745Mode-keyed ambient blob palette423Session progress bar (top of thread)534Session summary sheet959Shareable certificate generation769Voice input push-to-talk + state746Translate mode full867Create mode full668Roleplay mode (consumer light)465Dashboard CEFR ladder655Dashboard topic map544Spaced repetition queue867Enterprise curriculum strip368Enterprise scenario packs378
Phased plan
Phase 1 — Ship this week (launch foundation)
Goal: kill the ChatGPT-with-cat feeling. Make learning visible. Fix broken plumbing.

Fix Supabase multiple-client error (immediate blocker)
Wire vocabulary_bank to matcher properly
Restyle thread: remove user-message pink bubbles, kill Miomi white cards, naked text on page
Resize Miomi stage to 96px head + persistent subtitle below
Add mode strip (Learn active, Translate, Create-Pro, Roleplay-Pro as inactive pills)
Word card inline rendering (real, connected to vocabulary_bank)
Vocabulary underline highlighting in Miomi responses
Session progress bar (silent)

Phase 2 — First revenue (Month 1)
Goal: emotional payoff loops. Make sessions feel like accomplishments.

Session summary sheet (auto-trigger after 8 exchanges)
Shareable certificate generation at Lv.5 milestone
Echo correction visual (hearts opt-in)
Suggestion chips above input
Mode-keyed ambient palette shifts
Voice input push-to-talk with LISTENING state animation
Mastery celebration variant of word card with magic burst
Spaced repetition: words from previous sessions resurface naturally

Phase 3 — 50+ Pro users (Month 2)
Goal: monetizable modes live. Translation is the second hook.

Translate mode complete (monologue + dialogue)
Create mode complete (platform selector, content cards)
Translation language picker (TH, EN, JP, KR, CN, VN)
Voice output via ElevenLabs (Pro)
Dashboard CEFR ladder visualization
Dashboard topic map
Certificate generation at Lv.10, 15, 20 + streak milestones

Phase 4 — Enterprise (Month 3+)
Goal: B2B revenue. Same screen, deeper context.

Roleplay mode complete (consumer light)
School curriculum strip + lesson tree
Hospitality scenario packs
Teacher portal (separate route)
Manager portal (separate route)
Account type system in Supabase + server-side context injection
Enterprise certificate variants (with school/cafe branding)


CURSOR IMPLEMENTATION PROMPTS
These prompts are ready to paste. Each is self-contained and safe to run. Run them in order.
Prompt 1 — Fix Supabase multiple client + connect vocabulary_bank
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md before touching code.
BUILD MODE — direct, no speeches.

GOAL: Fix two blockers in /app/(app)/create/page.tsx and lib/supabase.

ISSUES TO FIX:
1. Console error: "Multiple GoTrueClient instances detected in the same browser context" — caused by creating new Supabase clients on each render. There must be exactly ONE client per browser context.
2. Console error: "[vocabulary] getWordForSession query failed: undefined" — the matcher is calling vocabulary_bank with a malformed query.

ACTIONS:
- In lib/supabase.ts (or wherever Supabase client is created): convert to singleton pattern. Export a single `getSupabaseBrowserClient()` function that creates the client once via createBrowserClient and reuses it. Remove any other client creation.
- Audit every file that imports Supabase. Replace direct createClient/createBrowserClient calls with the singleton.
- In lib/ai/matcher.ts (or wherever getWordForSession lives): fix the query to vocabulary_bank. The query should fetch one row matching the current user's CEFR level and that has not appeared in this session yet. Use proper .eq() chain and .limit(1).single(). Log the actual SQL error if it fails.
- Verify by opening /create in browser — console should be clean of GoTrueClient warnings and vocabulary errors.

DO NOT:
- Touch UI yet
- Add new dependencies
- Change schema
Prompt 2 — Restyle thread (kill bubbles, naked Miomi voice)
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1C and Section 2B before coding.
BUILD MODE — direct, no speeches.

GOAL: Restyle the conversation thread in /app/(app)/create/page.tsx.

REMOVE:
- The pink filled bubble around user messages (the right-aligned pink rounded rectangle).
- The white card background around Miomi messages (the left-aligned white card with border).

REPLACE WITH:
USER MESSAGES:
- Right-aligned, single line, max-width 88% of thread width.
- Prefix: Lucide ArrowUpRight icon, 12px, color #C9A96E, 8px right margin.
- Text: 14px Quicksand 500 (English) or Kanit 500 (Thai), color #1A1A18.
- No background, no border, no padding except a 24px wide 1px horizontal divider in color #E8E5DF directly below, left-indented 16px.

MIOMI RESPONSES:
- Left-aligned, content max-width 88%, no background, no border.
- Thai: 15px Kanit 500, color #1A1A18, line-height 1.6.
- English (always below Thai): 12px Quicksand 500, color #9A8B73, line-height 1.5, margin-top 4px.
- 16px vertical gap between Miomi responses and the next user message.

THREAD CONTAINER:
- Background remains #FAFAF6 (page background).
- Vertical padding: 16px top, 16px bottom.
- Horizontal padding: 16px left, 16px right.
- Smooth scroll, scroll-behavior: smooth.

KEEP:
- Existing exchange counter at top.
- Existing data fetching and message rendering logic.

DO NOT:
- Add cards, borders, or backgrounds back.
- Change typography weights.
- Touch the input bar or Miomi stage yet.
Prompt 3 — Resize Miomi stage + persistent subtitle
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1B before coding.
BUILD MODE — direct, no speeches.

GOAL: Resize Miomi on the Create screen and add a persistent subtitle showing her latest message.

CHANGES TO /app/(app)/create/page.tsx:

1. Miomi head size: change from 140px to 96px diameter.
2. Stage container: total 144px height (44px top bar + 100px Miomi area). Miomi vertically centered in the 100px area.
3. Top bar: left = back chevron 24px (Lucide ArrowLeft) + tap to go back to /home. Right = exchange counter pill (existing) for guests, or "Lv.X · ✦ XP" for signed-in users.
4. Below Miomi (12px gap), add a persistent subtitle div:
   - State: holds Miomi's most recent assistant message text (Thai + English).
   - Thai: 15px Kanit 500, color #1A1A18, max 2 lines, ellipsis if longer.
   - English: 12px Quicksand 500, color #9A8B73, max 1 line, ellipsis. 4px margin-top.
   - Centered horizontally, max-width 320px, padded 16px horizontal.
5. When a new assistant message arrives: subtitle fades out (opacity 1→0 over 200ms), updates text, fades in (0→1 over 200ms with translateY 4px → 0).
6. When input is focused (user typing/speaking): subtitle fades to opacity 0.3 over 200ms. On blur: returns to opacity 1.
7. Tap subtitle: no-op for now (TTS hook is Phase 2).

KEEP:
- Existing Miomi image state machine (head-idle, head-happy, etc).
- Existing message flow.

DO NOT:
- Remove the speech display in the thread — subtitle is IN ADDITION to thread, not replacing.
- Animate the Miomi head itself in this prompt — that comes later.
Prompt 4 — Add mode strip with Learn/Translate/Create/Roleplay pills
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1A before coding.
BUILD MODE — direct, no speeches.

GOAL: Add the mode strip below the Miomi stage in /app/(app)/create/page.tsx.

CREATE COMPONENT: /components/create/ModeStrip.tsx

PROPS:
- activeMode: 'learn' | 'translate' | 'create' | 'roleplay'
- onModeChange: (mode) => void
- userTier: 'guest' | 'free' | 'pro' | 'max'

LAYOUT:
- Horizontal row, 4 pills, 44px container height including 4px vertical padding.
- Sits directly below the Miomi stage subtitle area, 8px gap above, 16px gap below the thread starts.
- Horizontal scroll if needed (overflow-x-auto with no scrollbar visible).

PILL DESIGN:
- 36px tall, auto width, 12px horizontal padding, 18px border-radius.
- Active pill: pink gradient background (linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)), white text, no border, box-shadow 0 4px 12px rgba(219,39,119,0.20).
- Inactive pill: white background, 1px solid #E8E5DF, no shadow.
- Pro-gated pill (Create, Roleplay for tier < 'pro'): inactive style + small gold "Pro" badge inside the pill (9px Quicksand 600, color #C9A96E, 4px left margin from label).

PILL CONTENT (per pill):
- Lucide icon left, 14px, strokeWidth 1.75. White for active, current text color for inactive.
- Thai label: 13px Kanit 500.
- English label: 10px Quicksand 500, color #9A8B73 (inactive) or rgba(255,255,255,0.85) (active). Sits BELOW Thai (two-line pill content).

PILLS:
1. Learn — เรียน / Learn — Lucide MessageCircle
2. Translate — แปลภาษา / Translate — Lucide Languages
3. Create — สร้างคอนเทนต์ / Create — Lucide Sparkles (Pro)
4. Roleplay — บทบาท / Roleplay — Lucide Drama (Pro)

INTERACTION:
- Tap active pill: no-op.
- Tap inactive non-gated pill: calls onModeChange(mode).
- Tap Pro-gated pill (when user is not Pro): for now, fire a console.log("Pro sheet — TBD") — full Pro sheet is later prompt.

INTEGRATION IN /app/(app)/create/page.tsx:
- Import ModeStrip.
- Add state: const [mode, setMode] = useState<'learn' | 'translate' | 'create' | 'roleplay'>('learn').
- Render ModeStrip between Miomi stage and thread.
- For this prompt, switching modes only changes state — no thread content change yet.

DO NOT:
- Implement actual translate/create/roleplay logic yet.
- Add ambient blob palette switching yet.
Prompt 5 — Wire vocabulary_bank to thread with word cards + underline highlighting
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1C (Word cards + Vocabulary highlighting) before coding.
BUILD MODE — direct, no speeches.

GOAL: Make learning visible. When Miomi teaches a word, a word card appears inline. When she uses words the user has previously been taught, those words are underlined.

PRE-REQS:
- Supabase singleton (Prompt 1 done).
- vocabulary_bank table populated and queryable.
- vocabulary_user_state table exists with columns: user_id, word_id, stage, times_introduced, times_used_correctly, last_seen_at, mastered_at.

CREATE COMPONENT: /components/create/WordCard.tsx

PROPS:
- word: { english: string, thai: string, pronunciation_hint: string, cefr_level: string, register: 'formal' | 'informal' | 'slang' | 'street', example_sentence_th: string, example_sentence_en: string, more_examples: string[] }
- variant: 'introducing' | 'mastered'  (default 'introducing')

DESIGN per spec in Section 1C:
- 100% width minus 32px gutter, white background, 1px solid #E8E5DF, 12px border-radius, box-shadow 0 1px 3px rgba(26,26,24,0.04).
- Gold left-bar 3px wide (6px when variant='mastered'), full card height, color #C9A96E (or #E8C77F for mastered).
- Inline padding 14px.
- Header row: CEFR badge (10px Quicksand 600 uppercase, color #C9A96E) + register tag (lowercase, color #9A8B73) + Lucide Volume2 16px at right (tap → console.log("TTS hook TBD")).
- English word: clamp(18px, 5vw, 22px), Quicksand 600, color #1A1A18.
- Thai meaning + pronunciation: 14px Kanit 500 #1A1A18 / · / 12px Kanit 400 italic #9A8B73 inline.
- Example sentence: 13px italic, Kanit + Quicksand fallback, color #9A8B73.
- "▶ ตัวอย่างเพิ่ม" expandable: tap to reveal more_examples list, 240ms height transition.

CREATE COMPONENT: /components/create/VocabularyText.tsx

PROPS:
- text: string  (Miomi's response text)
- userVocabulary: Array<{ word: string, stage: 'heard' | 'used' | 'mastered' }>

BEHAVIOR:
- Parse text. For each word in userVocabulary, wrap matching occurrences in a span:
  - stage = 'heard': style { borderBottom: '1px dotted #9A8B73' }
  - stage = 'used': style { borderBottom: '1px solid #C9A96E' }
  - stage = 'mastered': no styling (mastered words are invisible)
- Tap on a marked span: show small popup card 200ms fade-in with word + meaning + "หนูสอนเมื่อ X วันก่อนค่า~". Dismiss on tap outside.
- Match case-insensitively but preserve original casing in rendering.

UPDATE /app/(app)/create/page.tsx:
- After receiving an assistant message, check if AI response payload includes a `teaching_word` field (from the matcher/router output). If present, render <WordCard word={teaching_word} /> immediately AFTER the Miomi text in the thread.
- Wrap all Miomi text rendering in <VocabularyText text={message.content} userVocabulary={userVocab} /> where userVocab is fetched once on session start from vocabulary_user_state.
- Cache userVocab in component state, refresh after each exchange if a word was introduced/mastered.

DO NOT:
- Build the mastered celebration variant in this prompt — that comes with the magic burst prompt.
- Touch CEFR level adjustments.
Prompt 6 — Suggestion chips above input
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1D (Quick actions) before coding.
BUILD MODE — direct, no speeches.

GOAL: After each Miomi response, show 3-4 suggestion chips above the input bar. Tapping a chip fills the input.

UPDATE AI ROUTER (lib/ai/router.ts or similar):
- Extend the response payload to include `suggestions: string[]` (max 4 short Thai phrases).
- Update the system prompt to instruct the AI: at the end of every response, generate 3-4 short reply suggestions the user might say, ranging across: agreement, disagreement, ask for clarification, ask for example, change topic. Format as JSON in a specific field of the response.

CREATE COMPONENT: /components/create/SuggestionChips.tsx

PROPS:
- suggestions: string[]
- onSelect: (text: string) => void
- visible: boolean

DESIGN:
- Horizontal row of chips, scroll if overflow, no scrollbar.
- Each chip: 32px tall, white background, 1px solid #E8E5DF, 16px border-radius, 12px horizontal padding, 11px Kanit 500 text, color #1A1A18.
- Tap: calls onSelect(text).
- Container sits directly above the input bar, 8px gap below to input.
- Entry animation: each chip fades in with translateY 4px → 0, staggered 60ms per chip, 240ms duration.

INTEGRATION /app/(app)/create/page.tsx:
- Store latest assistant message's suggestions in state.
- Render <SuggestionChips suggestions={latest.suggestions} onSelect={(text) => setInputValue(text)} visible={!inputFocused && hasLatestAssistantMessage} />.
- When user starts typing manually: chips fade out (200ms opacity transition).
- When user sends a message: chips clear immediately.

DO NOT:
- Auto-send the suggestion — only fill the input. User confirms by tapping send.
- Generate suggestions client-side — they must come from AI for context relevance.
Prompt 7 — Session progress bar + session summary sheet
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1C (Session progress) and 1E (Session summary) before coding.
BUILD MODE — direct, no speeches.

GOAL: Add the silent gold progress bar at top of thread, and the pull-up session summary sheet.

PART A — Progress bar:

UPDATE /app/(app)/create/page.tsx:
- Compute session completeness:
  completeness = clamp((exchangeCount / 8) + (wordsTaught * 0.15) + (correctionsMade * 0.10), 0, 1)
- Add a 2px tall bar at the very top of the thread area (below mode strip).
- Background of bar: rgba(201,169,110,0.12).
- Fill: linear-gradient(90deg, #C9A96E 0%, #E8C77F 100%), width = completeness * 100%, transition width 400ms ease-out.
- Opacity 0.4 by default.
- When completeness = 1.0: opacity 1.0 + gentle pulse (opacity 1.0 ↔ 0.7 over 1.6s loop).

PART B — Session summary sheet:

CREATE COMPONENT: /components/create/SessionSummarySheet.tsx

PROPS:
- isOpen: boolean
- onClose: () => void
- sessionData: { wordsLearned: WordEntry[], wordsMastered: WordEntry[], durationMin: number, exchangeCount: number, xpEarned: number, level: number, xpToNext: number, praise: string }

DESIGN per Section 1E spec:
- Slides up from bottom, full-width, 80% viewport height max.
- Background: white, top corners 24px radius, shadow 0 -8px 32px rgba(26,26,24,0.12).
- Backdrop: rgba(26,26,24,0.3), tap to close.
- Drag handle at top (40px wide, 4px tall, color #E8E5DF, centered, 12px from top edge).
- Miomi happy.png 140px centered.
- Praise line (Thai 16px Kanit 500 #1A1A18, EN 13px Quicksand 500 #9A8B73 below).
- Horizontal divider 1px #E8E5DF.
- "✦ เรียนรู้ใหม่ · X คำ" header (11px Kanit 600 #9A8B73 uppercase), word list below (each: english · thai, 14px).
- "✓ ใช้ถูกแล้ว · X คำ" header + word list (same style).
- Stats row: ⏱ X นาที · 💬 X แลกเปลี่ยน (replace ⏱ and 💬 with Lucide Clock and MessageCircle icons, 14px).
- Level bar: "Lv.X" + progress bar (8px tall, gold fill) + "+X XP วันนี้".
- Two CTAs at bottom:
  - Primary: "บันทึก & แชร์" (pink gradient, white text, 48px tall, Lucide Share2 14px icon left, 12px gap from text).
  - Secondary: "คุยต่อกับมิโอมิ" (text link, color #9A8B73, 14px Kanit 500, 16px above primary).

ENTRY ANIMATION per spec Section 2D:
- Sheet slides up 380ms cubic-bezier(0.4, 0, 0.2, 1).
- Backdrop fades 320ms.
- Miomi scales in 0.85→1.0 320ms spring at 200ms delay.
- Content cascades: praise 380ms, words 520ms, stats 700ms, level 880ms, CTAs 1100ms.

AUTO-TRIGGER:
- In create/page.tsx: track lastUserActivity timestamp.
- If exchangeCount >= 8 AND now - lastUserActivity > 30000 (30s): show a "pull-up handle" at bottom edge of thread.
- Pull-up handle: small gold pill 36px tall, "ดูสรุปวันนี้กับมิโอมิ~" text, gentle bounce (translateY 0 ↔ -2px over 1.2s loop).
- Tap pull-up handle: opens SessionSummarySheet with current sessionData.
- Tap progress bar (when completeness = 1.0): also opens sheet.

INTEGRATION:
- For now, primary CTA "บันทึก & แชร์" → console.log("certificate gen TBD").
- Secondary CTA → close sheet.

DO NOT:
- Implement certificate generation in this prompt.
- Track to backend yet — sessionData is from local in-memory state.
Prompt 8 — Mode-keyed ambient palette + Miomi expression bias
You are technical co-founder of Miomika.
Read MIOMIKA_CREATE_SCREEN_OPUS.md Section 1B (Ambient + Expression) and Section 2A before coding.
BUILD MODE — direct, no speeches.

GOAL: When mode changes, the ambient blob palette behind Miomi shifts, and her default expression updates.

PRE-REQS:
- Ambient blob system is live and accepts a palette prop (per handoff doc).
- ModeStrip is wired (Prompt 4 done).

UPDATE AMBIENT SYSTEM USAGE in /app/(app)/create/page.tsx:

1. Constrain ambient blobs to ONLY the Miomi stage area (top 144px). The thread sits on flat #FAFAF6 with no blobs.
   - Wrap the existing ambient component in a div with position: absolute, top: 0, left: 0, right: 0, height: 144px, overflow: hidden, z-index: 0.
   - Ensure Miomi head sits above with z-index: 1.

2. Define palette per mode:
```js
const MODE_PALETTES = {
  learn:    ['#F9A8D4', '#FFE5B4', '#FFF4E0', '#C9A96E'],
  translate:['#7DD3C0', '#C5C8E0', '#B8D8E8', '#E0F2F0'],
  create:   ['#C9A96E', '#FF8A80', '#FF6BB8', '#FFE5B4'],
  roleplay: ['#C5C8E0', '#B5E5C8', '#E8C77F', '#F4F1FA'],
};
```

3. Pass palette={MODE_PALETTES[mode]} to the ambient component.

4. When mode changes, the ambient should interpolate palette colors over 800ms (slower than UI 240ms — atmospheric pacing). If the ambient system doesn't support interpolation natively, wrap the palette change in a setTimeout chain that updates the palette in 8 steps over 800ms.

5. Ambient velocity multiplier on this screen: 0.6 (slower than home). Pass velocityMultiplier={0.6} if supported.

UPDATE MIOMI EXPRESSION BIAS:

In the Miomi head image rendering, the default expression when in IDLE state should be biased by mode:
```js
const MODE_EXPRESSION_BIAS = {
  learn: 'head-happy',
  translate: 'head-thinking',
  create: 'head-speaking',
  roleplay: 'head-idle',
};
```

When the state machine is in IDLE within a mode, use the bias expression instead of generic 'head-idle'. State machine takes priority — when state changes to HAPPY, THINKING, SPEAKING etc, those override the bias.

ANIMATION:
- When mode changes: crossfade Miomi expression image from old bias to new bias over 200ms.
- When state machine triggers (overrides bias): use existing 200ms crossfade.

DO NOT:
- Add blob shapes behind the thread area.
- Change ambient behavior on home screen — only create screen.

End of MIOMIKA_CREATE_SCREEN_OPUS.md.
This is the document. Save it to project root, hand prompts to Cursor in order. The first three prompts (Supabase fix, thread restyle, Miomi resize) ship within one day and transform the screen from 3/10 to roughly 6/10. The next four (mode strip, word cards, suggestions, summary) push it to 8/10 over a week. The eighth (ambient palette + expression bias) brings it to 9/10 with atmospheric depth.
Build the prompts in order. Do not skip ahead — each builds on the last.