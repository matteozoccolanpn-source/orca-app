import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { titleDetails } from '@/lib/tmdb'

// G2 scheda film/serie: trama, anno, generi, cast (TMDB, IT). Auth-guarded.
// GET ?title=...&kind=film|serie
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const title = (req.nextUrl.searchParams.get('title') ?? '').trim()
  const kind = req.nextUrl.searchParams.get('kind') ?? undefined
  if (!title) return NextResponse.json({ error: 'Titolo mancante' }, { status: 400 })

  const details = await titleDetails(title, kind)
  return NextResponse.json({ details })
}
