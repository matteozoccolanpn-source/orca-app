import { unstable_cache } from 'next/cache'

/* LA DIDASCALIA INTERA, presa alla fonte (docs/SPEC-RICETTARIO.md, gradino ①).
 *
 * PERCHÉ ESISTE. Fino al 16 agosto 2026 il testo che arrivava al modello era il
 * titolo del risultato di ricerca, tagliato a 200 caratteri. Per un video il
 * titolo È la didascalia, e i passi — quando ci sono — stanno dopo l'elenco
 * degli ingredienti, cioè oltre il taglio. Misurato: con la didascalia intera
 * 5 video su 8 hanno i passi; con quella tagliata, zero.
 *
 * Adesso la didascalia se la va a prendere CHI ESTRAE, dalla fonte, invece di
 * fidarsi di quello che gli è stato passato. Così la riparazione vale per tutte
 * le strade insieme: la ricerca, il ricettario, il link aperto da fuori.
 *
 * DUE FONTI, tutt'e due pubbliche e senza chiavi:
 *  · TikTok  → l'oEmbed ufficiale, che restituisce la didascalia intera nel
 *    campo `title`. È l'UNICA superficie pubblica rimasta: la pagina del video
 *    servita a un server è il muro del login (misurato).
 *  · YouTube → `shortDescription` dentro la pagina del video, che è la
 *    descrizione completa. L'oEmbed di YouTube dà solo il titolo del video, che
 *    per una ricetta non basta mai.
 *
 * Si ricorda per sette giorni: una didascalia non cambia, e una ricetta aperta
 * due volte non deve ripescare niente.
 */

const COME_UN_BROWSER = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Accept-Language': 'it-IT,it;q=0.9',
}

export function piattaformaDelLink(url: string): 'tiktok' | 'youtube' | 'web' {
  const u = url.toLowerCase()
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  return 'web'
}

/** L'id di un video di YouTube, da qualunque forma di indirizzo. */
export function idYouTube(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
    const v = u.searchParams.get('v')
    if (v) return v
    const m = u.pathname.match(/\/(?:shorts|embed|v)\/([^/?]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/* La chiave dell'API di YouTube. Oggi è la stessa che era nata per Custom
   Search — Google l'ha chiuso ai nuovi clienti e quella chiave è stata
   riabilitata sulla YouTube Data API — ma il nome giusto ha la precedenza, così
   il giorno che diventano due chiavi separate qui non si tocca niente. */
const chiaveYouTube = () => process.env.YOUTUBE_API_KEY || process.env.GOOGLE_CSE_KEY || ''

/** Le descrizioni di più video YouTube IN UNA CHIAMATA SOLA.
 *
 *  `videos.list` accetta fino a 50 id per volta e costa **1 unità** su 10.000
 *  al giorno: sedici risultati di una ricerca si guardano con un'unità, invece
 *  di sedici pagine da 1,1 MB l'una. È la differenza fra un filtro che si può
 *  tenere acceso e uno che no.
 *
 *  Torna una mappa id → descrizione. Vuota se la chiave manca o l'API risponde
 *  male: chi chiama ripiega sulla pagina, che funziona lo stesso. */
export const descrizioniYouTube = unstable_cache(
  async (ids: string[]): Promise<Record<string, string>> => {
    const chiave = chiaveYouTube()
    if (!chiave || ids.length === 0) return {}
    try {
      const p = new URLSearchParams({ part: 'snippet', id: ids.slice(0, 50).join(','), key: chiave })
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${p}`, {
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      if (!res.ok) return {}
      const d = (await res.json()) as { items?: { id: string; snippet?: { title?: string; description?: string } }[] }
      const per: Record<string, string> = {}
      for (const it of d.items ?? []) {
        per[it.id] = [it.snippet?.title, it.snippet?.description].filter(Boolean).join('\n\n')
      }
      return per
    } catch {
      return {}
    }
  },
  ['cucina-descrizioni-youtube'],
  { revalidate: 604800 }
)

export const didascaliaDi = unstable_cache(
  async (url: string): Promise<string> => {
    const dove = piattaformaDelLink(url)
    try {
      if (dove === 'tiktok') {
        const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(6000),
          cache: 'no-store',
        })
        if (!res.ok) return ''
        const d = await res.json()
        return typeof d?.title === 'string' ? d.title : ''
      }
      if (dove === 'youtube') {
        /* Prima l'API ufficiale: una richiesta piccola invece di una pagina da
           un megabyte, e la stessa descrizione. Se la chiave non c'è o l'API
           dice di no, si legge la pagina come prima. */
        const id = idYouTube(url)
        if (id) {
          const dalleApi = (await descrizioniYouTube([id]))[id]
          if (dalleApi) return dalleApi
        }
        const res = await fetch(url, { headers: COME_UN_BROWSER, signal: AbortSignal.timeout(8000), cache: 'no-store' })
        if (!res.ok) return ''
        const html = await res.text()
        /* `ytInitialPlayerResponse` è il blocco che la pagina si porta dietro
           per il suo player: dentro c'è `videoDetails.shortDescription`, cioè
           la descrizione per esteso. Non è scraping del testo della pagina — è
           un campo dichiarato, lo stesso che l'oEmbed espone monco. */
        // `[\s\S]` e non il flag `s`: il target di questo progetto è sotto
        // es2018 e quel flag non compila.
        const m = html.match(/var ytInitialPlayerResponse = (\{[\s\S]+?\});/)
        if (!m) return ''
        const vd = (JSON.parse(m[1]) as { videoDetails?: { title?: string; shortDescription?: string } }).videoDetails
        return [vd?.title, vd?.shortDescription].filter(Boolean).join('\n\n')
      }
      return ''
    } catch {
      // Fonte muta: chi chiama si tiene quello che ha già. Mai un errore in
      // faccia per una didascalia.
      return ''
    }
  },
  ['cucina-didascalia'],
  { revalidate: 604800 } // 7 giorni
)
