-- Shared rate limiter: one row per (scope, identity, minute-bucket).
-- Protects the two endpoints that call Google directly (TTS speak, STT
-- transcribe) from being hammered — the traffic pattern that can trip
-- Google's abuse detection, independent of what it costs us.
-- Server-only (service role bypasses RLS). Run in Supabase. Idempotent.

create table if not exists public.rate_limit_hits (
  rl_key      text primary key,   -- "<scope>:<identity>:<minute_bucket>"
  count       int not null default 1,
  updated_at  timestamptz not null default now()
);

create index if not exists rate_limit_hits_updated_idx on public.rate_limit_hits (updated_at);

alter table public.rate_limit_hits enable row level security;

-- Atomic upsert-increment, callable via supabase.rpc(). SECURITY DEFINER
-- so it runs as the function owner regardless of RLS on the table above.
create or replace function public.increment_rate_limit(p_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limit_hits (rl_key, count, updated_at)
  values (p_key, 1, now())
  on conflict (rl_key) do update set count = rate_limit_hits.count + 1, updated_at = now()
  returning count into v_count;
  return v_count;
end;
$$;
