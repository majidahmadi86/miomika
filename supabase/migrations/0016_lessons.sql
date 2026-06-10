-- Lessons: planned, start-to-finish lessons per user (Lessons milestone).
-- Single table; content/progress as jsonb. Service-role access only (RLS
-- enabled with no public policies, matching 0009_rls_lockdown).
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_en text not null,
  title_th text,
  topic text not null,
  color text not null default 'peach',
  cefr_level text not null default 'A1',
  learning_target text not null default 'th',
  position int not null default 0,
  status text not null default 'planned',
  content jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.lessons.status is 'planned | in_progress | completed';
comment on column public.lessons.content is '{words:[{word_en,word_th,...verified card fields}], phrases:[{th,pron,en,...verified}], candos:[{label,cefr,skill}]}';
comment on column public.lessons.progress is '{step:int, games:{say:bool,match:bool,listen:bool,fill:bool}, checkpoint:{score:int,total:int}, completed_at:timestamptz|null}';

create index lessons_user_position_idx on public.lessons (user_id, position);
alter table public.lessons enable row level security;
