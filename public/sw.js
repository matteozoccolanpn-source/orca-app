/* VIAGGI — offline per il viaggio caricato da fuori (PARTE 1.3).
 *
 * "Funziona senza rete per quello che è già stato caricato": non è dati
 * live, è l'ULTIMA pagina vista con successo, servita di nuovo quando la
 * rete manca. Interessa solo le NAVIGAZIONI vere (refresh, riapertura,
 * icona da home screen) — mai le richieste RSC dietro un `next/link` interno
 * alla pagina (cambiare viaggio dai chip, per esempio, resta un'azione che
 * ha bisogno di rete: è dati nuovi, non "quello che c'è già").
 *
 * Non precarica gli asset JS/CSS: se il browser li ha già in cache HTTP
 * normale (il caso comune, essendoci passato da poco) l'idratazione parte
 * lo stesso; se li ha persi, la pagina offline potrebbe restare senza
 * interattività. Un precache degli asset è il passo dopo, non questo.
 */
const CACHE_VIAGGIO_DOCS = "keiko-viaggio-docs-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode !== "navigate") return;
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith("/viaggio/documenti")) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_VIAGGIO_DOCS).then((c) => c.put(event.request, copia));
        return res;
      })
      .catch(async () => (await caches.match(event.request)) || Response.error())
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "OrCa", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
