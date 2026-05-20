-- supabase/migrations/0002_vocabulary_rpcs.sql

CREATE OR REPLACE FUNCTION increment_word_taught(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_taught = times_taught + 1
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_word_mastered(p_word_en TEXT)
RETURNS void AS $$
BEGIN
  UPDATE vocabulary_bank
  SET times_mastered = times_mastered + 1,
      mastery_rate = CASE
        WHEN times_taught > 0 THEN (times_mastered + 1)::float / times_taught
        ELSE 0
      END
  WHERE word_en = p_word_en;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_phrase_taught(p_phrase_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE phrases_bank
  SET times_taught = times_taught + 1
  WHERE id = p_phrase_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_phrase_used_correctly(p_phrase_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE phrases_bank
  SET times_used_correctly = times_used_correctly + 1
  WHERE id = p_phrase_id;
END;
$$ LANGUAGE plpgsql;
