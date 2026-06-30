-- Admin audit log: one row per admin action taken in the console.
-- Server-only (no RLS policies -> only the service role, which bypasses RLS, can read/write).
-- Run in Supabase SQL editor. Idempotent.

create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references public.profiles(id) on delete set null,
  admin_email    text,
  action         text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  detail         text,
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_target_idx  on public.admin_audit_log (target_user_id);
create index if not exists admin_audit_log_action_idx  on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;
