-- Voice metering ledger: cumulative Live-voice seconds per user per ISO week.
-- Live voice (real-time Speaking Room + future live chat) is the only metered
-- cost. Banked/pre-generated voice (greetings, guide, pronunciation) is NEVER
-- written here — it is free after first generation.
create table if not exists public.voice_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,                 -- Monday of the usage week (UTC)
  seconds_used integer not null default 0,  -- cumulative live-voice seconds this week
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Fast lookup for the balance gate.
create index if not exists voice_usage_user_week_idx
  on public.voice_usage (user_id, week_start);

-- RLS: users may read their own usage; only the service role writes (server-side
-- accounting — the client must never be trusted to report its own minutes).
alter table public.voice_usage enable row level security;

create policy "voice_usage_select_own"
  on public.voice_usage for select
  using (auth.uid() = user_id);

comment on table public.voice_usage is 'Per-user per-week cumulative LIVE voice seconds. Banked/pre-generated voice is never counted here. Written server-side only.';
