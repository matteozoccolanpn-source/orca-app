import { NextRequest, NextResponse, after } from 'next/server'
import { auth } from '@/auth'
import { createTicket, syncTripPlans } from '@/lib/supabase'
import { autoEnrichNewTrips } from '@/lib/trip-enrich'

// La generazione del piano (ricerca web ~30s) gira in background dopo la
// risposta: alziamo il limite di durata della funzione.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, type, datetime, location, reference, city } = await req.json()

  if (!title || !type || !datetime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { id } = await createTicket({ title, type, datetime, location, reference, city })

    // Dopo il salvataggio, ricontrolla gli incastri (viaggi) in automatico.
    // Idempotente (upsert su cluster_key) ed economico (solo query, niente web-search).
    // Se fallisce NON deve rompere il salvataggio: il biglietto è già stato scritto.
    try {
      await syncTripPlans()
    } catch (e) {
      console.error('syncTripPlans dopo create fallita (il biglietto è comunque salvato):', e)
    }

    // Genera il piano del viaggio in BACKGROUND, dopo la risposta (così il
    // salvataggio resta veloce). Solo viaggi brevi: il guardrail è dentro la funzione.
    after(async () => {
      try {
        await autoEnrichNewTrips()
      } catch (e) {
        console.error('autoEnrich background fallita:', e)
      }
    })

    return NextResponse.json({ success: true, record: { id } })
  } catch (err) {
    console.error('Supabase create error:', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 502 })
  }
}
