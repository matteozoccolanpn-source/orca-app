-- VIAGGI — hash per riconoscere i doppioni fra documenti (28 agosto 2026)
--
-- Migrazione successiva a docs/sql/trip-documents.sql, che ORA ha una riga
-- vera (il documento cinese sotto prova@keiko.local): questa è `alter table
-- add column`, non drop+create — la tabella non è più vuota.
--
-- Due hash, due garanzie diverse:
--   file_hash  — hash dei byte grezzi del file caricato. Calcolabile SEMPRE
--                prima di chiamare Claude, per qualunque formato: ferma
--                l'esatto incidente del 27 agosto (lo stesso file caricato
--                due volte, "(1).docx" compreso) a costo zero.
--   text_hash  — hash del testo estratto, normalizzato. Per un .docx è
--                gratis (mammoth) e si controlla anch'esso prima di Claude;
--                per un PDF/immagine il testo esiste solo DOPO la
--                trascrizione di Claude, quindi lì il controllo arriva dopo
--                — non evita la spesa AI in quel caso, evita solo che il
--                contenuto duplicato finisca comunque nella linea del tempo.
--
-- Il confronto è per utente (RLS fa già questo scoping da sola), MAI per
-- singolo viaggio: al momento del controllo, prima di aver letto il
-- documento, il trip_key non si conosce ancora.
--
-- Nullable, non NOT NULL: la riga già esistente non ha né l'uno né l'altro
-- (il file originale non è mai stato conservato, quindi file_hash non è
-- calcolabile a posteriori) e resta valida — semplicemente non parteciperà
-- al confronto finché non viene ricaricata.

alter table public.trip_documents add column if not exists file_hash text;
alter table public.trip_documents add column if not exists text_hash text;

create index if not exists trip_documents_file_hash_idx on public.trip_documents (user_id, file_hash);
create index if not exists trip_documents_text_hash_idx on public.trip_documents (user_id, text_hash);

notify pgrst, 'reload schema';
