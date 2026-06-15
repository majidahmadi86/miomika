-- Learner-declared CEFR level on profiles.
-- Set once by the user at /me/level; read by readBrainState to pick
-- vocabulary at the right difficulty instead of the hardcoded tier fallback.
alter table public.profiles
  add column if not exists cefr_level text;

comment on column public.profiles.cefr_level is
  'Learner-declared proficiency in their target language (A1|A2|B1|B2|C1|C2). NULL = unset -> tier fallback.';
