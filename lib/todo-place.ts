// Arricchisce un to-do con Claude + ricerca web. Due casi:
//  1. LUOGO: "Ritirare patente all'agenzia vicino Linklaters Milano"
//     → { location: "Agenzia ..., Via ..., Milano", phone: "+39 ..." }
//  2. EVENTO da vedere: "vedi gara sabato", "spettacolo balletto in TV"
//     → { title: "GP Gran Bretagna", time: "16:00",
//         info: "Diretta Sky F1 · differita TV8 18:30",
//         link: classifica, linkLabel: "Classifica" }
//
// Stesso schema e modello di lib/trip-enrich.ts (nessun modello nuovo).
// Il tool web-search costa $10 ogni 1000 ricerche: la chiamata parte SOLO
// per i to-do che sembrano contenere un luogo o un evento.

const MODEL = "claude-sonnet-4-5";

type Msg = { role: string; content: unknown };

/** Il testo sembra contenere un luogo da raggiungere? (stessa euristica della UI) */
export function looksLikePlace(text: string): boolean {
  if (/\bvicino\b/i.test(text)) return true;
  return /(?:\bda\b|\bdal\b|\bdalla\b|\bal\b|\ballo\b|\balla\b|\ball'|\bin\b|\bpresso\b|@)\s*[A-ZÀ-Ý]/.test(text);
}

/** Il testo sembra riferirsi a un evento da vedere (gara, partita, spettacolo, TV)? */
export function looksLikeEvent(text: string): boolean {
  return /\b(?:gara|gran premio|gp\b|f1|motogp|partita|match|derby|finale|semifinale|spettacolo|balletto|concerto|opera|in tv|diretta)\b/i.test(text);
}

/** Serve l'arricchimento con Claude? */
export function shouldEnrichTodo(text: string): boolean {
  return looksLikePlace(text) || looksLikeEvent(text);
}

export interface ResolvedPlace {
  title: string | null;     // titolo breve e pulito del promemoria
  location: string | null;
  phone: string | null;
  time: string | null;      // "HH:MM" — orario dell'evento, se trovato
  info: string | null;      // riga informativa (es. dove vederlo in TV)
  link: string | null;      // link utile (es. classifica)
  linkLabel: string | null; // etichetta del bottone (es. "Classifica")
}

/** Chiama Claude col tool web-search (loop pause_turn come trip-enrich). */
async function callClaude(userContent: string): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userContent }];
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 3, // un to-do è una ricerca piccola: tetto basso
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 4; guard++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages, tools }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();

    if (data.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: data.content });
      continue;
    }

    const blocks = Array.isArray(data.content) ? data.content : [];
    return blocks
      .filter((b: { type?: string }) => b?.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("\n")
      .trim();
  }
  throw new Error("web-search: troppe pause_turn, interrotto");
}

/** Trova il posto vero citato nel to-do. Non lancia mai: se qualcosa va storto
 *  ritorna { null, null } e il to-do si salva comunque senza luogo. */
export async function resolveTodoPlace(text: string, day: string): Promise<ResolvedPlace> {
  const empty: ResolvedPlace = { title: null, location: null, phone: null, time: null, info: null, link: null, linkLabel: null };
  if (!process.env.ANTHROPIC_API_KEY) return empty;

  const prompt = `Testo di un promemoria personale (italiano): "${text}"
Il promemoria è per il giorno: ${day}

Tre compiti:

1. TITOLO: il più CORTO possibile (2-5 parole), italiano corretto. SENZA orario,
   SENZA "vicino a…", SENZA verbi generici quando il contesto è ovvio
   ("guardare", "vedere", "fare"): "vedi qualifiche f1" → "Qualifiche F1".
   Tieni il verbo solo se è l'azione vera: "Ritirare la patente".
   Se è un EVENTO da vedere, il titolo è SOLO il nome proprio dell'evento:
   "vedi gara sabato" → "Sprint GP Gran Bretagna" (quello che c'è in quel giorno).

2. LUOGO: se il testo indica un LUOGO FISICO PUBBLICO da raggiungere (negozio,
   ufficio, agenzia, ristorante…), cercalo sul web e individua il posto specifico.

3. EVENTO: se il testo si riferisce a un evento da VEDERE (gara F1/MotoGP, partita,
   spettacolo, balletto, concerto in TV…), cerca sul web QUALE evento è in quel
   giorno e trova: orario di inizio (ora italiana), dove vederlo in Italia
   (canale TV / streaming, diretta o differita) e un link utile
   (per gli sport: la classifica del campionato; altrimenti la pagina ufficiale).

Rispondi SOLO con un JSON, nessun altro testo:
{"title": "…",
 "location": "Nome attività, Via e civico, Città" oppure null,
 "phone": "+39 …" oppure null,
 "time": "HH:MM" oppure null,
 "info": "es. Diretta Sky Sport F1 · differita TV8 18:30" oppure null,
 "link": "https://…" oppure null,
 "link_label": "es. Classifica" oppure null}

Regole:
- "location" deve essere un POSTO trovabile su Google Maps (nome + indirizzo reale
  verificato). MAI un sito web o dominio, MAI inventato. Casa di una persona
  (es. "cena da Marco") o luogo ambiguo → null.
- "phone" solo se lo trovi per QUEL posto.
- "time"/"info"/"link" solo per gli eventi da vedere e solo se VERIFICATI con la
  ricerca: se non trovi l'informazione, null. Non inventare canali né orari.
- "info" massimo una riga.`;

  try {
    const raw = await callClaude(prompt);
    // A volte il JSON arriva dentro ```json ... ```: prendiamo la prima graffa.
    const jsonStr = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const location = str(parsed.location);
    const time = str(parsed.time);
    return {
      title: str(parsed.title),
      // Paracadute: se location sembra un dominio web, buttala via.
      location: location && /\.(it|com|net|org)\b/i.test(location.split(",")[0]) ? null : location,
      phone: str(parsed.phone),
      time: time && /^\d{1,2}:\d{2}$/.test(time) ? time.padStart(5, "0") : null,
      info: str(parsed.info),
      link: str(parsed.link)?.startsWith("http") ? str(parsed.link) : null,
      linkLabel: str(parsed.link_label),
    };
  } catch (e) {
    console.error("resolveTodoPlace fallita (il to-do si salva senza extra):", e);
    return empty;
  }
}
