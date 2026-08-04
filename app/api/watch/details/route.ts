import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { titleDetails, titleDetailsById, type TmdbType } from '@/lib/tmdb'

// G2 scheda film/serie: trama, anno, generi, cast (TMDB, IT). Auth-guarded.
// GET ?title=...&kind=film|serie
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const title = (req.nextUrl.searchParams.get('title') ?? '').trim()
  const kind = req.nextUrl.searchParams.get('kind') ?? undefined
  if (!title) return NextResponse.json({ error: 'Titolo mancante' }, { status: 400 })

  // Se il client passa l'id TMDB si va dritti al titolo: niente ricerca
  // per nome, una chiamata in meno e nessun rischio di pescare l'omonimo.
  const tmdbId = Number(req.nextUrl.searchParams.get('tmdbId') ?? '')
  const tmdbTypeRaw = req.nextUrl.searchParams.get('tmdbType')
  const tmdbType: TmdbType | null = tmdbTypeRaw === 'tv' || tmdbTypeRaw === 'movie' ? tmdbTypeRaw : null
  const details = Number.isFinite(tmdbId) && tmdbId > 0 && tmdbType
    ? await titleDetailsById(tmdbId, tmdbType)
    : await titleDetails(title, kind)
  return NextResponse.json({ details })
}
