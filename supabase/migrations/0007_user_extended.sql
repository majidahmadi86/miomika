-- supabase/migrations/0007_user_extended.sql
-- Phase 1: extend users table for journey stage, Miomi Stars, active character.
-- See /MIOMIKA.md §2.6 (Journey Stages), §3 (Stars), §3.5 (Characters), §4.4 (Migration plan).
--
-- This migration is idempotent. Safe to re-run.

-- Defensive: ensure the users table exists. (It's created by an earlier hand-applied migration
-- or by onboarding upserts; we don't assume the column set, only that PK id matches auth.users.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    CREATE TABLE public.users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT,
      cat_name TEXT,
      tier TEXT DEFAULT 'free',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- 1. Journey stage (§2.6): tourist / student / worker / resident / unspecified
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS journey_stage TEXT
    DEFAULT 'unspecified'
    CHECK (journey_stage IN ('tourist','student','worker','resident','unspecified'));

-- 2. Miomi Stars wallet (§3). Earned + purchased balance.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS miomi_stars INTEGER
    DEFAULT 0
    CHECK (miomi_stars >= 0);

-- 3. Active character (§3.5). FK is deferred to migration 0009 (characters table); for Phase 1
--    we just store the slug-or-id text so it doesn't fail when characters table is absent.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS active_character_id TEXT
    DEFAULT 'miomi';

-- 4. Last-seen timestamp (used by welcome-screen Pro-returner guard, §6.1 #8).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 5. Welcome-screen shown flag (server-side counterpart of the localStorage guard).
--    Used for users who clear local storage but already met Miomi server-side.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS welcome_shown_at TIMESTAMPTZ;

-- Index for journey-stage cohorts (analytics + campaign targeting).
CREATE INDEX IF NOT EXISTS users_journey_stage_idx
  ON public.users(journey_stage);

-- Index for "missing user" engine state (§2.4).
CREATE INDEX IF NOT EXISTS users_last_seen_at_idx
  ON public.users(last_seen_at);
