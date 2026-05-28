-- TTS audio cache (3-strike: store MP3 only after 3rd request for same phrase).
-- Service-role only — no RLS policies (same pattern as library_interactions).

CREATE TABLE IF NOT EXISTS public.tts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,   -- hash of normalized text + lang + voice
  text text NOT NULL,
  lang text NOT NULL,
  voice text NOT NULL,
  audio_base64 text NOT NULL,        -- the cached MP3, base64 (empty until 3rd hit)
  request_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tts_cache_key_idx ON public.tts_cache(cache_key);
CREATE INDEX IF NOT EXISTS tts_cache_last_used_idx ON public.tts_cache(last_used_at);

ALTER TABLE public.tts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tts_cache FORCE ROW LEVEL SECURITY;
-- Intentionally no policies: only service-role can read/write.
