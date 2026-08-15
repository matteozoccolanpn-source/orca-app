import { unstable_cache } from 'next/cache'
import { leggiPaginaRicetta } from '@/lib/cucina'
import type { RicettaEstratta } from '@/lib/supabase'

/* IL MARCATORE STANDARD — andare a prendere la pagina e leggerla.
 *
 * La lettura vera sta in `lib/cucina.ts` ed è una funzione pura (HTML dentro,
 * campi fuori). Qui c'è solo la parte che tocca la rete: prendere la pagina,
 * non aspettarla troppo, e ricordarsi il risultato.
 *
 * PERCHÉ ESISTE (docs/PROMPT-CODE-14). Un blog di cucina pubblica ingredienti e
 * passi già strutturati, per farli mostrare a Google. Leggerli non costa niente
 * e non passa da nessun modello: la ricetta arriva completa, e «Cucina con
 * Keiko» ha finalmente dei passi da mostrare. Un video quei passi non li dà a
 * nessun prezzo — li dice a voce, e restano nel video.
 *
 * TRE PALETTI, e sono quelli che tengono onesta questa strada:
 *  1. si legge SOLO il marcatore dichiarato (`application/ld+json`). Nessuno
 *     scraping del testo della pagina: se l'autore non ha dichiarato la
 *     ricetta, per noi non c'è;
 *  2. tre secondi e poi si lascia perdere. Questa lettura sta dentro una
 *     ricerca che l'utente sta aspettando: una pagina lenta non deve rallentare
 *     tutte le altre, e chi non risponde in tempo semplicemente non risulta
 *     completo;
 *  3. si ricorda per sette giorni, ANCHE il «niente». Senza, ogni scorrimento
 *     dei risultati riscaricherebbe le stesse dieci pagine — e una ricetta
 *     aperta due volte le riscaricherebbe due volte.
 */

/** Le piattaforme dove la ricetta sta nel parlato, non nel testo. */
export function eVideo(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes('tiktok.com') || u.includes('youtube.com') || u.includes('youtu.be') || u.includes('instagram.com')
}

/** I posti che non sono pagine di ricetta e non hanno mai un marcatore: nei
 *  risultati ci finiscono sempre, e andarli a prendere è tempo buttato. */
export function eSocial(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes('facebook.com') || u.includes('pinterest.') || u.includes('x.com/') || u.includes('reddit.com')
}

export type Marcatore = { estratta: RicettaEstratta | null; immagine: string | null }
const VUOTO: Marcatore = { estratta: null, immagine: null }

/* Un'intestazione da browser vero. Non è per travestirsi: parecchi siti
   rispondono 403 a chi non manda niente, e questa pagina la stiamo aprendo
   perché l'utente ha appena chiesto di vederla. */
const COME_UN_BROWSER = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'it-IT,it;q=0.9',
}

export const marcatoreDi = unstable_cache(
  async (url: string): Promise<Marcatore> => {
    if (!url.startsWith('http') || eVideo(url) || eSocial(url)) return VUOTO
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(3000),
        headers: COME_UN_BROWSER,
        cache: 'no-store', // la memoria è questa qui fuori, non due strati
      })
      if (!res.ok) return VUOTO
      // Solo pagine: un PDF o un'immagine non hanno JSON-LD e leggerli intero
      // vorrebbe dire tirare giù megabyte per niente.
      if (!(res.headers.get('content-type') ?? '').includes('text/html')) return VUOTO
      const html = (await res.text()).slice(0, 800_000)
      return leggiPaginaRicetta(html)
    } catch {
      // Scaduto, DNS storto, 403: non è un errore da mostrare. La ricetta
      // semplicemente non risulta completa, e si continua come sempre.
      return VUOTO
    }
  },
  ['cucina-marcatore'],
  { revalidate: 604800 } // 7 giorni
)
