-- Keiko — sezione "Da guardare" (watchlist film/serie + catalogo cache)
-- Logica ispirata a TV Time: traccia cosa guardi, scopri dove, (v2: notifiche uscite).
--
-- ADDITIVA: crea 2 tabelle nuove, non tocca nient'altro.
-- Come si usa: incolla tutto nel SQL Editor di Supabase e premi Run.

-- La TUA lista: cosa vuoi guardare (e cosa hai già visto).
create table if not exists watchlist (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,                            -- null per ora (app single-user)
  title      text not null,                   -- es. "Quo Vado?"
  kind       text not null default 'film',    -- 'film' | 'serie'
  info       text,                            -- es. "Commedia 2016 · su Netflix · 1h 26m"
  link       text,                            -- link utile (scheda/streaming)
  seen       boolean not null default false,  -- già visto?
  created_at timestamptz not null default now()
);
grant all on table watchlist to service_role;
alter table watchlist enable row level security;

-- CATALOGO cache: titoli trovati dalle ricerche approfondite in background.
-- Le prossime richieste pescano prima da qui (istantaneo, costo zero).
-- Le voci "scadono": dopo ~30 giorni le info streaming vanno riverificate.
create table if not exists films_catalog (
  id        uuid primary key default gen_random_uuid(),
  title     text not null,
  kind      text not null default 'film',     -- 'film' | 'serie'
  genres    text,                             -- es. "commedia, italiano"
  platform  text,                             -- es. "Netflix"
  info      text,                             -- una riga: di cosa parla / perché
  link      text,
  cached_at timestamptz not null default now()
);
grant all on table films_catalog to service_role;
alter table films_catalog enable row level security;
