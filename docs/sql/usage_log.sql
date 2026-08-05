-- ============================================================================
-- REGISTRO DELLE OPERAZIONI AI — tabella `usage_log`
--
-- Perché esiste: `usage` conta quanto si è speso, ma non DI COSA. Per sapere
-- quanto costa un consiglio si è dovuto dedurlo dai totali di una giornata.
-- Questa tabella tiene una riga per chiamata, con il nome dell'operazione.
--
-- ⚠️ NON tocca `usage`, `usage_add` né il tetto: quella catena funziona e
-- protegge dai costi. Questa è contabilità in sola aggiunta, a fianco.
--
-- Cosa NON c'è dentro, di proposito: nessun titolo, nessuna domanda, nessun
-- testo dell'utente. Solo il nome dell'operazione e i numeri. È un registro di
-- spesa, non un registro di cosa fa la gente.
--
-- Stesso stile degli altri file: idempotente, niente blocchi DO, sicuro da
-- rieseguire. Da incollare nell'editor SQL di Supabase.
--
-- ⚠️ SE L'HAI GIÀ ESEGUITO IN PASSATO: rieseguilo per intero lo stesso. Le
-- colonne aggiunte dopo la prima versione (ricerche_web, token_in_cache_read,
-- token_in_cache_write) arrivano dalle ALTER qui sotto, e senza quelle l'app
-- non riesce più né a scrivere né a leggere il registro — lo dice nei log, ma
-- intanto le righe si perdono.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL,
  ts         timestamptz NOT NULL DEFAULT now(),
  operazione text        NOT NULL,   -- 'consiglio' | 'cattura' | 'catalogo' | 'piano' | 'viaggio' | 'sconosciuta'
  origine    text        NOT NULL,   -- 'utente' | 'cron' | 'sistema'
  token_in   integer     NOT NULL DEFAULT 0,   -- TOTALE in entrata (nuovi + cache)
  token_out  integer     NOT NULL DEFAULT 0,
  modello    text,                   -- es. 'claude-sonnet-4-5'; null se non passato
  -- Le ricerche web non sono token: si pagano a ricerca ($10 ogni 1.000). Finora
  -- si potevano solo stimare; questo è il numero che dà Claude.
  ricerche_web integer   NOT NULL DEFAULT 0,
  -- Due pezzi di `token_in` che NON costano come gli altri: i riletti dalla
  -- cache costano un decimo, quelli appena messi in cache 1,25 volte. Separati
  -- qui, il conto in dollari è quello vero e non una stima per eccesso.
  token_in_cache_read  integer NOT NULL DEFAULT 0,
  token_in_cache_write integer NOT NULL DEFAULT 0
);

-- Se la tabella esiste già da prima di queste colonne (idempotente: rieseguire
-- il file non rompe niente, e le righe vecchie restano con zero).
ALTER TABLE public.usage_log ADD COLUMN IF NOT EXISTS ricerche_web         integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_log ADD COLUMN IF NOT EXISTS token_in_cache_read  integer NOT NULL DEFAULT 0;
ALTER TABLE public.usage_log ADD COLUMN IF NOT EXISTS token_in_cache_write integer NOT NULL DEFAULT 0;

-- Le due domande che si faranno sempre: "cosa ho speso io" e "cosa è successo
-- negli ultimi giorni".
CREATE INDEX IF NOT EXISTS usage_log_user_ts_idx ON public.usage_log (user_id, ts DESC);

-- Privacy: come `usage` e `notification_runs`, la tabella è INVISIBILE agli
-- utenti. Nessuna policy = nessuno la legge col token utente. Ci scrive e la
-- legge solo il server con la service-role, che scavalca la RLS.
ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.usage_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.usage_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.usage_log_id_seq TO service_role;

-- Controllo finale: devono uscire 9 colonne. Se ne mancano, l'ALTER non è
-- passata e /numeri resterà vuota.
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'usage_log'
ORDER BY ordinal_position;

-- ============================================================================
-- Per guardare i numeri a mano:
--
--   SELECT operazione,
--          count(*) FILTER (WHERE token_in = 0 AND token_out = 0) AS volte,
--          sum(token_in) AS token_in, sum(token_out) AS token_out,
--          sum(token_in_cache_read) AS da_cache, sum(ricerche_web) AS ricerche
--   FROM public.usage_log
--   WHERE ts > now() - interval '7 days'
--   GROUP BY operazione ORDER BY sum(token_in) DESC;
--
-- ("volte" conta solo le righe a zero token: quelle le scrive spendAi, una per
--  operazione. Le altre le scrive claudeFetch, una per richiesta partita.)
--
-- Per fare pulizia (la tabella cresce di una riga per chiamata):
--
--   DELETE FROM public.usage_log WHERE ts < now() - interval '90 days';
-- ============================================================================
