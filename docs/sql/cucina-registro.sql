-- ============================================================================
-- BLOCCO 7 — IL REGISTRO DEI PASTI (docs/PROMPT-CODE-12-CUCINA-ANNOTA.md)
--
-- Oggi la Cucina è l'unica sezione che non sa niente di te: il piano si legge
-- e non si annota. Questa tabella è il registro: Matteo dice cosa ha mangiato,
-- Keiko lo scrive. Punto.
--
-- ⚠️ PALETTO LEGALE, e va letto insieme a quello di `cucina-v2.sql`.
--
-- Il divieto scritto là protegge `diet_plan`: il piano della nutrizionista,
-- che Keiko non scrive e non modifica. Nessuna colonna lì dentro può legare
-- una ricetta a un pasto, perché sarebbe Keiko che tocca una prescrizione.
--
-- `diet_log` è un'altra cosa: è un fatto su Matteo, non una prescrizione.
-- `ricetta_id` non dice «questa sostituisce quel pasto», dice «quel giorno ho
-- cucinato questa». Registrare quello che è successo non è prescrivere quello
-- che deve succedere.
--
-- Due condizioni rendono sicura la distinzione, e vanno tenute tutt'e due:
--   1. il legame lo crea il dito di Matteo, mai una deduzione dal testo;
--   2. niente, in nessun punto dell'app, confronta il registro col piano.
-- Se una delle due cade, cade anche la distinzione.
--
-- 🚫 Qui dentro NON c'è, e non deve entrare: nessuna colonna di aderenza,
-- nessun punteggio, nessuna caloria, nessun macro, nessuna quantità calcolata.
-- Cosa hai mangiato e quando. Senza commento.
--
-- Privacy: RLS per utente come tutte le tabelle personali.
-- Idempotente, sicuro da rieseguire. Da incollare nell'editor SQL di Supabase.
-- ============================================================================

-- ── Il registro ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.diet_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL DEFAULT auth.uid(),

  -- IL GIORNO VERO, non la chiave della settimana. Il piano è organizzato per
  -- giorno della settimana ('lun'…'dom') e si ripete: se il registro usasse
  -- quella chiave, martedì prossimo sovrascriverebbe martedì scorso.
  giorno      date NOT NULL,

  -- QUALE PASTO DI QUEL GIORNO. `indice` è la posizione nell'array del piano
  -- (`DietWeek[giorno][indice]`), ed è l'unica cosa che identifica un pasto in
  -- modo univoco: due «Spuntino» nello stesso giorno hanno lo stesso nome ma
  -- posizione diversa.
  indice      smallint NOT NULL,
  -- E il nome com'era quel giorno, copiato qui. Serve allo STORICO: se la
  -- nutrizionista cambia il piano fra un mese, «Pranzo» del 14 agosto deve
  -- restare leggibile senza andare a chiedere al piano di oggi cos'era.
  pasto       text NOT NULL,

  -- 'seguito' | 'altro' | 'saltato'. Il CHECK c'è perché questi tre sono
  -- l'intero vocabolario del blocco: un quarto valore vorrebbe una decisione,
  -- non una riga di codice.
  stato       text NOT NULL CHECK (stato IN ('seguito', 'altro', 'saltato')),

  -- Cosa hai mangiato, in parole tue. Ha senso solo con stato='altro'; sugli
  -- altri due resta vuoto. Testo libero: qui non si normalizza niente.
  testo       text,

  -- LA RICETTA, quando l'hai scelta tu dal ricettario. `on delete set null`:
  -- cancellare una ricetta non deve cancellare il ricordo di averla cucinata —
  -- il fatto è avvenuto, e resta con il suo `testo`.
  ricetta_id  uuid REFERENCES public.recipes (id) ON DELETE SET NULL,

  -- La foto del piatto (url). Niente stime di porzione: solo cosa, mai quanto.
  foto        text,

  annotato_at timestamptz NOT NULL DEFAULT now()
);

-- ── UN PASTO SI ANNOTA UNA VOLTA SOLA ──────────────────────────────────────
-- Garantito QUI e non solo nel codice: il codice fa `upsert` su questo
-- vincolo, quindi ri-annotare CORREGGE invece di aggiungere una riga. Se il
-- vincolo vivesse solo nel client, due tocchi vicini creerebbero due righe e
-- lo storico direbbe che quel giorno hai pranzato due volte.
CREATE UNIQUE INDEX IF NOT EXISTS diet_log_pasto_key
  ON public.diet_log (user_id, giorno, indice);

-- "cosa ho mangiato, indietro nel tempo": l'ordine con cui lo storico legge,
-- e lo stesso cursore per data che usa lo storico degli allenamenti.
CREATE INDEX IF NOT EXISTS diet_log_user_giorno_idx
  ON public.diet_log (user_id, giorno DESC, indice);

-- ── Privacy: solo le proprie righe ─────────────────────────────────────────
ALTER TABLE public.diet_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS keiko_own_select ON public.diet_log;
DROP POLICY IF EXISTS keiko_own_insert ON public.diet_log;
DROP POLICY IF EXISTS keiko_own_update ON public.diet_log;
DROP POLICY IF EXISTS keiko_own_delete ON public.diet_log;
CREATE POLICY keiko_own_select ON public.diet_log FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY keiko_own_insert ON public.diet_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_update ON public.diet_log FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY keiko_own_delete ON public.diet_log FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ⚠️ I PERMESSI, che sono un'altra cosa dalle policy. Le policy dicono QUALI
-- RIGHE si vedono; la GRANT dice se il ruolo può toccare la tabella. Senza
-- questa riga la tabella esiste, le policy ci sono, e l'app riceve
-- "permission denied for table diet_log" — è già successo con `recipes`.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_log TO authenticated, service_role;

-- ── E la riga che oggi ci ha salvati ───────────────────────────────────────
-- PostgREST tiene in cache lo schema: senza questa, la colonna esiste ma l'app
-- riceve "Could not find the 'X' column ... in the schema cache". È successo
-- stamattina con `workout_session.origine`, e ha fatto sparire l'apertura di
-- tutte le sedute senza che né tsc né il build se ne accorgessero.
NOTIFY pgrst, 'reload schema';

-- ── Controllo finale ───────────────────────────────────────────────────────
-- Devono uscire le 4 policy e le 10 colonne.
-- SELECT policyname FROM pg_policies WHERE tablename = 'diet_log';
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'diet_log' ORDER BY ordinal_position;
