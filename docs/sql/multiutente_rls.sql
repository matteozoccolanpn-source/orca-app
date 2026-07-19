-- ============================================================================
-- MULTI-UTENTE (Blocco C) — Via A: Row Level Security (RLS) su Supabase
-- ----------------------------------------------------------------------------
-- SCOPO: privacy a livello di DATABASE (non solo nel codice): ogni utente
--        vede/modifica SOLO le proprie righe. Massima privacy.
--
-- COME FUNZIONA CON L'APP:
--   • In PRODUZIONE l'app usa la chiave SERVICE ROLE, che SCAVALCA la RLS.
--     => Eseguire le SEZIONI 1-4 NON cambia nulla nella produzione di oggi.
--   • La RLS "morde" solo quando l'app interroga il DB come utente (client anon
--     + JWT firmato), cioè quando accenderai l'interruttore MULTIUSER_RLS=1.
--   • Cron e push route usano service-role => non toccati.
--
-- ORDINE SICURO (nessuna finestra di rottura):
--   SEZIONI 1-4  = eseguibili ORA, in qualsiasi ordine col deploy del codice.
--                  (Aggiungono soltanto: NON cancellano vincoli esistenti.)
--   SEZIONE 5    = SOLO al momento del CUTOVER, insieme a MULTIUSER_RLS=1.
--                  (Cancella i vecchi vincoli mono-colonna.)
--   È idempotente (ri-eseguibile). Esegui una sezione alla volta.
--
-- PARAMETRO — uuid di Matteo (derivato dall'email, NON cambiarlo):
--   matteo.zoccolan.pn@gmail.com  ->  2c875815-a9b2-5a28-9e9e-6051128a8d4d
--
-- PER-UTENTE (RLS attiva, 9 tabelle con colonna user_id): tickets, todos,
--   watchlist, diet_plan, workout_plan, workout_log, trip_plans, trips,
--   push_subscriptions
-- CONDIVISE (NIENTE user_id/RLS): films_catalog, search_log, notification_runs
-- ============================================================================


-- ----------------------------------------------------------------------------
-- SEZIONE 0 — SCOPERTA (esegui e guarda; non cambia niente)
-- ----------------------------------------------------------------------------
-- 0a) Tabelle con colonna user_id:
--   SELECT table_name FROM information_schema.columns
--   WHERE table_schema='public' AND column_name='user_id' ORDER BY 1;
-- 0b) UNIQUE attuali su workout_log / trip_plans:
--   SELECT conrelid::regclass AS tabella, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid IN ('public.workout_log'::regclass,'public.trip_plans'::regclass) AND contype='u';


-- ----------------------------------------------------------------------------
-- SEZIONE 1 — BACKFILL: righe storiche (user_id NULL) -> Matteo. Solo le NULL.
-- ----------------------------------------------------------------------------
DO $a$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','trips','push_subscriptions']
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
END $a$;


-- ----------------------------------------------------------------------------
-- SEZIONE 2 — AGGIUNGE i vincoli UNIQUE per-utente (NON cancella i vecchi).
--   workout_log : + UNIQUE(user_id, day)
--   trip_plans  : + UNIQUE(user_id, cluster_key)
--   I vecchi UNIQUE(day)/UNIQUE(cluster_key) restano attivi finché non fai la
--   SEZIONE 5, così il codice a flag spento (onConflict "day"/"cluster_key")
--   continua a funzionare. Nessuna finestra di rottura.
-- ----------------------------------------------------------------------------
DO $b$
DECLARE cfg record;
BEGIN
  FOR cfg IN
    SELECT * FROM (VALUES
      ('workout_log', ARRAY['user_id','day']::text[],         'workout_log_user_day_key'),
      ('trip_plans',  ARRAY['user_id','cluster_key']::text[], 'trip_plans_user_cluster_key')
    ) AS v(tbl, newcols, newname)
  LOOP
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=cfg.tbl AND column_name='user_id') THEN
      RAISE NOTICE 'SALTO % (nessuna colonna user_id)', cfg.tbl; CONTINUE;
    END IF;
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
    ELSE
      RAISE NOTICE '%: UNIQUE(%) gia presente', cfg.tbl, array_to_string(cfg.newcols, ', ');
    END IF;
  END LOOP;
END $b$;


-- ----------------------------------------------------------------------------
-- SEZIONE 3 — DEFAULT user_id = auth.uid() (rete di sicurezza per il percorso a
--   flag acceso; il codice comunque imposta già user_id esplicito).
-- ----------------------------------------------------------------------------
DO $c$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','trips','push_subscriptions']
  LOOP
    SELECT EXISTS(SELECT 1 FROM information_schema.columns
                  WHERE table_schema='public' AND table_name=t AND column_name='user_id') INTO has_col;
    IF has_col THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id SET DEFAULT auth.uid()', t);
    END IF;
  END LOOP;
END $c$;


-- ----------------------------------------------------------------------------
-- SEZIONE 4 — RLS + POLICY ("solo le mie" su SELECT/INSERT/UPDATE/DELETE).
--   service-role SCAVALCA => produzione a flag spento intatta. Idempotente.
-- ----------------------------------------------------------------------------
DO $d$
DECLARE t text; has_col boolean;
BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','trips','push_subscriptions']
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
END $d$;


-- ============================================================================
-- SEZIONE 5 — CUTOVER  ⚠️  ESEGUI SOLO quando accendi MULTIUSER_RLS=1
--   Cancella i vecchi UNIQUE mono-colonna (day / cluster_key), che in multi-
--   utente darebbero falsi conflitti tra utenti diversi. Prima di qui NON
--   eseguire questa sezione, o il codice a flag spento si rompe.
-- ============================================================================
-- DO $$
-- DECLARE rec record; cfg record;
-- BEGIN
--   FOR cfg IN
--     SELECT * FROM (VALUES
--       ('workout_log', ARRAY['day']::text[]),
--       ('trip_plans',  ARRAY['cluster_key']::text[])
--     ) AS v(tbl, oldcols)
--   LOOP
--     FOR rec IN
--       SELECT con.conname FROM pg_constraint con
--       WHERE con.conrelid = ('public.'||cfg.tbl)::regclass AND con.contype='u'
--         AND (SELECT array_agg(att.attname ORDER BY att.attnum)
--              FROM unnest(con.conkey) k JOIN pg_attribute att
--                ON att.attrelid=con.conrelid AND att.attnum=k) = cfg.oldcols
--     LOOP
--       EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', cfg.tbl, rec.conname);
--       RAISE NOTICE '%: droppato vincolo %', cfg.tbl, rec.conname;
--     END LOOP;
--     FOR rec IN
--       SELECT ix.indexrelid::regclass::text AS idxname FROM pg_index ix
--       WHERE ix.indrelid = ('public.'||cfg.tbl)::regclass AND ix.indisunique AND NOT ix.indisprimary
--         AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = ix.indexrelid)
--         AND (SELECT array_agg(att.attname ORDER BY att.attnum)
--              FROM unnest(ix.indkey) k JOIN pg_attribute att
--                ON att.attrelid=ix.indrelid AND att.attnum=k) = cfg.oldcols
--     LOOP
--       EXECUTE format('DROP INDEX IF EXISTS public.%I', rec.idxname);
--       RAISE NOTICE '%: droppato indice unique %', cfg.tbl, rec.idxname;
--     END LOOP;
--   END LOOP;
-- END $$;


-- ============================================================================
-- VERIFICHE (esegui e controlla a mano; non cambiano niente)
-- ============================================================================
-- V1) Nessuna riga orfana (user_id NULL) nelle tabelle per-utente:
--   SELECT 'tickets' t, count(*) FILTER (WHERE user_id IS NULL) orfane FROM tickets
--   UNION ALL SELECT 'todos', count(*) FILTER (WHERE user_id IS NULL) FROM todos
--   UNION ALL SELECT 'watchlist', count(*) FILTER (WHERE user_id IS NULL) FROM watchlist
--   UNION ALL SELECT 'diet_plan', count(*) FILTER (WHERE user_id IS NULL) FROM diet_plan
--   UNION ALL SELECT 'workout_plan', count(*) FILTER (WHERE user_id IS NULL) FROM workout_plan
--   UNION ALL SELECT 'workout_log', count(*) FILTER (WHERE user_id IS NULL) FROM workout_log
--   UNION ALL SELECT 'trip_plans', count(*) FILTER (WHERE user_id IS NULL) FROM trip_plans;
-- V2) RLS attiva dove serve (TRUE per-utente, FALSE su films_catalog/search_log):
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('tickets','todos','watchlist','diet_plan','workout_plan','workout_log','trip_plans','trips','push_subscriptions','films_catalog','search_log','notification_runs') ORDER BY 1;
-- V3) Policy create:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' ORDER BY 1,3;
-- V4) Vincoli UNIQUE attuali:
--   SELECT conrelid::regclass AS tabella, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conrelid IN ('public.workout_log'::regclass,'public.trip_plans'::regclass) AND contype='u';
-- ============================================================================
