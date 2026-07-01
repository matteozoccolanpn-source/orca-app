import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteWorkoutPlan } from '@/lib/supabase'

// Elimina la scheda di allenamento salvata. Auth-guarded.
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await deleteWorkoutPlan()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Workout delete error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Eliminazione fallita: ' + msg }, { status: 502 })
  }
}
