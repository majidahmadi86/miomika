-- RF2: session snapshots — user history survives library flushes.
-- plan_snapshot: frozen library payload at create time.
-- library_id: nullable + ON DELETE SET NULL so flushing session_library
-- never cascades away a user's completed sessions.

alter table public.speaking_sessions
  add column if not exists plan_snapshot jsonb not null default '{}'::jsonb;

comment on column public.speaking_sessions.plan_snapshot is
  '{title_en, cefr_level, learning_target, register, plan} frozen when the session starts';

alter table public.speaking_sessions
  drop constraint if exists speaking_sessions_library_id_fkey;

alter table public.speaking_sessions
  alter column library_id drop not null;

alter table public.speaking_sessions
  add constraint speaking_sessions_library_id_fkey
  foreign key (library_id) references public.session_library(id) on delete set null;
