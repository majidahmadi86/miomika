# MIOMIKA — MASTER HANDOFF DOCUMENT
> **For any new Claude or Cursor session. Read this FIRST.**
> **Complements `/MIOMIKA.md` (engineering contract).**
> Last updated: 2026-05-28 — synced to v6 + SYSTEM-MAP

---

## 0. HOW TO READ THIS

If you are a future Claude or Cursor: this is your single most important context. Mike has been building Miomika for ~3 weeks. He's burned credits on sessions that didn't have full context. Don't be one of them.

Read /SYSTEM-MAP.md FIRST (ground truth), then this file, then /MIOMIKA.md v6.

---

## 1. WHO MIKE IS

Mike (Majid Ahmadi) is a **Persian entrepreneur living in Bangkok**, building Miomika as his bridge to a life in Phuket or Krabi.

### Background

- **40s, Iranian, native Persian speaker**, advanced English, intermediate Turkish, basic Thai (nidnoi kab)
- **10+ years in marketing, branding, business development** — founded Padideh Fekre Mehtar (CSTLand) in Iran, ran it 2011–2023
- **Left Iran** because of US sanctions, IRGC pressure, mental health toll — wanted peace
- **Chose Thailand** specifically over Europe / Australia because Thai people felt kind and nature called him; loves beaches, forests, southern Thailand
- **Currently in Bangkok on ED-Visa**, pursuing BA TESOL Grade A at Siam Technology College
- **Teaches Digital Marketing & AI at Saint Gabriel's College** (2025–2026) — TikTok algorithm projects, prompt engineering, AI-content workflows for secondary students
- **Previously taught English** at Banmaireab School (Phuket) and Suansri Wittaya School (Lang Suan)
- **Runs Mikaro Studio** (mikaro.studio) — branding, web design, AI workshops — ongoing income source
- **25K TikTok followers** at @survivalmodemike — mostly Thai and SEA audience — real distribution asset (not yet activated for Miomika)

### The deep why (preserve this verbatim — it's the soul of the project)

Mike watched Thai students at his schools struggling. Their families pay enormous amounts for private classes. The teachers are often people with "degrees" but no real skill, no understanding, no care. Thai parents work hard to give their kids a chance at English fluency — and the system fails them. **Miomika is Mike's answer.** A way for Thai families to learn English without paying for the corrupt private-tutoring industry. A teacher that actually teaches, that's warm, that's available 24/7, that costs less than one bad lesson per month.

The income / Phuket dream is real and motivating — but it's the *consequence* of building this, not the reason. The reason is the kids in his classes who deserved better.

### Personal stakes

- Self-funded, tight savings, no investor pressure
- Wants to build until master-class, not until "MVP"
- Does NOT want to launch underbaked — "phase 1,000 if needed"
- Wants to eventually live in Phuket or Krabi — beach, forest, peace, productivity

---

## 2. THE PRODUCT — what Miomika is

**Miomika is an AI companion operating system. The product IS the cat (Miomi). Language learning is the wedge.**

The user installs Miomika because they want to learn English (or Thai). They stay because Miomi remembers them, asks if they've eaten, celebrates their first mastered word, never blames them for mistakes. Over time, the same Miomi who taught them "hello" writes their captions, translates their conversations, plans their content, grows with them.

### Verb stack (in order of acquisition)

1. Teach me — language learning, the wedge [in progress]
2. Translate this — instant translator [Phase 4]
3. Write this for me — captions, scripts, bio [Phase 5]
4. Practice with me — roleplay, exams [Phase 3B–4]
5. Read me a story — AI-generated e-books [Phase 7+]
6. Remember this — memory, journaling [Phase 4]
7. Be with me — ambient companionship [shipping]

### The Trojan Horse strategy

Language is the highest-demand category in Thailand. Once Miomi lives on the user's phone, the same engine teaching words can perform every other verb. Competitors building "AI language apps" can't catch up — they'd have to rebuild from scratch as companion-OS.

### The flywheel: Tourist → Student → Worker → Resident

Each stage takes ~1 year. Miomi grows with the user across all of it. Same cat. Same memory. Same warmth.

### The B2B rocket

Hotels onboard guests. Cafes onboard customers. Schools onboard students. Institution pays the bridge. Users continue paying personally once they're hooked.

### The marketplace ceiling

Characters (K-pop Bunny, Anime Hero, Wise Fox), e-books, outfits, exam packs — Roblox / Genshin economy on a learning companion.

---

## 3. NON-NEGOTIABLES (the laws)

1. **Never a wall, always an invitation.** Every limit becomes a warm Miomi moment.
2. **Library-first, AI-second.** 80%+ of interactions zero-cost from local data.
3. **Teaching invisible. Growth theatrical.** Echo-correct silently. Celebrate loudly.
4. **Thai users first.** Kreng jai is law.
5. **Honey-gold gradient** `linear-gradient(135deg, #E8C77A 0%, #C9A96E 100%)` **is the primary CTA color.** Pink is reserved for the heart fuel bar icon and tiny accents ONLY. See `/docs/COLOR-SYSTEM.md`.
6. **One clear focus per screen.** ONE primary CTA visible.
7. **All warm phrases come from `lib/voice/warmth.ts`.**
8. **Mobile is primary.** Test against 375×812 + Samsung A52 mentally.
9. **Server-side enforcement.** Always `getServerProfile()` in API routes. Never trust client.
10. **Master-class before launch.** No rush. Build until unforgettable.

---

## 4. MIKE'S COMMUNICATION STYLE (read carefully)

- **Direct.** Rates things 1/10 to 10/10. Brutal feedback. If you can't take it, you'll fail.
- **Visual learner.** Pastes screenshots. Look at them carefully.
- **Hates burning credits.** #1 rule. Imprecise prompts cost real money he doesn't have.
- **Hates back-and-forth.** Wants step-by-step in simple words. Decide for him unless it affects direction.
- **Numbered answers preferred.** "1. yes 2. no 3. (a)"
- **English not native** — be clear, no idioms, no hedging ("might consider"). Say "do this".
- **Builds in waves.** Long stretches of work, then testing on devices, then bug-report bursts.

### What Mike values

- Visual polish (real ratings, not flattery)
- Whether the product "feels intelligent" (the real conversion driver)
- Whether things work on his Samsung A52, not just desktop preview
- Cost discipline ("how much credit?" is a regular question)
- Documentation clear enough that future sessions don't need re-explanation

### What frustrates Mike

- Being asked to do something he already did
- Long responses with caveats
- Claude pretending to verify something it didn't actually run
- Surgical fixes that don't actually fix anything
- Architectural drift between documents

---

## 5. CURRENT BUILD STATE

Build state is no longer tracked here — see /SYSTEM-MAP.md section 3 (single
source of truth) and MIOMIKA.md section 10 state log.

---

## 6. PROMPTING PROTOCOL

### Cursor model per phase

| Phase | Model | Why |
|---|---|---|
| 0 hygiene | Sonnet 4.5 | File moves |
| 1 foundation | Opus 4.7 | Auth, security, migrations |
| 2 mobile + guidance | Opus 4.7 | Conversion engine |
| 3A visual | Sonnet 4.5 | Mechanical |
| 3A-fixes | Sonnet 4.5 | Patches |
| RESET-1 (foundation rewrite) | Opus 4.7 | Architecture |
| RESET-2 (component rewrites) | Opus 4.7 | MicButton + profile |
| 3B teaching brain | Opus 4.7 | Pedagogy precision |
| 4 real engine | Opus 4.7 | Self-improvement |
| 5 payment | Opus 4.7 | Money flow |
| 6 operational | Sonnet 4.5 | Mechanical |
| 7 polish + marketplace | Mix | Desktop needs Opus |

### Cursor master-prompt format

```
# CURSOR MASTER-PROMPT — <PHASE>: <NAME>
> Cursor config: ... Model: ...
> Auto-push: yes/no

## OBJECTIVE
## ACCEPTANCE CRITERIA [checkboxes]
## BLOCK A, B, C... [surgical instructions]
## WHEN COMPLETE [exact output format]

Begin.
```

### Auto-push pattern

```bash
npx tsc --noEmit && npm run lint && npm run build
git add -A && git commit -m "Phase N: ..." && git push
```

### Cursor must always

- Read `/MIOMIKA.md` §11 Codebase Map first
- Read `/MASTER-HANDOFF.md` for context
- Stop and ask if a file doesn't exist
- Output `PHASE N COMPLETE` block

### Cursor must never

- Refactor outside the spec
- Invent UI not in design tokens
- Use emojis in UI chrome
- Hardcode warm Thai phrases outside `lib/voice/warmth.ts`
- Trust client-side tier checks

---

## 7. KEY SHARP EDGES

- **No more `public.users` table.** It's gone. `getServerProfile()` reads `public.profiles`.
- **Engine API ignores client-sent tier / isGuest / userId.** Always server-resolved.
- **Honey gold is the CTA color.** Pink belongs to the heart fuel bar only.
- **Samsung Internet** = no Web Speech API. Use Chrome on mobile.
- **Android Chrome** times out speech after 3s — needs `continuous=true` + onend restart (RESET-2 will rewrite MicButton).
- **iOS Safari** requires `recognition.start()` synchronously in touch handler.
- **Onboarding completion** → `window.dispatchEvent("miomika:profile-refresh")` → `/api/auth/post-signup` returns redirect with `?celebrate=signup`.
- **Documentation drift = the most expensive bug class.** If `/MIOMIKA.md` disagrees with code, fix the doc immediately.

---

## 8. WHAT THE NEXT SESSION SHOULD DO

1. Read `/SYSTEM-MAP.md` first (ground truth: what is built vs not built).
2. Read `/MIOMIKA.md` v6 (the destination: soul, design, build plan).
3. Current phase is the brain system (Phase 4). The engine described in
   SYSTEM-MAP.md section 2 is what becomes the brain — evolve it, do not rebuild it.
4. Before any code: confirm with Mike which migrations (0009-0012) are actually
   applied in live Supabase, since the repo cannot verify this.

---

## 9. MIKE'S OWN WORDS THAT MATTER

- "Don't burn credits."
- "Be brief and actionable."
- "Tell me step by step in simple words."
- "We need to take their hand, walk them through. If they hit a wall, make that wall smooth — in favor of them and the app. Not forcing. Not annoying. Just cute and nicely take them."
- "Teaching invisible, growth theatrical."
- "Master-class before launch. Phase 1,000 if needed."
- "I see light in this project."
- "ROOT FIX ONLY!"

---

## 10. WORK-IN-PROGRESS LIST

- [x] RESET-1: foundation rewrite (auth + schema + color + docs)
- [ ] RESET-2: MicButton + profile page rebuild + polish pass
- [ ] Phase 3B: Real teaching brain — adaptive opener, journey-stage curriculum, mastery from vocabulary_user_state, spiral schedule, multiple exercise types
- [ ] Phase 4: Engine maturation, library promotion cron, Claude Haiku swap
- [ ] Phase 5: Payment (Omise PromptPay + Stripe), /pricing, conversion cards
- [ ] Phase 6: Referral, SEO push, /help, /legal, Supabase custom domain decision, Google OAuth verification
- [ ] Phase 7: Welcome redesign, desktop rebuild, admin, Rive, marketplace, Kuma character
- [ ] Phase 8+: Multi-language (later), React Native, B2B onboarding

---

## END OF MASTER HANDOFF

Read `/MIOMIKA.md` next. Mike is waiting. Don't burn credits. Be brief and actionable. Test on Samsung A52 mentally before shipping. Remember the cat is the product.

— RESET-1 chat, May 22, 2026
