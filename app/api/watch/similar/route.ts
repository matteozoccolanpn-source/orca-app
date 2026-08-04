import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { similarTitles, similarTitlesById, type TmdbType } from '@/lib/tmdb'

// G4 "Titoli simili": raccomandazioni TMDB (IT). Auth-guarded. GET ?title=...&kind=film|serie
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
  const similar = Number.isFinite(tmdbId) && tmdbId > 0 && tmdbType
    ? await similarTitlesById(tmdbId, tmdbType)
    : await similarTitles(title, kind)
  return NextResponse.json({ similar })
}
