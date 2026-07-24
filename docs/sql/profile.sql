-- ============================================================================
-- PROFILO (S1 del rework allenamento) — tabella `profile`
-- Il "seme" della personalizzazione, CONDIVISO tra allenamento e dieta.
-- Stesso stile di multiutente_rls.sql (niente blocchi DO, idempotente, sicuro).
-- Da eseguire nell'editor SQL di Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile (
  user_id    uuid PRIMARY KEY,
  obiettivo  text,                -- es. 'dimagrire' | 'massa' | 'tonificare' | 'forma'
  livello    text,                -- 'principiante' | 'intermedio' | 'avanzato'
  sessioni   jsonb,               -- es. {"palestra": 2, "corsa": 2}
  vincoli    text,                -- es. "ginocchio delicato" (libero, opzionale)
  stile      text,                -- 'duro' | 'chill'
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- nuovi inserimenti etichettati col proprietario (come le altre tabelle)
ALTER TABLE public.profile ALTER COLUMN user_id SET DEFAULT auth.uid();

-- grants espliciti (in questo progetto i default non si ereditano)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile TO authenticated, service_role;

-- privacy: RLS 'solo le mie righe' (stesso pattern delle altre tabelle)
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.profile;
DROP POLICY IF EXISTS keiko_own_insert ON public.profile;
DROP POLICY IF EXISTS keiko_own_update ON public.profile;
DROP POLICY IF EXISTS keiko_own_delete ON public.profile;
CREATE POLICY keiko_own_select ON public.profile FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.profile FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.profile FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.profile FOR DELETE TO authenticated USING (user_id = auth.uid());
