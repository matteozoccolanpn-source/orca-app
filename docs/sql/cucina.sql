-- ============================================================================
-- CUCINA V1 — il ricettario (docs/SPEC-CUCINA.md)
--
-- Una tabella sola: le ricette che l'utente SALVA. Non contiene ricette, né
-- video, né testo dei creator: solo il LINK a quello che sta su TikTok/YouTube,
-- più il titolo, l'autore e la miniatura che l'oEmbed pubblico restituisce.
-- Il video si apre sulla piattaforma: il creator si prende la sua view.
--
-- Privacy: stessa identica regola delle altre tabelle personali (RLS per
-- utente, copiata da multiutente_rls.sql). Ognuno vede solo le sue.
--
-- Idempotente, sicuro da rieseguire. Da incollare nell'editor SQL di Supabase.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recipes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid(),
  title      text NOT NULL,
  url        text NOT NULL,
  thumbnail  text,
  author     text,
  -- 'tiktok' | 'youtube' | 'web'
  platform   text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- La stessa ricetta non si salva due volte (il tocco doppio capita).
CREATE UNIQUE INDEX IF NOT EXISTS recipes_user_url_key ON public.recipes (user_id, url);
-- "le più recenti in alto", che è l'unico ordine che il ricettario usa.
CREATE INDEX IF NOT EXISTS recipes_user_created_idx ON public.recipes (user_id, created_at DESC);

-- ── Privacy: solo le proprie righe ─────────────────────────────────────────
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.recipes;
DROP POLICY IF EXISTS keiko_own_insert ON public.recipes;
DROP POLICY IF EXISTS keiko_own_update ON public.recipes;
DROP POLICY IF EXISTS keiko_own_delete ON public.recipes;
CREATE POLICY keiko_own_select ON public.recipes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.recipes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.recipes FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.recipes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ⚠️ I PERMESSI, che sono un'altra cosa dalle policy.
-- Le policy dicono QUALI RIGHE si vedono; la GRANT dice se il ruolo può
-- toccare la tabella. Senza questa riga la tabella esiste, le policy ci sono, e
-- l'app riceve "permission denied for table recipes" — successo davvero il
-- 7 agosto 2026, ed è lo stesso inciampo annotato in cleanup.sql per search_log.
-- Stessa riga di consents.sql e allenamento_sessioni.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated, service_role;

-- Controllo finale: devono uscire le 4 policy e RLS attiva.
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' ORDER BY policyname;
