-- Keiko — tabella todos (barra to-do per-giorno, task #21)
--
-- ADDITIVA: non tocca 'tickets', 'diet_plan', 'workout_plan', 'workout_log', 'trip_plans'.
-- Convenzioni prese dalle tabelle esistenti: id uuid, user_id (null in single-user),
-- accesso solo server-side con la service role key.
--
-- Come si usa: incolla tutto nel SQL Editor di Supabase e premi Run.

create table if not exists todos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                              -- null per ora (app single-user)
  day        date not null,                     -- il giorno a cui appartiene il to-do
  text       text not null,                     -- cosa fare (es. "Chiamare il dentista")
  done       boolean not null default false,    -- spuntato?
  star       boolean not null default false,    -- importante?
  created_at timestamptz not null default now()
);

-- Ritrova in fretta i to-do di un giorno.
create index if not exists todos_day_idx on todos (day);

-- PERMESSI (necessari): la tabella è usata solo lato server con la service role key.
-- Le tabelle create a mano dal SQL Editor NON ricevono da sole questo grant.
grant all on table todos to service_role;

-- SICUREZZA (consigliata): attiva RLS così l'API pubblica (anon/authenticated) non
-- può leggerla. La service_role bypassa RLS, quindi l'app continua a funzionare.
alter table todos enable row level security;
