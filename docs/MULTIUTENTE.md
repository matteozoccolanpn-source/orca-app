# Multi-utente (Blocco C) — stato reale + piano (verificato su DB)

## Decisioni (confermate dai dati)
- **Auth:** si tiene NextAuth/Google (Supabase Auth è presente ma VUOTO, `auth.users` = 0 righe → non lo usiamo).
- **Sicurezza:** app-scoped (ogni query filtra per l'utente nel codice). Adatto a 2 utenti fidati. RLS = upgrade futuro.
- **Chiave utente:** uuid DERIVATO in modo stabile dall'email → `lib/user.ts` (`uuidForEmail` / `currentUserId`). Nessuna tabella nuova, nessun FK, nessuna migrazione auth.
- uuid di Matteo (matteo.zoccolan.pn@gmail.com) = `2c875815-a9b2-5a28-9e9e-6051128a8d4d`

## Fatti verificati sul DB
- `user_id` è **uuid** su TUTTE le tabelle app (colonna GIÀ presente ovunque → niente da aggiungere).
- `user_id` **senza foreign key** verso auth.users (query FK = 0 righe) → qualsiasi uuid valido va bene.
- 0 query filtrano per utente (tutto in un mucchio unico, `user_id` = null).
- Ingresso eventi = in-app (`/api/upload` → `/api/upload/confirm` → `createTicket` `lib/supabase.ts:148`). Make/Dropbox/Airtable NON in uso.

Tabelle da rendere per-utente: tickets, todos, watchlist, diet_plan, workout_plan, workout_log, trip_plans, push_subscriptions, notification_runs.
NON dati utente (restano condivisi): films_catalog, search_log.
Trappole: (1) `workout_log` upsert `onConflict:"day"` → vincolo va portato a `(user_id, day)`; (2) update/delete "per id" senza guardia proprietario.

## Approccio implementativo (meno modifiche, meno rischio)
Le funzioni dati in `lib/supabase.ts` girano SEMPRE in contesto loggato → chiamano `currentUserId()` **internamente** (scritture: settano user_id; letture: filtrano). Così NON serve passare l'utente da ogni chiamante. (Il cron è a parte, ha il suo client: va gestito separatamente, per-utente.)

## Piano a fasi (ognuna testabile, un commit ciascuna)
1. Helper identità `currentUserId()` — ✅ FATTO (`lib/user.ts`).
2. Scritture: ogni create/save mette user_id = currentUserId(). (non-breaking: le letture vedono ancora tutto)
3. Backfill: assegnare i dati esistenti (user_id null) all'uuid di Matteo (SQL). + vincolo workout_log → (user_id, day).
4. Letture: ogni get filtra per currentUserId(). ← QUI scatta la separazione: test attento (Matteo deve continuare a vedere tutto suo).
5. Guardie: update/delete per id verificano il proprietario.
6. Cron: giro utente-per-utente (per ora resta com'è; le notifiche fini vanno ripensate).
7. Sblocco email di lei (`auth.ts`) + test end-to-end con due account.
