import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { autoEnrichNewTrips } from '@/lib/trip-enrich'

// Endpoint SEPARATO per generare i piani dei viaggi 'pending' brevi.
// Viene chiamato dal client SUBITO DOPO il salvataggio di un biglietto, in
// "fire-and-forget": così la generazione (ricerca web ~30s) gira per conto suo
// e NON blocca né rompe il salvataggio (che è un'altra richiesta, già conclusa).
export const maxDuration = 60

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await autoEnrichNewTrips()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('trip/generate fallita:', e)
    return NextResponse.json({ error: 'Generazione fallita' }, { status: 500 })
  }
}
