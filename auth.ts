import NextAuth from "next-auth"
import type { Session } from "next-auth"
import Google from "next-auth/providers/google"
import { sessioneDiSviluppo } from "@/lib/dev-login"

// Durata sessione: 30 giorni. Impostata sia su `session.maxAge` sia sul cookie,
// così il cookie diventa PERSISTENTE (non "di sessione"): sopravvive alla
// chiusura dell'app. Senza questo, iOS (PWA) cancellava il cookie a ogni
// chiusura e chiedeva di nuovo "Accedi con Google" a ogni riapertura.
const THIRTY_DAYS = 60 * 60 * 24 * 30
const useSecureCookies = process.env.NODE_ENV === "production"

// Il proprietario dell'app. Serve alle rotte di diagnostica (`/api/debug/*`),
// che devono essere visibili solo a lui e non a tutti gli invitati.
export const OWNER_EMAIL = "matteo.zoccolan.pn@gmail.com"

const nextAuth = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: THIRTY_DAYS },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      // nomi di default di Auth.js v5 (con prefisso __Secure- in produzione),
      // così le sessioni già attive restano valide: aggiungiamo solo la durata.
      name: `${useSecureCookies ? "__Secure-" : ""}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: THIRTY_DAYS,
      },
    },
  },
  callbacks: {
    signIn({ user }) {
      // Lista invitati (privato, solo queste email possono entrare).
      const allowed = [
        OWNER_EMAIL,
        "subbafederica@gmail.com",
      ]
      return allowed.includes((user.email ?? "").trim().toLowerCase())
    },
    // Nessun "buttafuori": il middleware NON rimanda più a /login a ogni apertura
    // (era la causa del "Accedi con Google" a ogni riavvio dell'app). Le rotte che
    // scrivono dati restano protette dai loro controlli interni (auth() nelle route).
    authorized() {
      return true
    },
  },
})

export const { handlers, signIn, signOut } = nextAuth

/* `auth` PASSA DA QUI, e per una ragione sola: la scorciatoia di sviluppo.
 *
 * Le rotte in `app/api/*` sono 47 e chiamano tutte `auth()` per conto loro.
 * Col login finto solo nelle pagine si poteva GUARDARE l'app vera ma non
 * PREMERE niente: ogni scrittura rispondeva 401. Toccare 47 file per una
 * scorciatoia di sviluppo sarebbe stato il rimedio peggiore del male; qui il
 * punto è uno, e chi importa `auth` da `@/auth` non cambia una riga.
 *
 * `auth` di NextAuth fa tre mestieri: chiamato senza argomenti dà la sessione,
 * chiamato con una funzione avvolge il middleware o una rotta. Solo il primo
 * caso ci interessa — gli altri passano di qui e vanno avanti intatti.
 *
 * La sessione vera vince sempre: il ripiego si accende solo quando NextAuth
 * non ha già una sessione, e comunque solo con le due serrature di
 * `lib/dev-login.ts` (variabile locale + `NODE_ENV`). Spente quelle,
 * `sessioneDiSviluppo()` torna `null` e questa funzione è `auth` e basta. */
type Auth = typeof nextAuth.auth
const authVero = nextAuth.auth as unknown as (...a: unknown[]) => unknown

export const auth = ((...args: unknown[]) => {
  if (args.length > 0) return authVero(...args)
  return (authVero() as Promise<Session | null>).then((s) => s ?? sessioneDiSviluppo())
}) as unknown as Auth
