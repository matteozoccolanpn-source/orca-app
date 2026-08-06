import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { saveBeatState } from '@/lib/supabase'

// La ✕ sulla card di un battito: chiude QUEL battito per sempre.
// Piccola apposta: scrive un campo dentro enrichment.beats e basta. La RLS fa
// il resto — si può chiudere solo un evento proprio.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; battito?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const id = (body.id ?? '').trim()
  const battito = (body.battito ?? '').trim()
  // "prima" e "dopo" sono le uniche chiavi che la tabella dei battiti usa:
  // qualsiasi altra cosa non la scriviamo.
  if (!id || (battito !== 'prima' && battito !== 'dopo')) {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  }

  await saveBeatState(id, battito, 'chiuso')
  return NextResponse.json({ success: true })
}
