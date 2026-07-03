/* Ricava un orario "HH:MM" dal testo di un to-do scritto in italiano.
 *
 * Regole, in ordine di priorità:
 *   1. orario esplicito:  "15:00", "15.30", "alle 9"      → quello
 *   2. momento del giorno: "stamattina", "pomeriggio", …  → orario di default
 *   3. niente di tutto ciò                                 → null (nessuna notifica)
 *
 * È un parser volutamente semplice (regex, nessuna AI): se scrivi qualcosa
 * di strano semplicemente non trova l'orario e il to-do resta senza notifica.
 */

/* Momenti della giornata → orario di default. */
const DAY_PART: Array<[RegExp, string]> = [
  [/\bstamattina\b|\bmattin/i, "09:00"],
  [/\bmezzogiorno\b|\bpranzo\b/i, "13:00"],
  [/\bpomeriggio\b/i, "14:30"],
  [/\bcena\b/i, "20:00"],
  [/\bstasera\b|\bsera(ta)?\b/i, "19:00"],
  [/\bstanotte\b|\bnotte\b/i, "22:00"],
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseTodoTime(text: string): string | null {
  // 1a. "15:00" o "15.30"
  const hm = text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h <= 23 && m <= 59) return `${pad(h)}:${pad(m)}`;
  }

  // 1b. "alle 9" / "alle 18" (ora piena)
  const alle = text.match(/\balle?\s+(\d{1,2})\b/i);
  if (alle) {
    let h = Number(alle[1]);
    if (h <= 23) {
      // "alle 3 di pomeriggio/sera" → pomeridiano
      if (h < 12 && /pomeriggio|sera/i.test(text)) h += 12;
      return `${pad(h)}:00`;
    }
  }

  // 2. momento del giorno
  for (const [re, time] of DAY_PART) {
    if (re.test(text)) return time;
  }

  return null;
}

/* Ripulisce il testo del to-do prima di salvarlo:
 *   - toglie le indicazioni d'orario ("alle 15", "18:30", "oggi pomeriggio"…)
 *     perché l'orario è già mostrato nel chip accanto
 *   - maiuscola iniziale, spazi doppi via, niente punteggiatura appesa
 * NON tocca le parole con significato (es. "cena da Marco" resta così:
 * togliere "cena" cambierebbe il senso). */
export function cleanTodoText(text: string): string {
  let out = text
    // "alle 15", "alle 15:30"
    .replace(/\balle?\s+\d{1,2}(?:[:.]\d{2})?\b/gi, " ")
    // "15:00", "18.30"
    .replace(/\b\d{1,2}[:.]\d{2}\b/g, " ")
    // avverbi di tempo che non aggiungono nulla al titolo
    .replace(/\b(?:oggi pomeriggio|nel pomeriggio|in mattinata|in serata|stamattina|stasera|stanotte|oggi)\b/gi, " ")
    // pasto usato come riferimento d'orario ("prima di pranzo", "dopo cena")
    // NB: "cena da Marco" resta intero, lì la cena è l'attività stessa
    .replace(/\b(?:prima di|dopo|verso|all'ora di|a ora di|ora di)\s+(?:pranzo|cena|colazione)\b/gi, " ")
    // preposizioni rimaste appese in fondo ("chiamare il dentista di")
    .replace(/\s+(?:di|a|da|in|il|la|per)\s*$/i, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.;:!-]+|[\s,.;:!-]+$/g, "")
    .trim();

  if (!out) return text.trim(); // se ripulendo resta vuoto, meglio l'originale
  return out.charAt(0).toUpperCase() + out.slice(1);
}
