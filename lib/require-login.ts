import type { Session } from "next-auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { emailDiSviluppo } from "./dev-login";

// Obbliga il login: se non c'è sessione, manda alla pagina /login.
// Va chiamata in cima alle pagine che leggono dati dell'utente. Necessaria per
// il multi-utente: senza sessione il database non sa di chi mostrare i dati
// (con la privacy accesa darebbe "utente non autenticato").
export async function requireLogin(): Promise<Session> {
  const session = await auth();
  if (session) return session;

  // In sviluppo, e solo con KEIKO_DEV_LOGIN acceso, si entra senza Google:
  // serve a provare l'app VERA in locale invece di banchi finti. Le due
  // serrature (variabile + NODE_ENV) stanno in `lib/dev-login.ts`, spiegate.
  // Senza la variabile questa riga non fa niente e si scende al redirect,
  // che è il comportamento di sempre.
  const email = emailDiSviluppo();
  if (email) {
    return {
      user: { name: "Matteo", email },
      // Il campo è obbligatorio nel tipo `Session`. Un'ora basta: la sessione
      // finta nasce a ogni richiesta, non viene conservata da nessuna parte.
      expires: new Date(Date.now() + 3600_000).toISOString(),
    };
  }

  redirect("/login");
}
