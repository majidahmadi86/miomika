-- ============================================================================
-- 0012_brutal_reset.sql
-- RESET-1: Brutal foundation reset. Idempotent.
--
-- Run manually in Supabase SQL Editor.
-- Safe to re-run — every statement is guarded.
-- ============================================================================

-- 1. Drop the legacy table permanently. Anything reading .from("users") is a
--    bug. All user data lives in public.profiles from now on.
DROP TABLE IF EXISTS public.users_legacy_backup CASCADE;

-- 2. Verify profiles has every required column. No-op if already present.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('masculine', 'feminine', 'neutral')),
  ADD COLUMN IF NOT EXISTS cat_name TEXT,
  ADD COLUMN IF NOT EXISTS personality TEXT,
  ADD COLUMN IF NOT EXISTS creator_type TEXT,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS ui_language TEXT CHECK (ui_language IN ('th', 'en')) DEFAULT 'th',
  ADD COLUMN IF NOT EXISTS welcome_shown_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS journey_stage TEXT CHECK (journey_stage IN ('tourist', 'student', 'worker', 'resident', 'unspecified')) DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS miomi_stars INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_character_id UUID;

-- 3. Verify the new-user trigger is current. SECURITY DEFINER so it can write
--    to public.profiles on behalf of auth.users INSERT.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, tier)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill: any auth.users without a profile row gets one now.
INSERT INTO public.profiles (id, email, display_name, tier)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  'free'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 5. RLS — users can only see/update/insert their own row.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Verification — four green checks confirm the reset succeeded.
SELECT
  'legacy table dropped' AS check,
  NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users_legacy_backup') AS result
UNION ALL
SELECT 'profiles complete',
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='profiles'
   AND column_name IN ('tier','journey_stage','ui_language','gender','xp','level','streak','mood')) = 8
UNION ALL
SELECT 'trigger active',
  EXISTS(SELECT 1 FROM information_schema.triggers
         WHERE event_object_schema='auth' AND event_object_table='users'
         AND trigger_name='on_auth_user_created')
UNION ALL
SELECT 'all auth users have profile',
  NOT EXISTS(SELECT 1 FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL);
