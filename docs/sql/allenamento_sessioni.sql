-- ============================================================================
-- SESSIONI DI ALLENAMENTO (S3 del rework) — `workout_session` + `workout_set`
--
-- Perche' due tabelle nuove invece di allargare quelle vecchie:
--   `workout_plan`  = la SCHEDA (cosa dovrei fare) — resta com'e'.
--   `workout_log`   = il CALENDARIO (mi sono allenato quel giorno si'/no) — resta com'e'.
--   `workout_session` = la SEDUTA VERA (quando ho iniziato, quando ho finito, come e' andata).
--   `workout_set`     = la SERIE VERA (questo esercizio, 8 ripetizioni, 40 kg).
-- Niente di esistente viene modificato: se questo SQL non venisse mai eseguito,
-- l'app continuerebbe a funzionare esattamente come adesso.
--
-- E' da qui che nasce la cosa che nessun'altra app di palestra puo' fare:
-- Keiko sa gia' che domani hai un volo alle 6:40 e che ieri hai dormito poco,
-- quindi puo' leggere queste serie insieme al resto del tuo calendario.
--
-- Stesso stile di profile.sql: idempotente, niente blocchi DO, sicuro da
-- rieseguire. Da incollare nell'editor SQL di Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) La seduta
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_session (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  day        date NOT NULL,              -- giorno di calendario (Europe/Rome), per incrociare con workout_log
  titolo     text,                       -- es. "Petto e tricipiti" (copiato dalla scheda del giorno)
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,                -- NULL = seduta ancora aperta
  sensazione text,                       -- 'scarico' | 'normale' | 'carico' — come stavi (facoltativo)
  note       text                        -- una riga libera a fine seduta
);

ALTER TABLE public.workout_session ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Le due domande che l'app fara' sempre: "ho una seduta aperta?" e "com'e' andata finora?"
CREATE INDEX IF NOT EXISTS workout_session_user_day_idx ON public.workout_session (user_id, day DESC);

-- ----------------------------------------------------------------------------
-- 2) La serie
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_set (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.workout_session(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  esercizio   text NOT NULL,             -- il nome come appare nella scheda ("Panca piana")
  serie       smallint,                  -- 1, 2, 3... l'ordine dentro l'esercizio
  ripetizioni smallint,
  peso_kg     numeric(6,2),              -- NULL per corpo libero / corsa
  secondi     integer,                   -- per plank, corsa, ecc. (alternativa alle ripetizioni)
  fatica      smallint,                  -- 1-10, quanto e' costata (serve per capire se stai crescendo)
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_set ALTER COLUMN user_id SET DEFAULT auth.uid();

-- "L'ultima volta che hai fatto la panca piana avevi messo 40 kg": questa e' la
-- query piu' importante di tutte, quindi si merita un indice suo.
CREATE INDEX IF NOT EXISTS workout_set_user_esercizio_idx ON public.workout_set (user_id, esercizio, created_at DESC);
CREATE INDEX IF NOT EXISTS workout_set_session_idx ON public.workout_set (session_id, created_at);

-- ----------------------------------------------------------------------------
-- 3) Permessi (in questo progetto i default non si ereditano: vanno scritti)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_session TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_set     TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4) Privacy: 'solo le mie righe' (stesso pattern delle altre tabelle)
-- ----------------------------------------------------------------------------
ALTER TABLE public.workout_session ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.workout_session;
DROP POLICY IF EXISTS keiko_own_insert ON public.workout_session;
DROP POLICY IF EXISTS keiko_own_update ON public.workout_session;
DROP POLICY IF EXISTS keiko_own_delete ON public.workout_session;
CREATE POLICY keiko_own_select ON public.workout_session FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.workout_session FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.workout_session FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.workout_session FOR DELETE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.workout_set ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.workout_set;
DROP POLICY IF EXISTS keiko_own_insert ON public.workout_set;
DROP POLICY IF EXISTS keiko_own_update ON public.workout_set;
DROP POLICY IF EXISTS keiko_own_delete ON public.workout_set;
CREATE POLICY keiko_own_select ON public.workout_set FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.workout_set FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.workout_set FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.workout_set FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- Controllo veloce dopo l'esecuzione (facoltativo):
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name IN ('workout_session','workout_set');
-- Devono comparire due righe.
-- ============================================================================
