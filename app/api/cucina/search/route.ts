import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auth } from '@/auth'
import { currentUserId } from '@/lib/user'
import { spendAi, claudeFetch, AiCapReached } from '@/lib/ai'
import { bastaCosi, ripulisciTraduzione, type Interpretazione } from '@/lib/cucina'

/* CUCINA — la ricerca (docs/SPEC-CUCINA.md, §2).
 *
 * LA RICERCA È GRATIS, L'INTERPRETE QUASI. Cercare ricette resta una query e
 * non un giudizio: Tavily costa 1 credito e le anteprime arrivano dagli oEmbed
 * pubblici di TikTok e YouTube, che non chiedono chiavi.
 * L'unica parte che tocca Claude è l'INTERPRETE, e solo quando la domanda
 * descrive una situazione invece di un cibo: «pollo e patate» non lo sveglia
 * nemmeno. Peso `interprete: 1`, cache 7 giorni, e se fallisce si cerca la
 * frase così com'è. Il tetto giornaliero non si accorge di questa sezione.
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
  /* L'estratto di pagina che Tavily restituisce insieme al link. Non si mostra
   * mai: serve all'estrazione della ricetta (V2), che lo unisce alla caption
   * per avere qualcosa da leggere. Gratis — è già dentro la risposta che
   * abbiamo pagato, e non chiederlo vorrebbe dire fare una seconda chiamata. */
  contenuto: string | null
}

/** Quel poco che serve a valle: un titolo e un link. Ogni fornitore risponde
 *  con la sua forma, qui diventano una sola. */
type Grezzo = { title?: string; url?: string; content?: string }

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
      // max_results 16 e non 6: UNA ricerca costa 1 credito che ne torni sei o
      // sedici, quindi si prende tutto e si paga una volta. La pagina ne mostra
      // sei per volta e "Mostrane altre" pesca dalle già pagate, senza
      // ritoccare la rete. `include_domains` fa il lavoro che prima facevano
      // gli operatori `site:`.
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, max_results: 16, include_domains: SITI }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',   // la cache è quella qui fuori, non due strati
      })
      if (!res.ok) {
        const dettaglio = (await res.text()).slice(0, 160)
        throw new Error(`Tavily ha risposto ${res.status}: ${dettaglio}`)
      }
      const d = await res.json()
      return ((d?.results ?? []) as { title?: string; url?: string; content?: string }[]).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
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

/* L'INTERPRETE (docs/SPEC-CUCINA.md §2, rivisto).
 *
 * «serata tra amici per la partita» non è una ricerca: è una situazione.
 * Tavily cercherebbe quelle parole e tornerebbe con niente di commestibile.
 * Una chiamata sola a Haiku, 80 token, nessuno strumento: frase → parole.
 *
 * Tre difese, perché questa è la SOLA parte a pagamento della ricerca:
 *  1. l'euristica di `bastaCosi` la salta del tutto quando la domanda è già
 *     fatta di cibo — «pollo e patate» non arriva mai qui;
 *  2. la cache di 7 giorni: la stessa frase si traduce una volta;
 *  3. `ripulisciTraduzione` butta le risposte assurde, e allora si cerca la
 *     frase originale. Una ricerca meno furba, mai un errore in faccia.
 *
 * userId sta negli ARGOMENTI e non si legge dalla sessione: dentro una cache
 * di Next i cookie non esistono. In cambio la cache è per persona — e il tetto
 * giornaliero si addebita solo quando la chiamata avviene davvero, perché a
 * cache piena questo corpo non gira proprio.
 */
const traduci = unstable_cache(
  async (domanda: string, userId: string | null): Promise<string | null> => {
    await spendAi('interprete', { userId, origine: 'utente' })
    const res = await claudeFetch(
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        system:
          "Sei il traduttore di Keiko fra una situazione e la cucina. Ricevi una frase che descrive un'occasione (\"serata tra amici per la partita\", \"cena romantica\", \"pranzo veloce in ufficio\") e rispondi SOLO con 3-5 parole italiane da mettere in un motore di ricerca di ricette: piatti o categorie di cibo, separate da spazi. Niente frasi, niente spiegazioni, niente punteggiatura, nessun a capo. Esempi: \"serata tra amici per la partita\" -> \"panini sfiziosi stuzzichini finger food\"; \"cena romantica\" -> \"primi piatti eleganti pesce\"; \"pranzo veloce ufficio\" -> \"insalate fredde bowl schiscetta\".",
        messages: [{ role: 'user', content: domanda }],
      },
      { userId, origine: 'utente' },
      { operazione: 'interprete', modello: 'claude-haiku-4-5-20251001' }
    )
    if (!res.ok) return null
    const d = await res.json()
    const testo = (d?.content ?? [])
      .filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
    return ripulisciTraduzione(testo, domanda)
  },
  ['cucina-interprete'],
  { revalidate: 604800 }   // 7 giorni
)

/** Cosa si cerca davvero, e perché. Non lancia MAI: qualunque cosa vada storta
 *  si ripiega sulla domanda così com'è. */
async function interpreta(domanda: string, userId: string | null): Promise<Interpretazione> {
  if (bastaCosi(domanda)) return { originale: domanda, cercato: domanda, viaAi: false }
  try {
    const tradotto = await traduci(domanda, userId)
    if (!tradotto) return { originale: domanda, cercato: domanda, viaAi: false }
    return { originale: domanda, cercato: tradotto, viaAi: true }
  } catch (e) {
    // Tetto giornaliero finito, o modello giù: la ricerca continua lo stesso.
    if (!(e instanceof AiCapReached)) console.error('[cucina] interprete fallito:', e)
    return { originale: domanda, cercato: domanda, viaAi: false }
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 120)
  const stili = (req.nextUrl.searchParams.get('stile') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => CHIP[s])

  if (!q) return NextResponse.json({ risultati: [] })

  /* LA FINESTRA. `da` è da quale risultato partire, e se ne mandano sempre 6.
   * I sedici che Tavily ha dato stanno già in cache: scorrere non ricerca, e
   * soprattutto NON risolve gli oEmbed di quelli che non si vedono — sei
   * chiamate per volta, non sedici, e solo quando servono davvero. */
  const PAGINA = 6
  const da = Math.max(0, Math.min(60, Number(req.nextUrl.searchParams.get('da') ?? 0) || 0))
  /* «Cerca ancora»: la stessa domanda, girata di poco. Cambia la chiave di
   * cache, quindi è una ricerca nuova e un credito nuovo — l'unico punto di
   * questa rotta in cui si spende di proposito. */
  const ancora = req.nextUrl.searchParams.get('ancora') === '1'

  // Prima si capisce COSA ha chiesto, poi si cerca. Le chip non passano di
  // qui: sono già parole di ricerca scelte a mano, non c'è niente da tradurre.
  const interpretazione = await interpreta(q, await currentUserId())

  // Quel che ha capito + le chip + "ricetta". Il "dove cercare" NON sta qui:
  // Tavily lo vuole come lista di domini, Brave come operatori.
  const domanda = [
    interpretazione.cercato,
    ...stili.map((s) => CHIP[s]),
    'ricetta',
    ...(ancora ? ['idee alternative'] : []),
  ].join(' ')

  const fornitore: 'tavily' | 'brave' | null = process.env.TAVILY_API_KEY
    ? 'tavily'
    : process.env.BRAVE_SEARCH_KEY
      ? 'brave'
      : null

  // Senza nessuna chiave la sezione non si rompe: lo dice e basta, e il
  // ricettario salvato continua a funzionare (è la parte che conta di più).
  if (!fornitore) return NextResponse.json({ risultati: [], senzaChiave: true, interpretazione })

  const query =
    fornitore === 'brave'
      ? `${domanda} (${SITI.map((s) => `site:${s}`).join(' OR ')})`
      : domanda

  try {
    const crudi = await cercaGrezzi(fornitore, query)
    const buoni = crudi.filter((r) => typeof r.url === 'string' && r.url.startsWith('http'))
    const grezzi = buoni.slice(da, da + PAGINA)

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
          contenuto: typeof r.content === 'string' ? r.content.slice(0, 1200) : null,
        }
      })
    )

    return NextResponse.json({
      risultati,
      interpretazione,
      da,
      /* Ce ne sono altre già pagate da mostrare? Se no, la pagina passa da
       * «Mostrane altre» a «Cerca ancora», che è un credito vero. */
      altrePronte: buoni.length > da + PAGINA,
      totale: buoni.length,
    })
  } catch (e) {
    console.error('[cucina] ricerca fallita:', e)
    return NextResponse.json({ risultati: [], errore: 'ricerca non disponibile', interpretazione }, { status: 200 })
  }
}
