-- ============================================================================
-- MULTI-UTENTE (Blocco C) — Via A: Row Level Security (RLS) su Supabase
-- ----------------------------------------------------------------------------
-- SCOPO: garantire la privacy a livello di DATABASE (non solo nel codice):
--        ogni utente vede/modifica SOLO le proprie righe. Massima privacy.
--
-- COME FUNZIONA CON L'APP:
--   • L'app in PRODUZIONE usa la chiave SERVICE ROLE, che SCAVALCA la RLS.
--     => Eseguire questo script NON cambia nulla nella produzione di oggi.
--   • La RLS "morde" solo quando l'app interroga il DB come utente (client anon
--     + JWT firmato), cioè quando accenderai l'interruttore MULTIUSER_RLS=1.
--   • Il cron e le push route usano anch'esse service-role => non toccate.
--
-- COME ESEGUIRLO: Supabase → SQL Editor. È idempotente (ri-eseguibile).
--   Consiglio: esegui una SEZIONE alla volta e leggi le VERIFICHE in fondo.
--
-- PARAMETRO — uuid di Matteo (derivato dall'email, NON cambiarlo):
--   matteo.zoccolan.pn@gmail.com  ->  2c875815-a9b2-5a28-9e9e-6051128a8d4d
--
-- TABELLE PER-UTENTE (RLS attiva): tickets, todos, watchlist, diet_plan,
--   workout_plan, workout_log, trip_plans, push_subscriptions, notification_runs
-- TABELLE CONDIVISE (NIENTE RLS, restano comuni): films_catalog, search_log
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SEZIONE 0 — SCOPERTA (esegui prima e guarda i risultati; non cambia niente)
-- ----------------------------------------------------------------------------
-- 0a) Quali tabelle hanno davvero la colonna user_id?
--   SELECT table_name FROM information_schema.columns
--   WHERE table_schema='public' AND column_name='user_id' ORDER BY 1;

-- 0b) Vincoli/indici UNIQUE attuali su workout_log e trip_plans (per capire
--     cosa verrà sostituito nella SEZIONE 2):
--   SELECT conrelid::regclass AS tabella, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid IN ('public.workout_log'::regclass,'public.trip_plans'::regclass) AND contype='u';
--   SELECT indexrelid::regclass AS indice, indrelid::regclass AS tabella
--   FROM pg_index WHERE indrelid IN ('public.workout_log'::regclass,'public.trip_plans'::regclass) AND indisunique;


-- ----------------------------------------------------------------------------
-- SEZIONE 1 — BACKFILL: assegna a Matteo le righe storiche (user_id = NULL)
--   Tocca SOLO le righe ancora NULL. Salta le tabelle senza colonna user_id.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','push_subscriptions','notification_runs']
  LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name='user_id') INTO has_col;
    IF has_col THEN
      EXECUTE format('UPDATE public.%I SET user_id = %L WHERE user_id IS NULL',
                     t, '2c875815-a9b2-5a28-9e9e-6051128a8d4d');
    ELSE
      RAISE NOTICE 'SALTO % (nessuna colonna user_id)', t;
    END IF;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- SEZIONE 2 — VINCOLI UNIQUE per-utente (necessari per gli upsert multi-utente)
--   workout_log : UNIQUE(day)         -> UNIQUE(user_id, day)
--   trip_plans  : UNIQUE(cluster_key) -> UNIQUE(user_id, cluster_key)
--   Droppa qualsiasi vincolo/indice UNIQUE sulla SOLA vecchia colonna e crea
--   quello nuovo. Idempotente.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
  cfg record;
BEGIN
  FOR cfg IN
    SELECT * FROM (VALUES
      ('workout_log', ARRAY['day']::text[],         ARRAY['user_id','day']::text[],         'workout_log_user_day_key'),
      ('trip_plans',  ARRAY['cluster_key']::text[], ARRAY['user_id','cluster_key']::text[], 'trip_plans_user_cluster_key')
    ) AS v(tbl, oldcols, newcols, newname)
  LOOP
    -- salta se la tabella o la colonna user_id non esistono
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=cfg.tbl AND column_name='user_id') THEN
      RAISE NOTICE 'SALTO % (nessuna colonna user_id)', cfg.tbl; CONTINUE;
    END IF;

    -- 2a) droppa VINCOLI UNIQUE che coprono esattamente le vecchie colonne
    FOR rec IN
      SELECT con.conname
      FROM pg_constraint con
      WHERE con.conrelid = ('public.'||cfg.tbl)::regclass AND con.contype='u'
        AND (SELECT array_agg(att.attname ORDER BY att.attnum)
             FROM unnest(con.conkey) k JOIN pg_attribute att
               ON att.attrelid=con.conrelid AND att.attnum=k) = cfg.oldcols
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', cfg.tbl, rec.conname);
      RAISE NOTICE '%: droppato vincolo %', cfg.tbl, rec.conname;
    END LOOP;

    -- 2b) droppa INDICI UNIQUE (non-vincolo) che coprono esattamente le vecchie colonne
    FOR rec IN
      SELECT ix.indexrelid::regclass::text AS idxname
      FROM pg_index ix
      WHERE ix.indrelid = ('public.'||cfg.tbl)::regclass AND ix.indisunique AND NOT ix.indisprimary
        AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = ix.indexrelid)
        AND (SELECT array_agg(att.attname ORDER BY att.attnum)
             FROM unnest(ix.indkey) k JOIN pg_attribute att
               ON att.attrelid=ix.indrelid AND att.attnum=k) = cfg.oldcols
    LOOP
      EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.idxname);
      RAISE NOTICE '%: droppato indice unique %', cfg.tbl, rec.idxname;
    END LOOP;

    -- 2c) crea il nuovo UNIQUE(user_id, ...) se non c'è già
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint con
      WHERE con.conrelid = ('public.'||cfg.tbl)::regclass AND con.contype='u'
        AND (SELECT array_agg(att.attname ORDER BY att.attnum)
             FROM unnest(con.conkey) k JOIN pg_attribute att
               ON att.attrelid=con.conrelid AND att.attnum=k) = cfg.newcols
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I UNIQUE (%s)',
                     cfg.tbl, cfg.newname, array_to_string(cfg.newcols, ', '));
      RAISE NOTICE '%: creato UNIQUE(%)', cfg.tbl, array_to_string(cfg.newcols, ', ');
    END IF;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- SEZIONE 3 — DEFAULT colonna: user_id = auth.uid()
--   Rete di sicurezza per il percorso "a flag acceso" (il codice comunque lo
--   imposta già). A flag spento (service-role) auth.uid() è NULL: irrilevante
--   perché il codice mette l'uuid esplicitamente.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','push_subscriptions','notification_runs']
  LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name='user_id') INTO has_col;
    IF has_col THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
    END IF;
  END LOOP;
END $$;


-- ----------------------------------------------------------------------------
-- SEZIONE 4 — RLS + POLICY (una per SELECT/INSERT/UPDATE/DELETE, "solo le mie")
--   service-role SCAVALCA queste policy => produzione a flag spento intatta.
--   Idempotente: droppa e ricrea le policy con nome fisso.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','push_subscriptions','notification_runs']
  LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name='user_id') INTO has_col;
    IF NOT has_col THEN RAISE NOTICE 'SALTO % (nessuna colonna user_id)', t; CONTINUE; END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS keiko_own_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS keiko_own_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS keiko_own_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS keiko_own_delete ON public.%I', t);

    EXECUTE format('CREATE POLICY keiko_own_select ON public.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY keiko_own_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY keiko_own_update ON public.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY keiko_own_delete ON public.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t);
  END LOOP;
END $$;


-- ============================================================================
-- VERIFICHE (esegui e controlla a mano; non cambiano niente)
-- ============================================================================
-- V1) Nessuna riga deve restare orfana (user_id NULL) nelle tabelle per-utente:
--   SELECT 'tickets' t, count(*) FILTER (WHERE user_id IS NULL) orfane FROM tickets
--   UNION ALL SELECT 'todos', count(*) FILTER (WHERE user_id IS NULL) FROM todos
--   UNION ALL SELECT 'watchlist', count(*) FILTER (WHERE user_id IS NULL) FROM watchlist
--   UNION ALL SELECT 'diet_plan', count(*) FILTER (WHERE user_id IS NULL) FROM diet_plan
--   UNION ALL SELECT 'workout_plan', count(*) FILTER (WHERE user_id IS NULL) FROM workout_plan
--   UNION ALL SELECT 'workout_log', count(*) FILTER (WHERE user_id IS NULL) FROM workout_log
--   UNION ALL SELECT 'trip_plans', count(*) FILTER (WHERE user_id IS NULL) FROM trip_plans;

-- V2) RLS attiva sulle tabelle giuste:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','push_subscriptions','notification_runs','films_catalog','search_log')
--   ORDER BY 1;   -- attese: TRUE sulle per-utente, FALSE su films_catalog/search_log

-- V3) Policy create:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY 1,3;

-- V4) Nuovi vincoli UNIQUE:
--   SELECT conrelid::regclass AS tabella, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid IN ('public.workout_log'::regclass,'public.trip_plans'::regclass) AND contype='u';
-- ============================================================================
