import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRecipes, saveExtracted, type RicettaEstratta } from '@/lib/supabase'

/* I PASSI SCRITTI A MANO (docs/PROMPT-CODE-14, parte 3).
 *
 * Per le ricette che restano senza procedimento — i video, dove i passi si
 * dicono a voce — la via è una sola, e la fa Matteo: li scrive lui mentre
 * guarda, e da quel momento restano.
 *
 * ZERO MODELLO, ZERO COSTO. Qui non si chiama nessuno: si prende un elenco di
 * righe e lo si mette accanto agli ingredienti che c'erano già.
 *
 * 🚫 E soprattutto: NESSUNO INVENTA I PASSI. Non da un titolo, non dagli
 * ingredienti, non «per somiglianza» con un'altra ricetta. Una ricetta
 * sbagliata te la mangi — e chi legge un passo dentro Keiko non ha modo di
 * sapere che quel passo non l'ha scritto nessuno. Se non ci sono, la ricetta
 * resta senza passi e lo dice.
 *
 * Gli ingredienti NON si toccano: si riscrive solo `passi` dentro `extracted`.
 */

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { id?: string; passi?: unknown }
  const id = (body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Serve la ricetta' }, { status: 400 })

  const passi = (Array.isArray(body.passi) ? body.passi : [])
    .map((p) => String(p ?? '').replace(/\s+/g, ' ').trim().slice(0, 400))
    .filter((p) => p.length > 0)
    .slice(0, 30)

  /* La ricetta dev'essere SUA: `getRecipes` legge già solo le proprie (RLS), e
   * se l'id non è lì dentro non si scrive niente. Senza questo controllo un id
   * indovinato scriverebbe nel ricettario di un altro. */
  /* ⚠️ GUASTO NON GESTITO (giro finale): con la lettura caduta questa rotta
     risponde «Ricetta non trovata» — una bugia: la ricetta c'è, è il database
     che non risponde. Va separata in un 503 con la sua frase, e quello è il
     giro finale; qui il dato è soltanto diventato distinguibile. */
  const mia = ((await getRecipes()) ?? []).find((r) => r.id === id)
  if (!mia) return NextResponse.json({ error: 'Ricetta non trovata' }, { status: 404 })

  /* Quello che c'era resta: se l'estrazione aveva già tirato fuori gli
   * ingredienti, il tempo e le porzioni, non si perdono perché adesso stai
   * scrivendo il procedimento. E `insufficiente` se ne va: con dei passi
   * scritti da te, questa ricetta non è più «tutta nel video». */
  const prima = mia.extracted ?? {}
  const estratta: RicettaEstratta = {
    ingredienti: prima.ingredienti ?? [],
    passi,
    tempo: prima.tempo ?? null,
    porzioni: prima.porzioni ?? null,
  }

  try {
    await saveExtracted(id, estratta)
    return NextResponse.json({ estratta })
  } catch (e) {
    console.error('[cucina] passi non salvati:', e)
    return NextResponse.json({ error: 'Qualcosa non torna, riprovo' }, { status: 500 })
  }
}
