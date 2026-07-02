-- Keiko — tabella trip_plans (memoria nascosta dei piani viaggio)
--
-- ADDITIVA: non tocca 'tickets', 'diet_plan', 'workout_plan', 'workout_log'.
-- Convenzioni prese dalle tabelle esistenti: id uuid, user_id (null in single-user),
-- piano in JSONB (come diet_plan.week), timestamp.
-- Accesso solo server-side con la service role key, come le altre tabelle.
--
-- Come si usa: incolla tutto nel SQL Editor di Supabase e premi Run.

create table if not exists trip_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,                             -- null per ora (app single-user)
  cluster_key  text unique not null,             -- chiave deterministica dell'incastro (città+date):
                                                 -- evita doppioni e rende idempotente il trigger (task 6)
  city         text not null,                    -- città del viaggio (es. "Roma")
  start_date   date,                             -- inizio finestra viaggio
  end_date     date,                             -- fine finestra viaggio
  ticket_ids   uuid[] not null default '{}',     -- biglietti che compongono l'incastro
  status       text   not null default 'pending',-- 'pending' = rilevato, non cercato; 'ready' = fase pesante fatta
  plan         jsonb,                            -- il piano strutturato: slot, orari, link, tips, messaggio
                                                 -- (stesso approccio JSONB di diet_plan.week)
  searched_at  timestamptz,                      -- quando è girata la fase pesante (volatile da rinfrescare?)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Ritrova in fretta il piano dato l'incastro.
create index if not exists trip_plans_cluster_key_idx on trip_plans (cluster_key);

-- PERMESSI (necessari): la tabella è usata solo lato server con la service role key.
-- Le tabelle create a mano dal SQL Editor NON ricevono da sole questo grant.
grant all on table trip_plans to service_role;

-- SICUREZZA (consigliata): attiva RLS così l'API pubblica (anon/authenticated) non
-- può leggerla. La service_role bypassa RLS, quindi l'app continua a funzionare.
alter table trip_plans enable row level security;
