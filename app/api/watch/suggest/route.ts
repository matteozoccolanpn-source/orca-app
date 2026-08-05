import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { suggestWatch } from '@/lib/films'
import { isAiCapReached, AI_CAP_MESSAGE } from '@/lib/ai'
import { posterFor } from '@/lib/tmdb'

// Prima erano 120 secondi perché il consiglio cercava sul web e ci metteva
// decine di secondi. Adesso sono due chiamate piccole a Claude piu' qualche
// richiesta a TMDB: misurato, sta sotto i 10 secondi. 30 e' il margine per il
// RIPIEGO, che la ricerca web ce l'ha ancora.
export const maxDuration = 30

// POST { query } → { films: [...] } (1 risultato per titolo secco, 3-4 per consiglio).
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

    // LA FASE 2 NON PARTE PIU'. Serviva a riempire il catalogo locale, che era
    // la cache dei consigli: adesso i candidati li da' TMDB, gratis e sempre
    // aggiornati, quindi pagare una ricerca web in background per riempire una
    // cache che nessuno legge sarebbe spesa pura. `deepenFilmCatalog` e la
    // tabella `catalog` restano dove sono: si dismettono quando e' chiaro che
    // non serve piu' niente, non oggi (come stiamo facendo con search_log).

    return NextResponse.json({ success: true, films: withPosters })
  } catch (e) {
    // Tetto costi (K6): non è un guasto, è la giornata finita → parole di Keiko.
    if (isAiCapReached(e)) return NextResponse.json({ error: AI_CAP_MESSAGE }, { status: 429 })
    console.error('suggestWatch fallita:', e)
    return NextResponse.json({ error: 'Ricerca fallita, riprova' }, { status: 502 })
  }
}
