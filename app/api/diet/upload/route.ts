import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveDietPlan, type DietWeek } from '@/lib/supabase'

// Diete lunghe = lettura lenta: diamo alla funzione fino a 60s prima del timeout.
export const maxDuration = 60

// Legge una dieta da foto multiple + PDF + testo, la fa strutturare a Claude
// (stesso modello del flusso eventi) e la salva. Auth-guarded come /api/upload.
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

  // Costruisco il messaggio per Claude: prima gli allegati, poi le istruzioni.
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
    text: text ? `${DIET_PARSE_PROMPT}\n\nNota aggiuntiva dall'utente: ${text}` : DIET_PARSE_PROMPT,
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
    console.error('Claude API error (diet):', err)
    return NextResponse.json({ error: 'Claude non ha risposto: ' + err.slice(0, 200) }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''
  const troncata = claudeData.stop_reason === 'max_tokens'

  let parsed: { week: DietWeek; haGiorni?: boolean; note?: string }
  try {
    const clean = rawText.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    console.error('Diet parse failed. stop_reason=', claudeData.stop_reason, 'len=', rawText.length)
    return NextResponse.json(
      {
        error: troncata
          ? 'La dieta è troppo lunga da leggere in un colpo: prova a caricarne una parte per volta (meno giorni).'
          : 'Non sono riuscito a leggere la dieta.',
        raw: rawText.slice(0, 500),
      },
      { status: 422 }
    )
  }

  if (!parsed.week || typeof parsed.week !== 'object') {
    return NextResponse.json({ error: 'Dieta senza una settimana valida' }, { status: 422 })
  }

  try {
    await saveDietPlan(parsed.week)
  } catch (e) {
    console.error('Diet save error:', e)
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

const DIET_PARSE_PROMPT = `Sei Keiko. Ti do una dieta (screenshot, un PDF e/o testo). Estrai il piano settimanale e restituisci SOLO un oggetto JSON valido — nessuna spiegazione, nessun markdown, nessun code fence, nessun testo attorno.

Formato ESATTO:
{
  "week": {
    "lun": [ { "pasto": "Colazione", "opzioni": ["opzione 1 con quantità", "opzione 2"] } ],
    "mar": [], "mer": [], "gio": [], "ven": [], "sab": [], "dom": []
  },
  "haGiorni": true,
  "note": ""
}

Regole:
- Le chiavi dei giorni sono ESATTAMENTE: lun, mar, mer, gio, ven, sab, dom.
- Ogni pasto ha un "pasto" (nome breve: "Colazione", "Spuntino", "Pranzo", "Merenda", "Cena") e "opzioni": una o più alternative. Includi le quantità nell'opzione se presenti (es. "Pasta 80g + verdure").
- Massimo 3 opzioni per pasto: tieni le più rilevanti.
- Se la dieta ASSEGNA i pasti ai giorni, rispetta l'assegnazione e imposta "haGiorni": true.
- Se la dieta è una LISTA di pasti/alternative SENZA giorni, distribuisci tu le opzioni nei 7 giorni in modo vario (ruotando le alternative così non si ripete tutto uguale) e imposta "haGiorni": false.
- Non lasciare giorni vuoti, a meno che la dieta preveda esplicitamente un giorno libero.
- Non inventare cibi non presenti. In "note" scrivi in breve cosa manca o è ambiguo (es. "quantità non indicate", "domenica non specificata").
- Mantieni l'italiano.
- Restituisci SOLO il JSON.`
