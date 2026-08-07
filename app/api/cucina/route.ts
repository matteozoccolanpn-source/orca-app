import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveRecipe, deleteRecipe } from '@/lib/supabase'

// Il ricettario: salva e togli. Niente contenuto dei creator in tabella —
// solo il link, il titolo e la miniatura pubblica (docs/SPEC-CUCINA.md).

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { title?: string; url?: string; thumbnail?: string | null; author?: string | null; platform?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const title = (body.title ?? '').trim()
  const url = (body.url ?? '').trim()
  if (!title || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Serve un titolo e un link' }, { status: 400 })
  }

  try {
    const ricetta = await saveRecipe({
      title,
      url,
      thumbnail: body.thumbnail ?? null,
      author: body.author ?? null,
      platform: body.platform ?? 'web',
    })
    return NextResponse.json({ success: true, ricetta })
  } catch (e) {
    console.error('[cucina] salvataggio fallito:', e)
    return NextResponse.json({ error: 'Non salvata, riprova' }, { status: 502 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = (req.nextUrl.searchParams.get('id') ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Serve l\'id' }, { status: 400 })

  try {
    const tolta = await deleteRecipe(id)
    // Non era tua (o non c'è più): si dice, invece di far finta di sì.
    if (!tolta) return NextResponse.json({ error: 'Ricetta non trovata' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[cucina] eliminazione fallita:', e)
    return NextResponse.json({ error: 'Non eliminata, riprova' }, { status: 502 })
  }
}
