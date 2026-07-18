export { auth as middleware } from "@/auth"

export const config = {
  // api/cron: rotte del cron di Vercel, si proteggono da sole con CRON_SECRET
  //           (il middleware le bloccherebbe perché girano senza login → notifiche ferme).
  // api/version: controllo versione PWA, deve rispondere anche senza sessione.
  matcher: ["/((?!login|ds-preview|api/auth|api/cron|api/version|_next/static|_next/image|favicon\\.ico).*)"],
}
