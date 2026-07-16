-- 0024: Miomi's care notifications (little notes)
-- Run this in the Supabase SQL editor by hand, then verify with:
--   select count(*) from public.care_notifications;

alter table public.profiles
  add column if not exists care_emails_enabled boolean not null default true;

create table if not exists public.care_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  moment text not null,
  channel text not null default 'email',
  sent_at timestamptz not null default now()
);

create index if not exists care_notifications_user_sent_idx
  on public.care_notifications (user_id, sent_at desc);

-- Service-role only: RLS on, no policies on purpose.
alter table public.care_notifications enable row level security;
