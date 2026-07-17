import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { enrichEvent } from '@/lib/event-enrich'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Aggiorna a mano l'arricchimento AI di un evento (ricerca web one-shot). Auth-guarded.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Id mancante' }, { status: 400 })

  try {
    const enrichment = await enrichEvent(id)
    return NextResponse.json({ enrichment })
  } catch (e) {
    console.error('Event enrich error:', e)
    return NextResponse.json({ error: 'Arricchimento fallito' }, { status: 502 })
  }
}
