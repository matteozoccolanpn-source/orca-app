-- ============================================================================
-- PULIZIA — roba da togliere di mezzo. Da eseguire nell'editor SQL di Supabase.
-- ⚠️  Questo file CANCELLA. Leggilo prima di incollarlo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- search_log (K70) — la tabella che non ha mai funzionato
--
-- Perché va via: aveva la policy `USING(true)` scritta, ma mancava il GRANT
-- perfino a service_role, quindi ogni inserimento falliva in silenzio. Non ha
-- mai raccolto una riga. E non ha `user_id`, quindi non sarebbe nemmeno
-- cancellabile per persona: con dentro le ricerche di qualcuno sarebbe stata un
-- buco nel "cancella tutti i miei dati" (K4).
--
-- Cosa smette di funzionare: niente. `logSearch()` in lib/supabase.ts continua
-- a essere chiamata da /api/ask e /api/search, ma già oggi fallisce e si limita
-- a scrivere un avviso nei log del server (`[search_log] insert fallito`).
-- Dopo il DROP fa esattamente la stessa cosa: nessun errore in faccia
-- all'utente, nessuna ricerca persa.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.search_log;

-- Per controllare che sia sparita (deve rispondere 0 righe):
--   SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'search_log';
