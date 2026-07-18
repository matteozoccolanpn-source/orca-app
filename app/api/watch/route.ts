import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { addWatchItem, setWatchItemSeen, setWatchItemReview, deleteWatchItem } from '@/lib/supabase'
import { tmdbKind } from '@/lib/tmdb'

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
  // Etichetta film/serie: TMDB decide (es. "The Bear" → serie); se non trova, tiene la regola del client.
  let kind = body.kind === 'serie' ? 'serie' : 'film'
  const detected = await tmdbKind(title)
  if (detected) kind = detected

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

  let body: { id?: string; seen?: boolean; rating?: number | null; note?: string | null }
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
    if (typeof body.seen === 'boolean') {
      await setWatchItemSeen(id, body.seen)
    }
    if ('rating' in body || 'note' in body) {
      const rating = typeof body.rating === 'number' ? Math.max(0, Math.min(5, Math.round(body.rating))) || null : null
      const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 1000) : null
      await setWatchItemReview(id, rating, note)
    }
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
