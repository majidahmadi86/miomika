-- Conversation memory for the brain context engine (Step 1).
-- Service-role only — no RLS policies (same pattern as library_interactions).

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid,
  exchange_number integer NOT NULL,
  role text NOT NULL CHECK (role IN ('user','miomi')),
  content text NOT NULL,
  language text,
  move text,
  emotional_signal text,
  intent text,
  used_target_word boolean DEFAULT false,
  ai_cost_usd numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_created_idx
  ON public.conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS conversations_session_idx
  ON public.conversations(session_id, exchange_number);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations FORCE ROW LEVEL SECURITY;
-- Intentionally no policies: only service-role can read/write.
