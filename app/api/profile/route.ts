import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProfile, saveProfile } from '@/lib/supabase'

// API del profilo (S1 rework allenamento) — il "seme" della personalizzazione,
// condiviso tra allenamento e dieta. Auth-guarded come le altre route.
// GET  → { profile } (null se non ancora compilato)
// POST → salva/aggiorna i campi passati. Validazione leggera: niente spazzatura in DB.

const OBIETTIVI = new Set(['dimagrire', 'massa', 'tonificare', 'forma'])
const LIVELLI = new Set(['principiante', 'intermedio', 'avanzato'])
const STILI = new Set(['duro', 'chill'])

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const profile = await getProfile()
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    obiettivo?: string
    livello?: string
    sessioni?: { palestra?: number; corsa?: number }
    vincoli?: string
    stile?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const obiettivo = OBIETTIVI.has(body.obiettivo ?? '') ? body.obiettivo! : null
  const livello = LIVELLI.has(body.livello ?? '') ? body.livello! : null
  const stile = STILI.has(body.stile ?? '') ? body.stile! : null
  const vincoli = typeof body.vincoli === 'string' ? body.vincoli.trim().slice(0, 300) : null

  // sessioni: solo interi sensati 0..7
  const n = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 7 ? v : null)
  const palestra = n(body.sessioni?.palestra)
  const corsa = n(body.sessioni?.corsa)
  const sessioni = palestra !== null || corsa !== null
    ? { palestra: palestra ?? 0, corsa: corsa ?? 0 }
    : null

  if (!obiettivo && !livello && !stile && !sessioni && !vincoli) {
    return NextResponse.json({ error: 'Niente da salvare' }, { status: 400 })
  }

  try {
    await saveProfile({ obiettivo, livello, sessioni, vincoli, stile })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Profile save error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}
