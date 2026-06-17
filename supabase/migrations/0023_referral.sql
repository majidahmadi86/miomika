-------------------------------------------------------------------
-- Referral plumbing (Phase 6). Attribution now; payout/credit deferred to billing.
-- Adds profiles.referral_code (per-user public invite code, auto-generated)
-- + referral_conversions ledger (who referred whom, status lifecycle).
-- Does NOT touch handle_new_user: the trigger inserts (id,email,display_name,tier)
-- and the column default fills referral_code for new users automatically.
-- Idempotent.

-- 1) Code generator: 7 chars, URL-safe, unambiguous (no 0/1/O/I/L), collision-checked.
create or replace function public.gen_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    perform 1 from public.profiles where referral_code = code;
    if not found then
      return code;
    end if;
  end loop;
end;
$$;

-- 2) Column added nullable first, so existing rows backfill safely.
alter table public.profiles
  add column if not exists referral_code text;

-- 3) Backfill existing users one row at a time (each call sees prior assignments
--    in the same transaction, so no intra-backfill collisions).
do $$
declare r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.gen_referral_code() where id = r.id;
  end loop;
end $$;

-- 4) New users auto-get a code via the column default (no trigger change).
alter table public.profiles
  alter column referral_code set default public.gen_referral_code();

-- 5) Uniqueness + fast lookup when resolving /invite/<code> links.
create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code);

comment on column public.profiles.referral_code is
  'Per-user public invite code (7 chars, unambiguous alphabet). Auto-generated; used in /invite/<code> links and the profile QR.';

-- 6) Referral ledger: one row per referred signup. Attribution now, payout later.
create table if not exists public.referral_conversions (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles(id) on delete cascade,
  referred_id  uuid not null references public.profiles(id) on delete cascade,
  code_used    text,
  status       text not null default 'pending',
  created_at   timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at  timestamptz,
  unique (referred_id),
  check (referrer_id <> referred_id)
);
create index if not exists referral_conversions_referrer_idx
  on public.referral_conversions (referrer_id, created_at desc);
alter table public.referral_conversions enable row level security;
drop policy if exists "referral_conversions_select_own" on public.referral_conversions;
create policy "referral_conversions_select_own"
  on public.referral_conversions for select
  using (auth.uid() = referrer_id);
comment on table public.referral_conversions is
  'Who referred whom. status: pending -> qualified (referred subscribed past refund window) -> rewarded. Inserts/updates service-role only; no self-referral (check), one referrer per user (unique referred_id).';
