import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auth } from '@/auth'
import { currentUserId } from '@/lib/user'
import { spendAi, claudeFetch, AiCapReached } from '@/lib/ai'
import { bastaCosi, ripulisciTraduzione, titoloCorto, haPassi, type Interpretazione } from '@/lib/cucina'
import { marcatoreDi, eVideo, eSocial } from '../marcatore'
import { didascaliaDi, descrizioniYouTube, idYouTube } from '../didascalia'
import { anteprima } from '../anteprima'

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

/* I DUE GIRI (15 agosto 2026, docs/PROMPT-CODE-14).
 *
 * Fino a ieri si cercava SOLO su TikTok e YouTube, e il risultato era che
 * nessuna ricetta salvata aveva i passi: misurato, 0 su 4. Il procedimento, nei
 * video, si dice a voce — e a voce resta, a qualunque prezzo.
 * Adesso i giri sono due: i video restano, perché è da lì che nasce la voglia
 * di cucinare una cosa, e accanto si cerca il web aperto, dove i blog di cucina
 * pubblicano la ricetta già scritta e già strutturata.
 *
 * ⚠️ Sono due ricerche, cioè DUE crediti Tavily invece di uno (il piano è di
 * 1.000 al mese, e la cache di 7 giorni vale per tutt'e due). Un credito in più
 * per avere il procedimento è il migliore affare di tutto questo blocco.
 */
type Dove = 'video' | 'web'

/* La ripesca giudica un testo che c'è già: «qui dentro c'è un procedimento?».
   È un compito da modello piccolo, e non decide cosa TOGLIERE — solo cosa
   rimettere dentro. Sull'estrazione, dove sbagliare vuol dire scrivere un
   passo storto, resta Sonnet. */
const MODELLO_RIPESCA = 'claude-haiku-4-5-20251001'

/* QUANDO LA RIPESCA NON SERVE (18 agosto 2026).
 *
 * Costa 0,26 centesimi a ricerca — misurato sul registro, non stimato — e
 * partiva sempre, anche quando dalla regola erano già passati quattordici
 * risultati. Ma se ce ne sono quattordici, rimetterne dentro altri due non
 * cambia niente per nessuno: la pagina ne mostra sei per volta, e in fondo a
 * quella lista non ci arriva nessuno.
 *
 * La soglia è DIECI, e viene dai numeri veri: sulle undici ricerche misurate i
 * sopravvissuti erano 8, 9, 11, 11, 11, 13, 14, 14, 14, 17, 18 — così la
 * ripesca parte su due, cioè il 18% delle volte, e il costo medio scende da
 * 0,26 a 0,05 centesimi.
 * Perché dieci e non dodici (che sarebbero due schermate piene): sotto i dieci
 * la lista è corta abbastanza che uno la guarda tutta, e la ricetta che si
 * perde è una che avrebbe visto. Sopra, no. */
const SOGLIA_RIPESCA = 10

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
  /** Il marcatore dice che ingredienti e passi sono già scritti nella pagina. */
  completa: boolean
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

/** L'anteprima pubblica della piattaforma — se non risponde entro 2 secondi si
 *  tiene la card col dominio: meglio un risultato spoglio che una pagina che
 *  aspetta. La funzione vera sta in `../anteprima.ts`: la usa anche la PARTE D
 *  del ricettario, per il link che Matteo incolla invece di cercare. */
async function anteprimaSe(url: string, piattaforma: Risultato['piattaforma']) {
  if (piattaforma === 'web') return null
  return anteprima(url, piattaforma)
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
  async (fornitore: 'tavily' | 'brave', query: string, dove: Dove = 'video'): Promise<Grezzo[]> => {
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
        // `include_domains` SOLO per il giro dei video. Il giro del web va
        // lasciato libero: appena si sceglie una lista di blog "buoni" si
        // congela la rete a quello che conoscevo io il giorno che l'ho scritta.
        body: JSON.stringify({ query, max_results: 16, ...(dove === 'video' ? { include_domains: SITI } : {}) }),
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

/* ══════════ LA RIPESCA ══════════
 *
 * `haPassi` sbaglia per difetto: butta una ricetta che i passi ce li ha ma li
 * scrive in un modo che la regola non riconosce. E un falso negativo è
 * INVISIBILE — chi cerca non sa cosa non gli è stato mostrato.
 *
 * Quindi Haiku gira SOLO sugli scarti, e può SOLO promuovere: quello che la
 * regola ha già approvato non glielo facciamo nemmeno vedere. Un modello, qui
 * dentro, non è in condizione di nascondere niente.
 *
 * In cache 7 giorni sulla lista degli indirizzi scartati: la stessa ricerca
 * rifatta non ripaga (ed è l'unico pezzo che restava a pagamento quando tutto
 * il resto veniva dalla memoria — misurato, 2,1 secondi su 2,2).
 * `spendAi` sta DENTRO la cache, come per l'interprete: il tetto giornaliero
 * si addebita solo quando la chiamata avviene per davvero.
 */
const ripescaDi = unstable_cache(
  /* ⚠️ `chi` è `string`, NON `string | null`, ed è il punto 4 del giro sui
     guasti travestiti. Se arrivasse null, `spendAi` → `risolviCtx`
     (`lib/ai.ts:134`) andrebbe a cercarsi l'utente da solo con
     `currentUserId()` → `auth()` → `headers()`, che dentro `unstable_cache`
     lancia — e il `catch` qui sotto se lo mangerebbe, esattamente come è
     successo il 18 agosto. Oggi non capita perché la rotta è protetta; col
     tipo non capita nemmeno se un domani la rotta smettesse di esserlo. */
  async (urls: string[], chi: string): Promise<{ ok: boolean; urls: string[] }> => {
    const dentro: string[] = []
    try {
      await spendAi('ripesca', { userId: chi, origine: 'utente' })
      const testi = await Promise.all(urls.map((u) => didascaliaDi(u)))
      const elenco = testi
        .map((t, i) => `[${i}] ${t.replace(/\s+/g, ' ').slice(0, 700)}`)
        .join('\n\n')
      const res = await claudeFetch(
        {
          model: MODELLO_RIPESCA,
          max_tokens: 120,
          system:
            "Ricevi didascalie di video di cucina, numerate. Per ognuna dimmi solo se contiene un PROCEDIMENTO — cioè almeno due istruzioni su come si prepara il piatto, in qualunque forma siano scritte (imperativo o infinito). Un elenco di soli ingredienti NON è un procedimento. Un indice di capitoli col minutaggio NON è un procedimento. Un articolo che RACCONTA in terza persona come si prepara un piatto NON è un procedimento. Rispondi SOLO con i numeri di quelle che ce l'hanno, separati da virgola, senza altro testo. Se nessuna ce l'ha, rispondi: nessuna",
          messages: [{ role: 'user', content: elenco.slice(0, 12000) }],
        },
        { userId: chi, origine: 'utente' },
        { operazione: 'ripesca', modello: MODELLO_RIPESCA }
      )
      if (res.ok) {
        const d = await res.json()
        const testo = (d?.content ?? [])
          .filter((b: { type?: string }) => b.type === 'text')
          .map((b: { text?: string }) => b.text ?? '')
          .join('')
        for (const n of testo.match(/\d+/g) ?? []) {
          const u = urls[Number(n)]
          if (u) dentro.push(u)
        }
      }
    } catch (e) {
      // Tetto finito o modello giù: si tengono solo quelle della regola. La
      // ricerca non fallisce mai per la ripesca — ma il fallimento ESCE DI QUI
      // (`ok: false`), perché una ripesca caduta e una ripesca che non ha
      // trovato niente sono due fatti opposti e non devono somigliarsi.
      if (!(e instanceof AiCapReached)) console.error('[cucina] ripesca fallita:', e)
      return { ok: false, urls: [] }
    }
    return { ok: true, urls: dentro }
  },
  ['cucina-ripesca'],
  { revalidate: 604800 }
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
  // Il giro del web è la stessa domanda senza il vincolo dei due siti.
  const queryWeb = domanda

  try {
    /* I TEMPI, misurati e restituiti. La ricerca è la cosa più lenta dell'app e
       ogni pezzo che le si aggiunge va pesato: senza questi numeri si
       ottimizza a naso. Non li legge la pagina, li leggo io. */
    const t0 = Date.now()
    const tempi: Record<string, number> = {}

    // I due giri partono insieme: aspettarli in fila raddoppierebbe l'attesa.
    const [crudiVideo, crudiWeb] = await Promise.all([
      cercaGrezzi(fornitore, query, 'video'),
      cercaGrezzi(fornitore, queryWeb, 'web'),
    ])

    tempi.ricerca = Date.now() - t0
    const visti = new Set<string>()
    const buoni = [...crudiVideo, ...crudiWeb].filter((r) => {
      if (typeof r.url !== 'string' || !r.url.startsWith('http')) return false
      if (visti.has(r.url)) return false      // lo stesso link può tornare da tutt'e due
      visti.add(r.url)
      return true
    })

    /* ══════════ IL FILTRO: si consegna solo quello che si cucina ══════════
     *
     * Fino a ieri tornavano tutti e la card diceva se erano completi. Ma una
     * card che dice «questa non si può cucinare» è comunque una card da
     * leggere e da scartare: è lavoro che scarichiamo addosso a chi cerca,
     * invece di farlo noi. Adesso chi non passa NON COMPARE.
     *
     * Il controllo dev'essere quello economico, e cambia col tipo:
     *  · pagina → il marcatore standard, una lettura sola (`marcatoreDi`);
     *  · video  → la didascalia, che si prende comunque, e la regola gratis
     *             `haPassi`. Niente sito del creator, niente ricerca web,
     *             niente audio: quelli sono i gradini della strada 2, dove è
     *             Matteo ad aver chiesto quella ricetta lì.
     *
     * ⚠️ Si guardano TUTTI i risultati, non i primi dodici: su 84 misurati ne
     * passa il 32%, ma guardandone solo 12 ne uscirebbero 4 — e la ricerca
     * diventerebbe povera per davvero. Tutto in parallelo, ognuno col suo
     * tetto di tempo, e tutto in cache per 7 giorni. */
    const daGuardare = buoni.filter((r) => !eSocial(r.url as string))
    const idVideoYt = daGuardare
      .map((r) => (piattaformaDi(r.url as string) === 'youtube' ? idYouTube(r.url as string) : null))
      .filter((x): x is string => !!x)
    /* Le descrizioni di YouTube in UNA chiamata sola (50 id per volta, 1 unità
       di quota su 10.000): sedici pagine da 1,1 MB diventano una richiesta
       piccola. È quello che rende sostenibile guardare tutti i risultati. */
    const descrizioni = await descrizioniYouTube(idVideoYt)

    /* ⚠️ L'ORDINE QUI SOTTO È UNA SCELTA DI TEMPO, non di logica.
       Prima le didascalie dei video (l'API di YouTube in blocco, gli oEmbed di
       TikTok: roba veloce), poi si fa PARTIRE la ripesca senza aspettarla, e
       intanto si vanno a prendere le pagine — che sono la parte lenta, fino a
       tre secondi l'una. Misurato: la ripesca costa ~2 secondi fissi, e messa
       in fila li aggiungeva tutti all'attesa; messa in parallelo con le pagine
       spariscono quasi del tutto. */
    const didascalie = new Map<string, string>()
    const video = daGuardare.filter((r) => eVideo(r.url as string))
    await Promise.all(
      video.map(async (r) => {
        const url = r.url as string
        const id = idYouTube(url)
        didascalie.set(url, (id && descrizioni[id]) || (await didascaliaDi(url)))
      })
    )

    /* ══════════ LA RIPESCA — un modello che può solo RIMETTERE DENTRO ══════════
     *
     * `haPassi` sbaglia per difetto: cinque positivi su cinque, nella taratura,
     * li ha presi la sola parola «procedimento», e una didascalia che racconta i
     * passi senza scriverla verrebbe buttata. Un falso negativo è invisibile —
     * chi cerca non sa cosa non gli è stato mostrato.
     *
     * Quindi Haiku gira SOLO sugli scarti, e può SOLO promuovere: quello che la
     * regola ha già approvato non glielo facciamo nemmeno vedere. Un modello,
     * qui dentro, non è in condizione di nascondere niente.
     * Una chiamata sola per ricerca, tutte le scartate insieme. */
    // Le pagine: la parte lenta, mentre la ripesca sta già lavorando.
    const letti = new Map<string, Awaited<ReturnType<typeof marcatoreDi>>>()
    await Promise.all(
      daGuardare
        .filter((r) => !eVideo(r.url as string))
        .map(async (r) => { letti.set(r.url as string, await marcatoreDi(r.url as string)) })
    )
    tempi.controlli = Date.now() - t0 - tempi.ricerca

    const completa = (u: string) => !!letti.get(u)?.estratta
    const passaDaSola = (u: string) => (eVideo(u) ? haPassi(didascalie.get(u) ?? '').ok : completa(u))

    /* ── LA RIPESCA, SE SERVE ──
     * La decisione si prende QUI e non prima, e costa: prima la ripesca partiva
     * insieme alle pagine e la sua attesa spariva dentro la loro. Ma per sapere
     * se serve bisogna sapere quanti sono passati, e quel numero arriva solo
     * quando le pagine hanno risposto. Meglio due secondi in più su una ricerca
     * magra su cinque, che pagare sempre una cosa che nell'80% dei casi non
     * cambia niente. */
    const dallaRegola = daGuardare.filter((r) => passaDaSola(r.url as string))
    const scartati = video.filter(
      (r) => !passaDaSola(r.url as string) && (didascalie.get(r.url as string) ?? '').length > 80
    )
    /* Chi sta cercando: si legge QUI, fuori dalla cache, e se non c'è la
       ripesca non parte proprio (vedi il commento sul tipo di `ripescaDi`). */
    const chiCerca = await currentUserId()
    const ripescaServe = dallaRegola.length < SOGLIA_RIPESCA && scartati.length > 0 && !!chiCerca
    /* ⚠️ `userId` si passa come ARGOMENTO. Dentro `unstable_cache` i cookie non
       esistono, e `currentUserId()` — che la sessione la legge da lì — fa
       cadere tutta la funzione. È scritto tre metri più su, nel commento
       dell'interprete, e l'ho rifatto lo stesso: la ripesca lanciava a ogni
       ricerca, il `catch` se lo mangiava, e usciva un onestissimo «0
       ripescati» che voleva dire «non ha mai girato». */
    const esito = ripescaServe
      ? await ripescaDi(scartati.map((r) => r.url as string).sort(), chiCerca as string)
      : { ok: true, urls: [] as string[] }
    const ripescati = new Set(esito.urls)
    tempi.ripesca = Date.now() - t0 - tempi.ricerca - tempi.controlli
    const passa = (u: string) => passaDaSola(u) || ripescati.has(u)
    const cucinabili = daGuardare.filter((r) => passa(r.url as string))
    const ordinati = [
      ...cucinabili.filter((r) => completa(r.url as string)),   // ricetta già scritta: sopra
      ...cucinabili.filter((r) => !completa(r.url as string)),  // poi i video
    ]
    const grezzi = ordinati.slice(da, da + PAGINA)

    // Le anteprime in parallelo: sei chiamate pubbliche, nessuna chiave.
    const risultati: Risultato[] = await Promise.all(
      grezzi.map(async (r) => {
        const url = r.url as string
        const piattaforma = piattaformaDi(url)
        const ante = await anteprimaSe(url, piattaforma)
        const marc = letti.get(url)
        return {
          /* ⚠️ `titoloCorto` e non `.slice(0, 200)`. Per un video il titolo
             dell'oEmbed È la didascalia intera, e tagliarla qui la tagliava
             anche per il modello: i passi stanno dopo gli ingredienti, cioè
             sempre oltre il duecentesimo carattere. Adesso qui si decide solo
             come si CHIAMA la card; la didascalia intera resta alla fonte, e
             chi estrae se la va a prendere (`didascalia.ts`). */
          titolo: titoloCorto(ante?.titolo || r.title || url),
          url,
          /* Per le pagine la foto è quella dichiarata NEL marcatore: è la stessa
             cosa che l'oEmbed fa per i video — l'immagine che la pagina pubblica
             apposta per essere mostrata altrove. */
          miniatura: ante?.miniatura ?? marc?.immagine ?? null,
          autore: ante?.autore ?? null,
          piattaforma,
          dominio: (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } })(),
          contenuto: typeof r.content === 'string' ? r.content.slice(0, 1200) : null,
          /* La card lo dice PRIMA che tu apra: «ricetta completa» quando i passi
             sono già lì da leggere. Non è una promessa, è una cosa verificata —
             questo campo è vero solo se il marcatore l'abbiamo letto davvero. */
          completa: completa(url),
        }
      })
    )

    tempi.anteprime = Date.now() - t0 - tempi.ricerca - tempi.controlli - tempi.ripesca
    tempi.tutto = Date.now() - t0

    return NextResponse.json({
      risultati,
      interpretazione,
      tempi,
      da,
      /* Ce ne sono altre già pagate da mostrare? Se no, la pagina passa da
       * «Mostrane altre» a «Cerca ancora», che è un credito vero. */
      altrePronte: ordinati.length > da + PAGINA,
      totale: ordinati.length,
      /* I conti del filtro, che servono a Matteo e non alla pagina: quanti ne
         ha scartati, e quanti ne ha rimessi dentro la ripesca. Il secondo è il
         numero che dice quanto spesso la sola parola «procedimento» sbaglia —
         senza registrarlo non lo sapremmo mai. */
      esaminati: daGuardare.length,
      scartati: daGuardare.length - ordinati.length,
      /* ⚠️ «NON PARTITA» NON È «ZERO RIPESCATI», e la differenza non è
         formale: `ripescati: 0` vuol dire «Haiku ha guardato gli scarti e non
         ha trovato niente da salvare», cioè la regola aveva ragione. Se
         scrivessimo zero anche quando la ripesca non è partita, fra un mese
         quel numero direbbe che la regola sbaglia molto meno di quanto sbaglia
         davvero — e misurarlo è tutto il motivo per cui la ripesca esiste. */
      ripesca: !ripescaServe
        ? { partita: false, perche: scartati.length === 0 ? 'nessuno scarto da guardare' : `già passati in ${dallaRegola.length}` }
        : esito.ok
          ? { partita: true, ripescati: ripescati.size, esaminate: scartati.length }
          : { partita: true, caduta: true, esaminate: scartati.length },
    })
  } catch (e) {
    /* ⚠️ QUI NON SI RISPONDE 200 CON UNA LISTA VUOTA.
     *
     * Prima sì: `{ risultati: [], errore: 'ricerca non disponibile' }` con
     * stato 200, e `errore` non lo leggeva nessuno (zero occorrenze nella
     * vista). Da fuori era indistinguibile da «non esiste nessuna ricetta», e
     * col filtro nuovo la schermata arrivava a scrivere «di questa non ho
     * trovato nessuna versione con il procedimento» — cioè Keiko affermava una
     * cosa sul mondo mentre in realtà era Tavily a essere giù. Una regressione
     * nostra, di questa settimana.
     *
     * Adesso: 503, e `guasto: true` in un campo che la vista guarda per primo.
     * Lo stato vuoto e il guasto sono due schermate diverse. */
    console.error('[cucina] ricerca fallita:', e)
    return NextResponse.json(
      { guasto: true, risultati: [], interpretazione, dettaglio: String(e).slice(0, 200) },
      { status: 503 }
    )
  }
}
