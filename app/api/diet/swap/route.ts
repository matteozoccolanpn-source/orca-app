import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// Scambio del singolo alimento dentro un'opzione (una riga di testo).
// Due mestieri in base al body:
//  - senza "alimento": elenca i cibi trovati nella riga  -> { alimenti }
//  - con "alimento":   riscrive la riga cambiando SOLO quel cibo -> { alternative }
// Non ristruttura il JSON della dieta: ragiona al volo sul testo. Auth-guarded.
export const maxDuration = 30

type Motivo = 'equivalente' | 'non_mi_piace' | 'allergia'

const MOTIVO_HINT: Record<Motivo, string> = {
  equivalente: 'un equivalente il più simile possibile (per tipo e apporto), cambiando il minimo.',
  non_mi_piace: 'un alimento diverso che di solito piace di più, ma equivalente come ruolo nel pasto.',
  allergia: 'un alimento sicuro che NON contenga né derivi dall\'alimento indicato (evita contaminazioni ovvie).',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { opzione?: string; alimento?: string; motivo?: Motivo }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const opzione = (body.opzione ?? '').trim()
  if (!opzione) {
    return NextResponse.json({ error: 'Manca l\'opzione' }, { status: 400 })
  }
  const alimento = body.alimento?.trim()
  const motivo: Motivo = body.motivo ?? 'equivalente'

  const prompt = alimento
    ? `Sei Keiko, aiuti con la dieta. In questa riga di un pasto:
"${opzione}"
l'utente vuole sostituire SOLO l'alimento "${alimento}". Proponi ${MOTIVO_HINT[motivo]}
Restituisci 1 o 2 versioni COMPLETE della riga, identiche all'originale tranne quell'alimento (mantieni gli altri cibi e le quantità; adatta la quantità del sostituto in modo sensato).
Rispondi SOLO con JSON valido, nessun testo attorno:
{ "alternative": ["riga completa 1", "riga completa 2"] }
Italiano. Niente cibi assurdi.`
    : `Sei Keiko, aiuti con la dieta. Questa è una riga di un pasto:
"${opzione}"
Elenca i singoli alimenti/ingredienti distinti presenti (con la quantità se c'è, es. "Pasta 80g"). Ignora condimenti banali se non sono cibi veri.
Rispondi SOLO con JSON valido, nessun testo attorno:
{ "alimenti": ["alimento 1", "alimento 2"] }
Italiano.`

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
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error (swap):', err)
    return NextResponse.json({ error: 'Keiko non ha risposto, riprova' }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''

  let parsed: { alimenti?: unknown; alternative?: unknown }
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Swap parse failed:', rawText)
    return NextResponse.json({ error: 'Non ho capito la risposta, riprova' }, { status: 422 })
  }

  if (alimento) {
    const alternative = Array.isArray(parsed.alternative)
      ? parsed.alternative.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 2)
      : []
    if (alternative.length === 0) {
      return NextResponse.json({ error: 'Nessuna alternativa trovata' }, { status: 422 })
    }
    return NextResponse.json({ alternative })
  }

  const alimenti = Array.isArray(parsed.alimenti)
    ? parsed.alimenti.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 8)
    : []
  if (alimenti.length === 0) {
    return NextResponse.json({ error: 'Non ho trovato alimenti da cambiare' }, { status: 422 })
  }
  return NextResponse.json({ alimenti })
}
