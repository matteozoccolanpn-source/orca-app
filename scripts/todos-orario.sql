-- Keiko — orario opzionale + promemoria per i to-do
--
-- ADDITIVA: aggiunge solo 2 colonne alla tabella todos, non tocca nient'altro.
-- Come si usa: incolla tutto nel SQL Editor di Supabase e premi Run.

-- Orario del to-do (es. 14:30). NULL = nessun orario → nessuna notifica.
alter table todos add column if not exists time time;

-- Quando è stata mandata la notifica "30 min prima" (NULL = mai).
-- Serve al cron per non mandare la stessa notifica due volte.
alter table todos add column if not exists reminded_at timestamptz;
