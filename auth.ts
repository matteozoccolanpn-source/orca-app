import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

// Durata sessione: 30 giorni. Impostata sia su `session.maxAge` sia sul cookie,
// così il cookie diventa PERSISTENTE (non "di sessione"): sopravvive alla
// chiusura dell'app. Senza questo, iOS (PWA) cancellava il cookie a ogni
// chiusura e chiedeva di nuovo "Accedi con Google" a ogni riapertura.
const THIRTY_DAYS = 60 * 60 * 24 * 30
const useSecureCookies = process.env.NODE_ENV === "production"

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        "matteo.zoccolan.pn@gmail.com",
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
