import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { spendAi, claudeFetch, AiCapReached, AI_CAP_MESSAGE } from '@/lib/ai'
import { getRecipes, saveExtracted, type RicettaEstratta } from '@/lib/supabase'
import { marcatoreDi, eVideo, eSocial, type Marcatore } from '../marcatore'
import { didascaliaDi } from '../didascalia'
import { linkDaDidascalia, haPassi, nomeCombacia, creatorCoincide, puntiIngredienti, titoloCorto } from '@/lib/cucina'

/* CUCINA V2 — l'estrazione della ricetta (docs/SPEC-CUCINA.md §4).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA REGOLA FERREA: SI ESTRAE SOLO QUELLO CHE C'È SCRITTO.
 *
 * Il modello legge la descrizione che il creator ha pubblicato e la mette in
 * ordine. Non completa, non converte, non "aggiusta". Se la caption dice
 * «pane, porchetta, provola» senza quantità, le quantità restano vuote — e
 * una ricetta con gli ingredienti senza dosi è una ricetta onesta, mentre una
 * con dosi inventate è un danno: qualcuno le userebbe.
 * Se non c'è abbastanza per una ricetta vera, la risposta giusta è
 * `insufficiente: true`, e il foglio dice «la ricetta completa è nel video».
 * ────────────────────────────────────────────────────────────────────────────
 *
 * COSTO: una chiamata sola, peso `estrazione: 1`, UNA VOLTA per ricetta nella
 * vita — il risultato finisce in `recipes.extracted` e da lì in poi aprirla è
 * gratis. Le ricette non salvate si estraggono senza salvare: si paga solo se
 * si guarda, e chi guarda due volte la stessa senza salvarla paga due volte.
 * È il motivo per cui il foglio invita a salvare.
 *
 * Niente calorie, niente valori nutrizionali, nessun riferimento al piano
 * alimentare: il prompt lo vieta e il filtro qui sotto li butterebbe comunque.
 */

const MODELLO = 'claude-sonnet-4-5'

const SISTEMA = `Sei un trascrittore di ricette per Keiko. Ricevi il testo che l'autore di un video di cucina ha pubblicato (didascalia e/o descrizione) e lo metti in ordine.

REGOLA ASSOLUTA: trascrivi SOLO quello che è scritto nel testo. Non aggiungere ingredienti, non dedurre quantità, non completare passaggi mancanti con la tua conoscenza di cucina. Se una quantità non è scritta, lascia il campo vuoto. Meglio una ricetta incompleta che una inventata.

Rispondi SOLO con un oggetto JSON, senza testo intorno e senza blocchi di codice. Due forme possibili.

Se il testo contiene almeno tre ingredienti oppure almeno due passaggi di preparazione:
{"ingredienti":[{"nome":"pane ciabatta","quantita":"4"},{"nome":"porchetta","quantita":"300 g"}],"passi":["Taglia la ciabatta e scaldala 3 minuti a 200°.","..."],"tempo":"20 min","porzioni":"4 persone"}

Se il testo è troppo povero (solo hashtag, solo un titolo, solo emoji, o niente di riconoscibile):
{"insufficiente":true}

Dettagli:
- "quantita" va omessa o lasciata "" quando non è scritta. Non convertire le unità.
- "tempo" e "porzioni" solo se scritti, altrimenti null.
- OMETTI i campi vuoti invece di scriverli vuoti: meno scrivi, meglio è. Nessuna frase prima o dopo il JSON.
- I passi sono frasi brevi, nell'ordine in cui li racconta l'autore, in italiano.
- Un elenco di capitoli col minutaggio ("00:45 – STESURA FROLLA", "1:20 cottura") NON sono passi: sono le tappe del video, e come istruzioni non dicono niente. Se il testo ha solo quelli, i passi sono vuoti.
- NON scrivere mai calorie, macronutrienti, valori nutrizionali o giudizi sulla salute, nemmeno se il testo li contiene: quei campi non esistono.`

/** Il filtro sulla risposta del modello. Meglio dichiarare "insufficiente" che
 *  far passare una struttura storta: a valle c'è una persona che compra la
 *  spesa in base a questo. */
function ripulisci(grezzo: string): RicettaEstratta {
  let t = (grezzo ?? '').trim()
  // Il modello a volte incarta il JSON in un blocco di codice, nonostante il
  // divieto. Si toglie l'involucro invece di buttare una risposta buona.
  const blocco = t.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (blocco) t = blocco[1].trim()
  const inizio = t.indexOf('{')
  const fine = t.lastIndexOf('}')
  if (inizio === -1 || fine <= inizio) return { insufficiente: true }

  let d: unknown
  try {
    d = JSON.parse(t.slice(inizio, fine + 1))
  } catch {
    return { insufficiente: true }
  }
  const o = d as Record<string, unknown>
  if (o?.insufficiente === true) return { insufficiente: true }

  const ingredienti = (Array.isArray(o?.ingredienti) ? o.ingredienti : [])
    .map((x) => {
      const i = x as Record<string, unknown>
      return {
        nome: String(i?.nome ?? '').trim().slice(0, 120),
        quantita: String(i?.quantita ?? '').trim().slice(0, 60),
      }
    })
    .filter((i) => i.nome.length > 0)
    .slice(0, 40)

  const passi = (Array.isArray(o?.passi) ? o.passi : [])
    .map((p) => String(p ?? '').trim().slice(0, 400))
    .filter((p) => p.length > 0)
    .slice(0, 30)

  // La soglia della spec: sotto questa non è una ricetta, è un titolo.
  if (ingredienti.length < 3 && passi.length < 2) return { insufficiente: true }

  const testo = (v: unknown) => {
    const s = String(v ?? '').trim().slice(0, 40)
    return s && s !== 'null' && s !== 'undefined' ? s : null
  }
  return { ingredienti, passi, tempo: testo(o?.tempo), porzioni: testo(o?.porzioni) }
}

/* ── PARTE C: L'ESITO DI UNA PAGINA CANDIDATA, IN TRE FORME ──
 *
 * 'trovata'  → il nome combacia (e, per ④, anche il creator): si usa.
 * 'scartata' → una pagina rispondeva ed era una ricetta vera, ma il nome NON
 *              combacia. NON si butta via in silenzio (regola della PARTE C):
 *              chi ha scelto il video si merita di sapere che una pagina
 *              c'era e perché non è stata usata, non solo «non trovato».
 * 'niente'   → nessuna pagina ha risposto con un marcatore leggibile.
 * Le due strade (①bis, ④) tornano la stessa forma, così la POST le tratta
 * allo stesso modo. */
type EsitoCandidata =
  | { esito: 'trovata'; estratta: RicettaEstratta; fonte: string }
  | { esito: 'scartata'; fonte: string; nomeTrovato: string }
  | { esito: 'niente' }

/** Fra le pagine che rispondono con un marcatore, quella che vince: fra chi
 *  passa il cancello del nome, la più alta negli ingredienti (che qui ordina
 *  soltanto, non boccia — vedi `puntiIngredienti`); se nessuna passa, si
 *  riporta la migliore comunque, per poterla mostrare come scartata. */
function scegliCandidata(
  letti: { u: string; m: Marcatore }[],
  titoloVideo: string,
  creator: string | null,
  severo: boolean
): EsitoCandidata {
  const trovate = letti.filter((l): l is { u: string; m: Marcatore & { estratta: RicettaEstratta } } => !!l.m.estratta)
  if (trovate.length === 0) return { esito: 'niente' }

  const giudicate = trovate.map(({ u, m }) => {
    const nome = nomeCombacia(m.nome ?? '', titoloVideo, creator)
    // ④ è più severo di ①bis: lì la pagina la troviamo noi, quindi oltre al
    // piatto deve combaciare anche chi l'ha scritta (docs/SPEC-RICETTARIO.md).
    const ok = severo ? nome.ok && creatorCoincide(creator, m.autore, u) : nome.ok
    return { u, m, ok, punti: puntiIngredienti((m.estratta.ingredienti ?? []).map((i) => i.nome), titoloVideo) }
  })
  giudicate.sort((a, b) => b.punti - a.punti)

  const buona = giudicate.find((g) => g.ok)
  if (buona) return { esito: 'trovata', estratta: { ...buona.m.estratta, fonte: buona.u }, fonte: buona.u }
  return { esito: 'scartata', fonte: giudicate[0].u, nomeTrovato: giudicate[0].m.nome ?? '' }
}

/* ── ①bis: LA RICETTA SCRITTA, LINKATA DALLA DIDASCALIA ──
 *
 * «★ INGREDIENTI, DOSI e PROCEDIMENTO: https://ricette.giallozafferano.it/…».
 * Quel link sta in un testo che leggiamo già per intero e gratis, e la pagina
 * dall'altra parte quasi sempre ha il marcatore: i passi arrivano scritti
 * dall'autore, senza chiamare nessun modello.
 *
 * Gli indirizzi si provano TUTTI INSIEME e non uno dopo l'altro: sono al
 * massimo tre, ognuno ha tre secondi di pazienza (`marcatoreDi`), e in fila
 * indiana sarebbero nove secondi di attesa dentro un foglio che sta aprendosi.
 * L'ordine di `linkDaDidascalia` non decide più da solo chi vince: decide chi
 * si prova, poi il cancello della PARTE C decide chi si usa. */
async function ricettaDaiLink(didascalia: string, titoloVideo: string, creator: string | null): Promise<EsitoCandidata> {
  const link = linkDaDidascalia(didascalia)
  if (link.length === 0) return { esito: 'niente' }
  const letti = await Promise.all(link.map(async (u) => ({ u, m: await marcatoreDi(u) })))
  return scegliCandidata(letti, titoloVideo, creator, false)
}

/* ── ④: LA RICERCA SUL WEB, PER QUESTO VIDEO PRECISO ──
 *
 * Quando né la didascalia (①) né un suo link (①bis) bastano, si cerca la
 * versione scritta di QUESTO video — titolo più creator, un giro di Tavily
 * solo, cinque risultati al massimo. È l'ultimo gradino prima di «scrivi tu i
 * passi» (PARTE F), quindi vale la pena provarci anche se costa una ricerca:
 * succede una volta per ricetta, mai in automatico su una lista.
 *
 * ⚠️ SEVERO: qui la pagina la troviamo noi, può essere di chiunque cucini lo
 * stesso piatto — quindi `scegliCandidata` chiede ANCHE che il creator
 * coincida (vedi `creatorCoincide`), non solo il nome del piatto. */
async function ricettaDalWeb(titoloVideo: string, creator: string | null): Promise<EsitoCandidata> {
  const chiave = process.env.TAVILY_API_KEY
  /* Non basta `titoloCorto`: taglia dove la didascalia cambia discorso, ma
   * qui il discorso non cambia — è UNA frase con la coda pubblicitaria
   * attaccata senza spazio («…Basmati profumato.Una ricetta gustosa e super
   * economica»). Misurato: la query con la coda trova solo altri video dello
   * stesso titolo; tolta la coda (primo «.», «!» o «?») trova pagine vere.
   * È un taglio più aggressivo di `titoloCorto`, e resta qui: serve solo a
   * questa ricerca, non a un titolo da mostrare. */
  const testo = titoloCorto(titoloVideo, 70).split(/[.!?]/)[0].trim()
  if (!chiave || !testo) return { esito: 'niente' }
  /* Il creator entra nella query solo per SPINGERE la ricerca verso la pagina
   * giusta, non per restringerla: un canale YouTube spesso ha il nome intero
   * dell'autore attaccato al brand («Cristina Camorani Conventello House &
   * Aut») e infilarlo per intero diluisce la query fino a non trovare più
   * niente — misurato: con il nome intero la stessa ricerca che con "Cristina"
   * trovava la pagina di GialloZafferano non trova più nulla. Le prime due
   * parole bastano a dare il verso senza affogare il titolo del piatto; il
   * cancello vero sul creator resta `creatorCoincide`, dopo — e quello legge
   * il nome per intero, questa riga taglia SOLO la stringa della ricerca.
   * Anche una parola sola basta a dare il verso: due volte su due, nei casi
   * veri, la seconda parola («Camorani», «Atipica») era quella che confondeva
   * Tavily fino a fargli perdere la pagina giusta. */
  const creatorBreve = creator?.trim().split(/\s+/)[0] || null
  let indirizzi: string[] = []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chiave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: [testo, creatorBreve, 'ricetta'].filter(Boolean).join(' '), max_results: 5 }),
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return { esito: 'niente' }
    const d = (await res.json()) as { results?: { url?: string }[] }
    indirizzi = (d.results ?? [])
      .map((r) => String(r.url ?? ''))
      .filter((u) => u.startsWith('http') && !eVideo(u) && !eSocial(u))
      .slice(0, 5)
  } catch {
    return { esito: 'niente' }   // Tavily giù o lento: non è un errore da mostrare, ④ semplicemente non risulta
  }
  if (indirizzi.length === 0) return { esito: 'niente' }
  const letti = await Promise.all(indirizzi.map(async (u) => ({ u, m: await marcatoreDi(u) })))
  return scegliCandidata(letti, titoloVideo, creator, true)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    id?: string
    url?: string
    titolo?: string
    contenuto?: string
    autore?: string
  }
  const url = (body.url ?? '').trim()
  if (!url.startsWith('http')) return NextResponse.json({ error: 'Serve un link' }, { status: 400 })
  const creator = (body.autore ?? '').trim() || null

  /* PARTE C, «quando non combacia, Keiko lo dice»: se ①bis o ④ trovano una
   * pagina vera ma il nome non combacia, non sparisce in silenzio. Si porta
   * dietro l'ULTIMA scartata (di solito la più esaustiva, perché ④ viene
   * dopo) fino alla risposta finale. */
  let paginaScartata: { fonte: string; nomeTrovato: string } | null = null
  const registraScarto = (e: EsitoCandidata) => {
    if (e.esito === 'scartata') paginaScartata = { fonte: e.fonte, nomeTrovato: e.nomeTrovato }
  }
  const risultatoVuoto = () =>
    NextResponse.json({ estratta: { insufficiente: true } as RicettaEstratta, ...(paginaScartata ? { paginaScartata } : {}) })

  /* GIÀ ESTRATTA? Allora è finita qui, senza toccare il modello. È il motivo
   * per cui questa rotta si può chiamare a ogni apertura del foglio senza
   * pensarci: la seconda volta non costa niente. */
  let ricettaId = (body.id ?? '').trim() || null
  if (ricettaId) {
    // ⚠️ GUASTO NON GESTITO (giro finale): se la lettura è caduta, `salvate` è null e qui
    // si finisce nel ramo «non è sua», cioè si estrae senza salvare. Il
    // comportamento è quello di prima; adesso però il guasto si può distinguere.
    const salvate = await getRecipes()
    const mia = (salvate ?? []).find((r) => r.id === ricettaId)
    if (!mia) ricettaId = null                       // non è sua, o non c'è più
    else if (mia.extracted) return NextResponse.json({ estratta: mia.extracted, daCache: true })
  }

  /* ── PRIMA IL MARCATORE, POI IL MODELLO (docs/PROMPT-CODE-14, parte 1) ──
   *
   * Se l'indirizzo è una pagina, quasi sempre la ricetta è già scritta lì
   * dentro in `schema.org/Recipe`: ingredienti, passi, tempo e porzioni, messi
   * dall'autore perché si vedano. Leggerli costa una richiesta HTTP e ZERO
   * modelli — e sono i passi veri di chi l'ha scritta, non una ricostruzione.
   * Misurato il 15 agosto: 6 pagine su 11 di una ricerca vera ce l'hanno.
   *
   * La lettura è già in cache dalla ricerca (`marcatoreDi`, 7 giorni): per una
   * ricetta arrivata dai risultati questo pezzo non tocca nemmeno la rete.
   * Se il marcatore non c'è o è povero si prosegue come sempre. */
  if (!eVideo(url)) {
    const { estratta } = await marcatoreDi(url)
    if (estratta) {
      // La fonte è la pagina stessa: si scrive lo stesso, così la riga sotto ai
      // passi dice la verità anche fra un mese (vedi `RicettaEstratta.fonte`).
      const conFonte = { ...estratta, fonte: url }
      if (ricettaId) await saveExtracted(ricettaId, conFonte)
      return NextResponse.json({ estratta: conFonte, daMarcatore: true })
    }
  }

  /* ── IL TESTO DA LEGGERE ──
   *
   * ⚠️ La didascalia si va a PRENDERE ALLA FONTE, non si usa quella che è
   * arrivata dal client. Quella è il titolo di una card, e un titolo è tagliato
   * per stare su una riga: fino al 16 agosto 2026 arrivava qui mozzato a 200
   * caratteri, e i passi — che nelle didascalie stanno dopo l'elenco degli
   * ingredienti — cadevano sempre oltre il taglio. Misurato: 5 video su 8
   * hanno i passi, e non ne avevamo trovato nessuno.
   *
   * Quello che manda il client resta come RIPIEGO, per quando la fonte non
   * risponde (video tolto, rete storta), e per le pagine web, dove la
   * didascalia non esiste e l'estratto di Tavily è quello che abbiamo. */
  const daFonte = await didascaliaDi(url)

  /* ── ①bis PRIMA DEL MODELLO, ma solo quando la didascalia i passi non li ha ──
   *
   * L'ordine della spec è ① la didascalia, ①bis il link che c'è dentro. Qui il
   * confine fra i due gradini lo traccia `haPassi()`, che è gratis e sui casi
   * veri azzecca 9 su 9:
   *
   *  · la didascalia i passi CE LI HA → sono i passi di QUESTO video, e sono
   *    quelli giusti per definizione. Si legge quella (①), e non si va a
   *    prendere una pagina che potrebbe essere un'altra ricetta dello stesso
   *    creator;
   *  · la didascalia i passi NON li ha → non c'è niente da perdere e c'è tutto
   *    da guadagnare: la pagina linkata costa zero e i passi li ha scritti
   *    l'autore. È il caso della crostata al pan di zenzero, dove la
   *    didascalia elenca venti ingredienti e le tappe del video, e i passi veri
   *    stanno su giallozafferano.it.
   *
   * Con la PARTE C, ①bis può anche tornare 'scartata': una pagina vera ma di
   * un altro piatto, o di un'altra ricetta dello stesso creator. Non si usa,
   * ma non sparisce — resta in `paginaScartata` per la risposta finale. */
  let provatoBis = false
  if (!haPassi(daFonte).ok) {
    provatoBis = true
    const esito = await ricettaDaiLink(daFonte, daFonte, creator)
    if (esito.esito === 'trovata') {
      if (ricettaId) await saveExtracted(ricettaId, esito.estratta)
      return NextResponse.json({ estratta: esito.estratta, daMarcatore: true })
    }
    registraScarto(esito)
  }

  const fonte = [daFonte || (body.titolo ?? ''), body.contenuto ?? '']
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000)

  /* ── ④, ULTIMA CHIAMATA POSSIBILE ──
   *
   * Non c'è testo da leggere (didascalia vuota o quasi) e ①bis non ha dato
   * niente: prima di arrendersi si prova la ricerca sul web per QUESTO video
   * — titolo più creator, un giro di Tavily. Costa una ricerca, non un
   * modello, e succede una volta per ricetta: vale la pena provarci. */
  if (fonte.length < 60) {
    const dalWeb = await ricettaDalWeb(daFonte || body.titolo || '', creator)
    if (dalWeb.esito === 'trovata') {
      if (ricettaId) await saveExtracted(ricettaId, dalWeb.estratta)
      return NextResponse.json({ estratta: dalWeb.estratta, daMarcatore: true })
    }
    registraScarto(dalWeb)
    return risultatoVuoto()
  }

  try {
    await spendAi('estrazione')
    const res = await claudeFetch(
      {
        model: MODELLO,
        max_tokens: 1400,
        system: SISTEMA,
        messages: [{ role: 'user', content: fonte }],
      },
      undefined,
      { operazione: 'estrazione', modello: MODELLO }
    )
    if (!res.ok) {
      console.error('[cucina] estrazione: Claude ha risposto', res.status)
      return risultatoVuoto()
    }
    const d = await res.json()
    const testo = (d?.content ?? [])
      .filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
    let estratta = ripulisci(testo)

    /* MANCA IL PROCEDIMENTO — e non è lo stesso di `insufficiente`: il
     * modello può tornare ingredienti pieni e zero passi (la didascalia era
     * solo la lista della spesa), e quello NON fa scattare `insufficiente`
     * per costruzione di `ripulisci` (richiede ENTRAMBI sotto soglia). Ma per
     * chi cucina «ho gli ingredienti, non i passi» è comunque un buco, ed è
     * esattamente il caso vero di Gnocchi alla sorrentina e Chicken wrap nel
     * ricettario: ingredienti letti, zero passi, e prima d'ora nessun
     * secondo tentativo scattava perché `insufficiente` restava false.
     *
     * Qui si scende — ①bis (se non già provato sopra) poi ④ — e SOLO se
     * trovano una pagina migliore la si usa al posto del risultato del
     * modello: un elenco di ingredienti letto bene resta comunque più utile
     * di niente, se poi in fondo non si trova altro. */
    const mancaProcedimento = (estratta.passi?.length ?? 0) < 2
    if (mancaProcedimento) {
      if (!provatoBis) {
        const esitoBis = await ricettaDaiLink(daFonte, daFonte, creator)
        if (esitoBis.esito === 'trovata') estratta = esitoBis.estratta
        else registraScarto(esitoBis)
      }
      if ((estratta.passi?.length ?? 0) < 2) {
        const dalWeb = await ricettaDalWeb(daFonte, creator)
        if (dalWeb.esito === 'trovata') estratta = dalWeb.estratta
        else registraScarto(dalWeb)
      }
    }

    // Si salva se c'è qualcosa (ingredienti o passi): mettere in cache un
    // "insufficiente" vero impedirebbe di riprovare quando il creator sistema
    // la descrizione — ma un elenco di ingredienti letto bene si tiene.
    if (ricettaId && !estratta.insufficiente) await saveExtracted(ricettaId, estratta)

    if (estratta.insufficiente) return risultatoVuoto()

    return NextResponse.json({
      estratta,
      ...(paginaScartata ? { paginaScartata } : {}),
      // Quanto è costata davvero, per il collaudo su usage_log.
      uso: { input: d?.usage?.input_tokens ?? null, output: d?.usage?.output_tokens ?? null },
    })
  } catch (e) {
    if (e instanceof AiCapReached) {
      return NextResponse.json({ error: AI_CAP_MESSAGE, tetto: true }, { status: 429 })
    }
    console.error('[cucina] estrazione fallita:', e)
    return risultatoVuoto()
  }
}
