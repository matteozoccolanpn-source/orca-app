import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { searchEventsTodos, logSearch } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Parole comuni da ignorare così "quando ho birra con Enrico?" cerca "birra"/"enrico".
const STOP = new Set([
  'quando', 'ho', 'con', 'il', 'la', 'le', 'lo', 'i', 'gli', 'un', 'una', 'di', 'da', 'a', 'e', 'o',
  'che', 'cosa', 'dove', 'come', 'per', 'mi', 'del', 'della', 'dei', 'delle', 'al', 'allo', 'alla',
  'ce', 'sono', 'devo', 'the', 'my', 'quanto', 'quale',
])

// Ricerca base sui dati dell'utente (eventi + to-do). Auth-guarded.
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
  if (!q) return NextResponse.json({ events: [], todos: [] })

  const terms = q
    .toLowerCase()
    .replace(/[?!.,;:«»"'`]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))

  try {
    const res = await searchEventsTodos(terms)
    const found = res.events.length > 0 || res.todos.length > 0
    // Backup: registriamo ogni domanda (e se abbiamo trovato) su Supabase, per capire cosa serve.
    await logSearch(q, found)
    return NextResponse.json(res)
  } catch (e) {
    console.error('Search error:', e)
    return NextResponse.json({ error: 'Ricerca fallita' }, { status: 502 })
  }
}
