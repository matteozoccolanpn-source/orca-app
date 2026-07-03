import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { addWatchItem, setWatchItemSeen, deleteWatchItem } from '@/lib/supabase'

// API della watchlist "Da guardare". Auth-guarded come /api/todos.
// POST   { title, kind?, info?, link? } → aggiunge, risponde con l'item
// PATCH  { id, seen }                   → segna visto / non visto
// DELETE { id }                         → elimina

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

  let body: { title?: string; kind?: string; info?: string | null; link?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const title = (body.title ?? '').trim()
  if (!title || title.length > 200) {
    return NextResponse.json({ error: 'Titolo mancante o troppo lungo' }, { status: 400 })
  }
  const kind = body.kind === 'serie' ? 'serie' : 'film'

  try {
    const item = await addWatchItem({ title, kind, info: body.info ?? null, link: body.link ?? null })
    return NextResponse.json({ success: true, item })
  } catch (e) {
    console.error('Watchlist add error:', e)
    return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  let body: { id?: string; seen?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  if (!id || typeof body.seen !== 'boolean') {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
  }

  try {
    await setWatchItemSeen(id, body.seen)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Watchlist patch error:', e)
    return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 502 })
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
    await deleteWatchItem(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Watchlist delete error:', e)
    return NextResponse.json({ error: 'Eliminazione fallita' }, { status: 502 })
  }
}
