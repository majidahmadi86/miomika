-- supabase/migrations/0003_user_sessions_state.sql

ALTER TABLE user_sessions
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS state_jsonb JSONB;

-- Unique index on session_id if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'user_sessions_session_id_uniq_idx'
  ) THEN
    CREATE UNIQUE INDEX user_sessions_session_id_uniq_idx
    ON user_sessions(session_id) WHERE session_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
ON user_sessions(user_id);
