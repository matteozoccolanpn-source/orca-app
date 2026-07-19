import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { auth } from '@/auth'
import { suggestWatch, deepenFilmCatalog } from '@/lib/films'
import { posterFor } from '@/lib/tmdb'

// Fase 1 con ricerca web: può volerci qualche decina di secondi.
export const maxDuration = 120

// POST { query } → { films: [...] } (1 risultato per titolo secco, 3-4 per consiglio).
// Dopo la risposta, in background, la fase 2 allarga il catalogo cache.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { query?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const query = (body.query ?? '').trim()
  if (!query || query.length > 200) {
    return NextResponse.json({ error: 'Richiesta vuota o troppo lunga' }, { status: 400 })
  }

  try {
    const films = await suggestWatch(query)
    // copertine TMDB per il pannello dei consigli (null se non trovata)
    const withPosters = await Promise.all(films.map(async (f) => ({ ...f, poster: await posterFor(f.title, f.kind) })))

    // Fase 2 in background: arricchisce il catalogo per le prossime richieste.
    after(async () => {
      try {
        await deepenFilmCatalog(query)
      } catch (e) {
        console.error('deepenFilmCatalog in background fallita:', e)
      }
    })

    return NextResponse.json({ success: true, films: withPosters })
  } catch (e) {
    console.error('suggestWatch fallita:', e)
    return NextResponse.json({ error: 'Ricerca fallita, riprova' }, { status: 502 })
  }
}
