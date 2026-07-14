import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { auth } from '@/auth'
import { createTicket, syncTripPlans } from '@/lib/supabase'
import { autoEnrichNewTrips } from '@/lib/trip-enrich'
import { enrichEvent } from '@/lib/event-enrich'

// La rigenerazione del plot (web-search) può durare: alziamo il tetto.
export const maxDuration = 300

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

    // I viaggi nuovi o "invecchiati" (biglietto aggiunto a piano già pronto →
    // status tornato pending) si rigenerano DA SOLI, dopo la risposta:
    // after() fa partire il lavoro pesante senza far aspettare l'utente.
    after(async () => {
      // Arricchimento AI automatico SOLO per i tipi che ne beneficiano (concerti,
      // musei, hotel, voli): risparmio. Gli altri (cena, ecc.) restano su richiesta
      // col bottone "Aggiorna info da Keiko" nel pannello evento.
      const AUTO_ENRICH = new Set(['concert', 'museum', 'hotel', 'flight'])
      if (AUTO_ENRICH.has((type ?? '').toLowerCase())) {
        try {
          await enrichEvent(id)
        } catch (e) {
          console.error('enrichEvent in background fallita:', e)
        }
      }
      try {
        await autoEnrichNewTrips()
      } catch (e) {
        console.error('autoEnrichNewTrips in background fallita:', e)
      }
    })

    return NextResponse.json({ success: true, record: { id } })
  } catch (err) {
    console.error('Supabase create error:', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 502 })
  }
}
