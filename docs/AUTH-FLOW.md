# Miomika Auth Flow (canonical)

Last verified: 2026-05-23 (RESET-1)

This is the single source of truth for how a user's identity is established, persisted, and consumed across the app. If code disagrees with this file, the code is the bug.

---

## Signup flow

```
User taps "Continue with Google"
  ↓
Supabase OAuth → Google account picker (prompt=select_account)
  ↓
Google redirects to https://[project].supabase.co/auth/v1/callback
  ↓
Supabase redirects to /auth/callback?code=...
  ↓
app/auth/callback/route.ts:
  - Exchanges code for session
  - Sets session cookies
  - DB trigger handle_new_user() created profile row automatically (tier='free')
  - Calls POST /api/auth/post-signup internally
  ↓
/api/auth/post-signup:
  - Reads getServerProfile()
  - If profile.onboarding_completed_at is null → redirect /onboarding
  - Else if profile.onboarding_completed_at < 30s ago → redirect /home?celebrate=signup
  - Else → redirect /home
  ↓
/onboarding completes → POST /api/auth/post-signup → router.push(redirect_to)
  ↓
/home reads ?celebrate=signup → CelebrationBurst for 2.4s → localStorage one-shot flag
```

## Signin flow (returning user)

Same path through `/auth/callback`, but the profile already exists. `/api/auth/post-signup` detects `onboarding_completed_at IS NOT NULL` and `> 30s old` → redirects `/home` (no celebration).

## Signout flow

```
User taps "Sign out"
  ↓
supabase.auth.signOut({ scope: 'global' })   // kills refresh token everywhere
  ↓
localStorage cleared of sb-* keys + sessionStorage cleared
  ↓
window.location.href = '/'                    // hard reload, no React state ghosts
```

---

## Reading user state — the rules

| Surface | How to read |
|---|---|
| **API routes** | `await getServerProfile()` — `lib/auth/get-server-profile.ts` |
| **Server components / server actions** | `await getServerProfile()` |
| **Client components** | `useProfile()` — `lib/auth/use-profile.ts` |

### Client invalidation

`useProfile` subscribes to two channels:

1. `supabase.auth.onAuthStateChange` — fires on `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED`, `SIGNED_OUT` and triggers a hard refetch.
2. `window.dispatchEvent(new Event("miomika:profile-refresh"))` — any client surface that just mutated the profile (onboarding completion, settings update) should dispatch this. The hook will refetch.

NEVER trust client-sent `tier` or `user_id` in an API request body. Server reads from cookies. Always.

---

## What broke before (so we don't repeat)

- The `users` table was renamed to `users_legacy_backup`, but several files still read from `users`. Result: `useProfile` returned a fake `free` object with no `welcome_shown_at`, breaking every downstream check.
- The engine API route accepted `tier` from the client request body, allowing a confused client to pass `tier: 'guest'` even after login completed.
- Post-signup logic was scattered across the auth callback and the onboarding page, with no single point that says "what should this user see next."

Fixed in RESET-1 by:

1. Migration `0012_brutal_reset.sql` drops `users_legacy_backup` permanently.
2. `lib/auth/get-server-profile.ts` is the only way the server reads identity.
3. `app/api/auth/post-signup/route.ts` is the only place that decides redirect destination.

---

## File map

| Concern | File |
|---|---|
| Browser Supabase client | `lib/supabase/client.ts` |
| Server Supabase client | `lib/supabase/server.ts` |
| Middleware (session refresh + language cookie) | `middleware.ts` |
| **Server-side profile reader (canonical)** | **`lib/auth/get-server-profile.ts`** |
| Client-side profile hook | `lib/auth/use-profile.ts` |
| **Post-signup canonical route** | **`app/api/auth/post-signup/route.ts`** |
| OAuth callback | `app/auth/callback/route.ts` |
| Welcome decision logic | `lib/welcome/show-welcome.ts` |
| Welcome side effects | `lib/welcome/actions.ts` |
| Auth gate (blocks home flash) | `app/(app)/layout.tsx` |
| Sign out | `components/layout/AppShell.tsx` |
