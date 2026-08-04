-- ============================================================================
-- K14b — L'ONBOARDING SI FA UNA VOLTA SOLA: `profile.onboarded_at`
-- Da eseguire UNA volta nell'editor SQL di Supabase.
-- Sicuro: non tocca nessun dato esistente. Si può rieseguire senza danni.
--
-- Perché serve: su iPhone l'app aperta dall'icona ha uno storage tutto suo,
-- separato da Safari. Cookie e localStorage NON si condividono. Quindi chi fa
-- l'onboarding nel browser, installa e apre dall'icona, senza questo se lo
-- ritroverebbe da capo. Va ricordato sul server, non sul telefono.
-- ============================================================================

-- 1) la colonna. Nulla per chi non ha ancora finito l'onboarding.
ALTER TABLE public.profile
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- 2) segna che l'onboarding è finito.
--    Due dettagli che contano:
--    a) usa INSERT ... ON CONFLICT, non una UPDATE: chi non ha mai compilato la
--       scheda allenamento NON ha una riga in `profile`, e una UPDATE non
--       troverebbe niente da aggiornare;
--    b) il `WHERE onboarded_at IS NULL` in coda tiene la PRIMA volta: chi rivede
--       l'onboarding dal Profilo non si vede riscrivere la data.
--    SECURITY DEFINER perché la chiama il server per conto dell'utente.
CREATE OR REPLACE FUNCTION public.mark_onboarded(p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.profile (user_id, onboarded_at)
  VALUES (p_user, now())
  ON CONFLICT (user_id) DO UPDATE
    SET onboarded_at = now()
    WHERE profile.onboarded_at IS NULL;
$$;

-- Come per usage_add e touch_last_seen: ogni funzione nuova in PostgreSQL è
-- eseguibile da PUBLIC, e PUBLIC comprende anon. Non basta togliere ad anon e
-- authenticated.
REVOKE ALL ON FUNCTION public.mark_onboarded(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_onboarded(uuid) TO service_role;

-- ============================================================================
-- NOTA ONESTA SU QUESTO FILE
-- La colonna e la funzione erano già state create a mano su Supabase prima che
-- questo file esistesse. Il contenuto qui sopra è stato ricostruito
-- verificando a mano come si comporta la funzione vera:
--   · chiamata su un utente SENZA riga di profilo  → la riga viene creata
--   · chiamata due volte                            → la data NON viene riscritta
--   · su un profilo con la scheda compilata         → gli altri campi non si toccano
-- Essendo idempotente, rieseguirlo allinea il database a questo file.
--
-- Per rifare la prova dell'onboarding da capo sul proprio utente:
--   UPDATE public.profile SET onboarded_at = NULL WHERE user_id = '<il tuo uuid>';
-- ============================================================================
