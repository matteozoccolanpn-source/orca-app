import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { watchProvidersIT, watchProvidersById, type TmdbType } from '@/lib/tmdb'

// G3 "Dove vederlo": piattaforme italiane reali (TMDB watch providers IT).
// Auth-guarded come le altre /api/watch. GET ?title=...&kind=film|serie
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
  const providers = Number.isFinite(tmdbId) && tmdbId > 0 && tmdbType
    ? await watchProvidersById(tmdbId, tmdbType)
    : await watchProvidersIT(title, kind)
  return NextResponse.json({ providers })
}
