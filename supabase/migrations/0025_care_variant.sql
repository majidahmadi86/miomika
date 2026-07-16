-- 0025: care-note variety memory. Stores which handwritten variant was sent
-- so the dispatcher never repeats a wording to the same user back to back.
-- Run in the Supabase SQL editor BY HAND (before or right after deploying the
-- variety code; the cron only fires at 11:30 Bangkok). Verify with:
--   select column_name from information_schema.columns
--   where table_name = 'care_notifications' and column_name = 'variant';

alter table public.care_notifications
  add column if not exists variant text;
