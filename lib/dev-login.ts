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
 *     KEIKO_DEV_LOGIN=matteo.zoccolan.pn@gmail.com
 *
 * Il valore è l'email con cui vuoi entrare: è la STESSA cosa che l'app legge
 * dalla sessione Google, e da lì si ricava la chiave utente (`uuidForEmail`).
 * Per questo dentro ci sono i dati veri e non un altro insieme vuoto.
 *
 * Le due serrature, e sono in AND:
 *  1. la variabile deve esserci — se manca, questa funzione torna `null` e
 *     l'app si comporta esattamente come prima, riga per riga;
 *  2. `NODE_ENV` non dev'essere `production` — così anche se la variabile
 *     finisse per sbaglio nelle impostazioni di Vercel non farebbe niente.
 *     La seconda serratura è quella che conta: la prima si può sbagliare.
 *
 * Non tocca l'autenticazione vera. `auth()` resta quello che era: questa
 * funzione viene interrogata SOLO quando `auth()` non ha già una sessione,
 * quindi se sei loggato per davvero vinci tu.
 */

export function emailDiSviluppo(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const email = process.env.KEIKO_DEV_LOGIN?.trim();
  return email ? email.toLowerCase() : null;
}
