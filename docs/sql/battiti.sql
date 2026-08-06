-- ============================================================================
-- I BATTITI — l'interruttore delle notifiche (docs/SPEC-BATTITI.md)
--
-- Una colonna sola su `profile`: spegne le NOTIFICHE dei battiti, non le card
-- in home. Default acceso, come dice la spec — chi non tocca niente li riceve.
--
-- Le card e lo stato dei battiti NON hanno bisogno di migrazioni: vivono in
-- tickets.enrichment (jsonb che c'è già).
--
-- Idempotente, sicuro da rieseguire. Da incollare nell'editor SQL di Supabase.
-- ============================================================================

ALTER TABLE public.profile ADD COLUMN IF NOT EXISTS beats_push boolean NOT NULL DEFAULT true;

-- Controllo: deve comparire `beats_push`.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profile' AND column_name = 'beats_push';
