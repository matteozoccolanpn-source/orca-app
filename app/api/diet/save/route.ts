import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveDietPlan, type DietWeek } from '@/lib/supabase'

// Salva una settimana già modificata dal client (es. dopo "Rendi definitivo"
// uno scambio di alimento). Riusa saveDietPlan, non duplica la scrittura.
// Auth-guarded come le altre vie della dieta.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { week?: DietWeek }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  if (!body.week || typeof body.week !== 'object') {
    return NextResponse.json({ error: 'Settimana non valida' }, { status: 400 })
  }

  try {
    await saveDietPlan(body.week)
  } catch (e) {
    console.error('Diet save error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
