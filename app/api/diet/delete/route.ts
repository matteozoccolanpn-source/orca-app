import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { deleteDietPlan } from '@/lib/supabase'

// Elimina il piano dieta salvato. Auth-guarded come le altre vie.
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await deleteDietPlan()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Diet delete error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Eliminazione fallita: ' + msg }, { status: 502 })
  }
}
