import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveWorkoutPlan, type WorkoutWeek } from '@/lib/supabase'

// Legge una scheda di allenamento da foto multiple + PDF + testo, la fa
// strutturare a Claude e la salva. Stesse lezioni della dieta: 60s, tetto
// token alto, errori parlanti. Auth-guarded.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const images = formData.getAll('images').filter((f): f is File => f instanceof File)
  const pdf = formData.get('pdf')
  const text = (formData.get('text') as string | null)?.trim() || null

  if (images.length === 0 && !(pdf instanceof File) && !text) {
    return NextResponse.json({ error: 'Nessun file o testo fornito' }, { status: 400 })
  }

  const content: object[] = []

  for (const img of images) {
    if (!img.type.startsWith('image/')) continue
    if (img.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Immagine troppo grande (max 10MB)' }, { status: 400 })
    }
    const b64 = Buffer.from(await img.arrayBuffer()).toString('base64')
    content.push({ type: 'image', source: { type: 'base64', media_type: img.type, data: b64 } })
  }

  if (pdf instanceof File) {
    if (pdf.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Il file deve essere un PDF' }, { status: 400 })
    }
    if (pdf.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF troppo grande (max 20MB)' }, { status: 400 })
    }
    const b64 = Buffer.from(await pdf.arrayBuffer()).toString('base64')
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: b64 },
    })
  }

  content.push({
    type: 'text',
    text: text ? `${WORKOUT_PARSE_PROMPT}\n\nNota aggiuntiva dall'utente: ${text}` : WORKOUT_PARSE_PROMPT,
  })

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error (workout):', err)
    return NextResponse.json({ error: 'Keiko non ha risposto: ' + err.slice(0, 200) }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''
  const troncata = claudeData.stop_reason === 'max_tokens'

  let parsed: { week: WorkoutWeek; haGiorni?: boolean; note?: string }
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Workout parse failed. stop_reason=', claudeData.stop_reason, 'len=', rawText.length)
    return NextResponse.json(
      {
        error: troncata
          ? 'La scheda è troppo lunga da leggere in un colpo: prova a caricarne una parte per volta.'
          : 'Non sono riuscito a leggere la scheda.',
        raw: rawText.slice(0, 500),
      },
      { status: 422 }
    )
  }

  if (!parsed.week || typeof parsed.week !== 'object') {
    return NextResponse.json({ error: 'Scheda senza una settimana valida' }, { status: 422 })
  }

  try {
    await saveWorkoutPlan(parsed.week)
  } catch (e) {
    console.error('Workout save error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }

  return NextResponse.json({
    success: true,
    week: parsed.week,
    haGiorni: parsed.haGiorni ?? true,
    note: parsed.note ?? '',
  })
}

const WORKOUT_PARSE_PROMPT = `Sei Keiko. Ti do una scheda di allenamento (screenshot, un PDF e/o testo). Estrai il piano settimanale e restituisci SOLO un oggetto JSON valido — nessuna spiegazione, nessun markdown, nessun code fence, nessun testo attorno.

Formato ESATTO:
{
  "week": {
    "lun": { "titolo": "Petto e tricipiti", "esercizi": [ { "nome": "Panca piana", "dettaglio": "4x8 @ 70kg" } ] },
    "mar": { "titolo": "", "esercizi": [] },
    "mer": {}, "gio": {}, "ven": {}, "sab": {}, "dom": {}
  },
  "haGiorni": true,
  "note": ""
}

Regole:
- Le chiavi dei giorni sono ESATTAMENTE: lun, mar, mer, gio, ven, sab, dom.
- Ogni giorno ha un "titolo" breve (il focus della sessione, es. "Gambe", "Push A", "Full body"; stringa vuota se non c'è) e "esercizi": lista di { "nome", "dettaglio" }.
- "dettaglio" = serie/ripetizioni/carico/note come sono scritti (es. "4x8 @ 70kg", "3x12", "30 min corsa"). Se non c'è, stringa vuota.
- Giorno di RIPOSO = "esercizi": [] (lista vuota).
- Se la scheda ASSEGNA le sessioni ai giorni, rispetta l'assegnazione e imposta "haGiorni": true.
- Se la scheda è "a SESSIONI" (A/B/C, Giorno 1/2/3, Push/Pull/Legs) SENZA giorni della settimana, distribuiscile in modo sensato nella settimana (es. 3 sessioni → lun/mer/ven, riposo negli altri) e imposta "haGiorni": false.
- Non inventare esercizi non presenti. In "note" scrivi in breve cosa manca o è ambiguo (es. "carichi non indicati", "sabato non specificato").
- Mantieni l'italiano dei nomi se già in italiano; non tradurre nomi tecnici comuni.
- Restituisci SOLO il JSON.`
