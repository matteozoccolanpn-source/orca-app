import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getShoppingItems,
  addShoppingItems,
  toggleShoppingItem,
  clearDoneShoppingItems,
  getDietPlan,
  type FonteSpesa,
} from '@/lib/supabase'
import { spesaDalPiano } from '@/lib/cucina'

/* CUCINA V2 — la lista della spesa (docs/SPEC-CUCINA.md §7).
 *
 * Una lista, due provenienze che non si mescolano mai nell'etichetta:
 *   `ricetta` → gli ingredienti che NON hai spuntato nel foglio ricetta;
 *   `piano`   → quello che serve per la settimana, letto dal piano.
 *
 * ⚠️ Il piano si LEGGE. Questa rotta non lo scrive, non lo modifica e non
 * confronta niente con le ricette: le due cose finiscono nella stessa lista
 * perché si comprano nello stesso negozio, non perché una sostituisca
 * l'altra. Nessuna quantità viene calcolata o sommata.
 *
 * Zero AI: qui non si chiama Claude. L'aggregazione dal piano è testo spezzato
 * su connettori (`spesaDalPiano`), e sbaglia in modo visibile e correggibile.
 */

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ voci: await getShoppingItems() })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    azione?: 'aggiungi' | 'dalPiano' | 'spunta' | 'svuotaFatti'
    voci?: { nome: string; quantita?: string | null }[]
    fonte?: FonteSpesa
    ref?: string | null
    id?: string
    spuntato?: boolean
  }

  try {
    switch (body.azione) {
      /* Dal foglio ricetta: arrivano i NON spuntati, cioè quello che manca. */
      case 'aggiungi': {
        const voci = (body.voci ?? []).slice(0, 40)
        if (voci.length === 0) return NextResponse.json({ voci: await getShoppingItems() })
        return NextResponse.json({
          voci: await addShoppingItems(
            voci.map((v) => ({
              nome: v.nome,
              quantita: v.quantita ?? null,
              fonte: body.fonte ?? 'ricetta',
              ref: body.ref ?? null,
            }))
          ),
        })
      }

      /* Dal piano della settimana. Sola lettura, e si ferma a 60 voci. */
      case 'dalPiano': {
        const piano = await getDietPlan()
        const dal = spesaDalPiano(piano?.week ?? null)
        if (dal.length === 0) return NextResponse.json({ voci: await getShoppingItems(), nessuna: true })
        return NextResponse.json({
          voci: await addShoppingItems(dal.map((v) => ({ ...v, fonte: 'piano' as FonteSpesa, ref: 'settimana' }))),
          aggiunte: dal.length,
        })
      }

      case 'spunta': {
        if (!body.id) return NextResponse.json({ error: 'Serve un id' }, { status: 400 })
        const fatto = await toggleShoppingItem(body.id, !!body.spuntato)
        if (!fatto) return NextResponse.json({ error: 'Voce non trovata' }, { status: 404 })
        return NextResponse.json({ ok: true })
      }

      /* Via quello che è già nel carrello. Cancella SOLO le righe spuntate e
       * solo le proprie: non è una pulizia a pattern. */
      case 'svuotaFatti': {
        const quante = await clearDoneShoppingItems()
        return NextResponse.json({ voci: await getShoppingItems(), tolte: quante })
      }

      default:
        return NextResponse.json({ error: 'Azione sconosciuta' }, { status: 400 })
    }
  } catch (e) {
    console.error('[cucina] spesa fallita:', e)
    return NextResponse.json({ error: 'Qualcosa non torna, riprovo' }, { status: 500 })
  }
}
