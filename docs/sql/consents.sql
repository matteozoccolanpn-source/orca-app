-- ============================================================================
-- CONSENSI (K2/K14) — tabella `consents`
-- Chi ha accettato cosa, quando, e su quale versione del testo. Serve per due
-- motivi: poterlo dimostrare, e permettere la REVOCA dal Profilo.
--
-- Due tipi, nessuno dei due obbligatorio:
--   'salute' → dati di dieta e allenamento (art. 9 GDPR). Senza, quelle due
--              sezioni non si usano; il resto di Keiko funziona lo stesso.
--   'email'  → avvisi per email sulle novità.
--
-- Stesso stile degli altri file (idempotente, niente blocchi DO, sicuro da
-- rieseguire). Da incollare nell'editor SQL di Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consents (
  user_id        uuid        NOT NULL,
  tipo           text        NOT NULL,   -- 'salute' | 'email'
  versione_testo text        NOT NULL,   -- la versione del testo mostrato, es. '2026-08-04'
  accettato      boolean     NOT NULL DEFAULT true,
  timestamp      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo)
);

ALTER TABLE public.consents DROP CONSTRAINT IF EXISTS consents_tipo_check;
ALTER TABLE public.consents ADD CONSTRAINT consents_tipo_check
  CHECK (tipo IN ('salute', 'email'));

-- nuovi inserimenti etichettati col proprietario (come le altre tabelle)
ALTER TABLE public.consents ALTER COLUMN user_id SET DEFAULT auth.uid();

-- grants espliciti (in questo progetto i default non si ereditano)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consents TO authenticated, service_role;

-- privacy: 'solo le mie righe', stesso pattern delle altre tabelle
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.consents;
DROP POLICY IF EXISTS keiko_own_insert ON public.consents;
DROP POLICY IF EXISTS keiko_own_update ON public.consents;
DROP POLICY IF EXISTS keiko_own_delete ON public.consents;
CREATE POLICY keiko_own_select ON public.consents FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.consents FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.consents FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- NOTA SULLA STORIA (limite noto, scritto apposta)
-- La riga è UNA per utente e per tipo: una revoca SOVRASCRIVE `accettato` e
-- `timestamp`. Si sa sempre lo stato di adesso e da quando, ma non si ricostruisce
-- la sequenza "accettato il 4, revocato il 9, riaccettato il 20".
-- Se un giorno serve la storia completa, la strada è una seconda tabella in sola
-- aggiunta (consents_log) alimentata da un trigger: questa resta com'è.
-- ============================================================================
