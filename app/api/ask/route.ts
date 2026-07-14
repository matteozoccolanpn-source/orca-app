import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUpcomingTickets, getTodos, getDietPlan, getWorkoutPlan, getTrainedDays, logSearch } from '@/lib/supabase'
import { askKeiko } from '@/lib/ask'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// "Chiedi a Keiko": consulente AI sui dati dell'utente. Auth-guarded.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { q?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const q = (body.q ?? '').trim()
  if (!q) return NextResponse.json({ answer: '' })

  try {
    const [events, todos, diet, workout, trained] = await Promise.all([
      getUpcomingTickets(),
      getTodos(),
      getDietPlan(),
      getWorkoutPlan(),
      getTrainedDays(),
    ])

    const context = {
      eventi: events.map((e) => ({ titolo: e.title, tipo: e.type, quando: e.datetime, luogo: e.location })),
      todo: todos.map((t) => ({ testo: t.text, giorno: t.day, ora: t.time, luogo: t.location, fatto: t.done })),
      dieta_settimana: diet?.week ?? null,
      allenamento_settimana: workout?.week ?? null,
      giorni_allenati: trained,
    }

    const answer = await askKeiko(q, context)
    // Backup: registriamo la domanda per capire cosa chiede l'utente.
    await logSearch(q, true)
    return NextResponse.json({ answer })
  } catch (e) {
    console.error('Ask error:', e)
    return NextResponse.json({ error: 'Non sono riuscito a rispondere' }, { status: 502 })
  }
}
