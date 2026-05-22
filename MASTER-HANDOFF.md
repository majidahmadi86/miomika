# MIOMIKA — MASTER HANDOFF DOCUMENT
> **For any new Claude or Cursor session. Read this FIRST, before anything else.**
> **This complements `/MIOMIKA.md` (engineering contract). This file is founder context.**
> Last updated: May 22, 2026

---

## 0. HOW TO READ THIS DOCUMENT

If you are a future Claude or Cursor session: this is your single most important context. Mike (Majid Ahmadi) has been building Miomika for weeks across multiple chats. He's lost work, dealt with broken handoffs, and burned credits on sessions that didn't have full context.

**Your one job: don't be one of those sessions.** Read this fully, then read `/MIOMIKA.md` in the repo. Only then propose actions.

---

## 1. THE STORY — WHY MIOMIKA EXISTS

Mike originally set out to build for **content creators in Thailand**. First idea: emotional support + niching + content pillars + TikTok/IG/YouTube guidance. He realized creator acquisition is brutal.

So he flipped the strategy: **The Trojan Horse.** Get Miomi (a kawaii cat) onto users' phones via the highest-demand category in Thailand — language learning. Once she lives in the user's phone — daily, warm, remembered — the *same* engine teaching them words can also write their captions, translate their conversations, generate their books.

**Miomika is not a language app. It is an AI companion operating system. Language is the first verb.**

### Verb stack (order of acquisition)

1. Teach me — language learning, the wedge [shipping]
2. Translate this — instant translator [Phase 4]
3. Write this for me — captions, scripts, bio [Phase 5]
4. Practice with me — roleplay, exams [Phase 3B-4]
5. Read me a story — AI-generated e-books [Phase 7+]
6. Remember this — memory, journaling [Phase 4]
7. Be with me — ambient companionship [shipping]

### The flywheel

Tourist → Student → Worker → Resident. Each stage takes ~1 year. Miomi grows with them across all of it. Same character. Same memory. Same warmth.

### B2B rocket

Hotels onboard guests. Cafes onboard customers. Schools onboard students. The institution pays the bridge; users continue paying personally once they're hooked. Net acquisition cost: negative.

### Marketplace ceiling

Characters (Miomi free, K-pop Bunny / Anime Hero / Wise Fox paid), AI-generated personalized e-books, custom exams, outfits, power-ups. SEA runs on cute/character-driven economies. Mobile-game psychology on a learning companion is unprecedented and uncopyable.

### Why this works in Thailand specifically

- **Cuteness** (anime/K-pop aesthetic is dominant)
- **Cultural warmth** ("Have you eaten yet?" — กินข้าวยังคะ — is a love language)
- **Kreng jai** (face-saving — never blame, always echo-correct)
- **Specific praise** (smart/cute/beautiful/handsome — never "good job")
- **Festival rhythm** (Songkran, Loy Krathong, Chinese NY — NOT Black Friday)
- **Soft humor** (555, self-deprecating cat humor)

---

## 2. WHO MIKE IS (so you don't misread his style)

- Solo founder, Bangkok, Mikaro Studio
- Background: content creator + entrepreneur, NOT a software engineer
- Uses Cursor (Pro), reviews on real devices
- Phone: Samsung A52 (Android Chrome). Laptop: Windows + Git Bash
- Email: majidtrade86@gmail.com · Domain: miomika.com · Repo: github.com/majidahmadi86/miomika

### Communication style — READ CAREFULLY

- **Direct.** Says "1/10" or "9/10". Gives ratings. If you can't take blunt feedback, you'll fail.
- **Visual learner.** Pastes screenshots constantly. Look at them carefully.
- **Hates burning credits.** #1 rule. Imprecise prompts cost real money.
- **Hates back-and-forth.** Wants step-by-step in simple words. Decide for him unless it affects direction.
- **Numbered answers preferred.** "1. yes 2. no 3. (a)" — keep it that way.
- **English not first language.** Be clear. Don't hedge ("might consider") — say "do this."
- **Speaks Thai natively + English fluently.**
- **Builds in waves.** Long work stretches, then long testing on devices, then bug-report bursts.

### What Mike values

- Visual polish (rates UX 1/10 to 10/10)
- Whether product "feels intelligent" — the actual conversion driver
- Whether things work on his Samsung A52, not just desktop preview
- Cost discipline (asks "how much credit?")
- Documentation clear enough that future sessions don't need him to re-explain

### What frustrates Mike

- Being asked to do something he already did
- Long responses with caveats and meta-commentary
- Suggested fixes that don't actually fix the thing
- Claude pretending to verify something it didn't run
- Treating symptoms instead of root causes
- Architectural drift between documents

---

## 3. PROJECT NON-NEGOTIABLES (the laws)

1. **Never a wall, always an invitation.** Every limit is a warm Miomi moment. Guidance System produces these (`lib/guidance/`).
2. **Library-first, AI-second.** 80%+ from local data at zero cost. AI is fallback.
3. **Teaching invisible. Growth theatrical.** Echo-correct silently. Celebrate loudly.
4. **Thai users first.** Kreng jai is law.
5. **Pink gradient `linear-gradient(135deg, #F9A8D4 0%, #DB2777 100%)` reserved for primary CTAs ONLY.** No pink backgrounds, no pink nav, no pink banners.
6. **One clear focus per screen.** ONE primary CTA visible at any time.
7. **All warm phrases come from `lib/voice/warmth.ts`.** Hardcoded "นะคะ", "หนู", "ค่า~" outside that file FORBIDDEN.
8. **Mobile is primary.** Test against 375×812 + Samsung A52 mentally before shipping.
9. **Server-side enforcement.** Tier, limits, exchange count — server only. Never trust client.
10. **14-state Miomi animation machine** with priority interruption (`/MIOMIKA.md` §2).

---

## 4. CURRENT BUILD STATE (May 22, 2026)

### What works end-to-end

- Welcome screen (single-show, no flash)
- Google OAuth (with `prompt=select_account`)
- Journey-stage onboarding (tourist/student/worker/resident)
- Migrations 0007 + 0011 applied; `profiles` is canonical
- Companion button with dreamy drift + playful behaviors
- Profile shows Free tier post-login
- Word card v3 + pronunciation check + specific praise
- Cultural warmth module
- Guidance system with triggers + pill rendering
- SEO meta + favicons
- Sentry wired
- Language auto-detection (Accept-Language header)
- Logout clears session (`scope: 'global'`)

### What's broken (Phase 3A-final-2 just shipped — verify these)

After Phase 3A-final-2 these should now work:
- Mobile voice input on Samsung A52 Chrome (continuous mode + onend restart)
- Celebration burst fires reliably on /onboarding completion → /home?celebrate=signup

### Deferred to future phases

- **Phase 3B**: Real teaching brain (adaptive opener, session continuity, journey-stage curriculum, multiple exercise types, mastery from vocabulary_user_state, spiral schedule)
- **Phase 4**: Engine maturation, library promotion cron, Claude Haiku swap
- **Phase 5**: Payment, /pricing, Omise PromptPay + Stripe, conversion cards
- **Phase 6**: Referral, LINE share, full SEO, /help, /legal, Supabase custom domain decision, Google OAuth verification
- **Phase 7**: Welcome master-class redesign, magic moments, desktop 4-zone rebuild (Canva-like), admin panel, Rive integration, marketplace, first paid character (Kuma)
- **Phase 8+**: Multi-language (Vietnamese, Indonesian, Japanese, Korean), React Native build, B2B onboarding for hotels/cafes/schools

---

## 5. KEY DESIGN DECISIONS (don't re-litigate)

### Tiers (locked v1)

| Tier | Price | Stars/mo | Notes |
|---|---|---|---|
| Guest | 0 | 0 | 5 exchanges/session, no memory |
| Free | 0 | 0 (earnable) | Daily fuel limits, basic memory |
| Pro Miomi | 299 THB/mo | 300 | Unlimited fuel, voice, all verbs |
| Pro Yearly | 2,990 THB/yr | 300/mo + 1,000 bonus | 2 months free |
| Pro Max | 599 THB/mo (post-launch) | 800 | Multi-character, deep memory, Sonnet 4.7 |

### Miomi Stars

- 1 THB ≈ 10 stars
- Earn: referrals (50/500), streaks (100/500/2000), challenges (10-30), mastery (5/word), festivals (100)
- Buy: 500/49THB, 1200/99THB, 3000/199THB, 7000/399THB (bigger pack = better rate)
- Rollover cap: 5,000 stars

### Payment

- **Omise** primary (PromptPay QR mandatory for Thailand)
- **Stripe** backup once verified
- Single abstraction so swap is one config change

### AI

- **Now**: Groq + Gemini Flash Lite, both free
- **Phase 4**: Claude Haiku 4.5 workhorse (~$0.0008/exchange)
- **Pro Max**: Claude Sonnet 4.7
- Cost caps: Guest $0.02/day, Free $0.05/day, Pro $0.50/day, Pro Max $2/day

### Character roadmap

| Character | Specialty | Unlock | Phase |
|---|---|---|---|
| Miomi | Starter | Free | Live |
| Kuma | Kid-safe | 1500 stars/Pro | Phase 8 |
| K-pop Bunny | Korean | 2500 stars/Pro Max | Phase 8 |
| Anime Hero | Gaming, Japanese | 2500 stars | Phase 8 |
| Wise Fox | Business English | 3000 stars/Pro Max | Phase 8 |
| Gen-Z Street Girl | TikTok | 2000 stars | Phase 8 |

Asset directory: `/public/characters/{slug}/{full,head,companion,widget}/`

---

## 6. PROMPTING PROTOCOL (how sessions should work)

### Roles

- **Mike** = product owner, tester, manual config (Supabase, Resend, Google Cloud, asset generation via ChatGPT)
- **Claude in claude.ai** = technical co-founder, writes Cursor master-prompts, triages bugs, updates `/MIOMIKA.md`
- **Cursor (Agent mode)** = executes prompts, generates code, runs verification, auto-pushes

### Model selection per phase

| Phase | Model | Reason |
|---|---|---|
| 0 hygiene | Sonnet 4.5 | File moves |
| 1 foundation | Opus 4.7 | Auth, security, migrations |
| 2 mobile + guidance | Opus 4.7 | Conversion engine |
| 3A visual + wiring | Sonnet 4.5 | Mechanical |
| 3B teaching brain | Opus 4.7 | Pedagogy precision |
| 4 real engine | Opus 4.7 | Self-improvement pipeline |
| 5 payment | Opus 4.7 | Money, no error margin |
| 6 operational | Sonnet 4.5 | SEO, legal stubs |
| 7 polish + marketplace | Mix | Desktop needs Opus |

### Prompt structure (every Cursor prompt)

```
# CURSOR MASTER-PROMPT — PHASE N: <NAME>
> Cursor config: ... Model: ...
> Auto-push: yes/no

## OBJECTIVE
<1-2 sentences>

## ACCEPTANCE CRITERIA
[ ] checkboxes

## BLOCK A, B, C... — surgical instructions

## WHEN COMPLETE
<exact output format>

Begin.
```

### Auto-push pattern

```bash
npx tsc --noEmit && npm run lint && npm run build
git add -A && git commit -m "Phase N: <description>" && git push
```

### Cursor must ALWAYS

- Read `/MIOMIKA.md` §11 Codebase Map first
- Stop and ask if a file doesn't exist
- Output `PHASE N COMPLETE` block

### Cursor must NEVER

- Refactor outside the spec
- Invent UI not in design tokens
- Use emojis in UI chrome
- Hardcode warm Thai phrases outside `lib/voice/warmth.ts`
- Trust client-side tier checks

---

## 7. KNOWN SHARP EDGES

### Data layer

- `public.users` was OLD. Now `public.users_legacy_backup`. **Do NOT read or write to it.**
- All user data in `public.profiles`. Any `.from("users")` is the root bug.
- RLS on every table. Service role key server-only.

### Auth

- Google OAuth uses `prompt=select_account`
- "dfufsjnneiwzllkawahv.supabase.co" in Google UI is normal — fixing = Supabase custom domain ($25/mo) or Google OAuth verification (Phase 6)
- Sign out: `scope: 'global'` then `window.location.href = '/'`

### Mobile

- **Samsung Internet** = no Web Speech API. `lib/talk/speech-support.ts` detects via UA `samsungbrowser`, shows "Open in Chrome" fallback.
- **Android Chrome** times out speech after ~3s silence. Solution: `continuous = true` + auto-restart in onend unless `isManualStopRef.current === true`.
- **iOS Safari** requires `recognition.start()` synchronously in touch handler. Any `await` before start = silent failure.
- Mobile keyboard pushes layout — use `100svh`, respect `env(safe-area-inset-bottom)`.

### Welcome/onboarding

- Welcome decision in `lib/welcome/show-welcome.ts`
- Auth-ready gate in `app/(app)/layout.tsx` blocks render until profile resolved
- Onboarding path is `/onboarding` (singular), NOT `/onboarding/journey`
- Completion redirects to `/home?celebrate=signup`
- Celebration gated by localStorage `miomika-signup-celebrated-v1` — fires once per user

### Documentation drift

If `/MIOMIKA.md` disagrees with code, the code wins. Update `/MIOMIKA.md` immediately. Never let docs and code drift — that's how we lost 2 chat sessions.

`/MIOMIKA.md` §11 Codebase Map is the most important section.

---

## 8. WHAT THE NEXT SESSION SHOULD DO

1. **Read this document fully.** Then `/MIOMIKA.md`.
2. **Greet Mike, confirm context.** Short: "I've read MASTER-HANDOFF.md and MIOMIKA.md v3. We're at end of Phase 3A-final-2. Ready for Phase 3B?"
3. **Run Phase 3B** — the real teaching brain. Opus 4.7. ~$4-6 in credits. The biggest leap in product intelligence. Spec in `/MIOMIKA.md` §8.
4. **After 3B verified**, propose Phase 4 or Phase 5 depending on Mike's priority.
5. **Maintain doc discipline.** Every phase updates `/MIOMIKA.md` §10 State Log. Updates to MASTER-HANDOFF.md happen at end of every long chat.

---

## 9. MIKE'S OWN WORDS THAT MATTER

- "Don't burn credits."
- "Be brief and actionable."
- "Tell me step by step in simple words what to do."
- "We need to take their hand, walk them through each step. If they hit a wall, make that wall smooth — in favor of them and the app. Not forcing. Not annoying. Just cute and nicely take them." (Guidance philosophy in one paragraph.)
- "Teaching invisible, growth theatrical."
- "Everything is too pink." (Pink reserved for CTAs only — now in `/MIOMIKA.md` §4.2.)
- "I rate desktop UX 1/10." (Desktop = hold pattern until Phase 7.)
- "The card was impressive. But that's only one — we need more teaching magics."
- "I see light in this project."

---

## 10. WORK-IN-PROGRESS LIST

- [ ] Phase 3B: Real teaching brain (NEXT)
- [ ] Phase 4: Real engine + Anthropic swap
- [ ] Phase 5: Payment + conversion
- [ ] Phase 6: Referral, SEO, /help, /legal, Supabase custom domain decision, Google OAuth verification
- [ ] Phase 7: Welcome redesign, desktop rebuild, admin, Rive, marketplace, Kuma character
- [ ] Phase 8+: Multi-language (Vietnamese, Indonesian, Japanese, Korean), React Native, B2B onboarding
- [ ] Color theming + multi-theme switcher (post-Phase 7)
- [ ] Resend domain verification (Mike manual)
- [ ] Email confirmation flow polish

---

## END OF MASTER HANDOFF

If you've read this far, you're ready. Now read `/MIOMIKA.md` and start the next phase. Mike is waiting.

Don't burn credits. Be brief and actionable. Test on Samsung A52 mentally before shipping. Remember the cat is the product — not the language learning, not the AI, not the features. **The cat.**

— Previous Claude Opus 4.7 session, May 22, 2026
