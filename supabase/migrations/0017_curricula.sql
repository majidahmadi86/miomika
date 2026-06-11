-- Curricula: the system-planned journey per user, level, and direction
-- (Curriculum milestone). One row per (user, cefr_level, learning_target);
-- the whole plan lives in jsonb. Units reference rows in public.lessons.
-- Service-role access only (RLS enabled with no public policies,
-- matching 0009_rls_lockdown).

create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cefr_level text not null default 'A1',
  learning_target text not null default 'th',
  status text not null default 'planned',
  plan jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, cefr_level, learning_target)
);

comment on column public.curricula.status is 'planned | in_progress | completed';
comment on column public.curricula.plan is '{units:[{position:int, title_en, topic, color, lesson_ids:[uuid], status}], checkpoints:[{badge, after_unit:int, kind:"checkpoint"|"level_test"}]}';
comment on column public.curricula.progress is '{current_unit:int, checkpoints:{badge:{score:int,total:int,passed_at}}, gold:int, silver:int, completed_at:timestamptz|null}';

create index curricula_user_idx on public.curricula (user_id, cefr_level, learning_target);

alter table public.curricula enable row level security;
