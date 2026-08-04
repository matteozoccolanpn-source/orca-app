-- ============================================================================
-- K6 — TETTO AI COSTI AI: la tabella che conta quanto si spende, per utente e
-- per giorno. Da eseguire UNA volta nell'editor SQL di Supabase.
-- Sicuro: non tocca nessun dato esistente. Si può rieseguire senza danni.
-- ============================================================================

-- 1) la tabella del contatore
--    origine: 'utente' (conta nel tetto) · 'cron' · 'sistema' (solo registrate)
--    chiamate = "peso" speso: una cattura vale 1, un piano 5, un viaggio 10.
CREATE TABLE IF NOT EXISTS public.usage (
  user_id    uuid        NOT NULL,
  giorno     date        NOT NULL,
  origine    text        NOT NULL DEFAULT 'utente',
  chiamate   integer     NOT NULL DEFAULT 0,
  token_in   bigint      NOT NULL DEFAULT 0,
  token_out  bigint      NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, giorno, origine)
);

ALTER TABLE public.usage DROP CONSTRAINT IF EXISTS usage_origine_check;
ALTER TABLE public.usage ADD CONSTRAINT usage_origine_check
  CHECK (origine IN ('utente', 'cron', 'sistema'));

-- 2) privacy: come notification_runs, la tabella è INVISIBILE agli utenti.
--    Nessuna policy = nessuno la legge col token utente. Ci scrive solo il
--    server con la service-role, che scavalca la RLS.
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.usage TO service_role;

-- 3) somma un consumo alla riga del giorno, in modo atomico (due richieste
--    contemporanee non si sovrascrivono a vicenda). Ritorna il totale aggiornato.
CREATE OR REPLACE FUNCTION public.usage_add(
  p_user      uuid,
  p_giorno    date,
  p_origine   text,
  p_chiamate  integer,
  p_token_in  bigint,
  p_token_out bigint
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.usage (user_id, giorno, origine, chiamate, token_in, token_out)
  VALUES (p_user, p_giorno, p_origine, p_chiamate, p_token_in, p_token_out)
  ON CONFLICT (user_id, giorno, origine) DO UPDATE
    SET chiamate   = usage.chiamate  + EXCLUDED.chiamate,
        token_in   = usage.token_in  + EXCLUDED.token_in,
        token_out  = usage.token_out + EXCLUDED.token_out,
        updated_at = now()
  RETURNING chiamate;
$$;

-- La funzione è SECURITY DEFINER: gira coi permessi del proprietario, quindi
-- deve poterla chiamare SOLO il server. Attenzione: su PostgreSQL ogni funzione
-- nuova è eseguibile da PUBLIC, e PUBLIC comprende anche anon → va tolto lì,
-- non basta togliere ad anon e authenticated.
REVOKE ALL ON FUNCTION public.usage_add(uuid, date, text, integer, bigint, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.usage_add(uuid, date, text, integer, bigint, bigint) TO service_role;

-- ============================================================================
-- Per guardare i numeri (K10 — "quanto è costato"):
--
--   SELECT giorno, origine, user_id, chiamate, token_in, token_out
--   FROM public.usage ORDER BY giorno DESC, chiamate DESC;
--
-- Per azzerare il contatore di oggi durante una prova:
--
--   DELETE FROM public.usage WHERE giorno = CURRENT_DATE;
-- ============================================================================
