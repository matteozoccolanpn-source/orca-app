-- Keiko — notifiche to-do regolabili (anticipo + doppia)
--
-- ADDITIVA: aggiunge 3 colonne alla tabella todos.
-- Come si usa: incolla nel SQL Editor di Supabase e premi Run.

-- Quanti minuti prima dell'orario arriva la notifica (default 30).
alter table todos add column if not exists lead_minutes integer not null default 30;

-- Seconda notifica a ridosso (~15 min prima)? Default no.
alter table todos add column if not exists double_reminder boolean not null default false;

-- Quando è partita la seconda notifica (NULL = mai). La prima usa reminded_at.
alter table todos add column if not exists reminded_imminent_at timestamptz;
