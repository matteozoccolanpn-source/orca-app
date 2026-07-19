import { auth } from "@/auth";

// Chiave utente per il multi-utente (Blocco C): l'email Google della sessione.
// Scelta semplice e stabile per pochi utenti fidati (app-scoped).
// Restituisce null se non loggato. NON ancora agganciata alle query dati:
// verrà usata fase per fase (vedi docs/MULTIUTENTE.md).
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}
