/* ═════════ LE REGOLE DELLE CHIAMATE DELLA GUARDA ═════════
 *
 * Quattro funzioni, e stanno qui per una ragione precisa. `SchedaTitolo` non
 * fa chiamate — i dati glieli passa chi lo monta — ma le schermate che lo
 * montano sono tre (la Home, la Guarda, i consigli), e se ognuna si scrive il
 * suo `?title=` e il suo `?kind=` finiamo con tre pannelli identici e tre
 * comportamenti diversi: il problema di partenza spostato di un piano.
 *
 * Quindi: **le regole della chiamata stanno fuori da tutti e tre**, e le tre
 * schermate decidono solo QUANDO chiamarle e dove tenere lo stato.
 *
 * Qui dentro non c'è nessuno stato e nessun React: si costruisce l'indirizzo,
 * si legge la risposta, si torna un dato pulito. Chi chiama gestisce l'attesa
 * e l'errore, perché è lì che si decide cosa mostrare mentre si aspetta.
 */

export type DettaglioTitolo = { year: string | null; genres: string[]; overview: string | null };
export type TitoloSimile = { title: string; poster?: string | null };

const q = (titolo: string, kind: string) =>
  `title=${encodeURIComponent(titolo)}&kind=${encodeURIComponent(kind)}`;

/** Trama, anno, genere. `null` quando TMDB non sa dire niente. */
export async function chiediDettagli(titolo: string, kind: string): Promise<DettaglioTitolo | null> {
  const r = await fetch(`/api/watch/details?${q(titolo, kind)}`, { credentials: "include" });
  const d = await r.json();
  return (d?.details ?? null) as DettaglioTitolo | null;
}

/** «Se ti è piaciuto». Elenco vuoto quando non ce ne sono. */
export async function chiediSimili(titolo: string, kind: string): Promise<TitoloSimile[]> {
  const r = await fetch(`/api/watch/similar?${q(titolo, kind)}`, { credentials: "include" });
  const d = await r.json();
  return (d?.similar ?? []) as TitoloSimile[];
}

/* Dove si vede, in Italia. L'abbonamento viene prima del noleggio: è l'unica
   risposta che non costa altri soldi. I doppioni si tolgono qui, una volta,
   invece che in ognuna delle tre schermate. */
export async function chiediPiattaforme(titolo: string, kind: string): Promise<string[]> {
  const r = await fetch(`/api/watch/providers?${q(titolo, kind)}`, { credentials: "include" });
  const d = await r.json();
  const p = d?.providers ?? {};
  const nomi = [...(p.flatrate ?? []), ...(p.rent ?? []), ...(p.buy ?? [])]
    .map((x: { name?: string }) => x?.name)
    .filter(Boolean) as string[];
  return [...new Set(nomi)].slice(0, 6);
}

/** «+1 episodio». Il conto vero lo fa il server, che sa quanto è lunga la
 *  stagione: qui si dice solo «avanza» e si guarda se è andata. */
export async function avanzaEpisodio(id: string): Promise<boolean> {
  const r = await fetch("/api/watch/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ id, avanza: true }),
  });
  return r.ok;
}
