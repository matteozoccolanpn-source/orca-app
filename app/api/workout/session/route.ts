import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  startSession,
  logSet,
  deleteSet,
  endSession,
  getOpenSession,
  getLastPerformance,
} from '@/lib/supabase'

/* Seduta di allenamento vera (S4): apri, segna le serie, chiudi.
 * Una sola rotta con un campo `action`, cosi' la schermata parla con un solo
 * indirizzo invece di cinque. Auth-guarded come tutte le altre /api/workout/*.
 *
 *   GET                                        -> { open: seduta aperta | null }
 *   POST { action:"start", day, titolo }       -> { sessionId }
 *   POST { action:"set", sessionId, set }      -> { setId }
 *   POST { action:"deleteSet", setId }         -> { success }
 *   POST { action:"end", sessionId, ... }      -> { success }
 *   POST { action:"last", esercizio }          -> { sets }  (l'ultima volta)
 */

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ open: await getOpenSession() })
  } catch (e) {
    console.error('Workout session GET error:', e)
    return NextResponse.json({ error: 'Lettura fallita' }, { status: 502 })
  }
}

type Body = {
  action?: string
  day?: string
  titolo?: string
  sessionId?: string
  setId?: string
  esercizio?: string
  sensazione?: string
  note?: string
  set?: {
    esercizio?: string
    serie?: number
    ripetizioni?: number
    pesoKg?: number
    secondi?: number
    fatica?: number
  }
}

// Un numero solo se e' davvero un numero sensato, altrimenti niente:
// meglio una casella vuota che uno zero finto nello storico.
function num(v: unknown, max: number): number | undefined {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > max) return undefined
  return n
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  try {
    switch (body.action) {
      case 'start': {
        const day = (body.day ?? '').trim()
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
          return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
        }
        const sessionId = await startSession(day, body.titolo?.trim() || undefined)
        return NextResponse.json({ sessionId })
      }

      case 'set': {
        const sessionId = (body.sessionId ?? '').trim()
        const esercizio = (body.set?.esercizio ?? '').trim()
        if (!sessionId) return NextResponse.json({ error: 'Seduta mancante' }, { status: 400 })
        if (!esercizio) return NextResponse.json({ error: 'Esercizio mancante' }, { status: 400 })
        const setId = await logSet(sessionId, {
          esercizio,
          serie: num(body.set?.serie, 99),
          ripetizioni: num(body.set?.ripetizioni, 999),
          pesoKg: num(body.set?.pesoKg, 999),
          secondi: num(body.set?.secondi, 86400),
          fatica: num(body.set?.fatica, 10),
        })
        return NextResponse.json({ setId })
      }

      case 'deleteSet': {
        const setId = (body.setId ?? '').trim()
        if (!setId) return NextResponse.json({ error: 'Serie mancante' }, { status: 400 })
        await deleteSet(setId)
        return NextResponse.json({ success: true })
      }

      case 'end': {
        const sessionId = (body.sessionId ?? '').trim()
        if (!sessionId) return NextResponse.json({ error: 'Seduta mancante' }, { status: 400 })
        await endSession(sessionId, {
          ...(body.sensazione ? { sensazione: body.sensazione } : {}),
          ...(body.note ? { note: body.note } : {}),
        })
        return NextResponse.json({ success: true })
      }

      case 'last': {
        const esercizio = (body.esercizio ?? '').trim()
        if (!esercizio) return NextResponse.json({ error: 'Esercizio mancante' }, { status: 400 })
        return NextResponse.json({ sets: await getLastPerformance(esercizio) })
      }

      default:
        return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
    }
  } catch (e) {
    console.error('Workout session error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}
