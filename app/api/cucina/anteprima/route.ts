import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { piattaformaDelLink } from '../didascalia'
import { anteprima } from '../anteprima'

/* PARTE D — LA PORTA DEL LINK.
 *
 * Quando Matteo incolla un video invece di cercarlo (D.1, docs/PROMPT-CODE-18),
 * il foglio ha bisogno di QUALCOSA da mostrare in testa — titolo, autore,
 * miniatura — prima ancora che `/api/cucina/estrai` finisca di leggere i
 * passi, che può volerci qualche secondo. Questa rotta fa solo quello: la
 * stessa anteprima oEmbed che già disegna le card della ricerca.
 *
 * 🚫 Sui link «web» (blog, o Instagram — che non ha un oEmbed pubblico
 * utilizzabile senza autenticazione, misurato e chiuso) non c'è anteprima da
 * chiedere: il foglio si apre lo stesso, con un titolo segnaposto, e
 * `/api/cucina/estrai` prova comunque a leggere la pagina o a cercare. */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = (req.nextUrl.searchParams.get('url') ?? '').trim()
  if (!url.startsWith('http')) return NextResponse.json({ error: 'Serve un link' }, { status: 400 })

  const piattaforma = piattaformaDelLink(url)
  if (piattaforma === 'web') return NextResponse.json({ piattaforma, titolo: null, autore: null, miniatura: null })

  const ante = await anteprima(url, piattaforma)
  return NextResponse.json({ piattaforma, ...(ante ?? { titolo: null, autore: null, miniatura: null }) })
}
