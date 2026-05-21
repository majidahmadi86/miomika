-- supabase/migrations/0010_profile_ui_language.sql
-- Phase 2: persist UI language on the user row so it survives device switches.
-- Cookie is the source of truth on the device; users.ui_language is the
-- portable record that the auth callback re-applies to the cookie on a new
-- device.
--
-- See /MIOMIKA.md §8 Phase 2 (browser language auto-detection) and §2.6.
-- Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ui_language TEXT
    CHECK (ui_language IN ('th', 'en'))
    DEFAULT 'th';

CREATE INDEX IF NOT EXISTS users_ui_language_idx
  ON public.users(ui_language);
