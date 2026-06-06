import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  const text = formData.get('text') as string | null

  if (!file && !text) {
    return NextResponse.json({ error: 'No image or text provided' }, { status: 400 })
  }

  let claudeMessages: object[]

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
          { type: 'text', text: IMAGE_PARSE_PROMPT },
        ],
      },
    ]
  } else {
    claudeMessages = [
      {
        role: 'user',
        content: `${TEXT_PARSE_PROMPT}\n\nTesto: ${text}`,
      },
    ]
  }

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: claudeMessages,
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'Claude API failed' }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''

  let parsed: {
    title: string
    type: string
    datetime: string
    location: string
    reference: string
  }

  try {
    const clean = rawText.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.error('Failed to parse Claude response:', rawText)
    return NextResponse.json(
      { error: 'Could not parse event data', raw: rawText },
      { status: 422 }
    )
  }

  return NextResponse.json({ parsed })
}

const IMAGE_PARSE_PROMPT = `You are a precise ticket and booking parser for a personal calendar app.
Extract event information from the image and return ONLY a valid JSON object — no explanations, no markdown, no code fences, no surrounding text.

The image can be: a ticket screenshot, a booking confirmation email, a WhatsApp message, or any document containing event/travel/reservation information. Focus on the core event data and ignore headers, footers, legal text, and promotional content.

Return exactly these fields:
{
  "title": "short descriptive title of the event",
  "type": "one of: train, flight, concert, hotel, museum, restaurant, other",
  "datetime": "YYYY-MM-DDTHH:mm:00",
  "location": "place, station, airport, or venue name; empty string if none",
  "reference": "booking code / PNR / reservation number / order number; empty string if none"
}

Rules:
- datetime format: ALWAYS ISO 8601 WITHOUT timezone offset and WITHOUT "Z": YYYY-MM-DDTHH:mm:00 (e.g. 2026-05-24T14:52:00). The time is the local time shown. Never add any timezone offset.
- Which time to extract, by type:
  - train / flight / other transport: the DEPARTURE date and time.
  - hotel: the CHECK-IN date and time. If only a check-in date is shown without a time, use T14:00:00 (standard check-in).
  - concert / museum / restaurant: the START or RESERVATION date and time.
  - other: the main START date and time of the event.
- If no time at all is visible, use T00:00:00.
- Year handling: if the year is NOT visible, choose the year that makes the date fall in the FUTURE relative to today. Never pick a past year when the month/day suggest an upcoming event.
- For email confirmations: extract the actual event data, not the email send date.
- For WhatsApp messages: extract the event being discussed, not the message timestamp.
- type: choose the closest match; if genuinely unclear, use "other".
- title: use the language of the source (keep Italian if Italian). Keep it short and descriptive.
- Never invent data. If a field is missing, use an empty string "" (except datetime).
- Return ONLY the JSON object, nothing else.`

const TEXT_PARSE_PROMPT = `Sei OrCa. Estrai i dati dell'evento dal testo libero. Restituisci SOLO un oggetto JSON valido — nessuna spiegazione, nessun markdown, nessun code fence, nessun testo aggiuntivo.

Campi richiesti:
{
  "title": "titolo breve e descrittivo dell'evento",
  "type": "uno tra: train, flight, concert, hotel, restaurant, museum, other",
  "datetime": "YYYY-MM-DDTHH:mm:00",
  "location": "luogo, stazione, aeroporto o venue; stringa vuota se assente",
  "reference": "codice prenotazione / PNR / numero ordine; stringa vuota se assente"
}

Regole:
- datetime: SEMPRE ISO 8601 SENZA offset timezone e SENZA "Z": YYYY-MM-DDTHH:mm:00.
- Se l'ora non è specificata usa T12:00:00.
- Se l'anno non è specificato scegli la data futura più prossima rispetto ad oggi.
- Se il testo descrive più eventi, estrai solo il primo o quello principale.
- type: scegli il più adatto; se incerto usa "other".
- title: mantieni l'italiano se il testo è in italiano. Tienilo breve.
- Non inventare dati. Se un campo manca usa stringa vuota "" (tranne datetime).
- Restituisci SOLO il JSON.`
