-- ============================================================================
-- K9 — LA RIGA DEI NUMERI: quando ciascuno ha aperto Keiko l'ultima volta.
-- Da eseguire UNA volta nell'editor SQL di Supabase.
-- Sicuro: non tocca nessun dato esistente. Si può rieseguire senza danni.
-- ============================================================================

-- 1) la colonna. Nulla per chi non ha ancora aperto l'app dopo questa modifica.
ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 2) indice: serve a contare gli attivi degli ultimi 7 e 30 giorni senza
--    scorrere tutta la tabella. Con pochi utenti non cambia nulla, ma costa
--    zero metterlo adesso.
CREATE INDEX IF NOT EXISTS profile_last_seen_idx
  ON public.profile (last_seen_at DESC NULLS LAST);

-- 3) segna il passaggio, ma solo se è cambiato il giorno.
--    Così l'app non scrive sul database a ogni apertura: una volta al giorno
--    per persona, e basta.
--    SECURITY DEFINER perché la chiama il server per conto dell'utente.
CREATE OR REPLACE FUNCTION public.touch_last_seen(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profile
     SET last_seen_at = now()
   WHERE user_id = p_user
     AND (last_seen_at IS NULL OR last_seen_at::date < CURRENT_DATE);
$$;

-- Come per usage_add: ogni funzione nuova in PostgreSQL è eseguibile da
-- PUBLIC, e PUBLIC comprende anon. Non basta togliere ad anon e authenticated.
REVOKE ALL ON FUNCTION public.touch_last_seen(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.touch_last_seen(uuid) TO service_role;

-- ============================================================================
-- I QUATTRO NUMERI (è la query che sta dietro alla schermata di K9):
--
--   SELECT
--     count(*)                                                    AS iscritti,
--     count(*) FILTER (WHERE last_seen_at > now() - interval '7 days')  AS attivi_7gg,
--     count(*) FILTER (WHERE last_seen_at > now() - interval '30 days') AS attivi_30gg
--   FROM public.profile;
--
-- E quanti hanno caricato davvero qualcosa:
--
--   SELECT count(DISTINCT user_id) AS con_contenuti FROM (
--     SELECT user_id FROM public.tickets
--     UNION SELECT user_id FROM public.diet_plan
--     UNION SELECT user_id FROM public.workout_plan
--   ) x;
-- ============================================================================
