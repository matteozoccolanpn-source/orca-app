import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { spendAi, claudeFetch, isAiCapReached, AI_CAP_MESSAGE } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tetto costi (K6): una cattura vale 1. Se la giornata è finita, Claude non
  // viene chiamato affatto e l'utente legge il messaggio di Keiko, non un errore.
  try {
    await spendAi('cattura')
  } catch (e) {
    if (isAiCapReached(e)) return NextResponse.json({ error: AI_CAP_MESSAGE }, { status: 429 })
    throw e
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const text = formData.get('text') as string | null

  if (!file && !text) {
    return NextResponse.json({ error: 'No image or text provided' }, { status: 400 })
  }

  let claudeMessages: object[]

  // Diamo a Claude la data di OGGI: senza, indovina l'anno e mette date passate
  // (es. "sabato" -> un sabato del 2025). Con questa riga, "oggi/domani/sabato"
  // vengono ancorati correttamente e l'anno esce giusto.
  const today = new Date().toISOString().slice(0, 10)
  const todayLine = `Oggi è ${today}. Usa questa come data di riferimento per "oggi", "domani", i giorni della settimana ecc.: scegli sempre la prima occorrenza FUTURA rispetto a oggi, con l'anno corrispondente.`

  if (file) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mediaType = file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    claudeMessages = [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: `${todayLine}\n\n${IMAGE_PARSE_PROMPT}` },
        ],
      },
    ]
  } else {
    claudeMessages = [
      {
        role: 'user',
        content: `${todayLine}\n\n${TEXT_PARSE_PROMPT}\n\nTesto: ${text}`,
      },
    ]
  }

  const claudeRes = await claudeFetch({
    model: 'claude-sonnet-4-5',
    // Cinque eventi invece di uno: 1024 bastavano per un evento, non per cinque.
    // Il costo non cambia per questo (si paga il generato, non il tetto).
    max_tokens: 2500,
    messages: claudeMessages,
  }, undefined, { operazione: 'cattura' })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Claude API failed' }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''

  type EventoLetto = {
    title: string
    type: string
    datetime: string
    location: string
    reference: string
    city: string
  }

  let parsed: EventoLetto[]

  try {
    const clean = rawText.replace(/```json|```/g, '').trim()
    const dato = JSON.parse(clean)
    // La forma attesa e' { events: [...] }. Si accetta anche un oggetto singolo:
    // costa una riga e evita che una risposta storta del modello butti via una
    // cattura che l'utente ha gia' scritto.
    const lista = Array.isArray(dato?.events) ? dato.events : Array.isArray(dato) ? dato : [dato]
    parsed = (lista as EventoLetto[])
      .filter((e) => e && typeof e.title === 'string' && e.title.trim() && e.datetime)
      .slice(0, 5)
    if (parsed.length === 0) throw new Error('nessun evento nella risposta')
  } catch {
    console.error('Failed to parse Claude response:', rawText)
    return NextResponse.json(
      { error: 'Could not parse event data', raw: rawText },
      { status: 422 }
    )
  }

  // `parsed` e' SEMPRE una lista, anche con un evento solo: il client ha un
  // formato unico da gestire, per il testo come per l'immagine.
  return NextResponse.json({ parsed })
}

const IMAGE_PARSE_PROMPT = `You are a precise ticket and booking parser for a personal calendar app.
Extract event information from the image and return ONLY a valid JSON object — no explanations, no markdown, no code fences, no surrounding text.

The image may contain MORE THAN ONE event (e.g. a screenshot with two tickets, an outbound and a return flight, a booking with a hotel and a transfer). Return them ALL, in the order they appear. Maximum 5: if there are more, return the first 5. A single event = a list with one element.

The image can be: a ticket screenshot, a booking confirmation email, a WhatsApp message, or any document containing event/travel/reservation information. Focus on the core event data and ignore headers, footers, legal text, and promotional content.

Return exactly this shape — ALWAYS a list, even for one event:
{ "events": [ { ... }, { ... } ] }

Each element has exactly these fields:
{
  "title": "short descriptive title of the event",
  "type": "one of: train, flight, concert, hotel, museum, restaurant, sport, other",
  "datetime": "YYYY-MM-DDTHH:mm:00",
  "location": "place, station, airport, or venue name; empty string if none",
  "city": "the CITY of the event in plain form (e.g. Roma, Milano); empty string if unknown",
  "reference": "booking code / PNR / reservation number / order number; empty string if none"
}

Rules:
- datetime format: ALWAYS ISO 8601 WITHOUT timezone offset and WITHOUT "Z": YYYY-MM-DDTHH:mm:00 (e.g. 2026-05-24T14:52:00). The time is the local time shown. Never add any timezone offset.
- Which time to extract, by type:
  - train / flight / other transport: the DEPARTURE date and time.
  - hotel: the CHECK-IN date and time. If only a check-in date is shown without a time, use T14:00:00 (standard check-in).
  - concert / museum / restaurant: the START or RESERVATION date and time.
  - sport: the race/match START time.
  - other: the main START date and time of the event.
- sport events (F1, MotoGP, football, tennis...): type "sport"; title = clean competition + round name, e.g. "F1 GP Gran Bretagna" (venue like "Silverstone" goes in location, not title).
- If no time at all is visible, use T00:00:00.
- Year handling: if the year is NOT visible, choose the year that makes the date fall in the FUTURE relative to today. Never pick a past year when the month/day suggest an upcoming event.
- For email confirmations: extract the actual event data, not the email send date.
- For WhatsApp messages: extract the event being discussed, not the message timestamp.
- type: choose the closest match; if genuinely unclear, use "other".
- city: the city where the event takes place, in plain form (e.g. "Roma"), EVEN IF the location/venue name does not contain it (e.g. venue "Tor Vergata" -> city "Roma"; "San Siro" -> "Milano"). For train/flight use the DESTINATION (arrival) city. Empty string only if genuinely unknown.
- title: use the language of the source (keep Italian if Italian). Keep it short and descriptive.
- Never invent data. If a field is missing, use an empty string "" (except datetime).
- Do NOT split one event into several: a train with a change is ONE journey; a
  ticket and its confirmation email are ONE event.
- Return ONLY the JSON object with the "events" list, nothing else.`

const TEXT_PARSE_PROMPT = `Sei OrCa. Estrai gli eventi dal testo libero. Restituisci SOLO un oggetto JSON valido — nessuna spiegazione, nessun markdown, nessun code fence, nessun testo aggiuntivo.

Un messaggio puo' contenere PIU' eventi ("volo venerdi' e hotel sabato" = due).
Estraili TUTTI, nell'ordine in cui compaiono. Massimo 5: se ce ne sono di piu',
i primi 5. Un evento solo = lista con un elemento.

Forma della risposta — SEMPRE una lista:
{ "events": [ { ... }, { ... } ] }

Ogni elemento ha questi campi:
{
  "title": "titolo breve e descrittivo dell'evento",
  "type": "uno tra: train, flight, concert, hotel, restaurant, museum, sport, other",
  "datetime": "YYYY-MM-DDTHH:mm:00",
  "location": "luogo, stazione, aeroporto o venue; stringa vuota se assente",
  "city": "la CITTÀ dell'evento in forma semplice (es. Roma, Milano); stringa vuota se sconosciuta",
  "reference": "codice prenotazione / PNR / numero ordine; stringa vuota se assente"
}

Regole:
- datetime: SEMPRE ISO 8601 SENZA offset timezone e SENZA "Z": YYYY-MM-DDTHH:mm:00.
- Se l'ora non è specificata usa T12:00:00.
- Se l'anno non è specificato scegli la data futura più prossima rispetto ad oggi.
- NON spezzare un evento solo in piu' pezzi: un treno con cambio e' UN viaggio,
  una cena con l'indicazione del locale e' UN evento. Due eventi sono due cose
  che accadono in momenti o luoghi diversi.
- type: scegli il più adatto; se incerto usa "other".
- eventi sportivi (F1, MotoGP, calcio, tennis...): type "sport"; title = competizione + tappa pulita, es. "F1 GP Gran Bretagna" (il circuito/stadio va in location, non nel title); orario = inizio gara/partita.
- city: la città dell'evento in forma semplice (es. "Roma"), ANCHE SE la location/venue non la contiene (es. "Tor Vergata" -> "Roma"; "San Siro" -> "Milano"). Per treno/volo usa la città di DESTINAZIONE (arrivo). Stringa vuota solo se davvero sconosciuta.
- title: mantieni l'italiano se il testo è in italiano. Tienilo breve.
- Non inventare dati. Se un campo manca usa stringa vuota "" (tranne datetime).
- Restituisci SOLO il JSON con la lista "events".`
