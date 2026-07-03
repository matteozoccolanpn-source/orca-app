import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { editTripSlot } from '@/lib/trip-enrich'

// La modifica usa la ricerca web di Claude: può volerci qualche decina di secondi.
export const maxDuration = 120

// POST { clusterKey, slotIndex, richiesta } → riscrive UNA tappa del piano.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { clusterKey?: string; slotIndex?: number; richiesta?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const clusterKey = (body.clusterKey ?? '').trim()
  const richiesta = (body.richiesta ?? '').trim()
  const slotIndex = body.slotIndex

  if (!clusterKey || typeof slotIndex !== 'number' || !Number.isInteger(slotIndex) || slotIndex < 0) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }
  if (!richiesta || richiesta.length > 300) {
    return NextResponse.json({ error: 'Richiesta vuota o troppo lunga' }, { status: 400 })
  }

  try {
    const { slot } = await editTripSlot(clusterKey, slotIndex, richiesta)
    return NextResponse.json({ success: true, slot })
  } catch (e) {
    console.error('editTripSlot fallita:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Modifica fallita: ' + msg }, { status: 502 })
  }
}
