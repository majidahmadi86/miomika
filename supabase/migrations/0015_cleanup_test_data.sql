-- Wipe testing data before real launch. Safe — only clears interaction logs
-- and conversation memory. Does NOT touch user accounts, vocabulary_bank,
-- library_entries (those are seeds, not test data).
DELETE FROM public.library_interactions;
DELETE FROM public.conversations;
DELETE FROM public.vocabulary_user_state;
DELETE FROM public.tts_cache;
