import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { watchProvidersIT } from '@/lib/tmdb'

// G3 "Dove vederlo": piattaforme italiane reali (TMDB watch providers IT).
// Auth-guarded come le altre /api/watch. GET ?title=...&kind=film|serie
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const title = (req.nextUrl.searchParams.get('title') ?? '').trim()
  const kind = req.nextUrl.searchParams.get('kind') ?? undefined
  if (!title) return NextResponse.json({ error: 'Titolo mancante' }, { status: 400 })

  const providers = await watchProvidersIT(title, kind)
  return NextResponse.json({ providers })
}
