# MIOMIKA — MASTER CHECKLIST v3
> Last updated: May 15, 2026 — End of Session 3
> Rule: Update this document every session. Never lose an idea or task.
> Read BRIEF_v3.md first. This checklist means nothing without that context.

---

## STATUS LEGEND
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked — needs decision or resource
- [*] Idea — not scheduled yet

---

## THE FOUR FOUNDATIONS — DO THESE BEFORE ANYTHING ELSE

These are not features. These are the minimum for the product to be credible.
Nothing new gets built until all four are done.

### FOUNDATION 1 — Mobile feels native (no frame, edge to edge)
- [ ] html and body: `overflow: hidden; background: #FFFFFF`
- [ ] Every screen exactly 100dvh, zero page scroll
- [ ] App background white everywhere — no gray shell visible
- [ ] Content bleeds edge to edge — feels installed like Line/Shopee
- [ ] Bottom nav icons positioned correctly (not too low, safe area insets)
- [ ] Remove any visible frame or container around the app
- [ ] Test on real phone: iPhone and Android

### FOUNDATION 2 — Miomi feels alive on home
- [ ] Miomi minimum 55% screen height
- [ ] Breathing animation running always (scale 1.0→1.03, 3s loop)
- [ ] Tap: bounce + wiggle + rotating Thai speech bubble (5 messages)
- [ ] Feed button: happy expression + bounce + hunger bar fills + XP earned
- [ ] Play button: bounce sequence + energy bar fills + XP earned
- [ ] Sleep after 30s inactivity (sleep expression, gentle breathing)
- [ ] Wake animation when user returns (excited jump)
- [ ] Random position drift every 8-12 seconds (8px left/right)
- [ ] NO frame, circle, or container around Miomi — ever
- [ ] XP system: numbers increment visibly when earned
- [ ] Level display: shows current level, progress to next

### FOUNDATION 3 — Create screen is real conversation, not a form
- [ ] Remove platform/tone/language selector from user's face
  (hide in collapsible advanced section or remove entirely)
- [ ] Miomi opens conversation first — never waits for user
- [ ] Opening line: "วันนี้จะสร้างอะไรดีคะ~ บอกมิโอมิได้เลยนะคะ"
- [ ] Miomi extracts platform from what user says (not from form)
- [ ] Miomi extracts language from how user speaks (not from form)
- [ ] Miomi asks smart follow-up if she doesn't know:
      niche, platform, content type, specific topic
- [ ] ONE question at a time — never a list of questions
- [ ] Voice input: `lang='th-TH'` always
- [ ] Voice input: process `isFinal` results ONLY — fix repeat bug
- [ ] Voice: 1.5s silence detection = user finished speaking
- [ ] Miomi switches to thinking expression while generating
- [ ] Miomi switches to happy expression when done
- [ ] Output presented as gift: "นี่คือของขวัญจากหนูนะคะ~"
- [ ] Chain continues naturally after each output:
      hook → caption → hashtags → CTA → comment replies → done
- [ ] Each chain step: Miomi offers, user accepts or declines
- [ ] End of chain: celebration + "สร้างอีกไหมคะ?" option

### FOUNDATION 4 — Guest experience is generous
- [ ] Zero login wall — guest goes directly to home screen with Miomi
- [ ] Guest gets real AI output (3 per session, Claude Haiku)
- [ ] Miomi is fully alive and reactive for guests
- [ ] Pet interactions (feed, play) work for guests (no AI cost)
- [ ] Signup invitation comes FROM Miomi emotionally:
      "อยากให้หนูจำชื่อคุณได้ไหมคะ~ จะได้เรียกคุณว่าที่รักได้นะคะ"
- [ ] NO forced walls before user feels the product
- [ ] After 3 guest outputs: Miomi gently says she wants to remember them
- [ ] Guest can still play with Miomi after limit — just no more generation
- [ ] ANTHROPIC_API_KEY added to Vercel environment variables
- [ ] Real content generation tested and working end to end

---

## PHASE 1 — MVP (Current sprint)

### Infrastructure — done
- [x] Next.js 14 project created
- [x] Supabase connected — schema, RLS, auth
- [x] All 5 screens built and working locally
- [x] Deployed to Vercel
- [x] miomika.com domain connected
- [x] Mobile shell — 390px centered (needs edge-to-edge fix)
- [x] Guest mode — no login wall on home
- [x] Miomi breathing animation
- [x] Miomi entrance animation on first load
- [x] Tap interaction — bounce + speech bubble

### Infrastructure — still needed
- [!] ANTHROPIC_API_KEY — add to Vercel env vars (go to console.anthropic.com, add $5)
- [ ] Test real content generation end to end
- [ ] Custom SMTP — Resend.io for branded emails
- [ ] Favicon — Miomi PNG as favicon
- [ ] Google OAuth (Thai users expect this)
- [ ] LINE OAuth (critical for Thai market)
- [ ] Stripe payments setup

### Known bugs — fix immediately
- [ ] Voice input repeat bug (interim results being processed — use isFinal only)
- [ ] Miomi clips outside container on Create screen mobile
- [ ] Slight scroll still happening on some screens
- [ ] Create screen: platform/tone forms feel wrong — redesign as conversation
- [ ] Bottom nav icons too low on some devices

---

## PHASE 2 — GROWTH (Month 2-4)

### Desktop UI — full redesign
Current desktop is broken. Do not touch until mobile is perfect.

Vision:
- Left panel: Miomi alive (large, animated), pet stats, navigation
- Center: professional content workspace (Figma/Canva feeling)
- Right: history, saved outputs, insights
- Top bar: Miomika logo, tier badge, upgrade CTA
- Reference: Figma, Canva, Vidu AI

### Character system
- [ ] Companion Store screen designed
- [ ] Character 2: K-pop Bunny (Korean culture + language)
- [ ] Character 3: The Wise Fox (strategy + analytics)
- [ ] Character 4: Anime Hero (gaming + storytelling)
- [ ] Character 5: Gen-Z Street Girl (TikTok + viral content)
- [ ] Character unlock flow: Miomi introduces them personally
- [ ] Character preview: personality, voice sample, example output

### Pet mechanics — deeper
- [ ] Rive animation file integrated (when file is ready from founder)
- [ ] Walking/running animation
- [ ] Feeding animation (real food item visual)
- [ ] Playing animation (Miomi chases something)
- [ ] Level-up celebration animation
- [ ] Outfit/dress-up store
- [ ] Seasonal limited items

### Memory system
- [ ] Guest: zero memory confirmed
- [ ] Free: name + niche stored in Supabase
- [ ] Paid starter: style + tone preferences stored
- [ ] Paid creator: full conversation history stored
- [ ] Pro: custom tone model (learns user's voice)

### Monetization
- [ ] Stripe subscription tiers (THB):
      Guest: free, 3 outputs/session
      Free: 0 THB, 10 outputs/month
      Starter: 299 THB/month, 100 outputs
      Creator: 599 THB/month, unlimited
      Pro: 1,299 THB/month, team + custom tone
- [ ] Upgrade experience: Miomi asks in her voice, not a pricing table
- [ ] Referral system:
      +20 outputs when friend signs up
      1 free month when friend goes paid
      Referred friend gets +20 bonus outputs
- [ ] Coupon code system

### Retention mechanics
- [ ] Push notifications — Miomi's morning nudge in her voice
- [ ] Pet neglect system — mood/energy decay if user ignores app
- [ ] Streak system connected to real output data
- [ ] Level-up celebrations — Miomi gets visibly excited
- [ ] Weekly summary from Miomi

---

## PHASE 3 — PLATFORM (Month 5-8)

### Language Learning — HIGH VIRAL POTENTIAL
- [ ] Language learning mode designed
- [ ] Miomi as teacher: conversational, not lesson-based
- [ ] Business English for creators
- [ ] Korean basics for K-style creators
- [ ] Pronunciation via voice (free: Web Speech, paid: ElevenLabs)
- [ ] Progress tracking: vocabulary, XP, levels separate from pet levels
- [ ] "Today's word" from Miomi every morning
- [ ] Miomi unlocks this feature naturally in conversation

### Community
- [ ] Public creator profiles
- [ ] Follow other creators
- [ ] Community feed
- [ ] Miomi matchmaking between creators
- [ ] Harassment protection layer (Orange's problem — Miomi moderates)

### Social media connection
- [ ] Instagram API (apply NOW — 2-4 week approval)
- [ ] TikTok API (apply NOW)
- [ ] Auto-scheduler — Miomi posts at optimal time

---

## PHASE 4 — EXPANSION (Month 9+)

- [*] SEA expansion: Vietnam, Indonesia, Philippines, Malaysia
- [*] Japanese market (kawaii culture)
- [*] Korean market
- [*] Brand partnerships and sponsored daily topics
- [*] Creator marketplace — brands find creators
- [*] Agency dashboard — Mikaro Studio integration

---

## CONTENT TYPES — built in Create screen

- [x] Caption (แคปชั่น)
- [x] Hook
- [x] Hashtags (แฮชแท็ก)
- [x] Script/Scenario (สคริปต์)
- [x] Thumbnail idea (ธัมบ์เนล)
- [x] Description (คำบรรยาย)
- [x] Comment reply (ตอบคอมเมนต์)
- [x] DM reply (ตอบ DM)
- [x] CTA
- [x] Text overlay

---

## TONE OPTIONS

### Free tier
- [x] Cute Thai
- [x] Professional

### Paid tiers (shown locked with tier badge)
- [x] Gen-Z hype
- [x] Korean aesthetic
- [x] Anime
- [x] Luxury brand
- [x] Western casual
- [x] Entertainment
- [x] Motivational
- [x] Educational
- [x] Storytelling
- [x] Humorous
- [ ] Custom tone — Pro tier, Miomi learns user's style

---

## MIOMI CHARACTER — CURRENT STATUS

### Assets
- [x] PNG files: idle, happy, thinking, speaking (4 expressions)
- [x] CSS breathing animation
- [x] CSS entrance animation (runs in from bottom)
- [x] Expression switching based on app state
- [x] Tap interaction — bounce, expression change, speech bubble
- [x] Sleep mode after 30s inactivity

### Still needed
- [ ] Rive file — founder building in Rive.app
      Parts: body, head, ears (separate), eyes (separate), nose, mouth,
      paws (separate), tail, collar, ear bows
      States: idle, happy, thinking, speaking, sleeping, eating, playing
      Export as .riv file
- [ ] Rive integrated into Next.js
- [ ] Feeding animation (PNG swap + CSS for now)
- [ ] Playing animation (PNG swap + CSS for now)
- [ ] Level-up celebration animation
- [ ] Touch reactions: purr sound, hearts appear

---

## UI/UX RULES — LOCKED, NEVER BREAK

- Background: #FFFFFF primary everywhere
- Rose accent: #8B1A35 buttons, active states
- Rose mid: #D4537E highlights
- Rose light: #FBEAF0 soft backgrounds
- Rose border: #EAD0DB dividers
- Gold: #B8860B premium, level, XP
- Gold light: #FDF5E0 briefing cards
- Text: #1A1A1A primary, #888888 muted
- NO emojis EVER — lucide-react icons only
- Miomi ALWAYS free on white canvas — NO frames, NO circles
- Thai text ALWAYS first, English below in muted smaller text
- White dominant — Miomi brings all the color
- Mobile: edge to edge, 100dvh, feels installed
- Create: conversation-driven, NEVER form-like
- Every feature delivered through Miomi's personality

---

## TECH STACK — LOCKED

- Next.js 14, TypeScript, Tailwind CSS, App Router
- Supabase (PostgreSQL) — database and auth
- Claude Haiku — free and guest users
- Claude Sonnet — paid users
- Web Speech API — voice input (`th-TH` default)
- Web Speech API TTS — Miomi voice for free users
- ElevenLabs — Miomi voice for paid users
- Rive.app — final animation (Phase 2)
- Stripe (THB) — payments
- Vercel — deployment
- Resend.io — transactional emails
- Cursor Pro — development IDE

---

## AI COST STRATEGY

- Free/guest: Claude Haiku
- Paid: Claude Sonnet
- Guest limit: 3 outputs per session (real AI, real value)
- Batch daily topics nightly by niche
- Cache hashtag sets weekly by niche
- Pet interactions (feed, play, sleep): ZERO AI cost — pure CSS/JS
- Memory depth is a paid feature
- Never expose model names — always just "Miomi"

---

## COMPLIANCE — TODO before launch

- [ ] PDPA privacy policy (Thailand)
- [ ] Terms of service
- [ ] Cookie consent
- [ ] Stripe business registration
- [ ] Meta API developer application (apply NOW — takes weeks)
- [ ] TikTok API developer application (apply NOW)
- [ ] ElevenLabs terms review

---

## SESSION LOG

### Session 1 — May 14, 2026 (morning)
- Product concept finalized
- Name: Miomika (app) + Miomi (cat)
- Domain: miomika.com
- Visual direction locked
- Miomi character generated: 4 PNG expressions
- Full architecture designed
- BRIEF_v1.md created
- Trojan horse strategy defined

### Session 2 — May 14, 2026 (afternoon/evening)
- Full Next.js project built in Cursor
- All 5 screens built and working locally
- Supabase connected — schema, RLS, seed data
- Auth working — signup, login, email confirmation
- Onboarding 6-step flow
- Mobile shell — 390px centered
- Desktop 3-column layout (basic)
- Create screen — conversation interface
- Home screen — pet status circles, no-scroll layout
- Dashboard, Profile screens
- CHECKLIST_v2.md created

### Session 3 — May 15, 2026
- Deployed to Vercel — miomika.com live
- GitHub repo connected
- Guest mode implemented — no login wall
- Miomi breathing + entrance animations added
- No-scroll audit — 100dvh on all screens
- Miomi soul layer — thinking/happy expressions on Create
- Deep brainstorm: identified all major problems
- Problems identified:
  - Create screen is a form pretending to be a conversation
  - Voice input has repeat bug (interim results)
  - Mobile still has frame/shell feeling
  - Guest experience not generous enough
  - Pet mechanics (feed/play) have no real function
  - Create generates before understanding user
  - No favicon
  - Miomi too small on Create mobile
- BRIEF_v3.md and CHECKLIST_v3.md created with full understanding
- Four foundations defined and prioritized
- Character system fully designed
- Memory tier system defined
- Signup emotional moment defined

### Known issues at end of Session 3
- Voice repeat bug — not yet fixed
- Create workflow still form-based — needs conversation redesign
- Mobile frame feeling — not fully fixed
- API key not in Vercel — real generation untested live
- Pet mechanics have no real function (feed/play are visual only)
- No favicon
- Miomi clips on Create mobile

---

## HOW TO START A NEW CHAT

Paste in this order:
1. BRIEF_v3.md (full content)
2. CHECKLIST_v3.md (full content)
3. This opening message:

```
You are the technical co-founder of Miomika.
Read both documents above completely before responding.
We are in BUILD MODE — direct, efficient, no motivation speeches.
The soul: Miomi is the product. Tools are what she delivers.
Never add features before the four foundations are complete.
Never use emojis — lucide-react icons only.
Never put Miomi in a frame or container.
Give me step by step instructions. One thing at a time.
[State your specific goal for this session]
```

---

*Update this file at the end of every session*
*The Four Foundations must be complete before any new features*
*The Trojan Horse story is the soul — every decision serves it*
