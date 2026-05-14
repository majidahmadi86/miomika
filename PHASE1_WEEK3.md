# Miomika — Phase 1 Week 3 Complete

## Date completed
May 14, 2026

## What was built this week

### Vercel deployment and miomika.com domain
- Production app deployed on **Vercel** (Next.js App Router build).
- Custom domain **miomika.com** connected to the Vercel project (DNS records + automatic HTTPS).
- Environment variables configured on Vercel for production (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `ANTHROPIC_API_KEY`, etc.) aligned with local `.env.local`.
- Root URL serves the product experience: unauthenticated visitors land on exploration **Home**, not a bare login screen.

### Guest exploration mode (no login wall, zero API cost)
- **No cold login wall**: `app/page.tsx` redirects signed-out users to **`/home`** instead of `/login`.
- **Middleware** (`middleware.ts`): `/home` is public. Without a session, **`/create`**, **`/dashboard`**, **`/profile`**, and **`/friends`** redirect to **`/home`** so guests never hit paid tools or profile DB. **`/onboarding`** remains auth-only (redirects to `/login` if signed out).
- **`GuestExplorationProvider`** + **`useGuestExploration`** (`components/guest/GuestExplorationContext.tsx`): Supabase `getSession` + `onAuthStateChange` drive **`isGuest`**; no Claude or `/api/miomi` calls for guests.
- **Locked nav (Create, Dashboard)**: blurred/disabled affordance + **lucide `Lock`**; tap opens Miomi’s **tab-lock** line and a soft **Sign up** chip under her bubble (not a modal).
- **Me tab (guest)**: routes to **`/signup`** so guests are never bounced to login by mistake.
- **Soft signup nudge** (Thai + English): fires **once per browser tab session** after **30 seconds** on Home, or when the guest taps **Create** CTAs (“สร้างเลย”, “สร้างกันเลย”); **`sessionStorage`** key `miomika_guest_soft_nudge_shown` dedupes against the timer.
- **Save topic** / **mic** (guest): gated prompts (`openLockedTabPrompt`) — still zero backend cost.
- **Tap Miomi**: **`dismissGuestInvite()`** clears invite UI so the pet stays primary; then normal tap lines resume.

### Miomi first impression animation (Home)
- **Entrance**: Framer Motion on the stage character — starts **below** (`y: 96`), slightly scaled down (`scale: 0.88`, `opacity: 0`), eases up into place over **~1.2s** (disabled when `prefers-reduced-motion`).
- **Breathing**: CSS class **`miomi-breathe`** on the sprite (subtle scale pulse from bottom origin).
- **Ambient motion**: horizontal **walk** (`miomiX`), vertical **float**, tail **wag** (idle) vs gentler float + tilt when **sleeping**.
- **Tap reactions**: bounce (`y` keyframes), spin wiggle on **`tapBounceKey` / `tapSpinKey`**, expression flip to **happy.png**, cycling **Thai-first** tap lines with English sublines.
- **Sleep**: after **30s** inactivity, Miomi sleeps with **Zzz** bubble; tap wakes with welcome + happy cycle.
- **Stage scale**: large **`h-[55vh]`** sprite on white canvas (no frame around Miomi per design rules).

### No-scroll audit (100dvh, internal scroll only)
- **`AppShell`**: Mobile shell **`h-[100dvh] max-h-[100dvh] overflow-hidden`** with a **`flex-1 min-h-0 overflow-hidden`** main column so pages fill the viewport under the tab bar.
- **`BottomNav`**: **In-flow** (no `fixed`) + **`env(safe-area-inset-bottom)`** spacer so total height matches real devices; avoids double `calc(100dvh - …)` hacks.
- **Home**: **`h-full min-h-0`** inside shell; **daily topic** fixed **`h-[68px]`** band so stage + actions + mic fit without page scroll.
- **Create**: **Three zones** — fixed **top** (Miomi + pill controls), **`flex-1 min-h-0 overflow-y-auto`** **thread only**, fixed **`h-14`** input bar.
- **Dashboard**: Compressed layout (briefing strip, **2×2** stats, two topic tiles, compact calendar); **`h-full min-h-0 overflow-hidden`** — no document scroll on iPhone-sized viewport.
- **Profile**: Outer **`overflow-hidden`**; long settings live in an **internal** **`overflow-y-auto`** scroller.
- **Friends**: Same **fill + internal scroll** pattern for placeholder growth.

### Miomi soul layer (character-led UX)
- **Home**: Miomi owns the canvas — bubble, mood/energy/hunger **PetStatusCircles**, daily **gold** topic, mic pulse; guest invite copy still **from Miomi’s bubble** with signup as a small follow-up control.
- **Create**: Stage Miomi drives **expression state** — **`idle` / `listening` / `thinking` / `happy`** maps to **`idle.png` / `happy.png` / `thinking.png`**; bubble copy per state (Thai + English).
- **Thinking**: while API loading or TTS-style **`isSpeaking`**.
- **Gift delivery**: after main package or comment variants finish, **`postGiftMood`** flips happy + gift-themed bubble; **Hook** cards show **`lucide-react` `Gift`** as a premium beat (not emoji).
- **Dashboard / Profile**: Miomi avatar in briefing or identity card keeps the companion **visually leading** those screens.

### CSS and Framer animations (inventory)
| Mechanism | Where | Role |
|-----------|--------|------|
| **`@keyframes miomi-breathe`** + **`.miomi-breathe`** | `app/globals.css` | Subtle scale pulse on Home + Create stage sprites; **disabled** under `prefers-reduced-motion`. |
| **`@keyframes miomi-login-float`** + **`.miomi-login-float`** | `app/globals.css` | Gentle vertical float (login/signup/create stage micro-float). |
| **Entrance** (`y`, `scale`, `opacity`) | `app/(app)/home/page.tsx` | First-run “comes toward you” feel. |
| **Float / walk / wag / sleep tilt** | `app/(app)/home/page.tsx` | Ambient life + sleep. |
| **Tap bounce / spin** | `app/(app)/home/page.tsx` | Playful feedback on pet tap. |
| **Mic ring pulse** | `app/(app)/home/page.tsx` | Framer loop on border ring. |
| **Bubble fade/slide** | `app/(app)/home/page.tsx` | `opacity` + `y` on speech UI. |
| **Create typing dots / toast** | `app/(app)/create/page.tsx` | Thread polish. |

### No-emoji rule + icons
- **Cursor rule** (`.cursor/rules/miomika.mdc`): **No generic Unicode / AI emojis** in UI copy or components; **Miomika assets**, text, or **lucide-react** icons only.
- **Enforced in product UI**: navigation, cards, guest prompts, and Create **Gift** accent use **`lucide-react`** (`Home`, `Sparkles`, `LayoutDashboard`, `User`, `Lock`, `Mic`, `Gift`, `Copy`, `Send`, `Check`, `Clock`, `Star`, etc.) — no decorative emoji characters in strings.

## Files touched or added (Week 3)
- `middleware.ts` — guest vs auth-required paths
- `app/page.tsx` — default route → `/home` for signed-out users
- `components/guest/GuestExplorationContext.tsx` — **new** guest session + invite state
- `components/layout/AppShell.tsx` — **100dvh** mobile shell
- `components/ui/BottomNav.tsx` — guest locked tabs, safe area, in-flow nav
- `app/(app)/layout.tsx` — **`GuestExplorationProvider`**, desktop nav guest behavior
- `app/(app)/home/page.tsx` — guest flows, bubble + CTA, **55vh** stage, motion
- `app/(app)/create/page.tsx` — fixed three-zone layout, **`miomi-breathe`**
- `app/(app)/dashboard/page.tsx` — compact no-scroll dashboard
- `app/(app)/profile/page.tsx` — internal scroll container
- `app/(app)/friends/page.tsx` — scroll shell pattern
- `app/globals.css` — **`miomi-breathe`**, **`miomi-login-float`** keyframes

## What is working
- **`npm run build`** passes (TypeScript + static generation).
- **miomika.com** serves the app with **SSL**; production env wired on Vercel.
- Guests get **full Home Miomi** (entrance, breathe, tap, sleep, topic) with **no** `/api/miomi` or Claude spend.
- Signed-in users unchanged: **Create**, **Dashboard**, **Profile**, onboarding, and API auth behave as before.
- Mobile layout fits **100dvh** with **thread/profile** internal scrolling only.

## Known issues / follow-ups
- **Week 2 doc** still mentions “middleware protects all app routes” and “Deploy to Vercel” — superseded for Week 3 by guest public **Home** + Vercel ship; consider a small note in `PHASE1_WEEK2.md` when archiving.
- **Rive** Miomi upgrade still future; PNG + Framer/CSS remain the soul layer for MVP.
- **Friends** tab in product spec vs **4-tab** bottom nav — nav remains Home / Create / Dashboard / Me until Friends ships.

## Next — Week 4 targets (suggested)
- Post-signup return path from guest **Sign up** chip (optional `?from=guest` analytics only).
- Light **E2E** or smoke checklist for guest vs authed flows on **miomika.com**.
- **Stripe** + usage limits when ready for monetization.
- Optional: dedicated **`/friends`** surface when design is ready.
