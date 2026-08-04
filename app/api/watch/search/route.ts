import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getPlatforms } from '@/lib/supabase'
import { searchWithProviders, PIATTAFORME_IT } from '@/lib/tmdb'

// Ricerca trasversale: UNA ricerca, e per ogni titolo dove si vede in Italia.
// Auth-guarded come le altre /api/watch. GET ?q=...
//
// Il confronto con gli abbonamenti dell'utente si fa QUI e non nel browser:
// i nomi che usa TMDB ("Amazon Prime Video", "Disney Plus") vanno riportati a
// quelli della nostra lista, e quella regola sta in lib/tmdb.ts, che è roba di
// server. Il client riceve la riga già pronta e la disegna.
//
// Nota sul tetto costi (K6): il tetto conta le chiamate ad Anthropic, non a
// TMDB — spendAi/claudeFetch sono solo per il modello. Questa rotta non tocca
// il modello, quindi non viene addebitata.

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ risultati: [], abbonamenti: [], haScelto: false, disponibili: PIATTAFORME_IT })

  const abbonamenti = await getPlatforms()
  const risultati = await searchWithProviders(q, abbonamenti)

  return NextResponse.json({
    risultati,
    abbonamenti,
    // false = non ha ancora detto a cosa è abbonato: la riga cambia tono e
    // sotto compare l'invito a dirlo, una volta sola.
    haScelto: abbonamenti.length > 0,
    disponibili: PIATTAFORME_IT,
  })
}
