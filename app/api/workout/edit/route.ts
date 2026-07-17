import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveWorkoutPlan, type WorkoutWeek } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Salva la scheda modificata (sposta sessione, togli/sostituisci esercizi).
// Riusa saveWorkoutPlan: niente tabella nuova. Auth-guarded.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { week?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const week = body.week
  if (!week || typeof week !== 'object' || Array.isArray(week)) {
    return NextResponse.json({ error: 'Scheda non valida' }, { status: 400 })
  }

  try {
    await saveWorkoutPlan(week as WorkoutWeek)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Workout edit error:', e)
    const msg = e instanceof Error ? e.message : 'errore'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}
