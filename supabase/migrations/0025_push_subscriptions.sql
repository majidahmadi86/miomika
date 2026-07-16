-- 0025: web push subscriptions for Miomi's care notifications
-- Run this in the Supabase SQL editor by hand, then verify with:
--   select count(*) from public.push_subscriptions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Service-role only: RLS on, no policies on purpose (the subscribe API
-- authenticates the user itself, then writes with the service client).
alter table public.push_subscriptions enable row level security;
