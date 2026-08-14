import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getPastiAnnotati,
  annotaPasto,
  togliAnnotazione,
  getGiorniAnnotati,
  type StatoPasto,
} from '@/lib/supabase'

/* IL REGISTRO DEI PASTI (blocco 7).
 *
 * Matteo dice cosa ha mangiato, Keiko lo scrive. Punto.
 *
 *   GET  ?giorno=YYYY-MM-DD        -> { pasti }   le annotazioni di un giorno
 *   GET  ?storico=1&prima=...      -> { giorni, altri }   lo storico, a pagine
 *   POST { giorno, indice, pasto, stato, testo?, ricettaId?, foto? } -> { pasto }
 *   POST { azione:"togli", giorno, indice } -> { success }
 *
 * ⚠️ QUESTA ROTTA NON TOCCA `diet_plan`. Il piano è della nutrizionista e si
 * legge soltanto; qui si scrive solo `diet_log`, che è un fatto su Matteo.
 * E non confronta niente fra i due: nessuna aderenza, nessuna percentuale.
 * Vedi la regola 3-decies di docs/UI-DECISIONI-V2.md.
 */

const STATI: StatoPasto[] = ['seguito', 'altro', 'saltato']
const GIORNO = /^\d{4}-\d{2}-\d{2}$/

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  try {
    if (url.searchParams.get('storico')) {
      const prima = url.searchParams.get('prima')
      return NextResponse.json(await getGiorniAnnotati(prima && GIORNO.test(prima) ? prima : null, 8))
    }
    const giorno = (url.searchParams.get('giorno') ?? '').trim()
    if (!GIORNO.test(giorno)) return NextResponse.json({ error: 'Giorno non valido' }, { status: 400 })
    return NextResponse.json({ pasti: await getPastiAnnotati(giorno) })
  } catch (e) {
    console.error('Registro pasti GET:', e)
    return NextResponse.json({ error: 'Lettura fallita' }, { status: 502 })
  }
}

type Body = {
  azione?: string
  giorno?: string
  indice?: number
  pasto?: string
  stato?: string
  testo?: string
  ricettaId?: string
  foto?: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body non valido' }, { status: 400 }) }

  const giorno = (body.giorno ?? '').trim()
  const indice = Number(body.indice)
  if (!GIORNO.test(giorno)) return NextResponse.json({ error: 'Giorno non valido' }, { status: 400 })
  if (!Number.isInteger(indice) || indice < 0 || indice > 20) {
    return NextResponse.json({ error: 'Pasto non valido' }, { status: 400 })
  }

  try {
    if (body.azione === 'togli') {
      await togliAnnotazione(giorno, indice)
      return NextResponse.json({ success: true })
    }

    /* Lo stato si accetta solo se e' uno dei tre: sono l'intero vocabolario
       del blocco, e una parola qualsiasi in tabella vorrebbe dire che nessuno
       sa piu' cosa significa quella riga. Stesso paletto della disciplina. */
    if (!STATI.includes((body.stato ?? '') as StatoPasto)) {
      return NextResponse.json({ error: 'Stato non valido' }, { status: 400 })
    }
    const pasto = (body.pasto ?? '').trim()
    if (!pasto) return NextResponse.json({ error: 'Nome del pasto mancante' }, { status: 400 })

    const salvato = await annotaPasto({
      giorno,
      indice,
      pasto,
      stato: body.stato as StatoPasto,
      testo: body.testo,
      ricettaId: body.ricettaId?.trim() || null,
      foto: body.foto?.trim() || null,
    })
    if (!salvato) return NextResponse.json({ error: 'Salvataggio fallito' }, { status: 502 })
    return NextResponse.json({ pasto: salvato })
  } catch (e) {
    console.error('Registro pasti POST:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }
}
