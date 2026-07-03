import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createTodo, updateTodoById, deleteTodoById } from '@/lib/supabase'
import { parseTodoTime, cleanTodoText } from '@/lib/todo-time'
import { looksLikePlace, resolveTodoPlace } from '@/lib/todo-place'

// La risoluzione del luogo usa la ricerca web di Claude: può volerci qualche
// secondo, quindi alziamo il tetto della serverless function.
export const maxDuration = 60

// API della barra to-do per-giorno. Auth-guarded come /api/workout/log.
// POST   { day: "YYYY-MM-DD", text: string }        → crea, risponde col to-do creato
// PATCH  { id: string, done?: boolean, star?: bool } → spunta / stella
// DELETE { id: string }                              → elimina

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

async function guard() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  let body: { day?: string; text?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const day = (body.day ?? '').trim()
  const text = (body.text ?? '').trim()
  if (!DAY_RE.test(day)) {
    return NextResponse.json({ error: 'Data non valida' }, { status: 400 })
  }
  if (!text || text.length > 200) {
    return NextResponse.json({ error: 'Testo mancante o troppo lungo' }, { status: 400 })
  }

  try {
    // Se il testo contiene un orario ("alle 15", "pomeriggio", "18:30")
    // lo salviamo: il cron manderà la notifica 30 min prima.
    // Il testo viene ripulito (maiuscola, via le indicazioni d'orario).
    const clean = cleanTodoText(text)

    // Se il testo sembra contenere un luogo, Claude lo cerca sul web
    // (nome + indirizzo + telefono) e riscrive anche un titolo pulito.
    // Se fallisce, si salva il testo ripulito dalla regex, senza luogo.
    let place = { title: null as string | null, location: null as string | null, phone: null as string | null }
    if (looksLikePlace(clean)) {
      place = await resolveTodoPlace(text)
    }

    const todo = await createTodo(day, place.title ?? clean, parseTodoTime(text), place.location, place.phone)
    return NextResponse.json({ success: true, todo })
  } catch (e) {
    console.error('Todo create error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  let body: { id?: string; done?: boolean; star?: boolean; time?: string | null; lead?: number; double?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Id mancante' }, { status: 400 })
  }
  const fields: { done?: boolean; star?: boolean; time?: string | null; lead?: number; double?: boolean } = {}
  if (typeof body.done === 'boolean') fields.done = body.done
  if (typeof body.star === 'boolean') fields.star = body.star
  if (typeof body.double === 'boolean') fields.double = body.double
  // Anticipo notifica: solo valori sensati (5 min .. 8 ore).
  if (typeof body.lead === 'number' && Number.isInteger(body.lead) && body.lead >= 5 && body.lead <= 480) {
    fields.lead = body.lead
  }
  // Orario cambiato a mano: "HH:MM" per impostarlo, null per toglierlo.
  if (body.time === null) fields.time = null
  else if (typeof body.time === 'string' && /^\d{2}:\d{2}$/.test(body.time)) fields.time = body.time
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Niente da aggiornare' }, { status: 400 })
  }

  try {
    await updateTodoById(id, fields)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Todo update error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Id mancante' }, { status: 400 })
  }

  try {
    await deleteTodoById(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Todo delete error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Eliminazione fallita: ' + msg }, { status: 502 })
  }
}
