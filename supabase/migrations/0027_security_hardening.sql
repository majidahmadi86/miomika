-- 0027 · Security hardening (health check 2026-09-29)
-- Run once in the Supabase SQL editor. Idempotent: safe to re-run.

-- ─── 1. profiles: users may edit only their own harmless columns ─────────────
-- Before: "Users can update own profile" was USING (auth.uid() = id) with no
-- column limit, so any signed-in user could set their own tier, credits,
-- stripe_customer_id, subscription_status or email from the browser.
-- These are exactly the columns the app writes with the user's own session
-- (me/*, onboarding, NameEdit/AvatarEdit sheets, welcome action,
-- touchLastSeen, companion bond). Everything else is service-role only.
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name,
  avatar_url,
  ui_language,
  journey_stage,
  learning_target_language,
  cefr_level,
  care_emails_enabled,
  welcome_shown_at,
  onboarding_completed_at,
  last_seen_at,
  streak,
  bond_points
) on public.profiles to authenticated;

-- Rows are created by the SECURITY DEFINER handle_new_user trigger only.
revoke insert on public.profiles from anon, authenticated;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── 2. RPCs that take a user id / key: server (service role) only ──────────
-- All of these are called from the server with the service client. Left
-- executable by PUBLIC, anyone (even logged out) could rewrite another
-- user's word mastery, lock users out via rate-limit keys, or inflate
-- library signals. Loops over pg_proc so unknown signatures are covered.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'advance_word_mastery',
        'touch_word_exposure',
        'increment_rate_limit',
        'increment_library_signal',
        'touch_last_seen',
        'audit_rls_status',
        'gen_referral_code',
        '_drop_policy_if_exists'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

alter function public.gen_referral_code() set search_path = public;

-- ─── 3. avatars bucket: images only, 2 MB cap ────────────────────────────────
-- The app uploads <userId>.jpg as image/jpeg (components/me/AvatarEditSheet).
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

-- ─── Check afterwards ────────────────────────────────────────────────────────
-- Column grants on profiles (expect only the 12 columns above for authenticated):
--   select column_name from information_schema.column_privileges
--   where table_schema = 'public' and table_name = 'profiles'
--     and grantee = 'authenticated' and privilege_type = 'UPDATE';
-- Storage policies on avatars (review for any broad SELECT that allows listing,
-- or INSERT/UPDATE not tied to name = auth.uid()::text || '.jpg'):
--   select policyname, cmd, roles, qual, with_check from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
