import { NextResponse } from "next/server"
import { auth, OWNER_EMAIL } from "@/auth"

// Nessun "buttafuori" generale: come prima, il middleware NON rimanda a /login.
// Le rotte che scrivono dati restano protette dai loro controlli interni.
//
// L'unica eccezione è /numeri (K9), che è solo mia. Il controllo sta QUI e non
// solo dentro la pagina, per un motivo pratico verificato a mano: `auth()`
// chiamata dentro una pagina scrive i cookie di sessione e chiude la risposta,
// così il notFound() arriva tardi e viene fuori un 200 con dentro la pagina
// "non esiste". Dal middleware il 404 è vero, come per /api/debug/* (K67).
// La pagina tiene comunque il suo controllo: se un giorno cambiasse il matcher,
// i numeri non uscirebbero lo stesso.
export default auth((req) => {
  if (req.nextUrl.pathname.startsWith("/numeri")) {
    const email = (req.auth?.user?.email ?? "").trim().toLowerCase()
    if (email !== OWNER_EMAIL) return new NextResponse(null, { status: 404 })
  }
})

export const config = {
  // api/cron: rotte del cron di Vercel, si proteggono da sole con CRON_SECRET
  //           (il middleware le bloccherebbe perché girano senza login → notifiche ferme).
  // api/version: controllo versione PWA, deve rispondere anche senza sessione.
  matcher: ["/((?!login|ds-preview|api/auth|api/cron|api/version|_next/static|_next/image|favicon\\.ico).*)"],
}
