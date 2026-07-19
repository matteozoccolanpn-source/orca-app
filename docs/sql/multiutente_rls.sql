-- ============================================================================
-- MULTI-UTENTE (Blocco C) — Via A: RLS su Supabase — VERSIONE SQL SEMPLICE
-- (niente blocchi DO/PLpgSQL: l'editor Supabase li gestisce male)
-- Sicuro: non cancella dati. La produzione usa service-role che scavalca la RLS.
-- Le sezioni 0-4 si possono eseguire ora. La SEZIONE 5 (in fondo, commentata)
-- solo al CUTOVER insieme a MULTIUSER_RLS=1.
-- uuid di Matteo: 2c875815-a9b2-5a28-9e9e-6051128a8d4d
-- ============================================================================

-- 0) rimuove i collegamenti fantasma a auth.users (login Supabase non usato)
ALTER TABLE public.tickets            DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
ALTER TABLE public.trips              DROP CONSTRAINT IF EXISTS trips_user_id_fkey;
ALTER TABLE public.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- 1) assegna a Matteo i dati esistenti (solo le righe senza proprietario)
UPDATE public.tickets SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.todos SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.watchlist SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.diet_plan SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.workout_plan SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.workout_log SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.trip_plans SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.trips SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;
UPDATE public.push_subscriptions SET user_id = '2c875815-a9b2-5a28-9e9e-6051128a8d4d' WHERE user_id IS NULL;

-- 2) controlli di unicità per-utente (indici, idempotenti)
CREATE UNIQUE INDEX IF NOT EXISTS workout_log_user_day_key    ON public.workout_log (user_id, day);
CREATE UNIQUE INDEX IF NOT EXISTS trip_plans_user_cluster_key ON public.trip_plans (user_id, cluster_key);

-- 3) i nuovi dati vengono etichettati in automatico col proprietario
ALTER TABLE public.tickets ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.todos ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.watchlist ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.diet_plan ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.workout_plan ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.workout_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.trip_plans ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.trips ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.push_subscriptions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4) attiva la privacy (RLS) e le policy 'solo le mie righe'
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.tickets;
DROP POLICY IF EXISTS keiko_own_insert ON public.tickets;
DROP POLICY IF EXISTS keiko_own_update ON public.tickets;
DROP POLICY IF EXISTS keiko_own_delete ON public.tickets;
CREATE POLICY keiko_own_select ON public.tickets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.tickets FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.tickets FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.todos;
DROP POLICY IF EXISTS keiko_own_insert ON public.todos;
DROP POLICY IF EXISTS keiko_own_update ON public.todos;
DROP POLICY IF EXISTS keiko_own_delete ON public.todos;
CREATE POLICY keiko_own_select ON public.todos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.todos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.todos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.todos FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.watchlist;
DROP POLICY IF EXISTS keiko_own_insert ON public.watchlist;
DROP POLICY IF EXISTS keiko_own_update ON public.watchlist;
DROP POLICY IF EXISTS keiko_own_delete ON public.watchlist;
CREATE POLICY keiko_own_select ON public.watchlist FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.watchlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.watchlist FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.watchlist FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.diet_plan;
DROP POLICY IF EXISTS keiko_own_insert ON public.diet_plan;
DROP POLICY IF EXISTS keiko_own_update ON public.diet_plan;
DROP POLICY IF EXISTS keiko_own_delete ON public.diet_plan;
CREATE POLICY keiko_own_select ON public.diet_plan FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.diet_plan FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.diet_plan FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.diet_plan FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.workout_plan;
DROP POLICY IF EXISTS keiko_own_insert ON public.workout_plan;
DROP POLICY IF EXISTS keiko_own_update ON public.workout_plan;
DROP POLICY IF EXISTS keiko_own_delete ON public.workout_plan;
CREATE POLICY keiko_own_select ON public.workout_plan FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.workout_plan FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.workout_plan FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.workout_plan FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.workout_log;
DROP POLICY IF EXISTS keiko_own_insert ON public.workout_log;
DROP POLICY IF EXISTS keiko_own_update ON public.workout_log;
DROP POLICY IF EXISTS keiko_own_delete ON public.workout_log;
CREATE POLICY keiko_own_select ON public.workout_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.workout_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.workout_log FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.workout_log FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.trip_plans;
DROP POLICY IF EXISTS keiko_own_insert ON public.trip_plans;
DROP POLICY IF EXISTS keiko_own_update ON public.trip_plans;
DROP POLICY IF EXISTS keiko_own_delete ON public.trip_plans;
CREATE POLICY keiko_own_select ON public.trip_plans FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.trip_plans FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.trip_plans FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.trip_plans FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.trips;
DROP POLICY IF EXISTS keiko_own_insert ON public.trips;
DROP POLICY IF EXISTS keiko_own_update ON public.trips;
DROP POLICY IF EXISTS keiko_own_delete ON public.trips;
CREATE POLICY keiko_own_select ON public.trips FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.trips FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.trips FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.trips FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS keiko_own_select ON public.push_subscriptions;
DROP POLICY IF EXISTS keiko_own_insert ON public.push_subscriptions;
DROP POLICY IF EXISTS keiko_own_update ON public.push_subscriptions;
DROP POLICY IF EXISTS keiko_own_delete ON public.push_subscriptions;
CREATE POLICY keiko_own_select ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- SEZIONE 5 — CUTOVER  ⚠️  esegui SOLO quando accendi MULTIUSER_RLS=1
--   Rimuove i vecchi controlli mono-utente (nomi verificati sul DB reale).
-- DROP INDEX IF EXISTS public.workout_log_day_uniq;
-- ALTER TABLE public.trip_plans DROP CONSTRAINT IF EXISTS trip_plans_cluster_key_key;
-- ============================================================================
