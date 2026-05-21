-- supabase/migrations/0009_rls_lockdown.sql
-- Phase 1: RLS audit and lockdown for every authored table.
-- See /MIOMIKA.md §4.4 ("RLS: assumed on but unaudited. Action in Phase 1.")
-- and the cursor rules ("All Supabase tables must have RLS. No exceptions.").
--
-- Strategy:
--   1. Per-user tables (rows scoped to auth.uid()): RLS ON, owner-only SELECT/INSERT/UPDATE/DELETE.
--   2. Shared library tables (vocabulary, phrases, library entries): RLS ON, world-readable SELECT,
--      writes blocked from clients (service-role only).
--   3. Quality logging (library_interactions, library_promotions_queue): RLS ON, owner-only INSERT,
--      service-role full access, no SELECT for normal users.
--
-- Idempotent: every policy is dropped before recreate.

-- =========================
-- Helper: drop a policy safely
-- =========================
CREATE OR REPLACE FUNCTION public._drop_policy_if_exists(p_table TEXT, p_policy TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_policy, p_table);
END;
$$;

-- =========================
-- 1) public.users — per-user
-- =========================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users') THEN
    EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.users FORCE ROW LEVEL SECURITY';
    PERFORM public._drop_policy_if_exists('users','users_self_select');
    PERFORM public._drop_policy_if_exists('users','users_self_insert');
    PERFORM public._drop_policy_if_exists('users','users_self_update');
    EXECUTE 'CREATE POLICY users_self_select ON public.users FOR SELECT USING (auth.uid() = id)';
    EXECUTE 'CREATE POLICY users_self_insert ON public.users FOR INSERT WITH CHECK (auth.uid() = id)';
    EXECUTE 'CREATE POLICY users_self_update ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)';
    -- DELETE is intentionally service-role only.
  END IF;
END $$;

-- =========================
-- 2) public.user_sessions — per-user
-- =========================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_sessions') THEN
    EXECUTE 'ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.user_sessions FORCE ROW LEVEL SECURITY';
    PERFORM public._drop_policy_if_exists('user_sessions','user_sessions_self_all');
    EXECUTE 'CREATE POLICY user_sessions_self_all ON public.user_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- =========================
-- 3) public.vocabulary_user_state — per-user (new in 0008)
-- =========================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='vocabulary_user_state') THEN
    EXECUTE 'ALTER TABLE public.vocabulary_user_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.vocabulary_user_state FORCE ROW LEVEL SECURITY';
    PERFORM public._drop_policy_if_exists('vocabulary_user_state','vus_self_all');
    EXECUTE 'CREATE POLICY vus_self_all ON public.vocabulary_user_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- =========================
-- 4) Shared library tables — world-readable, server-side writes only
-- =========================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['vocabulary_bank','phrases_bank','library_entries']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      PERFORM public._drop_policy_if_exists(t, t || '_world_read');
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (true)', t || '_world_read', t);
      -- No INSERT/UPDATE/DELETE policy → only service-role can write.
    END IF;
  END LOOP;
END $$;

-- =========================
-- 5) Logging / quality tables — server-side append, no client read
-- =========================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['library_interactions','library_promotions_queue']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
      -- Intentionally no policies: only service-role can read/write.
      -- This locks the table from any anon / authenticated client direct access.
    END IF;
  END LOOP;
END $$;

-- =========================
-- 6) Audit helper: produce a CSV of tables and their RLS state (Mike runs this manually)
-- =========================
CREATE OR REPLACE FUNCTION public.audit_rls_status()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN, force_rls BOOLEAN, policy_count INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.relname::TEXT AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls,
    COALESCE(p.policy_count, 0) AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN (
    SELECT polrelid, COUNT(*)::INT AS policy_count
    FROM pg_policy
    GROUP BY polrelid
  ) p ON p.polrelid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY c.relname;
$$;

-- Cleanup helper (kept around — it's harmless and useful for future migrations).
-- DROP FUNCTION IF EXISTS public._drop_policy_if_exists(TEXT, TEXT);
