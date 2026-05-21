-- supabase/migrations/0008_vocabulary_user_state.sql
-- Phase 1 (CRITICAL): per-user word mastery and spaced-spiral schedule.
-- See /MIOMIKA.md §5 Pillar 3 (Spaced Spiral) and §6.1 #7.
--
-- Without this table, mastery tracking and spiral teaching are both impossible.
-- Phase 3 wires the engine to read/write here.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.vocabulary_user_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_en TEXT NOT NULL,

  -- 0 = introduced, 1 = seen once correctly, 2 = seen twice correctly,
  -- 3 = mastered (3-correct-uses contract, §5 Pillar 3).
  mastery_level SMALLINT NOT NULL DEFAULT 0
    CHECK (mastery_level >= 0 AND mastery_level <= 3),

  -- Lifecycle counts (used by engine and library promotion).
  times_seen INTEGER NOT NULL DEFAULT 0,
  times_used_correctly INTEGER NOT NULL DEFAULT 0,
  times_used_incorrectly INTEGER NOT NULL DEFAULT 0,

  -- Spaced spiral (§5 Pillar 3): re-introduce at 1, 2, 4, 7, 12 days.
  first_introduced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_introduced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_spiral_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,

  -- Direction context (some words enter via th→en, some en→th).
  introduced_direction TEXT
    CHECK (introduced_direction IN ('th_to_en','en_to_th','both')),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, word_en)
);

CREATE INDEX IF NOT EXISTS vocabulary_user_state_user_idx
  ON public.vocabulary_user_state(user_id);

-- Engine query: "what's due for spiral right now for this user?"
CREATE INDEX IF NOT EXISTS vocabulary_user_state_next_spiral_idx
  ON public.vocabulary_user_state(user_id, next_spiral_at)
  WHERE next_spiral_at IS NOT NULL AND mastery_level < 3;

-- Engine query: "what did this user just master? (for celebration)"
CREATE INDEX IF NOT EXISTS vocabulary_user_state_mastered_idx
  ON public.vocabulary_user_state(user_id, mastered_at DESC)
  WHERE mastered_at IS NOT NULL;

-- RPC: advance mastery on a correct usage. Returns the new mastery_level.
-- Engine calls this from /api/miomi after detecting correct word usage (Phase 3).
CREATE OR REPLACE FUNCTION public.advance_word_mastery(
  p_user_id UUID,
  p_word_en TEXT,
  p_direction TEXT DEFAULT 'th_to_en'
) RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_level SMALLINT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.vocabulary_user_state AS s
    (user_id, word_en, mastery_level, times_seen, times_used_correctly,
     first_introduced_at, last_introduced_at, introduced_direction, updated_at)
  VALUES
    (p_user_id, p_word_en, 1, 1, 1, v_now, v_now, p_direction, v_now)
  ON CONFLICT (user_id, word_en) DO UPDATE
    SET mastery_level = LEAST(s.mastery_level + 1, 3),
        times_seen = s.times_seen + 1,
        times_used_correctly = s.times_used_correctly + 1,
        last_introduced_at = v_now,
        mastered_at = CASE
          WHEN s.mastery_level + 1 >= 3 AND s.mastered_at IS NULL THEN v_now
          ELSE s.mastered_at
        END,
        next_spiral_at = CASE LEAST(s.mastery_level + 1, 3)
          WHEN 1 THEN v_now + INTERVAL '1 day'
          WHEN 2 THEN v_now + INTERVAL '2 days'
          WHEN 3 THEN v_now + INTERVAL '7 days'
          ELSE v_now + INTERVAL '1 day'
        END,
        updated_at = v_now
  RETURNING mastery_level INTO v_new_level;

  RETURN v_new_level;
END;
$$;

-- RPC: record an exposure without advancing mastery (e.g. word card shown but not used).
CREATE OR REPLACE FUNCTION public.touch_word_exposure(
  p_user_id UUID,
  p_word_en TEXT,
  p_direction TEXT DEFAULT 'th_to_en'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
BEGIN
  INSERT INTO public.vocabulary_user_state
    (user_id, word_en, mastery_level, times_seen,
     first_introduced_at, last_introduced_at, introduced_direction, next_spiral_at, updated_at)
  VALUES
    (p_user_id, p_word_en, 0, 1, v_now, v_now, p_direction, v_now + INTERVAL '1 day', v_now)
  ON CONFLICT (user_id, word_en) DO UPDATE
    SET times_seen = public.vocabulary_user_state.times_seen + 1,
        last_introduced_at = v_now,
        updated_at = v_now;
END;
$$;
