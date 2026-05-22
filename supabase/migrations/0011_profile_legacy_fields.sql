-- 0011_profile_legacy_fields.sql
-- Add fields the old users table had that profiles needs
-- Backfill from users_legacy_backup for any matching rows

-- 1. Add gender column (used by Cultural Warmth System for praise vector selection)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('masculine', 'feminine', 'neutral'));

-- 2. Add any other legacy fields the engine might still reference
--    (cat_name, personality, creator_type, etc — these are nice-to-have,
--     used by miomi-personality module if present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cat_name TEXT,
  ADD COLUMN IF NOT EXISTS personality TEXT,
  ADD COLUMN IF NOT EXISTS creator_type TEXT,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood INTEGER DEFAULT 80;

-- 3. Backfill from users_legacy_backup (only for users that exist in both)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users_legacy_backup'
  ) THEN
    UPDATE public.profiles p
    SET
      cat_name = COALESCE(p.cat_name, u.cat_name),
      personality = COALESCE(p.personality, u.personality),
      creator_type = COALESCE(p.creator_type, u.creator_type),
      xp = COALESCE(NULLIF(p.xp, 0), u.xp, 0),
      level = COALESCE(NULLIF(p.level, 1), u.level, 1),
      streak = COALESCE(NULLIF(p.streak, 0), u.streak, 0),
      mood = COALESCE(NULLIF(p.mood, 80), u.mood, 80)
    FROM public.users_legacy_backup u
    WHERE p.id = u.id;
  END IF;
END $$;

-- 4. Verification
SELECT
  'gender column' AS check,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='gender') AS result
UNION ALL
SELECT 'cat_name column', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='cat_name')
UNION ALL
SELECT 'legacy data backfilled', (
  SELECT COUNT(*) > 0 FROM public.profiles WHERE cat_name IS NOT NULL
);
