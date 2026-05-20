-- supabase/migrations/0001_add_interaction_type.sql

ALTER TABLE library_interactions
ADD COLUMN IF NOT EXISTS interaction_type TEXT
DEFAULT 'standard';

-- Add the CHECK constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'library_interactions_interaction_type_check'
  ) THEN
    ALTER TABLE library_interactions
    ADD CONSTRAINT library_interactions_interaction_type_check
    CHECK (interaction_type IN (
      'word_introduced',
      'word_used_correctly',
      'phrase_introduced',
      'phrase_used_correctly',
      'creator_output',
      'translation_served',
      'standard'
    ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS library_interactions_interaction_type_idx
ON library_interactions(interaction_type);
