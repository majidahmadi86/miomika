-- Multi-thread chat for /talk (Mike's 5-point spec, 7/17).
-- Service-role only — no RLS policies (same pattern as conversations 0014).

CREATE TABLE IF NOT EXISTS public.talk_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS talk_threads_user_idx
  ON public.talk_threads(user_id, last_message_at DESC);

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.talk_threads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS conversations_thread_idx
  ON public.conversations(thread_id, created_at);
