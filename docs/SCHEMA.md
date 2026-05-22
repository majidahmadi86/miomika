# Miomika Database Schema (canonical)

Last verified: 2026-05-23 (RESET-1)

Single source of truth for the Postgres schema running on Supabase. Anything that disagrees with this file is the bug.

---

## Tables in `public` schema

### profiles (PRIMARY USER TABLE)

The canonical source of all user data. After RESET-1 there is no other user table.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | FK to `auth.users(id)`, cascade delete |
| display_name | TEXT | From OAuth name or email prefix |
| email | TEXT | Mirror of `auth.users.email` |
| avatar_url | TEXT | Optional |
| tier | TEXT | `guest` / `free` / `pro` / `pro_max` — default `free` |
| journey_stage | TEXT | `tourist` / `student` / `worker` / `resident` / `unspecified` |
| gender | TEXT | `masculine` / `feminine` / `neutral` |
| miomi_stars | INTEGER | Currency, default 0 |
| active_character_id | UUID | Future: marketplace characters |
| primary_language | TEXT | Default `th` |
| learning_target_language | TEXT | Default `en` |
| ui_language | TEXT | `th` / `en` |
| cat_name | TEXT | Legacy: user-named their cat |
| personality | TEXT | Legacy: `sweet` / `cheeky` / `dreamy` |
| creator_type | TEXT | Legacy: comma-joined creator interests |
| xp | INTEGER | Default 0 |
| level | INTEGER | Default 1 |
| streak | INTEGER | Default 0 |
| mood | INTEGER | 0–100, default 80 |
| last_seen_at | TIMESTAMPTZ | Updated by every authenticated API call |
| welcome_shown_at | TIMESTAMPTZ | Null if never shown |
| onboarding_completed_at | TIMESTAMPTZ | Null if not finished |
| created_at, updated_at | TIMESTAMPTZ | Standard |

**RLS:** users see/update/insert their own row only. Service role bypasses RLS.

**Trigger:** `handle_new_user()` on `auth.users INSERT` creates the profile row automatically with `tier = 'free'`. See `supabase/migrations/0012_brutal_reset.sql`.

---

### vocabulary_bank (PRESERVED — DO NOT TOUCH)

Reference vocabulary, 1,134+ rows. Read by `lib/ai/vocabulary.ts` and `lib/library/resolver.ts`. Phase 4 will add a JSONB `translations` column for multi-language readiness.

### phrases_bank (PRESERVED — Phase 3B will wire)

Reference phrases. Not yet active in the engine.

### library_entries (PRESERVED)

Cached AI responses promoted from `library_interactions` via the quality pipeline.

### library_interactions (PRESERVED)

Logged interactions with quality signals. Feeds the promotion pipeline.

### library_promotions_queue (PRESERVED)

AI → library promotion pipeline. Service role only.

### user_sessions (PRESERVED)

Per-user session state. Tracks `started_at`, exchange counts, current session shape.

### vocabulary_user_state (PRESERVED — Phase 3B will activate)

Per-user word mastery + spiral schedule. Columns: `last_introduced_at`, `next_spiral_at`, `mastery_stage`.

---

## REMOVED PERMANENTLY (post-RESET-1)

- `public.users` — the old user table
- `public.users_legacy_backup` — the renamed temporary backup

Both are dropped via migration `0012_brutal_reset.sql`. Any reference in code to `.from("users")` is a bug from a forgotten file.

---

## Reading user data — the ONLY pattern allowed

```typescript
// SERVER (API routes, server components, server actions):
import { getServerProfile } from "@/lib/auth/get-server-profile";
const profile = await getServerProfile(); // returns ServerProfile | null

// CLIENT (components):
import { useProfile } from "@/lib/auth/use-profile";
const { profile, loading, authReady } = useProfile();
```

Never `.from("users")`. Never trust client-sent `tier` in API routes. The server is the source of truth; the client's job is to ASK what tier it is, never to TELL.

---

## Migration history

| File | Applied? | Purpose |
|---|---|---|
| 0001_add_interaction_type.sql | ✓ | `library_interactions.interaction_type` |
| 0002_vocabulary_rpcs.sql | ✓ | Vocabulary RPCs |
| 0003_user_sessions_state.sql | ✓ | `user_sessions` table |
| 0007_user_extended.sql | ✓ | `profiles` table + `handle_new_user` trigger |
| 0008_vocabulary_user_state.sql | ✓ | Per-user mastery tracking |
| 0009_rls_lockdown.sql | ✓ | RLS policies audit |
| 0010_profile_ui_language.sql | ✓ | `profiles.ui_language` |
| 0011_profile_legacy_fields.sql | ✓ | Backfill from `users_legacy_backup` |
| **0012_brutal_reset.sql** | **needs apply (RESET-1)** | **Drop legacy table, verify schema, refresh trigger, RLS audit** |

Apply `0012_brutal_reset.sql` manually in the Supabase SQL Editor at the end of RESET-1.
