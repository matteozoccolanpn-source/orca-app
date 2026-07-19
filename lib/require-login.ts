import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Obbliga il login: se non c'è sessione, manda alla pagina /login.
// Va chiamata in cima alle pagine che leggono dati dell'utente. Necessaria per
// il multi-utente: senza sessione il database non sa di chi mostrare i dati
// (con la privacy accesa darebbe "utente non autenticato").
export async function requireLogin() {
  const session = await auth();
  if (!session) redirect("/login");
  return session;
}
