import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auth } from '@/auth'

/* CUCINA — la ricerca (docs/SPEC-CUCINA.md, §2).
 *
 * ZERO AI: cercare ricette è una query, non un giudizio. Le anteprime arrivano
 * dagli oEmbed pubblici di TikTok e YouTube, che non chiedono chiavi.
 * `spendAi` non c'entra: questa rotta non tocca Claude né il tetto giornaliero.
 *
 * FORNITORI, in ordine: Tavily, poi Brave (se un giorno avrà una chiave).
 * Google Custom Search è sparito il 7 agosto 2026: Google l'ha chiuso ai nuovi
 * clienti ("not available for new customers") e da lì i 403 a raffica. Il ramo
 * Brave resta perché è dieci righe e cambiare fornitore un'altra volta deve
 * costare poco — la lezione di stamattina.
 * Se non c'è nessuna chiave la sezione lo dice e il ricettario funziona uguale.
 *
 * Niente scraping e niente video incorporati: si raccolgono LINK, si mostra
 * l'anteprima che la piattaforma stessa pubblica, e il tocco porta lì. Il
 * creator si prende la sua view.
 */

// Le chip di stile: parole che l'utente aggiunge alla ricerca, nient'altro.
// (Paletto legale della spec: Keiko non giudica «fit», lo cerca e basta.)
const CHIP: Record<string, string> = {
  virale: 'virale',
  fit: 'fit proteica',
  easy: 'facile veloce pochi ingredienti',
  veloce: '15 minuti',
  veg: 'vegetariana',
}

// Dove si cerca. Tavily lo prende come lista (`include_domains`), Brave come
// operatori dentro la query: stesso posto, due grammatiche.
const SITI = ['tiktok.com', 'youtube.com']

type Risultato = {
  titolo: string
  url: string
  miniatura: string | null
  autore: string | null
  piattaforma: 'tiktok' | 'youtube' | 'web'
  dominio: string
}

/** Quel poco che serve a valle: un titolo e un link. Ogni fornitore risponde
 *  con la sua forma, qui diventano una sola. */
type Grezzo = { title?: string; url?: string }

function piattaformaDi(url: string): Risultato['piattaforma'] {
  const u = url.toLowerCase()
  if (u.includes('tiktok.com')) return 'tiktok'
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube'
  return 'web'
}

/** L'anteprima pubblica della piattaforma. Nessuna chiave, nessuno scraping.
 *  Se non risponde entro 2 secondi si tiene la card col dominio: meglio un
 *  risultato spoglio che una pagina che aspetta. */
async function anteprima(url: string, piattaforma: Risultato['piattaforma']) {
  if (piattaforma === 'web') return null
  const endpoint =
    piattaforma === 'tiktok'
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 604800 },   // 7 giorni: un video non cambia titolo
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

/* La ricerca vera, in cache 7 giorni sulla coppia (fornitore, query): la stessa
 * domanda non consuma due volte, e cambiare fornitore riparte pulito.
 *
 * Perché `unstable_cache` e non `next: { revalidate }` come per gli oEmbed:
 * Tavily vuole una POST, e la cache dei fetch di Next vale solo per le GET.
 * Senza questo, ogni ricerca ripetuta sarebbe un credito buttato.
 *
 * Se il fornitore sbaglia si LANCIA, non si torna una lista vuota: così il
 * fallimento non finisce in cache per una settimana. Chi chiama lo prende. */
const cercaGrezzi = unstable_cache(
  async (fornitore: 'tavily' | 'brave', query: string): Promise<Grezzo[]> => {
    if (fornitore === 'tavily') {
      // POST https://api.tavily.com/search — Authorization: Bearer.
      // max_results 8 per averne 6 buoni dopo gli scarti; `include_domains`
      // fa il lavoro che prima facevano gli operatori `site:`.
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, max_results: 8, include_domains: SITI }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',   // la cache è quella qui fuori, non due strati
      })
      if (!res.ok) {
        const dettaglio = (await res.text()).slice(0, 160)
        throw new Error(`Tavily ha risposto ${res.status}: ${dettaglio}`)
      }
      const d = await res.json()
      return ((d?.results ?? []) as { title?: string; url?: string }[]).map((r) => ({
        title: r.title,
        url: r.url,
      }))
    }

    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=12&country=it&search_lang=it`,
      {
        headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_KEY as string },
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      }
    )
    if (!res.ok) {
      const dettaglio = (await res.text()).slice(0, 160)
      throw new Error(`Brave ha risposto ${res.status}: ${dettaglio}`)
    }
    const d = await res.json()
    return (d?.web?.results ?? []) as Grezzo[]
  },
  ['cucina-ricerca'],
  { revalidate: 604800 }   // 7 giorni
)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120)
  const stili = (req.nextUrl.searchParams.get('stile') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => CHIP[s])

  if (!q) return NextResponse.json({ risultati: [] })

  // La domanda dell'utente + le chip + "ricetta". Il "dove cercare" NON sta
  // qui: Tavily lo vuole come lista di domini, Brave come operatori.
  const domanda = [q, ...stili.map((s) => CHIP[s]), 'ricetta'].join(' ')

  const fornitore: 'tavily' | 'brave' | null = process.env.TAVILY_API_KEY
    ? 'tavily'
    : process.env.BRAVE_SEARCH_KEY
      ? 'brave'
      : null

  // Senza nessuna chiave la sezione non si rompe: lo dice e basta, e il
  // ricettario salvato continua a funzionare (è la parte che conta di più).
  if (!fornitore) return NextResponse.json({ risultati: [], senzaChiave: true })

  const query =
    fornitore === 'brave'
      ? `${domanda} (${SITI.map((s) => `site:${s}`).join(' OR ')})`
      : domanda

  try {
    const crudi = await cercaGrezzi(fornitore, query)
    const grezzi = crudi
      .filter((r) => typeof r.url === 'string' && r.url.startsWith('http'))
      .slice(0, 6)

    // Le anteprime in parallelo: sei chiamate pubbliche, nessuna chiave.
    const risultati: Risultato[] = await Promise.all(
      grezzi.map(async (r) => {
        const url = r.url as string
        const piattaforma = piattaformaDi(url)
        const ante = await anteprima(url, piattaforma)
        return {
          titolo: (ante?.titolo || r.title || url).slice(0, 200),
          url,
          miniatura: ante?.miniatura ?? null,
          autore: ante?.autore ?? null,
          piattaforma,
          dominio: (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } })(),
        }
      })
    )

    return NextResponse.json({ risultati })
  } catch (e) {
    console.error('[cucina] ricerca fallita:', e)
    return NextResponse.json({ risultati: [], errore: 'ricerca non disponibile' }, { status: 200 })
  }
}
