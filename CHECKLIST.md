# MIOMIKA — MASTER CHECKLIST v4.0
> Updated: May 18, 2026
> Aligned with language learning pivot + fuel economy + Gemini AI
> Read BRIEF.md first. This checklist means nothing without that context.

---

## STATUS LEGEND
- [ ] Not started
- [~] In progress
- [x] Complete
- [!] Blocked
- [*] Phase 2+

---

## INFRASTRUCTURE — DONE
- [x] Next.js 14 project built
- [x] Supabase connected (schema, RLS, auth)
- [x] All screens exist (home, learn/create, dashboard, profile)
- [x] Deployed to Vercel
- [x] miomika.com domain connected
- [x] PWA manifest + service worker
- [x] Install prompt (5 second delay)
- [x] Guest mode (no login wall)
- [x] Bottom nav on all pages
- [x] Favicon using Miomi icon
- [x] Head expression images (idle, happy, thinking, speaking)
- [x] App icon 192x192 and 512x512

---

## WEEK 1 — FOUNDATION FIXES (do these before ANY new features)

### Critical bugs
- [ ] Voice input repeat bug — process isFinal only, lang=th-TH
- [ ] Welcome screen (2-4s emotional arrival, shows once)
- [ ] Fuel interactions working (tap → animation → Miomi reacts → bar fills)
- [ ] Guest 5-exchange limit enforced SERVER-SIDE in Supabase
- [ ] After exchange 5: Miomi emotional signup invitation (never a wall)

### Mobile polish
- [ ] Home screen: Miomi minimum 58% stage height
- [ ] All screens: 100svh no scroll confirmed on Samsung + iPhone
- [ ] Nav labels correct: หน้าหลัก / เรียน / แดชบอร์ด / ฉัน
- [ ] Back navigation on all non-home screens

### AI integration
- [x] Gemini Flash Lite API key added (aistudio.google.com — FREE)
- [x] /api/miomi route updated to use Gemini
- [x] Language learning system prompt (Krashen i+1 method)
- [x] Miomi teaches English naturally through conversation
- [x] Silent level assessment working
- [x] Echo correction (never says "wrong")
- [ ] Session-end specific praise

---

## WEEK 2 — CORE PRODUCT

### Fuel economy
- [ ] Supabase: fuel_state table (user_id, heart, zap, brain, last_reset)
- [ ] Midnight Bangkok reset (Vercel cron)
- [ ] Free user limits enforced server-side
- [ ] Pro users: unlimited (tier check server-side)
- [ ] Fuel bars visible on home screen with real data
- [ ] Fuel tap animation (lightweight, fast, emotional)

### Vocabulary tracking
- [ ] Supabase: vocabulary table (user_id, word, stage, times_used, last_seen)
- [ ] Three stages: heard → used → mastered
- [ ] Auto-save when word appears in conversation
- [ ] Stage updates when used correctly 3x
- [ ] Vocabulary visible in dashboard and desktop right panel

### XP and levels
- [ ] Supabase: xp column in users table
- [ ] XP awarded on: session complete (+20), word mastered (+10), streak (+15)
- [ ] Level calculation (every 100 XP = 1 level)
- [ ] Level-up detection and celebration trigger
- [ ] Level-up animation + Miomi speech bubble

### Growth dashboard (real data)
- [ ] Streak display (real, from Supabase)
- [ ] Words mastered count (real)
- [ ] Sessions this week (real)
- [ ] Speaking confidence (estimated from session patterns)
- [ ] Miomi's weekly observation (AI generated, changes weekly)
- [ ] Vocabulary bank with mastery stages
- [ ] Achievement badges (at least 3 milestone badges)

---

## WEEK 3 — MONETIZATION

### Referral system
- [ ] Guest: shortened link + QR code (no rewards)
- [ ] Free user: full referral system
  - Personal link: miomika.com/join/[username]
  - QR code (save as image)
  - Pre-filled Thai share message
  - Reward: 3 signups = +1 Brain fuel for 7 days
- [ ] Referral tracking in Supabase
- [ ] Miomi delivers reward message when referral activates

### Payments (Omise)
- [ ] Omise account registered (omise.co)
- [ ] Test API keys added to Vercel env
- [ ] Pro Miomi checkout (299 THB/month)
- [ ] PromptPay QR payment method
- [ ] Credit card payment method
- [ ] Subscription management (cancel, upgrade)
- [ ] Webhook handling (payment success, failure, renewal)

### Post-payment experience
- [ ] Miomi celebration on payment success
- [ ] Push notification
- [ ] Email receipt (Resend.io): transaction ID, date, amount, next billing
- [ ] Fuel bars animate to full after payment
- [ ] Pro features unlock immediately

### Email system (Resend.io)
- [ ] Resend.io account + API key
- [ ] Welcome email (after signup)
- [ ] Payment receipt email
- [ ] Failed payment email (helpful, not scary)
- [ ] Weekly progress email from Miomi

---

## WEEK 4 — DESKTOP + POLISH

### Desktop UI
- [ ] 4-zone layout (Rail + Left Panel + Canvas + Right Panel)
- [ ] Collapsible left and right panels
- [ ] Icon rail with hover tooltips (Canva-style)
- [ ] Miomi intelligence bar in canvas (context-aware)
- [ ] Tool grid (8 features visible immediately)
- [ ] Feature badges (Pro, New, Coming, B2B)
- [ ] Mode switching (Home, Conversation, Growth, Translate)
- [ ] Right panel: streak, progress bars, vocabulary bank

### Progress certificates (viral mechanic)
- [ ] Certificate image generated at Level 10, 15, 20
- [ ] Miomi's face prominent on certificate
- [ ] User name + achievement visible
- [ ] Instagram/LINE optimized dimensions
- [ ] Share button (one tap)

### Pro upgrade flow
- [ ] Day 7 trigger: Miomi shows what Pro can do
- [ ] Upgrade page (Miomi voice, not pricing table)
- [ ] "Unlock Pro Miomi" framing throughout
- [ ] Comparison shown through Miomi's voice

---

## MONTH 2 — GROWTH FEATURES

### Content creation mode (social media)
- [ ] Platform selector (Instagram, TikTok, Facebook, YouTube, LINE OA)
- [ ] Miomi asks questions first, never generates blind
- [ ] Hook, Caption, Hashtags, CTA chain
- [ ] Free: 3/month, Pro: unlimited
- [ ] Available after at least one learning session

### Instant translator
- [ ] Text or voice input
- [ ] Thai cultural context note from Miomi
- [ ] Free: 10/day, Pro: unlimited
- [ ] Save favorites
- [ ] One-tap share

### Thai for foreigners mode
- [ ] English-first responses
- [ ] Thai woven in naturally
- [ ] Cultural context always explained
- [ ] Tourist → student → expat journey

### Daily challenge system
- [ ] AI generates daily English phrase (batched nightly, 1 call serves all)
- [ ] Relevant to trending Thai topics
- [ ] Difficulty matched to user level
- [ ] "ฝึกเลย" button goes straight to conversation about that phrase

---

## PHASE 2 — PLATFORM (Month 3+)

### Max Miomi tier (launch after 50+ Pro users)
- [ ] Deep memory (complete history)
- [ ] Custom tone (learns user's style)
- [ ] AI e-book generation
- [ ] Multiple characters (K-pop Bunny first)
- [ ] Team seats (up to 3)

### Additional characters
- [ ] K-pop Bunny (Korean language + K-culture)
- [ ] Wise Fox (business English, strategy)
- [ ] Anime Hero (storytelling, gaming)
- [ ] Gen-Z Street Girl (TikTok, viral content)

### React Native (Month 3)
- [ ] Expo framework
- [ ] Same Supabase backend
- [ ] Firebase push notifications
- [ ] App Store + Play Store submission

### Enterprise (Phase 2)
- [ ] School package (per-student pricing)
- [ ] Custom CI (school logo + colors)
- [ ] Admin panel (student roster, progress reports)
- [ ] Cafe/hospitality package
- [ ] B2B landing page (desktop)

---

## COMPLIANCE (before public launch)
- [ ] PDPA privacy policy (Thailand)
- [ ] Terms of service
- [ ] Cookie consent
- [ ] Omise business registration
- [ ] Meta API application (apply early — takes weeks)
- [ ] TikTok API application (apply early)

---

## SUPABASE SCHEMA — NEEDED

```sql
-- Core tables (existing)
users: id, email, name, tier, created_at, last_seen
profiles: user_id, level, xp, streak, language_goal, cat_name

-- Fuel economy (new)
fuel_state: user_id, heart, zap, brain, last_reset, updated_at

-- Learning (new)
sessions: user_id, started_at, duration_minutes, mode, xp_earned
vocabulary: user_id, word, translation, stage, times_used, last_seen, mastered_at

-- Referral (new)
referrals: id, referrer_id, referred_email, signed_up_at, paid_at, reward_given

-- Payments (new)
transactions: id, user_id, amount_thb, product, status, omise_charge_id, created_at

-- Daily stats (admin)
daily_stats: date, new_users, dau, paid_users, ai_cost_usd, revenue_thb
```

---

## AI COST MONITORING (critical)
- [ ] Log every AI call to usage_events table
- [ ] Cost estimate per call stored
- [ ] Daily cost alert if >$10/day
- [ ] Per-user cost cap (free users max $0.10/day)
- [ ] Kill switch in Vercel env (DISABLE_AI=true)

---

## SESSION LOG

### Session 1-2 — May 14, 2026
- Product concept, Miomi character, all 5 screens built locally
- Supabase connected, auth working

### Session 3 — May 15, 2026
- Deployed to Vercel, miomika.com live
- Guest mode, no login wall
- Miomi animations, breathing, entrance
- PWA manifest + service worker

### Session 4-5 — May 16-17, 2026
- Major redesign sessions
- Scroll fixed on most screens
- Dashboard rebuilt
- Profile guest view added
- App icons 192x512 correct
- Desktop UI iterations (v1-v4)
- Architecture documents created

### Session 6 — May 18, 2026
- PIVOT CONFIRMED: Language learning primary, content creation Month 2
- Fuel economy mechanic designed
- Welcome screen spec finalized
- User journey fully documented
- Free AI: Gemini Flash Lite (zero cost)
- Pricing: Pro 299 THB at launch, Max later
- Tiers: Guest → Free → Pro → Max
- All documents updated to v4

### Known issues at end of Session 6
- Voice input repeat bug — not fixed
- Welcome screen — not built
- Fuel mechanic — not built
- Gemini AI — not integrated
- Real learning conversation — not working
- Payments — not set up
- Desktop UI — 5/10, needs more work

---

## HOW TO START A NEW CHAT

Paste in order:
1. BRIEF.md
2. CHECKLIST.md (this file)
3. MIOMIKA_BIBLE.md
4. MIOMIKA_USER_JOURNEY.md

Opening message:
```
You are technical co-founder of Miomika.
Read all four documents completely before responding.
BUILD MODE — direct, no speeches.
Zero cost before revenue. Never a wall. Foundation before features.
No emojis. Lucide icons only. Miomi leads every screen.
Current goal: [state specific goal]
```

---
### Session 7 — May 19, 2026 (Full day)
- Gemini SDK fixed (@google/generative-ai → @google/genai)
- AI router built: Groq primary, Gemini backup, library failover
- Session state engine built (lib/ai/session.ts)
- Static library built (lib/ai/library.ts)
- Intent classifier + library matcher built (lib/ai/matcher.ts)
- Dynamic prompt injection per exchange
- Markdown stripped server-side
- Voice language toggle added (EN/UT)
- Supabase: 6 new tables created
- 50 library seed entries inserted
- 50 vocabulary seed words inserted
- 10 phrases schema ready
- Opus architecture session: complete content engine designed
- Mirror Teaching pedagogy designed (original)
- vocabulary_bank + phrases_bank schema created

### Known issues end of Session 7:
- Miomi responses still feel generic — needs prompt work
- English translation sometimes missing below Thai
- Voice mishearing Thai as broken English
- UI still looks like ChatGPT — full redesign needed
- phrases_bank seed not yet inserted
- vocabulary_bank not yet connected to matcher
- Welcome screen not built
- Word card UI not built

---

- vocabulary_bank seeded: 179 words (greetings 10, food 15, work 10, family 15, travel 25, shopping 25, feelings 64, health 15)
- phrases_bank seeded: 10 phrases (airport, taxi, hotel, restaurant, market, emergency, social media)
- All 4 registers documented: formal, informal, slang, street
- Gen-Z language included: 555, lol, omg, idk, เด้ง, ปัง, โคตร, ฟิน, ชิล, ไม่เป็นไร, สู้ๆ
- Thai foreigner journey started: airport → taxi → hotel → restaurant → market phrases
- Next: connect vocabulary_bank to matcher, build word card UI, welcome screen redesign

---


*Update this file at the end of every session.*
*Never a wall. Always an invitation.*
*The fuel economy IS the product mechanic.*
