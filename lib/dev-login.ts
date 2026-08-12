import type { Session } from "next-auth";

/* LA SCORCIATOIA DI SVILUPPO — una sola, e sta tutta qui.
 *
 * Perché esiste. Fino al 12 agosto 2026 nessuna ondata di lavoro è mai stata
 * provata sull'app vera in locale: `requireLogin()` rimanda a `/login`, e
 * `/login` vuole Google. Ogni volta si costruiva un banco finto — dati
 * inventati, pagine di anteprima — e i difetti veri saltavano fuori sul
 * telefono di Matteo invece che sullo schermo di chi scriveva il codice.
 *
 * Come si accende. Nel `.env.local` (che non finisce mai nel repo, vedi
 * `.gitignore`):
 *
 *     KEIKO_DEV_LOGIN=prova@keiko.local
 *
 * ⚠️ QUALE INDIRIZZO. Quello **di prova**, non quello di Matteo. Il valore è
 * l'email con cui entri, e da lì si ricava la chiave utente: mettendo la sua,
 * ogni tasto premuto durante le prove scriverebbe nel SUO storico — serie
 * finte nell'allenamento, spunte sulla sua lista della spesa — e corromperebbe
 * proprio i dati su cui si sta lavorando. Con `prova@keiko.local` hai un
 * utente tutto tuo, vuoto, dove puoi premere qualsiasi cosa.
 * L'indirizzo di Matteo si usa **solo per guardare**, mai per premere: serve
 * quando devi vedere una schermata piena di roba vera invece che vuota.
 * La regola per esteso sta in `AGENTS.md`.
 *
 * Le due serrature, e sono in AND:
 *  1. la variabile deve esserci — se manca, queste funzioni tornano `null` e
 *     l'app si comporta esattamente come prima, riga per riga;
 *  2. `NODE_ENV` non dev'essere `production` — così anche se la variabile
 *     finisse per sbaglio nelle impostazioni di Vercel non farebbe niente.
 *     La seconda serratura è quella che conta: la prima si può sbagliare.
 *
 * Non tocca l'autenticazione vera. Il `auth()` di NextAuth resta quello che
 * era: la sessione finta si accende SOLO quando quello non ha già una
 * sessione, quindi se sei loggato per davvero vinci tu.
 */

export function emailDiSviluppo(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const email = process.env.KEIKO_DEV_LOGIN?.trim();
  return email ? email.toLowerCase() : null;
}

/** La sessione finta, nella forma che NextAuth restituirebbe. `null` quando la
 *  scorciatoia è spenta — ed è il caso normale. */
export function sessioneDiSviluppo(): Session | null {
  const email = emailDiSviluppo();
  if (!email) return null;
  return {
    user: { name: email.split("@")[0], email },
    // Il campo è obbligatorio nel tipo. Un'ora basta: questa sessione nasce a
    // ogni richiesta e non viene conservata da nessuna parte.
    expires: new Date(Date.now() + 3600_000).toISOString(),
  };
}
