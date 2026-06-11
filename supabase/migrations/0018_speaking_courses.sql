-- Speaking courses: Confident Speaking — the flagship surface (Curriculum
-- milestone). One row per (user, cefr_level, learning_target); the whole
-- path lives in jsonb. Scenario content is built lazily and passes the same
-- accuracy gates as lessons (verified phrases only). Service-role access
-- only (RLS enabled with no public policies, matching 0009_rls_lockdown).

create table public.speaking_courses (
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

comment on column public.speaking_courses.status is 'planned | in_progress | completed';
comment on column public.speaking_courses.plan is '{courses:[{position:int, title_en, topic, color, scenario_titles:[text], scenarios:[{position:int, title_en, scene_en, goals:[text], phrases:[{en,th,romanization}], status}]}]}';
comment on column public.speaking_courses.progress is '{current_course:int, completed:{<course>-<scenario>:{goals_done:int, completed_at}}}';

create index speaking_courses_user_idx on public.speaking_courses (user_id, cefr_level, learning_target);

alter table public.speaking_courses enable row level security;
