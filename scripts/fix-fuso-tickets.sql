-- Keiko — FIX una tantum del fuso orario sui biglietti esistenti.
--
-- Problema: le ore erano state salvate come UTC ma erano ore ITALIANE
-- (es. treno delle 08:48 salvato come 08:48+00 → l'app mostrava 10:48).
-- Questo comando reinterpreta ogni datetime come ora di Roma e salva
-- l'istante UTC giusto (gestisce da solo ora legale/solare per ogni data).
--
-- DA ESEGUIRE UNA VOLTA SOLA. Se lo lanci due volte, sposti tutto di altre 2 ore!
-- Dopo il fix, l'app salva già gli orari giusti (fix nel codice), quindi basta così.

update tickets
set datetime = (datetime at time zone 'UTC') at time zone 'Europe/Rome'
where datetime is not null;
