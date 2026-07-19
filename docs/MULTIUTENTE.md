# Multi-utente (Blocco C) — stato reale + piano

> Verificato dal CODICE ATTUALE (non dall'handoff vecchio). Ogni riga ha la prova file:riga.

## Decisioni (default proposti — da confermare)
- **Sicurezza:** app-scoped (ogni query filtra per l'utente nel codice). Adatto a 2 utenti fidati (coppia). RLS su Supabase = upgrade futuro se diventa prodotto per estranei.
- **Chiave utente:** email Google della sessione (`lib/user.ts` → `currentUserId()`). ⚠️ Dipende dal tipo della colonna `user_id` (vedi "Da verificare").

## Stato attuale (prove)
- Identità: la sessione ha l'email, ma il codice dati NON la usa mai (grep `session.user` = 0). Accesso a 1 sola email: `auth.ts:31`.
- 0 query filtrano per utente (grep `.eq("user_id"` = 0). Tutto in un mucchio unico.
- Ingresso eventi = in-app: `/api/upload` → `/api/upload/confirm` → `createTicket` (`lib/supabase.ts:148`). Make/Dropbox/Airtable NON in uso (airtable non importato; refresh legacy).

Tabelle dati (tutte da rendere per-utente):
- tickets — createTicket :148 (user_id:null :152) · getUpcomingTickets :65 · update/delete per id :110/:115
- todos — createTodo :705 (user_id:null :716) · getTodos :673
- watchlist — addWatchItem :531 (user_id:null :534) · getWatchlist :504
- diet_plan — saveDietPlan :201 (user_id:null :205) · getDietPlan :181
- workout_plan — saveWorkoutPlan :255 (NIENTE user_id → colonna da aggiungere) · getWorkoutPlan :235
- workout_log — setTrainedDay :285 upsert onConflict:"day" (VINCOLO SOLO SUL GIORNO → cambiare in (user_id,day)) · getTrainedDays :273
- trip_plans — syncTripPlans :305 (niente user_id)
- push_subscriptions — subscribe (user_id:null); cron legge TUTTE
- notification_runs — dedup (kind,data) globale

NON dati utente (restano condivisi): films_catalog, search_log.

Trappole: (1) vincolo workout_log sul solo giorno; (2) update/delete "per id" non controllano il proprietario → serve guardia user_id.

## Da verificare su Supabase (prima di scrivere codice dati)
Tipo della colonna user_id nelle tabelle che ce l'hanno. Query di sola lettura:
```sql
select table_name, column_name, data_type
from information_schema.columns
where column_name = 'user_id'
order by table_name;
```
Se il tipo è `uuid`, l'email non ci sta → si aggiusta (colonna text o mini tabella users). Se è `text`, si procede con l'email.

## Piano a fasi (ognuna testabile, su branch, senza rompere la tua app)
1. Colonne: user_id dove manca + vincolo workout_log → (user_id, day).
2. Identità: `currentUserId()` — FATTO (lib/user.ts).
3. Scritture: ogni create/save mette il vero user_id + backfill dei tuoi dati esistenti al tuo id.
4. Letture: ogni get filtra per user_id (qui scatta la separazione — test attento).
5. Guardie: update/delete per id verificano il proprietario.
6. Cron: giro utente-per-utente.
7. Sblocca l'email di lei + test end-to-end.
