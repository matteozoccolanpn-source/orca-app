import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getWatchItem, setWatchProgress, setWatchItemSeen } from '@/lib/supabase'
import { seriesProgressInfo } from '@/lib/tmdb'

// "Ho visto un episodio". Auth-guarded come le altre /api/watch.
//
// GET  ?id=...            → a che punto sei, aggiornando da TMDB se serve
// POST { id, avanza:true} → +1 episodio, con la regola qui sotto
// POST { id, season, episode } → correzione a mano (la gente salta e recupera)
//
// LA REGOLA
//   episodio + 1
//   se supera gli episodi della stagione → stagione + 1, episodio 1
//   se supera l'ultima stagione          → la serie va in "visto"
//
// Se TMDB non risponde non si rompe niente: non sapendo quanti episodi ha la
// stagione, si avanza di uno e basta. Meglio un conto che va avanti dritto che
// una schermata che esplode.

async function guard() {
  const session = await auth()
  return session ? null : NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/** Legge la lunghezza della serie da TMDB e la ricopia in tabella, così la
 *  prossima volta non serve richiederla. */
async function infoSerie(id: string, tmdbId: number | null) {
  if (!tmdbId) return null
  const info = await seriesProgressInfo(tmdbId)
  if (!info) return null
  await setWatchProgress(id, {
    totalSeasons: info.totalSeasons,
    totalEpisodes: info.totalEpisodes,
    nextAirDate: info.nextAirDate,
  })
  return info
}

export async function GET(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Id mancante' }, { status: 400 })

  const item = await getWatchItem(id)
  if (!item) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (item.kind !== 'serie') return NextResponse.json({ progresso: null })

  // si aggiorna da TMDB solo se non si sa ancora quanto è lunga
  const info = item.totalSeasons == null ? await infoSerie(id, item.tmdbId) : null

  return NextResponse.json({
    progresso: {
      season: item.season,
      episode: item.episode,
      totalSeasons: info?.totalSeasons ?? item.totalSeasons,
      totalEpisodes: info?.totalEpisodes ?? item.totalEpisodes,
      nextAirDate: info?.nextAirDate ?? item.nextAirDate,
      episodiPerStagione: info?.episodiPerStagione ?? null,
    },
  })
}

export async function POST(req: NextRequest) {
  const denied = await guard()
  if (denied) return denied

  let body: { id?: string; avanza?: boolean; season?: number; episode?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Id mancante' }, { status: 400 })

  const item = await getWatchItem(id)
  if (!item) return NextResponse.json({ error: 'Non trovato' }, { status: 404 })
  if (item.kind !== 'serie') return NextResponse.json({ error: 'Non è una serie' }, { status: 400 })

  // ── correzione a mano ─────────────────────────────────────────────────────
  if (!body.avanza) {
    const s = Math.max(1, Math.round(Number(body.season)))
    const e = Math.max(1, Math.round(Number(body.episode)))
    if (!Number.isFinite(s) || !Number.isFinite(e)) {
      return NextResponse.json({ error: 'Stagione o episodio non validi' }, { status: 400 })
    }
    const ok = await setWatchProgress(id, { season: s, episode: e })
    if (!ok) return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 502 })
    return NextResponse.json({ success: true, season: s, episode: e, finita: false })
  }

  // ── +1 episodio ───────────────────────────────────────────────────────────
  const info = await seriesProgressInfo(item.tmdbId ?? 0)
  if (info) {
    await setWatchProgress(id, { totalSeasons: info.totalSeasons, totalEpisodes: info.totalEpisodes, nextAirDate: info.nextAirDate })
  }

  // chi non ha ancora un segnaposto parte dal primo episodio
  let season = item.season ?? 1
  let episode = (item.episode ?? 0) + 1

  const inQuestaStagione = info?.episodiPerStagione?.[season]
  if (inQuestaStagione && episode > inQuestaStagione) {
    season += 1
    episode = 1
  }

  // oltre l'ultima stagione: la serie è finita
  const finita = !!info?.totalSeasons && season > info.totalSeasons
  if (finita) {
    await setWatchItemSeen(id, true)
    return NextResponse.json({ success: true, finita: true, season: item.season, episode: item.episode })
  }

  const ok = await setWatchProgress(id, { season, episode })
  if (!ok) return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 502 })
  return NextResponse.json({ success: true, season, episode, finita: false })
}
