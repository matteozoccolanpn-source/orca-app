import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProfile, saveWorkoutPlan, type WorkoutWeek } from '@/lib/supabase'
import { spendAi, claudeFetch, isAiCapReached, AI_CAP_MESSAGE } from '@/lib/ai'

// S2 rework allenamento — L0: genera una scheda BASE dal profilo (per chi non ha
// il PDF del professionista). Stessa pipeline dell'upload: Claude → week JSON →
// saveWorkoutPlan (che SOSTITUISCE l'eventuale scheda precedente). Auth-guarded.
export const maxDuration = 60

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getProfile()
  if (!profile) {
    return NextResponse.json({ error: 'Compila prima il profilo qui sopra' }, { status: 400 })
  }

  const palestra = profile.sessioni?.palestra ?? 0
  const corsa = profile.sessioni?.corsa ?? 0
  if (palestra + corsa === 0) {
    return NextResponse.json({ error: 'Nel profilo non hai indicato sessioni: aggiungine almeno una' }, { status: 400 })
  }

  const righe = [
    `- Obiettivo: ${profile.obiettivo ?? 'stare in forma'}`,
    `- Livello: ${profile.livello ?? 'principiante'}`,
    `- Sessioni a settimana: ${palestra} di palestra, ${corsa} di corsa`,
    profile.vincoli ? `- Vincoli/infortuni: ${profile.vincoli}` : null,
    profile.stile ? `- Stile preferito: ${profile.stile === 'duro' ? 'tosto ma sostenibile' : 'rilassato, senza pressione'}` : null,
  ].filter(Boolean).join('\n')

  // Tetto costi (K6): generare una settimana intera è un'operazione pesante → vale 5.
  try {
    await spendAi('piano')
  } catch (e) {
    if (isAiCapReached(e)) return NextResponse.json({ error: AI_CAP_MESSAGE }, { status: 429 })
    throw e
  }

  const claudeRes = await claudeFetch({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: `${WORKOUT_GENERATE_PROMPT}\n\nProfilo dell'utente:\n${righe}` }],
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    console.error('Claude API error (workout generate):', err)
    return NextResponse.json({ error: 'Keiko non ha risposto: ' + err.slice(0, 200) }, { status: 502 })
  }

  const claudeData = await claudeRes.json()
  const rawText = claudeData.content?.[0]?.text ?? ''

  let parsed: { week: WorkoutWeek; note?: string }
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    console.error('Workout generate parse failed. len=', rawText.length)
    return NextResponse.json({ error: 'Non sono riuscita a preparare la scheda, riprova.' }, { status: 422 })
  }

  if (!parsed.week || typeof parsed.week !== 'object') {
    return NextResponse.json({ error: 'Scheda generata senza una settimana valida' }, { status: 422 })
  }

  try {
    await saveWorkoutPlan(parsed.week)
  } catch (e) {
    console.error('Workout generate save error:', e)
    const msg = e instanceof Error ? e.message : 'errore sconosciuto'
    return NextResponse.json({ error: 'Salvataggio fallito: ' + msg }, { status: 502 })
  }

  return NextResponse.json({ success: true, week: parsed.week, note: parsed.note ?? '' })
}

const WORKOUT_GENERATE_PROMPT = `Sei Keiko, un'assistente che prepara una scheda di allenamento settimanale DI BASE a partire dal profilo dell'utente. Restituisci SOLO un oggetto JSON valido — nessuna spiegazione, nessun markdown, nessun code fence, nessun testo attorno.

Formato ESATTO (stesso della lettura schede):
{
  "week": {
    "lun": { "titolo": "Full body A", "esercizi": [ { "nome": "Panca piana manubri", "dettaglio": "3x10, carico gestibile" } ] },
    "mar": { "titolo": "", "esercizi": [] },
    "mer": {}, "gio": {}, "ven": {}, "sab": {}, "dom": {}
  },
  "note": ""
}

Regole:
- Chiavi giorni ESATTAMENTE: lun, mar, mer, gio, ven, sab, dom. Giorno di riposo = "esercizi": [].
- Rispetta il NUMERO di sessioni del profilo: le sessioni di palestra sono giorni con esercizi in sala; le sessioni di corsa sono giorni con UNA voce tipo { "nome": "Corsa facile", "dettaglio": "30-40 min, ritmo comodo" }.
- Distribuisci le sessioni in modo sensato (recupero tra sessioni simili; es. 2 palestre + 2 corse → lun palestra, mar corsa, gio palestra, sab corsa).
- Esercizi COMUNI, sicuri e adatti al livello: per un principiante 5-7 esercizi a sessione, macchine e manubri semplici, niente tecniche avanzate.
- "dettaglio": serie x ripetizioni + indicazione di carico RELATIVA ("carico gestibile", "leggero", "ultimo set impegnativo"). MAI kg assoluti: non conosci i suoi carichi.
- RISPETTA i vincoli/infortuni: se indicati, evita gli esercizi a rischio e proponi alternative sicure (es. ginocchio delicato → niente salti/affondi profondi, meglio leg press parziale, cyclette).
- Stile "rilassato" → volumi contenuti e progressione dolce; "tosto" → volumi un po' più alti ma sempre sostenibili.
- In "note" scrivi UNA riga con le assunzioni fatte (es. "Ho ipotizzato sessioni da ~45 min; carichi da tarare la prima settimana").
- Restituisci SOLO il JSON.`
