-- VIAGGI — la foto dei fatti con un luogo riconoscibile (PARTE 3, 27 agosto 2026)
--
-- Migrazione su una tabella con righe vere: `alter table add column`, non
-- drop+create, stessa regola di docs/sql/trip-documents-hash.sql.
--
-- Due colonne, non una: `photo_name` da sola non basterebbe a distinguere
-- "non ancora cercata" da "cercata, e non c'era una foto di cui fidarsi" — la
-- stessa lezione di `EventEnrichment.placePhoto` in lib/supabase.ts. Senza
-- `photo_checked`, un fatto senza foto ripagherebbe la ricerca su Google Places
-- a ogni apertura della linea del tempo, per sempre.
--
-- `photo_name` è il "photo name" di Google Places (New) — es.
-- "places/XXX/photos/YYY" — non un URL: l'immagine vera passa dal proxy
-- /api/place-photo, la chiave resta server-side (stesso schema già in uso per
-- i Battiti).

alter table public.trip_facts add column if not exists photo_name text;
alter table public.trip_facts add column if not exists photo_checked boolean not null default false;

notify pgrst, 'reload schema';
