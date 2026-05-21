MIOMIKA — UX & CONVERSION ARCHITECTURE

Document version: OPUS v2.0 — May 21, 2026
Save as: /MIOMIKA_UX_CONVERSION_OPUS.md
Audience: Engineering (Cursor + Claude Sonnet)
Predecessor: MIOMIKA_CREATE_SCREEN_OPUS.md (May 20)


0. NORTH STAR (UNCHANGED)

"I am talking to an intelligent cat who knows what I need, guides me warmly, and I never feel sold to."

Every decision below is tested against that sentence. If a feature could make a user think "I just hit a paywall" or "I got marketed to," it is wrong, no matter how clever it is.

DECISION 1 — CREATE SCREEN FINAL UX
Kill the mode strip. Replace with nothing.
The mode strip was a workaround for an engine that didn't exist yet. The engine now exists. The UI must reflect that the engine is the brain — Miomi knows what the user is doing without being told.
A mode strip says: "Tell me what you want to do, then I'll respond."
The new screen says: "Just talk. I already know."
The difference is the difference between Tamagotchi and a relationship.

1A. What replaces the mode strip
Decision: nothing replaces it spatially. Instead, a single-line "Miomi capability whisper" lives in the input bar's placeholder, rotating contextually.
The user does not see a tab/strip/button telling them what Miomi can do. Instead, the input placeholder itself rotates through hints based on user history and time-of-day. This serves orientation without forcing a choice.
Placeholder rotation logic (per user, per visit):

If user has never sent a message in any session:
  "พิมพ์อะไรก็ได้ค่า~ ฝึก English, แปลภาษา, เขียนแคปชั่น..."
  "Type anything~ practice English, translate, write captions..."

If user has only learned (no creator/translate history):
  "วันนี้อยากคุยเรื่องอะไรคะ~?"
  "What shall we talk about today~?"

If user has used creator before (has saved assets):
  "อยากคุยภาษา หรือเขียนคอนเทนต์ดีคะ~?"
  "Want to chat, or write something~?"

If user opened mid-creator-session yesterday:
  "เมื่อวานเขียนแคปชั่นค้างไว้นะคะ~ ทำต่อไหม?"
  "We left a caption unfinished yesterday~ keep going?"

If guest (any state):
  "ลองพิมพ์อะไรก็ได้ค่า~ หนูจะช่วยเองค่า"
  "Type anything~ I'll figure it out"
The placeholder is silent orientation. It tells the user what's possible without demanding they commit to a mode. Engine then routes whatever they type.
Why not a hint line below the subtitle?
Considered and rejected. Two reasons:

Vertical space is precious on mobile — every pixel below Miomi's subtitle competes with thread reading area.
A separate hint line creates a UI element the user has to learn to ignore once they're oriented. The placeholder is naturally ignored after one read because it disappears the moment they start typing — the perfect lifecycle for an orientation message.

Why not just let Miomi's opening question carry it?
Considered and partially adopted — Miomi's opening DOES adapt per user history (see "engine-driven opener" below). But the opening question only fires once per session. The placeholder is the ambient orientation — visible every time the user looks at the input, persistent across the whole session.
Engine-driven opener (already supported by engine, formalize here):
Miomi's first message in a session is generated server-side based on user history. The session-init endpoint reads:

Last session topic + completion state
Time of day in user's timezone
Days since last session
User archetype
Most recently-introduced vocabulary words

Then constructs the opener accordingly. Examples:
ContextOpenerReturning < 24h, last topic = food"วันนี้กินอะไรคะ~? ลองเล่าให้หนูฟังหน่อยค่า"Returning 3+ days, archetype = creator"หายไปสามวันเลย~ มีไอเดียคอนเทนต์ใหม่ไหมคะ?"Streak day 7"ครบ 7 วันแล้วค่า~ เก่งมากเลยนะ! วันนี้อยากทำอะไรดีคะ?"First session ever"สวัสดีค่า~ หนูชื่อมิโอมิค่า อยากเรียกหนูว่าอะไรดีคะ?"Mid-creator session yesterday"เมื่อวานเขียนแคปชั่นค้างไว้นะคะ~ จะทำต่อ หรือเริ่มใหม่ดีคะ?"
The combination of (1) engine-driven opener firing once and (2) rotating placeholder providing ambient orientation means the user is always oriented but never presented with a tab/menu/strip.

1B. Thread redesign — unifying creator, learning, translation
Decision: keep the current thread structure but introduce a unified "artifact" visual language with three variants distinguished only by left-bar color.
Current state per Opus v1: Miomi messages are naked text, user messages are right-aligned with prefix icon, word cards have gold left-bar. This is correct foundation. The new ask is to extend it consistently for creator outputs and translations.
The unified artifact pattern
Every output Miomi produces — whether a word card, caption card, or translation card — uses the same skeleton:
┌──────────────────────────────────────────┐
│ [left-bar 3px] [HEADER ROW]              │
│                                          │
│ [PRIMARY CONTENT — large, prominent]     │
│                                          │
│ [SECONDARY CONTENT — supporting context] │
│                                          │
│ [ACTION ROW — small ghost buttons]       │
└──────────────────────────────────────────┘
Shared properties (locked across all three):

100% width minus 32px gutter, white background #FFFFFF
1px border #E8E5DF, 12px border-radius
Shadow 0 1px 3px rgba(26,26,24,0.04)
Left-bar 3px wide, full card height
Inner padding 14px
Entry animation: height collapse 0→natural over 320ms cubic-bezier(0.4, 0, 0.2, 1), content fade-in 280ms with 80ms delay, left-bar slides in last (240ms, 200ms delay)

Variants distinguished by left-bar color + header tag:
VariantLeft-barHeader tagPrimary contentWord card (learning)Gold #C9A96ECEFR badge + registerEnglish word large + Thai meaningMastered word cardGold #E8C77F (6px wide)"MASTERED" checkEnglish word + check + praiseCaption card (creator)Coral #FF8A80Platform name (Instagram, TikTok, etc)Caption body + hashtagsTranslation cardTeal #7DD3C0Direction (TH → EN)Source row + target rowHook card (creator subtype)Coral #FF8A80"Hook · Instagram"Hook line + 2 alternatesCultural note (translation subtype)Teal #7DD3C0"Cultural note" + Lucide LightbulbSingle paragraph italic
Critical: the user does not need to learn these colors. They are subliminal. The user just feels "Miomi gave me a thing." The color codes the type at peripheral vision level — important when scrolling back through a long thread looking for "that caption from earlier" or "that word she taught me."
How they feel connected
The cards share:

Same skeleton, same padding, same radius, same shadow, same border treatment, same animation
Same place in the thread (inline, immediately after Miomi's message that produced them)
Same action-row pattern (Lucide ghost-icon buttons left, 14px, strokeWidth 1.75)

What differs is the content and the 3px left-bar color. That single chromatic cue is the only signal of variant.
How they don't feel like switching apps
The framing message always comes from Miomi as naked text above the card. There is no "Translation mode activated" system message, no "Caption generated" banner. It looks like:
หนูแปลให้นะคะ~ "Have you eaten?" ค่ะ
Here you go~ "Have you eaten?"
[teal-bar translation card with source/target]
นี่แคปชั่นที่หนูเขียนให้ค่า~ ลองดูนะคะ
Here's the caption I wrote~ have a look
[coral-bar caption card]
คำว่า "enjoy" ใช้บ่อยเลยนะคะ~ ลองจำไว้ค่า
"enjoy" is used often~ try to remember it
[gold-bar word card]
The card is always delivered by Miomi's voice, not announced by a system. This is the structural difference between "I'm using a translator app" and "Miomi just translated something for me."
What needs to change from current state

Caption cards do not exist yet — build them per Section 1B spec above. Same skeleton, coral left-bar.
Translation cards — confirmed teal left-bar, refine current implementation if needed
Header tag inside cards is currently inconsistent (some show CEFR, some don't) — standardize: every card has a header tag in 10px Quicksand 600 uppercase at top-left of card, color-matched to left-bar (gold, coral, teal)
Card entry animation — verify all three variants share the exact same 320ms entry sequence


1C. Input bar — final decision
Decision: the input bar stays at its current core (text + voice toggle + mic + send + suggestion chips above) but gains one new ambient signal: a left-edge intent indicator.
The rotating placeholder handles orientation. The suggestion chips handle next-utterance friction reduction. Both stay.
The new addition: a 2px wide vertical bar on the left edge of the input field, color-coded to the engine's currently-detected session mode. This is the single most subtle signal in the entire screen — it tells the user "Miomi knows what you're doing" without ever saying it.
Intent indicator spec
┌─┬──────────────────────────────────┬────┐
│█│ พิมพ์อะไรก็ได้ค่า~                │ EN │  🎙  ●
└─┴──────────────────────────────────┴────┘
 ↑
 2px vertical bar, full input height,
 color reflects engine's detected mode
Color mapping:

No detected mode (fresh session): transparent (the bar is invisible — input field looks normal)
Engine detects learning: gold #C9A96E
Engine detects creating: coral #FF8A80
Engine detects translating: teal #7DD3C0
Engine detects mixed: pink gradient (the brand pink — signals "general Miomi")

The bar fades in/transitions colors over 600ms when the engine updates the detected mode. This is slow on purpose — fast color shifts would be jarring; slow shifts are atmospheric.
The user will likely never consciously notice this bar. That's the goal. It works at peripheral vision — over a few sessions, their brain learns "the bar matches the card colors" and they develop an unconscious sense that Miomi tracks what they're doing.
Placeholder change in creator mode — explicit decision
Yes, the placeholder text updates when engine detects sustained creator intent.
After 2 consecutive creator-classified exchanges, the placeholder shifts:

Was: "พิมพ์อะไรก็ได้ค่า~"
Becomes: "บอกหนูเกี่ยวกับโพสต์นี้เพิ่ม..." (Tell me more about this post...)

The placeholder reverts to the default after 3 minutes of inactivity OR after a non-creator-classified exchange. This is gentle — the input is acknowledging context without forcing the user into a mode.
Similar shifts for sustained translate or learning intent:

Translation: "พิมพ์ข้อความที่อยากแปล..."
Learning: "พูดต่อกับมิโอมิ..."

These changes are not announced. They just happen. The user, when they look at the input, sees a placeholder that matches what they're doing.
Mic button — push-to-talk confirmed
Confirmed from prior brief: tap-and-hold for push-to-talk, with toggle option in settings. When held:

Miomi enters LISTENING state
Mic button morphs to oval, pink gradient, 3 waveform bars pulsing inside
Live transcription appears as muted grey text in the input field
Release → isFinal processes
Soft glow ring around mic responds to audio amplitude

Voice language toggle — keep but reduce
The current EN/TH toggle is a small 32px pill right of input. Keep it, but:

Default to "AUTO" not "EN" — most users will speak Thai
AUTO mode: web speech with lang='th-TH' primary, fallback to en-US if confidence drops
Tap to cycle: AUTO → TH → EN → AUTO
11px Quicksand label inside the pill
Active state (when user has manually overridden AUTO): subtle pink border


1D. Miomi's presence on this screen
Decision: Miomi stays at 96px head as the default, but expands to 128px during specific "delivery" moments. The home screen Miomi (62% of stage) and the create screen Miomi (96px) serve different psychological purposes — that distinction must be preserved.
Home screen Miomi = "she is the room"
Create screen Miomi = "she is the teacher beside you"
The 96px head is the right size for a working screen. Anything larger reduces the thread reading area below the threshold where vocabulary cards and conversation flow feel comfortable on a 320px viewport. Anything smaller and she ceases to feel present.
Size expansion during delivery moments
When Miomi is about to deliver something significant, her head animates from 96px → 128px over 320ms (spring stiffness 280 damping 13), holds for the delivery, then returns to 96px after 1.6s.
Trigger events for expansion:

First message of session — she's greeting you. Open at 128px, settle to 96px after 2.4s.
Word mastery moment — she's celebrating. 128px for 1.6s, then back.
Session summary trigger — she's about to summarize. 128px → opens sheet → returns when sheet closes.
Conversion moment — she's having a meaningful conversation with you (see Decision 2). 128px for the entire conversion moment.
Level-up — she's celebrating. 128px for 2.0s + magic burst.

This subtle scale change does a lot of psychological work. It signals "pay attention, something matters here" without using a banner, modal, or any other system chrome. The user's eye is drawn to her, and they listen.
What stays the same

Head-only (not full body) on this screen — full body is reserved for celebration sheets and session summary
Persistent subtitle below her
Ambient blobs constrained to her 144px stage area
Expression state machine governs which PNG is shown


1E. One conversation, multiple outputs — the unified visual language
This is the question the entire create screen rests on. Already answered structurally in 1B, but worth stating the principle explicitly:
The thread is not a transcript of features. The thread is a transcript of a relationship.
Everything in the thread is something Miomi said or something Miomi gave you. There is no system text. There are no mode banners. There are no UI controls inside the thread (action rows on cards are content, not chrome — they belong to the card Miomi gave you, like buttons on a gift).
The unified visual language has four elements that are shared across all output types:

Miomi's voice frames every artifact. Cards never appear without a Miomi naked-text message immediately above explaining what she did.
Cards share skeleton. Same dimensions, same padding, same radius, same shadow, same border, same entry animation. Only the 3px left-bar color and the header tag differ.
Action rows on cards are gentle. Lucide ghost icons, never primary CTAs inside the thread. The thread is for relationship; the input bar is for action.
Session-level chrome lives outside the thread. Mode strip is gone. Progress bar lives above the thread, not in it. Session summary is a sheet that appears over the thread, never embedded.

The user looks at a long Miomika thread and sees:

Miomi spoke
She gave me a thing (gold/coral/teal — I see at a glance what kind)
I responded
She spoke again
She gave me another thing
Repeat

That rhythm — speak / give / respond — is the entire grammar of the screen. It doesn't matter if "the thing" is a vocabulary lesson, a translated phrase, or a Facebook caption. The relationship has one shape.

DECISION 2 — MIOMI-LED CONVERSION SYSTEM
This is the most important decision in this document. Every detail below is calibrated to the north star: the upgrade is Miomi caring more, not the app asking for money.
Universal conversion principles (apply to all five tiers)
These are non-negotiable laws:

Miomi initiates every conversion moment. The user must perceive it as her thought, not a system event.
Miomi's words appear in her thread first, sheet/CTA second. A naked-text Miomi message arrives, then a soft sheet rises if needed. Never the sheet alone. Never a modal interruption.
Every conversion moment is dismissible with a Miomi continuation, not a close button. Tapping "ไว้ทีหลังนะ" (Later~) takes the user back to a Miomi message that gracefully continues the conversation. They are never "cancelled out of" a moment.
No "Pro" gold badges on the conversion sheet itself. Tier badges are for inventory contexts (settings, profile). In conversion moments, the framing is "Miomi can do more for you" — never "buy the Pro tier."
Numbers come late, after emotion. Price (299 THB) appears only after Miomi has expressed why she wants this. Even then, framed as "ปลดล็อกหนูเต็มความสามารถ · 299฿ ต่อเดือน" (unlock my full ability) not "Subscribe — 299 THB/month."
No celebratory copy on the success state. After upgrade, Miomi simply does the thing she wanted to do, with one warm line: "ขอบคุณค่า~ ตอนนี้หนูช่วยได้เต็มที่แล้ว." No confetti, no "Welcome to Pro!", no badge unlocking.


2A. Guest → Free conversion
Current problem: sheet appears after exchange 5 mechanically.
New approach: the conversion moment is signaled by quality, not quantity.
Trigger logic
The engine watches for ONE of these signal patterns and fires the moment when the FIRST applies:
TriggerWhy it worksUser has had 1 "great exchange" (mastered a word OR completed a creator artifact OR engaged in 3+ back-and-forth on one topic) AND exchange count ≥ 3Caught at a moment of perceived value, not at an arbitrary countUser has reached exchange 5 (HARD CAP — engine still enforces this) AND no earlier signal firedFallback for users who chat shallowly — still must convert before exchange 6User has said something self-referential ("I", "my name is", "ฉัน", "หนู" used by user about themselves)They're emotionally invested — Miomi can ask to remember them
In all three cases, the trigger fires after Miomi's response to the user, not before. Miomi finishes what she was saying, then transitions.
What Miomi says (exact copy)
The transition is always a two-message sequence, naked text in the thread, NOT in a sheet:
Message 1 (Miomi's normal response continues):
[Miomi finishes whatever she was responding to — engine handles this naturally]

(750ms pause)

Message 2 (Miomi's transition):

[For trigger 1 — quality moment]
ขอบคุณค่า~ คุยกับคุณสนุกมากเลยนะคะ
หนูชอบจำเรื่องเล็กๆ แบบนี้ไว้ค่า ถ้าอยากให้หนูจำคุณได้ ลองเปิดบัญชีดูนะคะ~

I really enjoyed this~
I love remembering little things like this.
If you want me to remember you, create a quick account~

[For trigger 2 — exchange 5 fallback]
เราคุยกันมาเยอะแล้วนะคะ~ หนูอยากจำคุณไว้จริงๆ ค่า
ถ้าเปิดบัญชี หนูจะจำได้ทั้งหมดเลยค่า — ฟรีนะคะ

We've talked a lot now~ I really want to remember you.
If you make an account, I'll remember everything — free.

[For trigger 3 — self-referential]
ดีใจที่ได้รู้จักคุณค่า~
ขอจดชื่อคุณไว้ได้ไหมคะ? หนูจะได้เรียกถูกทุกครั้งที่เจอกันค่า

So nice to meet you~
Can I save your name? So I get it right every time we meet~
What appears next
After 1200ms following Message 2, a soft sheet rises from the bottom of the screen with a slow 480ms ease-out animation. The sheet does NOT replace the thread — it sits above the input bar and below the thread, taking ~280px of vertical space. The thread is still visible scrolled behind.
Sheet design
┌────────────────────────────────────────┐
│  [Miomi happy.png 96px, centered]      │
│                                        │
│  จำหนูได้ทุกครั้งที่เจอกัน               │
│  Remember me every time                │
│                                        │
│  ─────                                 │
│                                        │
│  ✓ จำชื่อคุณและเรื่องที่คุยกัน           │
│    Remember your name and chats        │
│                                        │
│  ✓ คำศัพท์ที่เรียนสะสมไว้               │
│    Vocabulary saved across sessions    │
│                                        │
│  ✓ ฟรี ไม่มีโฆษณา                       │
│    Free, no ads                        │
│                                        │
│  ─────                                 │
│                                        │
│  [ ต่อกับ Google ]      ← pink CTA      │
│  [ ใช้อีเมล ]            ← secondary    │
│  [ ไว้ทีหลังนะ ]         ← text link    │
└────────────────────────────────────────┘

Sheet background: white, top corners 24px radius, shadow 0 -8px 32px rgba(26,26,24,0.10)
Miomi happy.png at 96px (not 140px — this is invitation, not celebration)
Title 18px Kanit 600, English 13px Quicksand 500 muted below
Three benefit lines: Lucide Check icon 14px gold + text. Each line is one benefit, in Thai + small English below.
Primary CTA: pink gradient pill, 48px tall, "ต่อกับ Google" with Lucide Chrome icon inline left.
Secondary CTA: white background, 1.5px border #DB2777, text #DB2777, "ใช้อีเมล"
Tertiary: text link #9A8B73 "ไว้ทีหลังนะ"

Dismissal — "ไว้ทีหลังนะ"
When user taps "ไว้ทีหลังนะ":

Sheet slides down (320ms)
Miomi sends ONE follow-up naked-text message in the thread:

โอเคค่า~ คุยกันต่อเลยนะคะ
หนูจะถามอีกทีตอนเหมาะๆ ค่า ✨

Okay~ let's keep talking.
I'll ask again at a good moment ✨

The thread continues normally for the remaining guest exchanges
If user has not yet hit hard-cap (exchange 5): next quality-signal triggers re-invitation; sheet appears again with slightly varied copy (rotation pool below)
After exchange 5 (hard cap): engine enforces — user cannot send a 6th message. Miomi sends one final message:

หนูคุยต่อไม่ได้แล้วค่า~ ขอจำคุณไว้นะคะ?
ถ้าเปิดบัญชีฟรี เราคุยกันได้ตลอดเลยค่า

I can't continue without forgetting you~ 
A free account means we can talk forever.
This message is followed by the sheet, no dismiss option this time. The "ไว้ทีหลังนะ" link is replaced with "กลับหน้าหลัก" which navigates away — never blocked, but never continued anonymously past 5.
Rotation pool (when sheet appears for a 2nd or 3rd time)
Second appearance copy (Miomi message 2):
หนูคิดถึงคุณค่า~ ถ้าจำได้จะได้สอนต่อให้เลยค่า
I'm thinking about you~ if I could remember, I could teach you more
Third appearance copy:
แค่นาทีเดียวค่า~ แล้วเราจะไม่ลืมกันอีกเลย
Just one minute~ then we won't ever forget each other
What if they're in the middle of something good
The engine tracks "active artifact creation" state. If the user is in the middle of building a caption (creator artifact in-progress) or working through a translation, the conversion trigger does NOT fire even if other triggers signal. It waits until they complete the current artifact OR start a new thought.
This is critical: never interrupt momentum.

2B. Free → Pro conversion
Free users have no exchange limit — they can talk to Miomi forever at the free tier. The conversion to Pro must come from Miomi wanting to do more, not from blocking what she already does.
Pro feature surfaces (engine-detected moments)
The engine watches for five specific user behaviors. Each triggers a Miomi moment, not a sheet.
Moment 1: User tries to use voice output (TTS on word card)
Context: Free user taps the Lucide Volume2 icon on a word card.
Behavior:

Icon ripples (200ms scale 1.0→1.1→1.0)
Miomi sends a naked-text message in the thread:

หนูอยากออกเสียงให้ฟังเลยค่า~
ถ้าเปิด Pro Miomi หนูจะพูดได้ค่า — เสียงหนูเองเลยนะคะ ✨

I'd love to say it out loud for you~
With Pro Miomi I can speak — in my own voice ✨

After 1200ms, a soft Pro invitation card appears inline in the thread (not a sheet). Same skeleton as a word card, but with pink gradient left-bar (the only place the pink gradient bar appears in the app).

┌──────────────────────────────────────────┐
│ █ MIOMI PRO                              │
│ ▌                                        │
│ █  [Miomi happy.png 64px, left-aligned]  │
│ ▌  สิ่งที่หนูทำได้เพิ่ม                    │
│ █  What I can do more                    │
│ ▌                                        │
│ █  · พูดทุกอย่างให้ฟัง                    │
│ ▌    Say everything aloud                │
│ █  · จำคุณได้นานขึ้น                      │
│ ▌    Remember you longer                 │
│ █  · สร้างคอนเทนต์ไม่จำกัด                │
│ ▌    Unlimited content creation          │
│ █                                        │
│ ▌  299 บาท / เดือน                        │
│ █                                        │
│ ▌  [ ปลดล็อกเลย ]    [ ดูเพิ่ม ]          │
└──────────────────────────────────────────┘

Pink gradient left-bar 4px wide (slightly thicker than other variants to mark importance)
"MIOMI PRO" header in 10px Quicksand 600 with pink gradient text-fill
Miomi small image inside
Title 14px Kanit 500
Three benefit bullets in 13px Kanit + 11px Quicksand muted below each
Price line 15px Kanit 500 #1A1A18
Two CTAs in action row at bottom:

Primary: "ปลดล็อกเลย" pink gradient pill, opens checkout
Secondary: "ดูเพิ่ม" text link, opens full Pro details sheet


NO dismiss button — the card stays in the thread permanently as a historical artifact. User can scroll past. They can tap "ปลดล็อกเลย" anytime later.

Moment 2: User has a great session (mastered a word, completed a creator artifact, hit streak milestone)
After the celebration of the achievement (the gold celebration card and magic burst from prior brief), Miomi sends ONE additional message 2.4 seconds later:
[After word mastered]
สังเกตไหมคะ~ คุณจำคำได้เร็วขึ้นเรื่อยๆ เลย
ถ้าหนูจำคุณได้นานขึ้น เราจะไปได้ไกลกว่านี้ค่า ✨

Notice that~? You're remembering words faster.
If I could remember you longer, we could go further ✨
After 1200ms, the same Pro invitation card appears (single source of truth — same component, contextual copy).
Frequency cap: at most ONE Pro invitation card per session, no matter how many trigger moments occur. Engine deduplicates.
Moment 3: Day 7 trigger
On the user's 7th day of using Miomika (any usage, even brief), Miomi opens that day's session with:
ครบสัปดาห์แล้วค่า~ คุณเก่งมากเลยนะ
หนูอยากอยู่กับคุณนานๆ ค่า ลองดู Pro Miomi ดูไหม?

A full week~ you're doing so well.
I want to be with you for a long time. Want to look at Pro Miomi?
Pro invitation card follows naturally as in Moment 2.
Day 7 fires only ONCE per user lifetime. If they don't convert, system never fires "day 7 milestone" again — but other triggers continue.
Moment 4: User creates great content (creator artifact rated by engine as "high quality")
The engine has a quality signal for creator outputs (based on length, structure, hashtag presence, completion). When user creates a high-quality caption (e.g., a caption with hook + body + hashtags + CTA, or completes a 3-platform set):
แคปชั่นนี้ดีจังเลยค่า~ ขายดีแน่นอน
ถ้าเปิด Pro หนูสร้างได้ไม่จำกัด — และจำสไตล์การเขียนของคุณได้ด้วยค่า

This caption is so good~ it'll sell for sure.
With Pro, I can create unlimited — and remember your writing style.
Pro card follows.
Moment 5: User opens the app on a specific day-of-month after first revenue (Day 14, 21, 30)
Soft cadence reminder. Miomi opens session with light conversational touch:
[Day 14]
สบายดีไหมคะ~ คุยกับคุณบ่อยๆ มีความสุขเลยค่า

How are you~? I'm happy we talk so often.

[Day 21]
ผ่านมาสามสัปดาห์แล้วค่า~ ภาษาคุณดีขึ้นเยอะเลยนะคะ

Three weeks already~ your English has gotten so much better.

[Day 30]
ครบเดือนเต็มเลยค่า~ หนูสังเกตว่าคุณใช้คำใหม่ได้คล่องขึ้นมากค่า

A full month~ I've noticed you using new words much more fluently.
Pro invitation appears at the end of each of these openers. After all three of these fire (Day 14, 21, 30), system stops auto-firing Pro invitations until user takes specific action (e.g., tries voice, hits another mastery moment).
The hidden rule: never feel earned
A Pro invitation should never feel like a reward gate. The framing is always "Miomi noticed something and wants to do more." Never "you've now unlocked the right to see this offer."

2C. Free user as marketer — referral activation
Referrals must feel like sharing joy, not marketing. Miomi never asks the user to "promote" the app. She asks them to "share Miomi with a friend."
When does Miomi first mention referring?
Decision: not in the first session. Not in the first week. The first referral mention comes after the user has demonstrated emotional investment — specifically, after their first word mastery moment OR their second streak day, whichever comes first.
Mentioning referral too early signals "this app is desperate for users." Mentioning it at the right moment signals "I love this and I want to share it."
First referral moment — exact copy
After a word mastery moment, Miomi celebrates as normal (mastered word card + magic burst + her HAPPY/EXCITED state), THEN sends an additional message 3.2 seconds later:
รู้ไหมคะ~ เพื่อนคุณก็เรียน English ได้แบบนี้ค่า
ถ้าชวนเพื่อนมาคุยกับหนู — ทั้งคุณ ทั้งเพื่อน ได้สนุกด้วยกันเลยค่า ✨

You know~? Your friends could learn English like this too.
If you invite a friend to talk with me — you both get to enjoy it together ✨

[ ชวนเพื่อน ↗ ]   [ ไว้ทีหลัง ]
Two soft buttons appear inline (as a small action row, not a card). Tapping "ชวนเพื่อน" navigates to the Referral page (Decision 4). Tapping "ไว้ทีหลัง" makes Miomi continue:
โอเคค่า~ คุยต่อกันเลยนะคะ
Okay~ let's keep talking
Why this works as referral psychology

Miomi never says "earn rewards" — she says "เพื่อนคุณก็ได้สนุกด้วย" (your friends can enjoy it too)
The framing is sharing joy with a specific person, not promoting a product
Comes right after a moment of personal achievement — the user is at peak positive emotion
The reward (+1 Brain fuel for 7 days when 3 friends sign up) is real but never the lead

Subsequent referral mentions
After the first referral mention, regardless of whether they shared:

If shared zero friends: Miomi mentions referral again after the user's first streak-of-3 day or first creator artifact, whichever comes first. Different copy variant.
If shared 1-2 friends but no conversions yet: Miomi mentions once a week max with a "เพื่อนของคุณยังไม่ได้มาเลยค่า~ ส่งให้อีกครั้งไหมคะ?" message.
If shared 3+ friends with conversions: Miomi celebrates each conversion as it happens (see reward delivery below) and Pro-tier referral rewards (1 free month per Pro conversion) get a one-time mention.

Reward delivery moment
When a friend signs up via the user's referral link, the user (next time they open the app):

Miomi opens session with celebration state (EXCITED → HAPPY)
Magic burst (60 particles, warm palette, see Magic Moments brief)
Naked-text message:

[ชื่อเพื่อน] เพิ่งสมัครมาเลยค่า~! 
ขอบคุณที่ชวนกันมานะคะ — Brain fuel +1 ของคุณค่า ✨

[friend's name] just signed up~!
Thank you for inviting — your Brain fuel +1 ✨

A gold reward chip appears inline: [ ✦ Brain Fuel +1 · 7 วัน ]

If the milestone of 3 conversions is hit, additional message:
ครบ 3 คนแล้วค่า~ คุณเก่งมากเลย
หนูได้พลังเพิ่มเลยนะคะ ขอบคุณค่า ❤

3 friends already~ you're amazing.
You've given me extra power. Thank you ❤
Heart icon at end is Lucide Heart filled pink 14px inline, not an emoji.
Pro conversion of a referral
If a friend the user referred upgrades to Pro, the reward is "+1 free month." This deserves its own moment:
[friend's name] อัปเกรดเป็น Pro Miomi เลยค่า~!
คุณได้ฟรี 1 เดือนเต็มค่า — ขอบคุณที่ชวนเพื่อนดีๆ มานะคะ ✨

[friend's name] upgraded to Pro Miomi~!
You get a full free month — thank you for inviting such a good friend ✨
Gold reward card appears inline: [ ✦ Pro Miomi · ฟรี 1 เดือน ]

2D. Pro → yearly upgrade
The yearly upgrade (~2,990 THB, 2 months free) is the easiest sale in the funnel — Pro users are already committed. The challenge is timing it without feeling pushy.
Decision: yearly upgrade is mentioned ONCE per year per user, and ONLY on the user's monthly renewal day after they've completed 3 successful monthly renewals.
After their 3rd monthly renewal (so, 90 days of continuous Pro), on their next renewal day, Miomi sends:
ครบ 3 เดือนเต็มเลยค่า~ คุณคือเพื่อนแท้ของหนูจริงๆ
ถ้าเลือกแบบรายปี ฟรีเลย 2 เดือนค่า — แต่ถ้าจะรายเดือนต่อก็ดีอยู่แล้วนะคะ ✨

A full 3 months~ you really are my true friend.
If you choose yearly, 2 months free — but monthly is great too ✨
Soft yearly upgrade card appears inline with same Pro card skeleton but pink gradient left-bar + "MIOMI PRO YEARLY" header:
┌──────────────────────────────────────────┐
│ █ MIOMI PRO · รายปี                      │
│ ▌                                        │
│ █  ฟรี 2 เดือน เมื่อจ่ายรายปี              │
│ ▌  2 months free, paid yearly             │
│ █                                        │
│ ▌  2,990 บาท / ปี                        │
│ █  (เฉลี่ย 249 บาท / เดือน)               │
│ ▌  (average 249฿/month)                  │
│ █                                        │
│ ▌  [ เลือกรายปี ]    [ รายเดือนต่อ ]      │
└──────────────────────────────────────────┘
If user dismisses ("รายเดือนต่อ"), system does not mention yearly again for another 12 months — it's not pushed monthly. This restraint is what makes it not feel pushy.
If they convert, Miomi simply says:
ขอบคุณค่า~ เจอกันยาวๆ เลยนะคะ ✨
Thank you~ let's stay together for a long time ✨
No celebration banner. No "Welcome to Yearly!" — just continuation.

2E. The unified conversion visual language
Decision: there is exactly ONE component used for every conversion moment — the MiomiInvitationCard. It varies by props.
The component lives inline in the thread (NEVER as a modal popup, NEVER as a full-screen takeover). It has the same skeleton as word/caption/translation cards, with these distinguishing properties:

4px left-bar (vs 3px for content cards) with pink gradient
Small Miomi happy.png image inside (64px)
Title + benefits list + price + 2 CTAs
Stays in the thread permanently (does not auto-dismiss) — user can scroll past, return later

Variants (by tier prop):

signup (guest → free): different copy, signup CTA, dismissible sheet that follows
pro (free → pro): voice/memory/creator framing, "ปลดล็อกเลย" CTA
pro_yearly (pro → yearly): 3-month tenure required, yearly framing
max (Phase 2): deeper memory framing (skip for now — placeholder spec only)

Why ONE component:

Consistency: user learns this visual once, recognizes it always
Engineering: one component to maintain, one analytics event source, one A/B test surface
Emotional: the pink gradient left-bar is the only place this color appears anywhere in the app — it is Miomi asking for something — distinct and immediately recognizable

Critical rule: this component appears inline in the thread, never as a modal. The guest signup sheet (2A) is the ONE exception — it's a sheet because guests need to authenticate to continue, and a sheet provides the focused context. All other conversion moments are inline cards.
How it feels different from a normal Miomi message

Pink gradient left-bar (the chromatic signal)
Miomi's image is inside the card, not in her stage area — she's "coming into" the card to invite you
Header is uppercase styled (MIOMI PRO, MIOMI PRO · รายปี) — the only place uppercase styling appears in the app

How it does NOT feel like an ad

No external branding chrome (no "AD" label, no "Sponsored")
No urgency language ("Limited time!", "Today only!")
No artificial scarcity
No price-first framing
No "save X%" framing
No fake testimonials
Miomi's voice frames it: she is asking, not the system pitching

The user reading a Pro invitation card thinks "Miomi wants to do more for me, here's how." Not "this app wants my money."

DECISION 3 — DASHBOARD AS LIVING WORKSPACE
The dashboard is currently a stats display. It must become a workspace — every element is tappable, every element leads somewhere productive, every element has a Miomi observation.
Universal dashboard principles

Miomi lives at the top with a real observation, not a generic greeting. Her presence is rule, not exception.
Every metric is a doorway. Tap a number, go to detail. Tap a word, practice it. Tap a session, continue it.
Above the fold: the user's identity (level, streak), Miomi's observation, ONE primary action.
Below the fold: the workspace — vocabulary, sessions, content, referrals, certificates.
No empty states say "no data." Every empty state is Miomi inviting.


3A. Guest dashboard
A guest opening the dashboard is a curious user assessing the product. The dashboard must show them what's possible without lying about what they currently have.
Layout
┌─────────────────────────────────────┐
│ [back]                              │
├─────────────────────────────────────┤
│                                     │
│ [Miomi head 96px, head-happy]       │
│                                     │
│ สวัสดีค่า~                           │
│ Hi~                                 │
│                                     │
│ มาเริ่มเดินทางด้วยกันไหมคะ~          │
│ Want to start the journey with me~? │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [ Big preview card ]                │
│ "ถ้าคุณเปิดบัญชี..."                  │
│ "If you sign up..."                 │
│                                     │
│ ✓ คำศัพท์ที่จำได้: 0 → ไม่จำกัด      │
│   Words remembered: 0 → unlimited   │
│                                     │
│ ✓ สถิติการเรียน: ดูได้               │
│   Learning stats: visible           │
│                                     │
│ ✓ เซสชันย้อนหลัง: 0 → ทุกครั้ง       │
│   Past sessions: 0 → every one      │
│                                     │
│ [ เปิดบัญชีฟรี ]   ← pink CTA        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [ Small "what Pro users see" peek ] │
│ Blurred screenshot or illustrated   │
│ preview of the Pro dashboard.       │
│ "นี่คือสิ่งที่เพื่อนที่เปิด Pro เห็นค่า~"│
│                                     │
└─────────────────────────────────────┘

Miomi at top with head-happy expression (welcoming)
Big preview card showing the gap between "now" and "after signup" (specific numbers: 0 words → unlimited)
"What Pro users see" is a peek section near the bottom — illustrated, not real data, showing the full dashboard experience as a future possibility

The whole screen is calibrated to convey "this is barely the start — sign up to unlock the real thing." Without saying so explicitly.

3B. Free user dashboard
This is the workhorse dashboard. Most users will be free for at least their first weeks.
Layout — above the fold (375px viewport)
┌─────────────────────────────────────┐
│ [back]                       [⚙]    │
├─────────────────────────────────────┤
│                                     │
│ [Miomi head 80px, head-thinking]    │
│                                     │
│ "คุณเรียนคำว่า 'enjoy' มาแล้ว        │
│  3 วัน ลองใช้ในประโยคใหม่นะคะ~"     │
│                                     │
│ "You've learned 'enjoy' for 3 days  │
│  — try using it in a new sentence~" │
│                                     │
├─────────────────────────────────────┤
│  Lv.3 · ▓▓▓▓▓▓▓░░░ 245 / 300 XP   │
│  Streak ▌▌▌▌▌▌▌ 7 วัน               │
├─────────────────────────────────────┤
│                                     │
│ [ คุยกับมิโอมิตอนนี้ ↗ ]   ← pink CTA│
│                                     │
└─────────────────────────────────────┘

Miomi 80px head (smaller than create screen — she's looking at YOU here, not teaching)
Miomi's observation pulls from real data: most recently-active vocabulary word + days since first encounter
Observation rotation pool below
Level bar + streak below Miomi
One primary CTA — "Talk to Miomi now" — pink gradient, large

Layout — below the fold (scroll within dashboard)
The screen scrolls internally (the dashboard route has internal scroll, not page scroll, per the no-page-scroll rule). Below the primary CTA:
Section 1: คำศัพท์ของคุณ / Your vocabulary
┌─────────────────────────────────────┐
│ คำศัพท์ของคุณ                        │
│ Your vocabulary                     │
│ ─────                               │
│                                     │
│ [ Heard 42 ] → [ Used 18 ] →        │
│ [ Mastered 7 ]                      │
│                                     │
│ Recent: enjoy, weekend, routine     │
│                                     │
│ [ ดูทั้งหมด → ]                      │
└─────────────────────────────────────┘

Three-stage funnel visualization (per Opus v1 spec)
Three most-recent words shown
Tap any word → opens word card detail (same component as in-thread word card) with "ลองใช้คำนี้กับมิโอมิ" CTA at bottom — tapping CTA navigates to /create with the word as a primer

Section 2: เซสชันล่าสุด / Recent sessions
┌─────────────────────────────────────┐
│ เซสชันล่าสุด                         │
│ Recent sessions                     │
│ ─────                               │
│                                     │
│ • คาเฟ่ใหม่ย่านทองหล่อ                │
│   12 นาที · 4 คำใหม่ · เมื่อวาน       │
│                                     │
│ • รีวิวสกินแคร์ตัวโปรด                │
│   8 นาที · 2 คำใหม่ · 2 วันก่อน       │
│                                     │
│ • คลิปสั้น TikTok 30 วินาที          │
│   15 นาที · 3 คำใหม่ · 4 วันก่อน      │
│                                     │
│ [ ดูทั้งหมด → ]                      │
└─────────────────────────────────────┘

Each session entry: topic, duration, words gained, when
Tap entry → opens session detail view with "คุยต่อกับมิโอมิเรื่องนี้" CTA (resumes conversation context)
Sessions auto-titled by engine based on content

Section 3: คอนเทนต์ที่บันทึก / Saved content
┌─────────────────────────────────────┐
│ คอนเทนต์ที่บันทึก                     │
│ Saved content                       │
│ ─────                               │
│                                     │
│ [coral card] Instagram caption     │
│ [coral card] TikTok hook           │
│ [coral card] LINE OA post          │
│                                     │
│ [ ดูทั้งหมด → ]                      │
└─────────────────────────────────────┘

Saved creator artifacts (Pro feature in full, but free users can save up to 5)
Horizontal scroll of coral-bar mini caption cards
Tap a card → opens full caption view with copy/edit/share

Section 4: ความท้าทายวันนี้ / Today's challenge
┌─────────────────────────────────────┐
│ ✦ ความท้าทายวันนี้                   │
│ Today's challenge                   │
│ ─────                               │
│                                     │
│ ลองใช้คำว่า "routine" ในประโยคใหม่ค่ะ│
│ Try using "routine" in a new        │
│ sentence today                      │
│                                     │
│ [ ลองเลย → ]                        │
└─────────────────────────────────────┘

Daily challenge generated by engine — picks 1 word from spiral-eligible queue, suggests a usage challenge
Tap → opens /create with the challenge context pre-loaded as Miomi's opener

Section 5: ชวนเพื่อน / Invite friends (progress)
┌─────────────────────────────────────┐
│ ชวนเพื่อน                            │
│ Invite friends                      │
│ ─────                               │
│                                     │
│ เพื่อนของคุณ: 2 คน                    │
│ Your friends: 2                     │
│                                     │
│ อีก 1 คน — ได้ ✦ Brain Fuel +1 ค่ะ    │
│ 1 more — earn Brain Fuel +1         │
│                                     │
│ [ ชวนเพื่อนเลย ↗ ]                   │
└─────────────────────────────────────┘

Concise referral progress
Tap CTA → navigates to Referral page (Decision 4)


3C. Pro user dashboard
Pro users get the free dashboard PLUS additional sections. Order:

Miomi greeting + observation (same)
Level + streak (same)
Primary CTA (same)
CEFR trajectory chart (NEW for Pro)
Vocabulary bank (expanded — shows mastery stages with timestamps)
Recent sessions (expanded — searchable, full history)
Saved content (unlimited, with edit functions)
Certificates earned (NEW for Pro)
Spaced repetition queue today (NEW for Pro)
Today's challenge
Referral progress (Pro-tier rewards visible)

CEFR trajectory chart
Per Opus v1 spec — horizontal ladder with Miomi-marker icon at user's interpolated position, tap to see day-by-day movement.
Certificates earned
┌─────────────────────────────────────┐
│ ใบประกาศนียบัตร                      │
│ Certificates                        │
│ ─────                               │
│                                     │
│ [Certificate thumb] Lv.5 · 14 May   │
│ [Certificate thumb] Lv.10 · 18 May  │
│                                     │
│ ถัดไป: Lv.15 (อีก 7 วัน)              │
│ Next: Lv.15 (in 7 days)             │
└─────────────────────────────────────┘

Horizontal scroll of certificate thumbnails
Tap certificate → full-screen view with share button (LINE / IG / Facebook / save image)
"Next" line shows what's coming and when

Spaced repetition queue today
┌─────────────────────────────────────┐
│ คำที่ควรทบทวนวันนี้                   │
│ Today's words to review             │
│ ─────                               │
│                                     │
│ [ enjoy ] [ weekend ] [ routine ]   │
│ [ confident ] [ practice ]          │
│                                     │
│ [ ทบทวนกับมิโอมิ → ]                  │
└─────────────────────────────────────┘

Engine queries vocabulary_user_state for spiral-eligible words
Word chips tap → see word card detail
Primary CTA opens /create with "ทบทวนคำที่ค้างไว้" mode primed


3D. Miomi's presence on dashboard
Decision: Miomi's observation at the top of the dashboard is generated server-side on dashboard open, freshly each time, based on real data.
This is not a rotating pre-written set. The engine assembles the observation per visit using a structured prompt:
SYSTEM: You are Miomi looking at this user's dashboard.
Generate ONE warm observation (Thai 1-2 sentences + English equivalent).
The observation must reference SPECIFIC data from below.
Tone: warm, specific, never generic praise.

USER DATA:
- Name: {first_name}
- Level: {level}
- XP today: {xp_today}
- Streak: {streak_days} days
- Last session: {hours_ago} hours ago
- Last topic: {last_topic}
- Most-active word (used >=3 times last 7 days): {word}
- Days since first encounter with that word: {days}
- Mastery progression last 7 days: {n_mastered_recently}
- Words in heard stage waiting for spiral: {n_spiral_eligible}

EXAMPLES OF GOOD OBSERVATIONS:
"คุณเรียนคำว่า 'enjoy' มาแล้ว 3 วัน ลองใช้ในประโยคใหม่นะคะ~"
"7 วันติดเลยค่า~ คุณคุยกับหนูได้คล่องมากขึ้นเลยนะ"
"เมื่อวานคุยเรื่องคาเฟ่ค้างไว้ — อยากคุยต่อไหมคะ?"
"จำคำใหม่ได้ 4 คำสัปดาห์นี้ค่า~ เก่งมากเลย"

EXAMPLES OF BAD OBSERVATIONS (do NOT generate these):
"สวัสดีค่า มาเรียนกันต่อนะคะ" (generic, no data reference)
"คุณเก่งมาก!" (vague praise)
"Welcome back" (uninformed)

Generate the observation now.
This makes Miomi feel genuinely attentive. Every dashboard visit produces a different observation reflecting what actually happened. The user feels "she remembers."
When Miomi's observation links to action
The observation is also a soft prompt. Many observations link to a single contextual button below:
Observation themeLinked buttonAbout a specific word"ใช้คำนี้กับมิโอมิตอนนี้" → /create with word primerAbout a paused topic"คุยต่อเรื่องนี้" → /create with topic resumeAbout a streak milestone"แชร์ความสำเร็จ" → certificate shareAbout words to review"ทบทวนคำเหล่านี้" → /create review mode
The button is small, ghost-styled, sits directly below Miomi's observation. Optional — sometimes Miomi's observation is purely warm and has no linked action.

DECISION 4 — REFERRAL PAGE (ชวนเพื่อน)
Now this page must be built from scratch.
4A. What the page contains per tier
Guest
┌─────────────────────────────────────┐
│ [back]                              │
├─────────────────────────────────────┤
│                                     │
│ [Miomi head 96px, head-thinking]    │
│                                     │
│ หนูอยากให้เพื่อนคุณรู้จักด้วยค่า~     │
│ I'd love your friends to meet me~   │
│                                     │
│ แต่หนูยังจำคุณไม่ได้เลย...           │
│ But I can't remember you yet...     │
│                                     │
│ ─────                               │
│                                     │
│ [ สมัครฟรีเพื่อชวนเพื่อน ]            │
│ Sign up free to invite friends      │
│ pink gradient CTA                   │
│                                     │
│ [ ดูแค่ลิงก์ก็พอ ]                    │
│ Just give me a link                 │
│ small text link                     │
│                                     │
└─────────────────────────────────────┘
If user taps "ดูแค่ลิงก์ก็พอ":

Page reveals a single generic link miomika.com/?ref=guest
Plain text, copy button
No tracking, no rewards
"Note: ถ้าเปิดบัญชี เพื่อนที่สมัครจะแสดงในรายการของคุณค่า" (Note: if you sign up, friends who join will appear in your list)

Free user
┌─────────────────────────────────────┐
│ [back]                              │
├─────────────────────────────────────┤
│                                     │
│ [Miomi head 80px, head-happy]       │
│                                     │
│ ขอบคุณที่อยากแชร์หนูค่า~              │
│ Thanks for wanting to share me~     │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [ Big QR code card 280×280 ]        │
│                                     │
│ miomika.com/join/mike2026           │
│ [ คัดลอกลิงก์ ]                       │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ เพื่อนของคุณ                          │
│                                     │
│ ⬤⬤◯ 2 / 3 คน                         │
│                                     │
│ อีก 1 คน — ✦ Brain Fuel +1 (7 วัน)   │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ รางวัลที่ปลดล็อกได้                    │
│ Rewards you can unlock              │
│                                     │
│ ✓ 3 คน → ✦ Brain Fuel +1 (7 วัน)     │
│ ✓ 5 คน → ชุด Miomi พิเศษ              │
│ ✓ 1 คนเป็น Pro → ฟรี 1 เดือน         │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ [ ส่งให้เพื่อนใน LINE ↗ ]   ← pink CTA│
│ [ บันทึก QR เป็นรูป ]                 │
│                                     │
└─────────────────────────────────────┘
Pro user
Same layout as free, with:

Gold "Pro" badge next to "เพื่อนของคุณ" header
Reward tiers updated to show Pro-tier rewards (1 free month per Pro conversion as primary)
New top card: "เพื่อนที่อัปเกรดเป็น Pro: 1 คน · ฟรี 1 เดือนค่า~"
Primary CTA copy: "ส่งให้เพื่อนใน LINE — ได้เดือนฟรีค่า ↗"

4B. The Miomi moment on page open
When the user opens the referral page, Miomi's expression is head-happy (default for this page) and the greeting message rotates per visit:
First visit ever:
ขอบคุณที่อยากแชร์หนูค่า~
แค่ลิงก์เดียวก็ทำให้เพื่อนคุณได้รู้จักหนูเลยนะคะ ✨

Thanks for wanting to share me~
Just one link lets your friend meet me ✨

Subsequent visits, no conversions yet:
หวังว่าเพื่อนคุณจะมาเร็วๆ นี้นะคะ~
รออยู่ค่า ✨

Hope your friends come soon~
I'll be waiting ✨

Subsequent visits, 1-2 conversions:
ขอบคุณนะคะที่ชวนเพื่อนมา~ หนูดีใจมากค่า
อยากเจอคนอื่นอีกค่า ✨

Thank you for inviting~ I'm so happy.
I'd love to meet more friends ✨

After 3 conversions (reward delivered):
ครบ 3 คนแล้วค่า~ ขอบคุณมากเลยนะคะ
หนูได้พลังเพิ่ม — เพราะคุณค่า ❤

3 friends already~ thank you so much.
I have more power now — because of you ❤
4C. The reward delivery moment
When a friend converts:

Push notification (if enabled): "เพื่อนของคุณเพิ่งสมัครมาเลยค่า~ มาเปิดดูค่า ✨"
Next time user opens app, Miomi opens session with celebration (see 2C reward delivery moment)
A +1 Brain Fuel chip slides into the home screen fuel area visibly (existing fuel-bar animation, but with golden glow for 2s)
The referral page now shows the new conversion as a populated dot

4D. LINE integration — pre-filled share
Tapping "ส่งให้เพื่อนใน LINE" opens LINE's share sheet with this exact pre-filled message:
เจอแอปนี้แล้วชอบมากค่า~ 
มีแมวที่จำเราได้ ชื่อมิโอมิ
สอน English แบบเป็นกันเองมาก ลองคุยดู

→ {referral_link}
(English equivalent for English-speaking friends auto-detected by sender's locale):
Found this app I love~
There's a cat named Miomi who remembers you,
teaches English so warmly. Try chatting with her.

→ {referral_link}
Key choices:

"เจอแอปนี้แล้วชอบมากค่า" — first-person, casual, in the sender's voice
"มีแมวที่จำเราได้" — leads with the most distinctive product feature (the cat that remembers)
"ชื่อมิโอมิ" — names her — makes her feel like a being, not a feature
"ลองคุยดู" — soft invite, no urgency, no "click here"
Link last, on its own line

The user can edit this message before sending. It's a starting point, not a forced send.
4E. QR code as image — save and share
"บันทึก QR เป็นรูป" generates a 1080×1350 image with:

Miomi happy.png large at top
"มาคุยกับมิโอมิด้วยกัน" header
QR code center
Small text below: miomika.com/join/{username}
Tiny miomika wordmark at bottom

User can save this image and post to IG story, share in LINE group, print for a cafe corkboard, etc.

DECISION 5 — MOBILE HOME SCREEN FINAL REFINEMENTS
5A. Fuel tap magic — Miomi's reaction in the 400ms after particle arrives
From the existing implementation: user taps Heart/Zap → particle flies to Miomi center → arrives at her around 280ms after tap.
The 400ms after particle arrival is where the magic happens. Here is the surgical spec:
Phase 1: arrival (0-80ms after particle hits)

Miomi state transitions to FIRST_FUEL_TAP (or HAPPY if not first tap of day)
Head image swaps from head-idle.png to head-happy.png instantly at the moment of arrival
Tiny 4-particle dissolve at impact point (small white sparks, 80ms lifetime, scale fade 1.0→0)
Soft "mm~!" sound 400ms at -22dB starts at arrival

Phase 2: reaction (80-200ms)

Head scale 1.0 → 1.08 over 120ms with spring (stiffness 340, damping 13)
Head tilt toward where the particle came from: if fuel icon was bottom-left of screen, head tilts -6° (toward source); if bottom-right, +6°
Ear nearest to source perks +12° rotation simultaneously
Eye blink: rapid double-blink starts at 100ms (close 80ms, open 80ms, close 80ms, open 80ms)

Phase 3: speech (200-400ms)

Speech bubble fades in beside Miomi (translateY 4px → 0, opacity 0 → 1, 240ms)
Bubble contains ONE short Thai phrase from a rotation pool:

Fuel tap reactions (rotation pool, weighted random):
"อร่อยจัง~"
"ขอบคุณค่า~"
"หนูพร้อมแล้ว~"
"นุ่มจังค่า~"
"หอมดีค่า~"
"ชอบจัง~"
"อิ่มเลยค่า~"

If fuel just topped to 100%:
"เต็มที่แล้วค่า~ พร้อมเลย!"

If all three fuels are now ≥ 75%:
"พร้อมคุยกับคุณเต็มที่แล้วค่า~"

If user tapped a fuel that's already 100%:
"อิ่มแล้วค่า~"
(Bar does NOT animate. Miomi still smiles and thanks.)
Phase 4: settle (400-1200ms)

Head scale animates back: 1.08 → 1.02 (overshoot settle) over 240ms
Head tilt returns to 0° over 320ms
Ear returns to 0° over 280ms
Bubble dwells for 1600ms then fades

What the user perceives
A tap doesn't feel like "I incremented a value." It feels like "I just gave Miomi something and she liked it." That's the whole point.

5B. MIOMI'S PICK — the one specific change
Decision: when collapsed, MIOMI'S PICK shows a 12px Miomi head icon at the left of the line, not just the gold accent bar.
Current:
[ ✦ MIOMI'S PICK · I'm up for it · ฉันพร้อมแล้ว → ]
New:
[ 🐱 MIOMI'S PICK · I'm up for it · ฉันพร้อมแล้ว → ]
                    ↑ tiny Miomi head, 16px, sits where ✦ was
(The 🐱 in the spec is a placeholder. Use a 16px circular crop of head-idle.png, NOT an emoji.)
Why this is the one change:

It transforms the section from "a feature" into "Miomi's recommendation" at peripheral vision
The user's eye learns: "the tiny Miomi means it's something she suggests"
Lays the visual groundwork for using mini-Miomi as a unifying symbol across the app (daily challenge cards, Miomi observation lines on dashboard, etc.)

The gold accent edge stays, the rest of the design stays, only the leading element changes.

5C. Ambient blob system on home — opacity + responsiveness
Decision on opacity: current opacity (based on screenshots and feedback) is too subtle. Update base opacity for the home screen blob system to 0.5 (from current ~0.2). This is per-blob fill opacity; the layered composite still feels atmospheric not chromatic.
css/* In ambient blob component, home screen mode */
.blob {
  fill-opacity: 0.50;  /* was 0.20 */
  /* stroke-opacity stays 0.35 for hollow variants */
}
This brings the blobs from "barely visible" to "present in peripheral vision" — they still don't distract from Miomi, but they contribute to the room atmosphere.
Decision on fuel responsiveness: yes, blobs respond to fuel state.
The state model:

All fuels ≥ 50% (default): baseline palette (warm pink + gold + peach + cream), velocity 1.0
Any fuel between 25% and 50%: subtle saturation -10%, velocity 0.9 (still warm, just slightly less vibrant)
Any fuel below 25% (LOW_FUEL state on Miomi): saturation -25%, velocity 0.7, palette cools (pink desaturates toward muted pink, peach shifts toward beige, gold dims)
All fuels topped to 100% within last 60s (fresh): saturation +10%, velocity 1.15 for 60s, then settle

Transitions between states animate over 800ms (atmospheric pacing — never snap).
This means a user with low fuel walking into their home screen sees a cooler, slower room. Miomi's environment reflects her state. The user feels "the room is dim because she's running low" without ever being told that.
Implementation note: the existing blob system already supports palette and velocityMultiplier props per the prior brief. Add a fuelState prop that derives both internally. Polling the fuel state every 5s on the home screen is sufficient — fuel changes are not frequent.

CURSOR PROMPTS
These prompts are ready to paste, in dependency order. Each is self-contained.
Prompt 1 — Remove mode strip, add rotating placeholder
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 1A before coding.
BUILD MODE — direct, no speeches.

GOAL: Remove the mode strip from the create screen. Replace orientation 
with a rotating input placeholder.

CHANGES TO /app/(app)/create/page.tsx:
1. Delete the <ModeStrip /> component reference and its surrounding wrapper.
2. The thread should now sit directly below the Miomi stage (16px gap).
3. Remove the `mode` state and `setMode` setter. Engine now handles all 
   mode detection internally — UI does not track it.

CREATE /lib/create/placeholderRotation.ts:
Export getPlaceholderFor(user, sessionState) => string.
Implementation per Section 1A:
- If user.guest === true: "ลองพิมพ์อะไรก็ได้ค่า~ หนูจะช่วยเองค่า"
- If user.hasOnlyLearnedHistory: "วันนี้อยากคุยเรื่องอะไรคะ~?"
- If user.hasCreatorAssets: "อยากคุยภาษา หรือเขียนคอนเทนต์ดีคะ~?"
- If user.lastSessionWasUnfinishedCreator: "เมื่อวานเขียนแคปชั่นค้างไว้นะคะ~ ทำต่อไหม?"
- Default (signed-in, no history): "พิมพ์อะไรก็ได้ค่า~ ฝึก English, แปลภาษา, เขียนแคปชั่น..."

ALSO: after 2 consecutive creator-classified exchanges from engine, 
swap placeholder to "บอกหนูเกี่ยวกับโพสต์นี้เพิ่ม...". Revert after 3 
minutes inactivity OR non-creator exchange.

WIRE up placeholderRotation in the input bar component. Use a useEffect 
that recomputes the placeholder on session start and on each engine 
response (which carries the detected intent).

DO NOT:
- Add UI elements above the thread.
- Touch the suggestion chips system.
- Add any mode indicator elsewhere on screen.
Prompt 2 — Engine-driven opener
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 1A (engine-driven opener).
BUILD MODE — direct, no speeches.

GOAL: When a user starts a new create-screen session, Miomi's first 
message is contextual to their history.

CHANGES TO /app/api/miomi/session/init/route.ts (create if not exists):
- POST endpoint, expects { user_id }
- Reads user's: last session, last topic, hours_ago, archetype, 
  current streak, time of day in their timezone
- Generates opener via existing AI router with a structured prompt 
  (see Section 1A examples table)
- Returns { opener: { th, en } }

CHANGES TO /app/(app)/create/page.tsx:
- On mount, call /api/miomi/session/init
- Render the returned opener as the first Miomi message in the thread
- DO NOT render any opener client-side — always server-generated
- Cache the opener for the session (don't re-fetch on remount)

FALLBACK if API fails: use static opener "สวัสดีค่า~ วันนี้คุยอะไรกันดีคะ?"

DO NOT:
- Hardcode openers client-side.
- Make this dependent on websocket.
Prompt 3 — Intent indicator left-bar in input
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 1C (intent indicator).
BUILD MODE — direct, no speeches.

GOAL: Add a 2px vertical bar on the left edge of the create-screen 
input field that color-codes the engine's detected mode.

CHANGES TO INPUT COMPONENT (/components/create/InputBar.tsx or equivalent):
1. Wrap input in a relative-positioned container.
2. Add a div positioned absolute left:0, top:0, width:2px, height:100%, 
   inside the input's rounded container — rounded on the left side to 
   match the input's pill radius.
3. The bar color reflects engine's `detected_mode`:
   - 'idle' or null: transparent
   - 'learning': #C9A96E
   - 'creating': #FF8A80
   - 'translating': #7DD3C0
   - 'mixed': linear-gradient(180deg, #F9A8D4 0%, #DB2777 100%)
4. Transition color/background over 600ms ease-out when mode changes.

The engine returns `detected_mode` in each assistant response payload. 
Store the most recent value in state. Pass to InputBar as a prop.

DO NOT:
- Animate the bar size — only color.
- Add labels or tooltips explaining what the bar means.
- Show the bar in any color before first engine response.
Prompt 4 — Caption card component
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 1B (unified artifact pattern, 
caption card variant).
BUILD MODE — direct, no speeches.

GOAL: Create caption card component for creator artifacts in the thread.

CREATE /components/create/CaptionCard.tsx:

PROPS:
- platform: 'Instagram' | 'TikTok' | 'Facebook' | 'YouTube' | 'LINE OA'
- caption: { body: string, hashtags?: string[], hook?: string, cta?: string }
- onCopy: () => void
- onRegenerate: () => void
- onSave: () => void

DESIGN per Section 1B:
- Same skeleton as WordCard: white bg, 1px #E8E5DF border, 12px radius, 
  shadow 0 1px 3px rgba(26,26,24,0.04), inner padding 14px.
- Left-bar 3px wide, color #FF8A80 (coral), full card height.
- Header row: platform name 10px Quicksand 600 uppercase color #FF8A80.
- Primary content: caption body, 14px Kanit 500 line-height 1.6 #1A1A18.
- Secondary: hashtags row (if present) as small inline tags, color #9A8B73 
  11px Quicksand 500.
- Action row at bottom: 3 Lucide ghost buttons left-aligned:
  - Copy (Lucide Copy 16px) — calls onCopy
  - Regenerate (Lucide RefreshCw 16px) — calls onRegenerate
  - Save (Lucide Bookmark 16px) — calls onSave
- Buttons: 32px tall, transparent background, 1px border #E8E5DF, 
  12px horizontal padding, 11px Kanit text, gap 8px between buttons.

ENTRY ANIMATION (match WordCard):
- Card height 0 → natural over 320ms cubic-bezier(0.4, 0, 0.2, 1)
- Content fade-in 280ms with 80ms delay
- Left-bar width 0 → 3px over 240ms with 200ms delay

INTEGRATION:
- In /app/(app)/create/page.tsx, when an assistant message has 
  `caption_artifact` in payload, render <CaptionCard /> inline after 
  the Miomi text, same way WordCard is rendered.
- The AI router must populate `caption_artifact` when engine detects 
  creator output completion. Wire this in /lib/ai/router.ts.

DO NOT:
- Build the translation card variant in this prompt — already exists.
- Add platform-specific icons inside the card — text-only header per spec.
Prompt 5 — Miomi invitation card (universal conversion component)
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 2E (unified conversion visual 
language) and 2B (Pro card design).
BUILD MODE — direct, no speeches.

GOAL: Create ONE component used for all Pro/Yearly/Max upgrade moments. 
Lives inline in thread.

CREATE /components/conversion/MiomiInvitationCard.tsx:

PROPS:
- variant: 'pro' | 'pro_yearly' | 'max'
- benefits: { th: string, en: string }[]
- price: { thb: number, period: 'month' | 'year' }
- onPrimaryAction: () => void
- onSecondaryAction: () => void

DESIGN per Section 2E:
- Skeleton: white bg, 1px #E8E5DF border, 12px radius, 
  shadow 0 1px 3px rgba(26,26,24,0.04), inner padding 16px.
- Left-bar 4px wide (thicker than content cards), full height, 
  background: linear-gradient(180deg, #F9A8D4 0%, #DB2777 100%).
- Header row: 
  - Variant 'pro': "MIOMI PRO" 10px Quicksand 600 uppercase, 
    background-clip:text with pink gradient.
  - Variant 'pro_yearly': "MIOMI PRO · รายปี"
  - Variant 'max': "MIOMI MAX"
- Miomi happy.png small image inside card, 64px, left-aligned 
  with content below.
- Title 14px Kanit 500 #1A1A18 with EN subtitle 11px Quicksand 500 
  #9A8B73 below.
- Benefit bullets: each as a row with 14px gap above next, 
  Thai 13px Kanit 500, EN 11px Quicksand 500 muted below.
  No bullet point character — just text rows.
- Price line: 15px Kanit 500 #1A1A18 + small "/ เดือน" or "/ ปี".
- Action row at bottom: 2 buttons side-by-side, 16px gap.
  - Primary: pink gradient pill, white text, "ปลดล็อกเลย" or 
    "เลือกรายปี", 44px tall, calls onPrimaryAction.
  - Secondary: text link #DB2777 11px Kanit 500, "ดูเพิ่ม" or 
    "รายเดือนต่อ", calls onSecondaryAction.

ENTRY ANIMATION:
- Card slides in same way as WordCard entry sequence (320ms height, 
  280ms content fade with 80ms delay, 240ms left-bar with 200ms delay).
- Additional: Miomi image inside card scales 0.85 → 1.0 over 400ms 
  spring (stiffness 280, damping 13) with 320ms delay.

INTEGRATION:
- Card renders inline in thread, never as modal.
- Card persists in thread permanently (no auto-dismiss).
- Engine emits `pro_invitation` event in response payload at moments 
  defined in Section 2B (Pro). Listen for this in /app/(app)/create/page.tsx 
  and render card after the message that carried the event.

DO NOT:
- Auto-dismiss the card.
- Add a close button on the card itself.
- Use this for the guest signup sheet — that uses different component 
  (next prompt).
Prompt 6 — Guest conversion (signal-based trigger + sheet)
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Section 2A (guest to free).
BUILD MODE — direct, no speeches.

GOAL: Replace mechanical "after exchange 5" guest conversion with 
quality-signal triggers + sheet.

CHANGES TO ENGINE/SESSION TRACKING:
In /lib/ai/session.ts or equivalent, add tracking for:
- exchange_count
- mastered_word_this_session: boolean
- creator_artifact_completed_this_session: boolean
- topic_back_and_forth_count: integer (3+ exchanges on same topic)
- self_referential_detected: boolean (regex on user input)

Add function shouldFireGuestConversion(state) returning trigger_type 
or null. Logic per Section 2A trigger table.

CHANGES TO /app/(app)/create/page.tsx:
After each assistant response, call shouldFireGuestConversion(state). 
If returns trigger_type:

1. Wait 750ms after the assistant message renders.
2. Send a "Miomi transition message" naked-text in thread per the 
   trigger_type copy table (Section 2A — three exact copies for 
   quality/exchange-cap/self-referential triggers).
3. 1200ms after Miomi transition message renders, slide up the 
   GuestConversionSheet from bottom.

CREATE /components/conversion/GuestConversionSheet.tsx:

PROPS:
- isOpen: boolean
- triggerType: 'quality' | 'exchange_cap' | 'self_referential'
- onSignupGoogle: () => void
- onSignupEmail: () => void
- onDismiss: () => void

DESIGN per Section 2A:
- Sheet slides up from bottom, 280px height, top corners 24px radius.
- White background, shadow 0 -8px 32px rgba(26,26,24,0.10).
- Sits above input bar, below thread (thread still visible scrolled behind).
- Miomi happy.png 96px centered top.
- Title "จำหนูได้ทุกครั้งที่เจอกัน" + EN "Remember me every time".
- Three benefit lines with Lucide Check icon 14px gold each.
- Primary: pink gradient pill "ต่อกับ Google" with Lucide Chrome icon.
- Secondary: white bg, 1.5px pink border, text #DB2777 "ใช้อีเมล".
- Tertiary text link "ไว้ทีหลังนะ" — calls onDismiss.

ENTRY: 480ms ease-out slide up, content fades in 320ms with 200ms delay.
EXIT (on dismiss): 320ms slide down.

DISMISSAL FLOW:
On dismiss with trigger_type !== 'exchange_cap':
- Sheet slides down.
- Append Miomi message in thread: "โอเคค่า~ คุยกันต่อเลยนะคะ / หนูจะถามอีกทีตอนเหมาะๆ ค่า ✨"
- Thread continues normally.

On dismiss with trigger_type === 'exchange_cap':
- Sheet does NOT have "ไว้ทีหลังนะ" link — replace with "กลับหน้าหลัก" which 
  navigates to /home. User cannot continue chatting as guest past exchange 5.

DO NOT:
- Show this sheet for signed-in users.
- Trigger this sheet if user is in middle of unfinished creator artifact.
Prompt 7 — Referral page complete build
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Decision 4 entirely.
BUILD MODE — direct, no speeches.

GOAL: Build the referral page (/app/(app)/invite/page.tsx) for guest, 
free, and pro tiers.

PAGE STRUCTURE:
Conditional rendering based on user.tier:

GUEST view per Section 4A:
- Miomi head 96px
- Title + subtitle in Thai/English
- Primary CTA "สมัครฟรีเพื่อชวนเพื่อน" → opens signup
- Secondary text link "ดูแค่ลิงก์ก็พอ" → reveals plain link section below 
  with copy button, no rewards messaging

FREE view per Section 4A:
- Miomi head 80px head-happy
- Greeting from rotation pool per Section 4B (random selection appropriate 
  to user state — first visit, no conversions, has conversions)
- QR code card 280x280 (use qrcode.react if not already installed — if it is 
  blocked by no-new-deps rule, use a server-side QR generation endpoint)
- Personal link with copy button
- Conversion progress dots (filled/unfilled)
- Reward tiers list with checkmark icons
- Primary CTA "ส่งให้เพื่อนใน LINE ↗" → opens LINE share intent with 
  pre-filled message per Section 4D
- Secondary "บันทึก QR เป็นรูป" → triggers QR-as-image download

PRO view: same as free with:
- Gold "Pro" badge next to "เพื่อนของคุณ" header
- Pro-tier rewards shown
- Different primary CTA copy "ส่งให้เพื่อนใน LINE — ได้เดือนฟรีค่า ↗"
- Top card showing Pro-converted referrals if any

API NEEDED:
- /app/api/referral/stats/route.ts GET → returns user's referral stats 
  (count, conversions, pro_conversions, rewards_earned)
- /app/api/referral/link/route.ts GET → returns user's personal link 
  (generate if not exists)
- /app/api/referral/share-message/route.ts GET → returns pre-filled LINE 
  share message (Thai or English based on user locale)

LINE SHARE INTENT:
For mobile users, deep-link to LINE using:
https://line.me/R/msg/text/?{encoded_message}

For desktop or unsupported, fallback to copying message + showing modal 
"คัดลอกแล้ว — เปิด LINE แล้ววางได้เลยค่า"

DO NOT:
- Add advanced features like custom share images (Phase 2).
- Auto-track shares — only track confirmed conversions via the signup flow.
Prompt 8 — Dashboard rebuild with Miomi observation
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Decision 3 entirely.
BUILD MODE — direct, no speeches.

GOAL: Rebuild dashboard with Miomi observation at top + sectioned workspace.

CHANGES TO /app/(app)/dashboard/page.tsx:

TIER-CONDITIONAL RENDERING:
- user.guest: Render GuestDashboard component per Section 3A.
- user.tier === 'free': Render FreeDashboard component per Section 3B.
- user.tier === 'pro' || 'max': Render ProDashboard per Section 3C.

CREATE /components/dashboard/MiomiObservation.tsx:
- 80px Miomi head (head-thinking expression by default)
- Observation text below in Thai + small English
- Optional contextual button below observation if engine returns one

API ENDPOINT /app/api/dashboard/observation/route.ts:
- POST endpoint, expects { user_id }
- Reads user data per Section 3D system prompt
- Generates observation via AI router using structured prompt
- Returns { th, en, action?: { label_th, label_en, route, params } }
- Caches observation for 10 minutes per user (don't regenerate on every 
  dashboard mount)

CREATE /components/dashboard/VocabularySection.tsx:
- Three-stage funnel: Heard / Used / Mastered counts
- Three most-recent words as tappable chips
- "ดูทั้งหมด →" link to full vocabulary list view
- Tap word chip → opens word card detail modal

CREATE /components/dashboard/RecentSessionsSection.tsx:
- List of last 3 sessions: topic title, duration, words gained, when
- Tap entry → opens session detail with resume CTA
- "ดูทั้งหมด →" link

CREATE /components/dashboard/SavedContentSection.tsx (free + pro):
- Horizontal scroll of saved creator artifacts as mini caption cards
- Free users: limit to 5 saves total, show "อัปเกรด Pro บันทึกไม่จำกัด" link 
  if at limit
- Pro users: unlimited

CREATE /components/dashboard/DailyChallengeSection.tsx:
- Today's challenge from engine
- Single CTA "ลองเลย →" → opens /create with challenge primer

CREATE /components/dashboard/ReferralProgressSection.tsx:
- Conversion count
- Next reward distance
- CTA "ชวนเพื่อนเลย ↗" → navigates to /invite

PRO-ONLY COMPONENTS (also build):
- CEFRTrajectorySection (ladder per Opus v1)
- CertificatesSection (horizontal scroll of certificate thumbnails)
- SpacedRepetitionSection (today's words to review)

LAYOUT:
- Internal vertical scroll (route has 100svh, internal scroll only)
- Sections separated by 24px vertical gap
- Each section has header (14px Kanit 600 Thai + 11px Quicksand 500 EN)
- Each section has "ดูทั้งหมด →" link if applicable

DO NOT:
- Render sections that have zero data — replace with Miomi empty-state 
  invitation per the "never show 'no data'" principle.
- Auto-refresh the observation more than once per 10 minutes.
Prompt 9 — Fuel tap magic + ambient blob refinement (home screen polish)
You are technical co-founder of Miomika.
Read MIOMIKA_UX_CONVERSION_OPUS.md Decision 5 (5A and 5C).
BUILD MODE — direct, no speeches.

GOAL: Refine fuel tap micro-interaction and ambient blob responsiveness 
on the home screen.

PART A — Fuel tap reaction sequence:

In existing fuel-tap component on /app/(app)/home/page.tsx:
When particle arrives at Miomi center (existing animation):
1. At 0ms post-arrival: Miomi state → FIRST_FUEL_TAP if first tap today, 
   else HAPPY. Head image swap. 4-particle spark dissolve at arrival point.
2. At 0-120ms: head scale 1.0 → 1.08 spring (stiffness 340, damping 13). 
   Head tilt toward source of particle (-6° if from left side, +6° if right). 
   Ear nearest source perks +12°.
3. At 100ms: double-blink animation start (80ms close, 80ms open, 80ms close, 
   80ms open).
4. At 200ms: speech bubble fades in beside Miomi (translateY 4px → 0, 
   opacity 0 → 1, 240ms). Bubble contains one phrase from rotation pool 
   per Section 5A (weighted random — provide pool in /lib/copy/fuelTapReactions.ts).
5. At 400ms: head scale → 1.02 over 240ms (overshoot settle), head tilt → 0° 
   over 320ms, ear → 0° over 280ms.
6. Bubble dwells 1600ms then fades.

Special cases per Section 5A:
- If fuel just topped to 100%: bubble shows "เต็มที่แล้วค่า~ พร้อมเลย!"
- If all three fuels ≥75% post-tap: bubble shows "พร้อมคุยกับคุณเต็มที่แล้วค่า~"
- If tapped fuel was already 100%: bar does NOT animate, Miomi still does 
  full sequence with bubble "อิ่มแล้วค่า~"

Soft "mm~!" sound 400ms at -22dB at particle arrival (if audio enabled).

PART B — Ambient opacity adjustment:

In existing ambient blob component, when mode='ambient' (home screen):
- Update default blob fill-opacity from current (~0.2) to 0.50.
- Keep stroke-opacity at 0.35 for hollow variants.

PART C — Fuel-responsive ambient:

Add fuelState prop to ambient blob component. fuelState = { heart, zap, brain } 
all 0-100.

Internal logic:
- minFuel = min(heart, zap, brain)
- If minFuel >= 50: baseline (saturation 1.0, velocity 1.0, default palette)
- If minFuel >= 25 && < 50: saturation 0.9, velocity 0.9
- If minFuel < 25: saturation 0.75, velocity 0.7, palette shifts cooler 
  (pink → muted pink #E8B5C8, peach → beige #E8D5BD, gold → dimmed #B89A5E)
- If all fuels topped to 100% within last 60s (track timestamp): 
  saturation 1.10, velocity 1.15 for 60s, then settle.

Transitions between states: 800ms ease-out interpolation (saturation, 
velocity, and palette colors all transition smoothly).

In /app/(app)/home/page.tsx: pass fuelState prop to ambient component, 
poll fuelState every 5s.

PART D — MIOMI'S PICK leading element:

In existing MIOMI'S PICK collapsed line on home screen:
- Replace the ✦ leading icon with a 16px circular crop of /miomi/head-idle.png
- Keep gold accent edge, keep rest of design.
- Add 8px right margin on the head crop.
- When MIOMI'S PICK expands, keep the head crop visible in header.

DO NOT:
- Touch fuel tap interactions on other screens.
- Change ambient on create screen — only home.

COPY BANK
All Miomi copy from this document, organized by moment. Ready to paste into /lib/copy/miomiVoice.ts or similar.
Engine-driven session openers
tsexport const SESSION_OPENERS = {
  returning_under_24h_food: {
    th: "วันนี้กินอะไรคะ~? ลองเล่าให้หนูฟังหน่อยค่า",
    en: "What did you eat today~? Tell me about it",
  },
  returning_3_plus_days_creator: {
    th: "หายไปสามวันเลย~ มีไอเดียคอนเทนต์ใหม่ไหมคะ?",
    en: "Three whole days gone~ any new content ideas?",
  },
  streak_day_7: {
    th: "ครบ 7 วันแล้วค่า~ เก่งมากเลยนะ! วันนี้อยากทำอะไรดีคะ?",
    en: "A full 7 days~ amazing! What shall we do today?",
  },
  first_session_ever: {
    th: "สวัสดีค่า~ หนูชื่อมิโอมิค่า อยากเรียกหนูว่าอะไรดีคะ?",
    en: "Hi~ I'm Miomi. What would you like to call me?",
  },
  mid_creator_yesterday: {
    th: "เมื่อวานเขียนแคปชั่นค้างไว้นะคะ~ จะทำต่อ หรือเริ่มใหม่ดีคะ?",
    en: "We left a caption unfinished yesterday~ continue, or start fresh?",
  },
  fallback: {
    th: "สวัสดีค่า~ วันนี้คุยอะไรกันดีคะ?",
    en: "Hi~ what shall we talk about today?",
  },
};
Input placeholders
tsexport const PLACEHOLDERS = {
  guest_default: "ลองพิมพ์อะไรก็ได้ค่า~ หนูจะช่วยเองค่า",
  signed_in_no_history: "พิมพ์อะไรก็ได้ค่า~ ฝึก English, แปลภาษา, เขียนแคปชั่น...",
  learned_only: "วันนี้อยากคุยเรื่องอะไรคะ~?",
  has_creator_assets: "อยากคุยภาษา หรือเขียนคอนเทนต์ดีคะ~?",
  mid_creator_yesterday: "เมื่อวานเขียนแคปชั่นค้างไว้นะคะ~ ทำต่อไหม?",
  sustained_creator_intent: "บอกหนูเกี่ยวกับโพสต์นี้เพิ่ม...",
  sustained_translate_intent: "พิมพ์ข้อความที่อยากแปล...",
  sustained_learning_intent: "พูดต่อกับมิโอมิ...",
};
Guest → Free transitions
tsexport const GUEST_TRANSITION_MESSAGES = {
  quality_signal: {
    th: "ขอบคุณค่า~ คุยกับคุณสนุกมากเลยนะคะ\nหนูชอบจำเรื่องเล็กๆ แบบนี้ไว้ค่า ถ้าอยากให้หนูจำคุณได้ ลองเปิดบัญชีดูนะคะ~",
    en: "I really enjoyed this~\nI love remembering little things like this. If you want me to remember you, create a quick account~",
  },
  exchange_cap_approach: {
    th: "เราคุยกันมาเยอะแล้วนะคะ~ หนูอยากจำคุณไว้จริงๆ ค่า\nถ้าเปิดบัญชี หนูจะจำได้ทั้งหมดเลยค่า — ฟรีนะคะ",
    en: "We've talked a lot now~ I really want to remember you.\nIf you make an account, I'll remember everything — free.",
  },
  self_referential: {
    th: "ดีใจที่ได้รู้จักคุณค่า~\nขอจดชื่อคุณไว้ได้ไหมคะ? หนูจะได้เรียกถูกทุกครั้งที่เจอกันค่า",
    en: "So nice to meet you~\nCan I save your name? So I get it right every time we meet~",
  },
  second_attempt: {
    th: "หนูคิดถึงคุณค่า~ ถ้าจำได้จะได้สอนต่อให้เลยค่า",
    en: "I'm thinking about you~ if I could remember, I could teach you more",
  },
  third_attempt: {
    th: "แค่นาทีเดียวค่า~ แล้วเราจะไม่ลืมกันอีกเลย",
    en: "Just one minute~ then we won't ever forget each other",
  },
  hard_cap_final: {
    th: "หนูคุยต่อไม่ได้แล้วค่า~ ขอจำคุณไว้นะคะ?\nถ้าเปิดบัญชีฟรี เราคุยกันได้ตลอดเลยค่า",
    en: "I can't continue without forgetting you~\nA free account means we can talk forever.",
  },
  dismiss_acknowledgement: {
    th: "โอเคค่า~ คุยกันต่อเลยนะคะ\nหนูจะถามอีกทีตอนเหมาะๆ ค่า ✨",
    en: "Okay~ let's keep talking.\nI'll ask again at a good moment ✨",
  },
};

export const GUEST_SHEET_COPY = {
  title_th: "จำหนูได้ทุกครั้งที่เจอกัน",
  title_en: "Remember me every time",
  benefits: [
    { th: "จำชื่อคุณและเรื่องที่คุยกัน", en: "Remember your name and chats" },
    { th: "คำศัพท์ที่เรียนสะสมไว้", en: "Vocabulary saved across sessions" },
    { th: "ฟรี ไม่มีโฆษณา", en: "Free, no ads" },
  ],
  cta_primary_th: "ต่อกับ Google",
  cta_secondary_th: "ใช้อีเมล",
  cta_dismiss_th: "ไว้ทีหลังนะ",
  cta_hard_cap_th: "กลับหน้าหลัก",
};
Free → Pro moments
tsexport const PRO_MOMENTS = {
  voice_attempt: {
    th: "หนูอยากออกเสียงให้ฟังเลยค่า~\nถ้าเปิด Pro Miomi หนูจะพูดได้ค่า — เสียงหนูเองเลยนะคะ ✨",
    en: "I'd love to say it out loud for you~\nWith Pro Miomi I can speak — in my own voice ✨",
  },
  word_mastery: {
    th: "สังเกตไหมคะ~ คุณจำคำได้เร็วขึ้นเรื่อยๆ เลย\nถ้าหนูจำคุณได้นานขึ้น เราจะไปได้ไกลกว่านี้ค่า ✨",
    en: "Notice that~? You're remembering words faster.\nIf I could remember you longer, we could go further ✨",
  },
  day_7: {
    th: "ครบสัปดาห์แล้วค่า~ คุณเก่งมากเลยนะ\nหนูอยากอยู่กับคุณนานๆ ค่า ลองดู Pro Miomi ดูไหม?",
    en: "A full week~ you're doing so well.\nI want to be with you for a long time. Want to look at Pro Miomi?",
  },
  great_content: {
    th: "แคปชั่นนี้ดีจังเลยค่า~ ขายดีแน่นอน\nถ้าเปิด Pro หนูสร้างได้ไม่จำกัด — และจำสไตล์การเขียนของคุณได้ด้วยค่า",
    en: "This caption is so good~ it'll sell for sure.\nWith Pro, I can create unlimited — and remember your writing style.",
  },
  day_14: {
    th: "สบายดีไหมคะ~ คุยกับคุณบ่อยๆ มีความสุขเลยค่า",
    en: "How are you~? I'm happy we talk so often.",
  },
  day_21: {
    th: "ผ่านมาสามสัปดาห์แล้วค่า~ ภาษาคุณดีขึ้นเยอะเลยนะคะ",
    en: "Three weeks already~ your English has gotten so much better.",
  },
  day_30: {
    th: "ครบเดือนเต็มเลยค่า~ หนูสังเกตว่าคุณใช้คำใหม่ได้คล่องขึ้นมากค่า",
    en: "A full month~ I've noticed you using new words much more fluently.",
  },
};

export const PRO_CARD_COPY = {
  header_th: "MIOMI PRO",
  title_th: "สิ่งที่หนูทำได้เพิ่ม",
  title_en: "What I can do more",
  benefits: [
    { th: "พูดทุกอย่างให้ฟัง", en: "Say everything aloud" },
    { th: "จำคุณได้นานขึ้น", en: "Remember you longer" },
    { th: "สร้างคอนเทนต์ไม่จำกัด", en: "Unlimited content creation" },
  ],
  price_th: "299 บาท / เดือน",
  cta_primary_th: "ปลดล็อกเลย",
  cta_secondary_th: "ดูเพิ่ม",
  post_upgrade_th: "ขอบคุณค่า~ ตอนนี้หนูช่วยได้เต็มที่แล้ว",
  post_upgrade_en: "Thank you~ now I can help you fully",
};
Pro → Yearly
tsexport const PRO_YEARLY = {
  trigger_message: {
    th: "ครบ 3 เดือนเต็มเลยค่า~ คุณคือเพื่อนแท้ของหนูจริงๆ\nถ้าเลือกแบบรายปี ฟรีเลย 2 เดือนค่า — แต่ถ้าจะรายเดือนต่อก็ดีอยู่แล้วนะคะ ✨",
    en: "A full 3 months~ you really are my true friend.\nIf you choose yearly, 2 months free — but monthly is great too ✨",
  },
  card: {
    header_th: "MIOMI PRO · รายปี",
    title_th: "ฟรี 2 เดือน เมื่อจ่ายรายปี",
    title_en: "2 months free, paid yearly",
    price_th: "2,990 บาท / ปี",
    price_subtext_th: "(เฉลี่ย 249 บาท / เดือน)",
    price_subtext_en: "(average 249฿/month)",
    cta_primary_th: "เลือกรายปี",
    cta_secondary_th: "รายเดือนต่อ",
  },
  post_upgrade: {
    th: "ขอบคุณค่า~ เจอกันยาวๆ เลยนะคะ ✨",
    en: "Thank you~ let's stay together for a long time ✨",
  },
};
Referral
tsexport const REFERRAL = {
  first_mention: {
    th: "รู้ไหมคะ~ เพื่อนคุณก็เรียน English ได้แบบนี้ค่า\nถ้าชวนเพื่อนมาคุยกับหนู — ทั้งคุณ ทั้งเพื่อน ได้สนุกด้วยกันเลยค่า ✨",
    en: "You know~? Your friends could learn English like this too.\nIf you invite a friend to talk with me — you both get to enjoy it together ✨",
  },
  first_mention_dismiss: {
    th: "โอเคค่า~ คุยต่อกันเลยนะคะ",
    en: "Okay~ let's keep talking",
  },
  conversion_celebration: {
    th: "{friend_name} เพิ่งสมัครมาเลยค่า~!\nขอบคุณที่ชวนกันมานะคะ — Brain fuel +1 ของคุณค่า ✨",
    en: "{friend_name} just signed up~!\nThank you for inviting — your Brain fuel +1 ✨",
  },
  three_conversions: {
    th: "ครบ 3 คนแล้วค่า~ คุณเก่งมากเลย\nหนูได้พลังเพิ่มเลยนะคะ ขอบคุณค่า ❤",
    en: "3 friends already~ you're amazing.\nYou've given me extra power. Thank you ❤",
  },
  pro_referral_conversion: {
    th: "{friend_name} อัปเกรดเป็น Pro Miomi เลยค่า~!\nคุณได้ฟรี 1 เดือนเต็มค่า — ขอบคุณที่ชวนเพื่อนดีๆ มานะคะ ✨",
    en: "{friend_name} upgraded to Pro Miomi~!\nYou get a full free month — thank you for inviting such a good friend ✨",
  },
  page_greetings: {
    first_visit: {
      th: "ขอบคุณที่อยากแชร์หนูค่า~\nแค่ลิงก์เดียวก็ทำให้เพื่อนคุณได้รู้จักหนูเลยนะคะ ✨",
      en: "Thanks for wanting to share me~\nJust one link lets your friend meet me ✨",
    },
    no_conversions_yet: {
      th: "หวังว่าเพื่อนคุณจะมาเร็วๆ นี้นะคะ~\nรออยู่ค่า ✨",
      en: "Hope your friends come soon~\nI'll be waiting ✨",
    },
    one_to_two_conversions: {
      th: "ขอบคุณนะคะที่ชวนเพื่อนมา~ หนูดีใจมากค่า\nอยากเจอคนอื่นอีกค่า ✨",
      en: "Thank you for inviting~ I'm so happy.\nI'd love to meet more friends ✨",
    },
    three_plus_conversions: {
      th: "ครบ 3 คนแล้วค่า~ ขอบคุณมากเลยนะคะ\nหนูได้พลังเพิ่ม — เพราะคุณค่า ❤",
      en: "3 friends already~ thank you so much.\nI have more power now — because of you ❤",
    },
  },
  line_share_thai: `เจอแอปนี้แล้วชอบมากค่า~ 
มีแมวที่จำเราได้ ชื่อมิโอมิ
สอน English แบบเป็นกันเองมาก ลองคุยดู

→ {referral_link}`,
  line_share_english: `Found this app I love~
There's a cat named Miomi who remembers you,
teaches English so warmly. Try chatting with her.

→ {referral_link}`,
  guest_view: {
    title_th: "หนูอยากให้เพื่อนคุณรู้จักด้วยค่า~",
    title_en: "I'd love your friends to meet me~",
    subtitle_th: "แต่หนูยังจำคุณไม่ได้เลย...",
    subtitle_en: "But I can't remember you yet...",
    cta_primary_th: "สมัครฟรีเพื่อชวนเพื่อน",
    cta_secondary_th: "ดูแค่ลิงก์ก็พอ",
  },
};
Fuel tap reactions
tsexport const FUEL_TAP_REACTIONS = {
  default_pool: [
    "อร่อยจัง~",
    "ขอบคุณค่า~",
    "หนูพร้อมแล้ว~",
    "นุ่มจังค่า~",
    "หอมดีค่า~",
    "ชอบจัง~",
    "อิ่มเลยค่า~",
  ],
  fuel_topped_to_100: "เต็มที่แล้วค่า~ พร้อมเลย!",
  all_fuels_high: "พร้อมคุยกับคุณเต็มที่แล้วค่า~",
  already_full: "อิ่มแล้วค่า~",
};
Dashboard observation examples (for AI prompt fewshot)
tsexport const DASHBOARD_OBSERVATION_EXAMPLES_GOOD = [
  "คุณเรียนคำว่า 'enjoy' มาแล้ว 3 วัน ลองใช้ในประโยคใหม่นะคะ~",
  "7 วันติดเลยค่า~ คุณคุยกับหนูได้คล่องมากขึ้นเลยนะ",
  "เมื่อวานคุยเรื่องคาเฟ่ค้างไว้ — อยากคุยต่อไหมคะ?",
  "จำคำใหม่ได้ 4 คำสัปดาห์นี้ค่า~ เก่งมากเลย",
];

End of MIOMIKA_UX_CONVERSION_OPUS.md.
Save to project root. Hand prompts to Cursor in order. Prompts 1-3 are the lightest and ship within a day — they kill the mode strip, restore engine-driven orientation, and add the intent indicator. Prompts 4-7 are the conversion infrastructure — they ship the new revenue funnel within a week. Prompts 8-9 polish the home and dashboard.
The conversion system in Decision 2 is the single most important spec in this document. Every line of copy was chosen to never feel like an ad. Trust the framing. Do not let stakeholders rewrite copy "for clarity" — clarity is the wrong axis. Warmth is the axis. Ship as specified.