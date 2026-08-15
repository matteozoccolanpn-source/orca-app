import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { spendAi, claudeFetch, AiCapReached, AI_CAP_MESSAGE } from '@/lib/ai'
import { getRecipes, saveExtracted, type RicettaEstratta } from '@/lib/supabase'
import { marcatoreDi, eVideo } from '../marcatore'

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

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    id?: string
    url?: string
    titolo?: string
    contenuto?: string
  }
  const url = (body.url ?? '').trim()
  if (!url.startsWith('http')) return NextResponse.json({ error: 'Serve un link' }, { status: 400 })

  /* GIÀ ESTRATTA? Allora è finita qui, senza toccare il modello. È il motivo
   * per cui questa rotta si può chiamare a ogni apertura del foglio senza
   * pensarci: la seconda volta non costa niente. */
  let ricettaId = (body.id ?? '').trim() || null
  if (ricettaId) {
    const salvate = await getRecipes()
    const mia = salvate.find((r) => r.id === ricettaId)
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
      if (ricettaId) await saveExtracted(ricettaId, estratta)
      return NextResponse.json({ estratta, daMarcatore: true })
    }
  }

  /* Il testo da leggere: la didascalia (per TikTok l'oEmbed restituisce la
   * caption intera, che nei video di cucina contiene quasi sempre gli
   * ingredienti) più l'estratto che Tavily ci ha già dato. Niente scraping:
   * sono due cose che abbiamo già in mano. */
  const fonte = [body.titolo ?? '', body.contenuto ?? '']
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000)

  // Troppo poco per chiamare qualcuno: si risponde subito, gratis.
  if (fonte.length < 60) return NextResponse.json({ estratta: { insufficiente: true } })

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
      return NextResponse.json({ estratta: { insufficiente: true } })
    }
    const d = await res.json()
    const testo = (d?.content ?? [])
      .filter((b: { type?: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
    const estratta = ripulisci(testo)

    // Si salva solo se la ricetta è nel ricettario e l'estrazione è servita a
    // qualcosa: mettere in cache un "insufficiente" impedirebbe di riprovare
    // il giorno che il creator sistema la descrizione.
    if (ricettaId && !estratta.insufficiente) await saveExtracted(ricettaId, estratta)

    return NextResponse.json({
      estratta,
      // Quanto è costata davvero, per il collaudo su usage_log.
      uso: { input: d?.usage?.input_tokens ?? null, output: d?.usage?.output_tokens ?? null },
    })
  } catch (e) {
    if (e instanceof AiCapReached) {
      return NextResponse.json({ error: AI_CAP_MESSAGE, tetto: true }, { status: 429 })
    }
    console.error('[cucina] estrazione fallita:', e)
    return NextResponse.json({ estratta: { insufficiente: true } })
  }
}
