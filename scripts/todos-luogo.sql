-- Keiko — luogo e telefono risolti da Claude per i to-do
--
-- ADDITIVA: aggiunge solo 2 colonne alla tabella todos.
-- Come si usa: incolla nel SQL Editor di Supabase e premi Run.

-- Luogo vero trovato da Claude (es. "Agenzia Card, Via dell'Annunciata 1, Milano").
alter table todos add column if not exists location text;

-- Telefono del posto, se trovato (es. "+39 02 883 9351").
alter table todos add column if not exists phone text;
