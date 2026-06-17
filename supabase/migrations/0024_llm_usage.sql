-- Per-call AI usage + cost ledger. Mike runs this SQL in Supabase.
create table if not exists public.llm_usage (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),
  user_id           uuid references public.profiles(id) on delete set null,
  fn                text not null,
  provider          text not null,
  kind              text not null default 'llm',
  model             text not null,
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  chars             integer not null default 0,
  audio_seconds     numeric not null default 0,
  est_cost_usd      numeric(12,6) not null default 0,
  latency_ms        integer,
  ok                boolean not null default true,
  request_id        text,
  meta              jsonb
);
create index if not exists llm_usage_created_idx on public.llm_usage (created_at desc);
create index if not exists llm_usage_user_idx    on public.llm_usage (user_id, created_at desc);
create index if not exists llm_usage_fn_idx      on public.llm_usage (fn, created_at desc);
alter table public.llm_usage enable row level security;
