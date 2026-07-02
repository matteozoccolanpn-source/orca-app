import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createTicket, syncTripPlans } from '@/lib/supabase'

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

    return NextResponse.json({ success: true, record: { id } })
  } catch (err) {
    console.error('Supabase create error:', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 502 })
  }
}
