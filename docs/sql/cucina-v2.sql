-- ============================================================================
-- CUCINA V2 — la ricetta in mano e la lista della spesa (docs/SPEC-CUCINA.md)
--
-- Due cose:
--   1. `recipes.extracted` — la ricetta strutturata (ingredienti, passi, tempi)
--      letta UNA volta dalla descrizione del creator e poi tenuta lì per
--      sempre. È una cache, non un contenuto nostro: dentro ci finisce solo
--      quello che il creator ha scritto, mai qualcosa di inventato.
--      Ci sta anche `times_cooked`, il contatore "fatta N volte" che il mock
--      mostra sulle card e che il cook mode (V2B) incrementa.
--   2. `shopping_items` — la lista della spesa, che tiene insieme due
--      provenienze diverse senza mescolarle: `piano` (dal piano della
--      settimana, in sola lettura) e `ricetta` (dagli ingredienti estratti).
--      L'etichetta di provenienza si vede sempre, ed è voluto.
--
-- ⚠️ PALETTO LEGALE. Qui non esiste e non deve esistere una colonna che leghi
-- una ricetta a un pasto del piano, né un campo calorie/macro. La spesa mette
-- le due provenienze nella stessa lista perché si compra insieme, non perché
-- una sostituisca l'altra. Il piano è di un professionista (art. 348).
--
-- Privacy: RLS per utente come tutte le tabelle personali.
-- Idempotente, sicuro da rieseguire. Da incollare nell'editor SQL di Supabase.
-- ============================================================================

-- ── 1. La ricetta estratta, e quante volte l'hai fatta ─────────────────────
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS extracted    jsonb;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS times_cooked integer NOT NULL DEFAULT 0;

-- ── 2. La lista della spesa ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL DEFAULT auth.uid(),
  nome       text NOT NULL,
  -- Quantità come l'ha scritta il creator ("300 g", "1 barattolo"), oppure
  -- vuota. MAI calcolata e mai inventata: se non c'era, resta vuota.
  quantita   text,
  -- 'piano' | 'ricetta'. Niente CHECK: un vincolo qui vorrebbe una migrazione
  -- il giorno che nasce una terza provenienza, e il codice già normalizza.
  fonte      text NOT NULL DEFAULT 'ricetta',
  -- Da dove viene: l'id della ricetta, o la chiave del giorno del piano.
  -- Testo libero di proposito: non è una foreign key, così cancellare una
  -- ricetta non svuota la lista della spesa che hai in mano al supermercato.
  ref        text,
  spuntato   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- "quello che resta da comprare, il più recente in alto": l'unico ordine che
-- la lista usa davvero.
CREATE INDEX IF NOT EXISTS shopping_user_created_idx
  ON public.shopping_items (user_id, spuntato, created_at DESC);

-- La stessa cosa non entra due volte dalla stessa fonte: due ricette con la
-- cipolla fanno UNA voce (idea 209), ma "cipolla dal piano" e "cipolla dalla
-- ricetta" restano due righe, perché l'etichetta di provenienza deve dire il
-- vero. `lower(nome)` perché "Cipolla" e "cipolla" sono la stessa cosa.
CREATE UNIQUE INDEX IF NOT EXISTS shopping_user_nome_fonte_key
  ON public.shopping_items (user_id, lower(nome), fonte);

-- ── Privacy: solo le proprie righe ─────────────────────────────────────────
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.shopping_items;
DROP POLICY IF EXISTS keiko_own_insert ON public.shopping_items;
DROP POLICY IF EXISTS keiko_own_update ON public.shopping_items;
DROP POLICY IF EXISTS keiko_own_delete ON public.shopping_items;
CREATE POLICY keiko_own_select ON public.shopping_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.shopping_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.shopping_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.shopping_items FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ⚠️ I PERMESSI, che sono un'altra cosa dalle policy.
-- Le policy dicono QUALI RIGHE si vedono; la GRANT dice se il ruolo può
-- toccare la tabella. Senza questa riga la tabella esiste, le policy ci sono,
-- e l'app riceve "permission denied for table shopping_items" — è successo
-- davvero con `recipes` il 7 agosto 2026, ed è annotato anche in cucina.sql.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_items TO authenticated, service_role;

-- ── Controllo finale ───────────────────────────────────────────────────────
-- Devono uscire: le 4 policy di shopping_items, e le due colonne nuove.
SELECT policyname, cmd FROM pg_policies
 WHERE schemaname = 'public' AND tablename = 'shopping_items' ORDER BY policyname;

SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'recipes'
   AND column_name IN ('extracted', 'times_cooked') ORDER BY column_name;
