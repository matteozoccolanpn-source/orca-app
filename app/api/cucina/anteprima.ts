/* L'ANTEPRIMA PUBBLICA DI UN LINK — titolo, autore, miniatura.
 *
 * Estratta da `search/route.ts` (dov'era una funzione privata) perché serve
 * anche alla PARTE D del ricettario: quando Matteo incolla un link invece di
 * cercare, il foglio ha bisogno di qualcosa da mostrare in testa PRIMA che
 * `/api/cucina/estrai` finisca di leggere la ricetta. Stessa funzione,
 * stesso comportamento — solo un posto solo invece di due copie.
 *
 * Nessuna chiave, nessuno scraping: oEmbed pubblico, e basta.
 */

export type PiattaformaConAnteprima = 'tiktok' | 'youtube'

export async function anteprima(
  url: string,
  piattaforma: PiattaformaConAnteprima
): Promise<{ titolo: string | null; miniatura: string | null; autore: string | null } | null> {
  const endpoint =
    piattaforma === 'tiktok'
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 604800 }, // 7 giorni: un video non cambia titolo
    })
    if (!res.ok) return null
    const d = await res.json()
    return {
      titolo: typeof d?.title === 'string' ? d.title : null,
      miniatura: typeof d?.thumbnail_url === 'string' ? d.thumbnail_url : null,
      autore: typeof d?.author_name === 'string' ? d.author_name : null,
    }
  } catch {
    return null
  }
}
