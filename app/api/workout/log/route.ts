import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { setTrainedDay } from '@/lib/supabase'

// Segna/desegna un giorno come allenato. Body: { day: "YYYY-MM-DD", done: boolean }.
// Auth-guarded.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { day?: string; done?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const day = (body.day ?? '').trim()
  // Accetta solo una data ISO semplice (YYYY-MM-DD), così non scriviamo spazzatura.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
  }

  try {
    await setTrainedDay(day, body.done === true)
  } catch (e) {
    console.error('Workout log error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
