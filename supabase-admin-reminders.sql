-- Miomika admin · reminders / renewals (Watchboard)
-- Run once in Supabase SQL editor. Server uses service role; RLS with no policies denies clients.

create table if not exists public.admin_reminders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null default 'renewal',
  due_date date,
  note text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admin_reminders enable row level security;
-- no policies: client access denied; server uses service role

create index if not exists admin_reminders_due_idx on public.admin_reminders (due_date) where done = false;
