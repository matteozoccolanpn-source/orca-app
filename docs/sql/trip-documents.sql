-- VIAGGI — il viaggio caricato da fuori (PROMPT-CODE-20, PARTE 0 + revisioni)
--
-- Due tabelle nuove: i documenti caricati e i fatti che ne escono (giorno,
-- ora, cosa, dove, codice — sempre con la fonte). Non tocca `tickets` né
-- `trip_plans`: qui si LEGGE da `tickets` per riconoscere i doppioni
-- (PARTE 1.4), mai si scrive né si referenzia con una foreign key — il
-- confronto si fa a runtime, non si congela nello schema.
--
-- ⚠️ DROP + CREATE, non ALTER: la versione precedente di questo file provava
-- a convergere con `alter table add column if not exists` su qualunque bozza
-- avesse trovato — ma quel metodo dipende dal sapere ESATTAMENTE cosa c'è già,
-- e due giri di fila hanno dimostrato che sbagliavo a indovinarlo (mancava
-- `destination`/`extracted_text`, e su `trip_facts` c'era un `trip_key NOT
-- NULL` residuo di una bozza precedente che nessuna versione del file aveva
-- mai droppato). Matteo ha verificato con `information_schema`, in autorità
-- sulla mia congettura, che ENTRAMBE le tabelle sono vuote (0 righe). Su una
-- tabella vuota il drop+create è sicuro e non dipende da nessuna storia: la
-- forma finale è quella scritta qui, non quella ereditata da una bozza.
-- Se in futuro queste tabelle avessero righe vere, questo file andrebbe
-- riscritto in `alter table` — ma non è la situazione di oggi.
--
-- NIENTE FILE ORIGINALE CONSERVATO (decisione di Matteo, 27 agosto 2026):
-- non c'è uno Storage bucket. La fonte è `extracted_text` — per un .docx è il
-- testo verbatim di mammoth, per un PDF/immagine è la trascrizione che Claude
-- restituisce insieme ai fatti.
--
-- trip_key: dedotto automaticamente da città + date dei fatti estratti,
-- INDIPENDENTE da trip_plans.cluster_key (il viaggio vero di Matteo, Cina 16
-- giorni, non ha una riga in trip_plans: il guardrail >=7 giorni la esclude).
-- Vive SOLO su trip_documents, non su trip_facts (i fatti seguono il loro
-- documento via document_id: staccare un documento aggiorna una riga sola).
-- L'unione non è silenziosa: dopo il caricamento la pagina dice a quale
-- viaggio il documento è stato attaccato, e si può STACCARE.
--
-- Gli orari NON si convertono e NON si sommano: time_text/time_end_text sono
-- l'ora COSÌ COM'È SCRITTA sul documento (vale anche per i fatti letti dai
-- biglietti, quando li si mostra insieme a questi).

drop table if exists public.trip_facts;
drop table if exists public.trip_documents;

create table public.trip_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  trip_key text not null,        -- dedotto da città+date all'arrivo; "staccare" = riassegnarlo
  destination text not null,     -- la destinazione dedotta dal documento (es. "Cina"): decide il trip_key e la testata
  file_name text not null,
  mime_type text not null,
  extracted_text text not null,  -- LA FONTE: testo verbatim (mammoth per .docx, trascrizione di Claude per PDF/immagini)
  uploaded_at timestamptz not null default now(),
  status text not null default 'ok' check (status in ('ok','error')),
  error_message text             -- valorizzato solo se status='error': perché QUESTO file non si è letto
);

create index trip_documents_trip_key_idx on public.trip_documents (user_id, trip_key);

create table public.trip_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  document_id uuid not null references public.trip_documents(id) on delete cascade,
  kind text not null check (kind in ('volo','treno','hotel','visita','contatto','altro')),
  day date,                    -- giorno del fatto, se noto (anno dedotto dalla data di caricamento)
  time_text text,              -- ora di inizio ESATTAMENTE come scritta ("18H50", "07:55")
  time_end_text text,          -- ora di fine, se il documento la dà
  title text not null,         -- "cosa": es. "Volo CA750", "Sun World Hotel Beijing"
  place text,                  -- "dove"
  reference text,              -- codice di prenotazione, se c'è (spesso assente nei programmi d'agenzia)
  raw_text text not null,      -- il fatto trascritto com'è, senza parafrasi
  created_at timestamptz not null default now()
);

create index trip_facts_document_id_idx on public.trip_facts (document_id);

-- RLS, stesso schema di docs/sql/multiutente_rls.sql: solo le proprie righe.
alter table public.trip_documents enable row level security;
alter table public.trip_facts enable row level security;

create policy keiko_own_select on public.trip_documents for select to authenticated using (user_id = auth.uid());
create policy keiko_own_insert on public.trip_documents for insert to authenticated with check (user_id = auth.uid());
create policy keiko_own_update on public.trip_documents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy keiko_own_delete on public.trip_documents for delete to authenticated using (user_id = auth.uid());

create policy keiko_own_select on public.trip_facts for select to authenticated using (user_id = auth.uid());
create policy keiko_own_insert on public.trip_facts for insert to authenticated with check (user_id = auth.uid());
create policy keiko_own_update on public.trip_facts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy keiko_own_delete on public.trip_facts for delete to authenticated using (user_id = auth.uid());

-- `authenticated` (l'app, con la RLS sopra a filtrare le righe) E `service_role`
-- (gli script di amministrazione/collaudo, che la RLS la scavalca ma la GRANT
-- di tabella no — trovato collaudando: senza questa riga il service_role
-- vedeva "permission denied for table", non "nessuna riga").
grant select, insert, update, delete on public.trip_documents, public.trip_facts to authenticated, service_role;

notify pgrst, 'reload schema';
