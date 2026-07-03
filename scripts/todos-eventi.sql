-- Keiko — to-do "evento" (gara, partita, spettacolo): info e link extra
--
-- ADDITIVA: aggiunge 3 colonne alla tabella todos.
-- Come si usa: incolla nel SQL Editor di Supabase e premi Run.

-- Riga informativa breve trovata da Claude (es. "Diretta Sky F1 15:00 · differita TV8 18:00").
alter table todos add column if not exists info text;

-- Link utile (es. classifica mondiale F1) + etichetta del bottone (es. "Classifica").
alter table todos add column if not exists link text;
alter table todos add column if not exists link_label text;
