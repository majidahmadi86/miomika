# Miomika — Phase 1 Week 2 Progress

## Date
May 14, 2026

## What was built this week
- Auth system: signup, login, logout connected to Supabase
- Email confirmation flow with branded Miomika email template
- Middleware protecting all app routes — redirects to /login if not authenticated
- Onboarding flow: 6 steps with Miomi character, saves to Supabase users table
  - Name your cat, personality, creator type, platforms, language
  - Upsert to users table with all onboarding data
- Create screen: voice input via Web Speech API, platform/tone/language selectors
  - API route at /api/miomi connected to Claude API (needs ANTHROPIC_API_KEY)
  - Output panel: hook, caption, hashtags, CTA cards with copy buttons
  - Branded card download placeholder
- Dashboard screen: Miomi briefing, stats grid, topic recommendations, posting calendar
- Miomi home screen animations improved:
  - Random position changes every 4-6 seconds
  - Expression changes (idle/happy)
  - Tap interaction with bounce and random Thai/English phrases
  - Sleep mode after 30 seconds of inactivity

## Screens completed
- app/(auth)/login/page.tsx
- app/(auth)/signup/page.tsx
- app/onboarding/page.tsx
- app/(app)/home/page.tsx
- app/(app)/create/page.tsx
- app/(app)/dashboard/page.tsx

## Still needed to complete MVP
- Profile screen (app/(app)/profile/page.tsx)
- ANTHROPIC_API_KEY — add credits to console.anthropic.com
- Mobile width constraint — max 390px centered on desktop
- Rive animation for Miomi — in progress by founder
- Branded card generation
- Stripe payments setup
- Deploy to Vercel

## Known issues
- Content generation not testable until API key added
- PNG Miomi animations are object-level only — Rive upgrade planned
- App shows full desktop width on large screens

## Next session starting point
Continue from Profile screen build
Then: API key, Stripe, deploy to Vercel
