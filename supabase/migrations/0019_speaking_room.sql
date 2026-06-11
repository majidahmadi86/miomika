-- Speaking Room data (Curriculum milestone).
-- session_library: the SMART LIBRARY — a session plan is generated ONCE per
-- (level, target, topic, register), verified, then served to ALL users.
-- speaking_sessions: one row per user session run — results, notes, review.
-- Service-role access only (RLS enabled, no public policies, matching 0009).

create table public.session_library (
  id uuid primary key default gen_random_uuid(),
  cefr_level text not null default 'A1',
  learning_target text not null default 'th',
  topic_slug text not null,
  register text not null default 'everyday',
  title_en text not null,
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (cefr_level, learning_target, topic_slug, register)
);

comment on column public.session_library.plan is '{scene, miomi_role, objectives:[3 text], stages:[6 {id,title,activity,guidance}], phrases:[{en,th,romanization}]}';

create index session_library_key_idx on public.session_library (cefr_level, learning_target, topic_slug, register);

alter table public.session_library enable row level security;

create table public.speaking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  library_id uuid not null references public.session_library(id) on delete cascade,
  course_position int,
  scenario_position int,
  status text not null default 'ready',
  results jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on column public.speaking_sessions.status is 'ready | in_progress | completed';
comment on column public.speaking_sessions.results is '{objectives_done:[int], notes:[{kind:"glow"|"grow", note}], minutes:int, exit_done:bool}';

create index speaking_sessions_user_idx on public.speaking_sessions (user_id, created_at desc);

alter table public.speaking_sessions enable row level security;
