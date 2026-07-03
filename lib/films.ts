// Sezione "Da guardare" — il cervello (logica ispirata a TV Time).
//
// FASE 1 (veloce, alla richiesta): l'utente scrive un titolo secco ("quo vado")
// o una richiesta di consiglio ("commedia stile quo vado") → Claude risponde
// con 1 risultato (titolo) o 3-4 proposte (consiglio), usando PRIMA il catalogo
// locale già salvato e la ricerca web solo per colmare i buchi.
//
// FASE 2 (in background, dopo la risposta): ricerca più larga che salva nel
// catalogo ~12-15 titoli affini → le prossime richieste simili costano zero.
//
// Stesso schema e modello di lib/trip-enrich.ts (nessun modello nuovo).

import { getFreshCatalog, saveCatalogFilms, type CatalogFilm } from "./supabase";

const MODEL = "claude-sonnet-4-5";

type Msg = { role: string; content: unknown };

async function callClaude(userContent: string, maxSearches: number): Promise<string> {
  const messages: Msg[] = [{ role: "user", content: userContent }];
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: maxSearches,
      user_location: { type: "approximate", country: "IT", timezone: "Europe/Rome" },
    },
  ];

  for (let guard = 0; guard < 5; guard++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 2048, messages, tools }),
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

/** Una proposta per la watchlist (fase 1). */
export interface FilmPick {
  title: string;
  kind: "film" | "serie";
  platform: string | null; // dove si vede in Italia oggi
  info: string | null;     // una riga: genere/anno/di cosa parla; serie: stagioni, in corso?
  link: string | null;
}

function extractJson(raw: string): string {
  const a = raw.indexOf("["), b = raw.lastIndexOf("]");
  if (a >= 0 && b > a) return raw.slice(a, b + 1);
  const c = raw.indexOf("{"), d = raw.lastIndexOf("}");
  return raw.slice(c, d + 1);
}

function catalogLines(cat: CatalogFilm[]): string {
  if (cat.length === 0) return "(vuoto)";
  return cat
    .map((f) => `- ${f.title} | ${f.kind} | ${f.genres ?? "-"} | ${f.platform ?? "?"} | ${f.info ?? ""}`)
    .join("\n");
}

function parsePicks(raw: string): FilmPick[] {
  const parsed = JSON.parse(extractJson(raw)) as unknown;
  const arr = Array.isArray(parsed) ? parsed : (parsed as { films?: unknown[] })?.films;
  if (!Array.isArray(arr)) return [];
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  return arr
    .map((f) => {
      const o = f as Record<string, unknown>;
      const title = str(o.title);
      if (!title) return null;
      return {
        title,
        kind: o.kind === "serie" ? ("serie" as const) : ("film" as const),
        platform: str(o.platform),
        info: str(o.info),
        link: str(o.link)?.startsWith("http") ? str(o.link) : null,
      };
    })
    .filter((f): f is FilmPick => f !== null)
    .slice(0, 6);
}

/** FASE 1: risposta veloce (titolo secco → 1 risultato; consiglio → 3-4 proposte). */
export async function suggestWatch(query: string): Promise<FilmPick[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  const catalogo = await getFreshCatalog(60);

  const prompt = `Richiesta dell'utente per la sua lista "da guardare" (Italia): "${query}"

CATALOGO LOCALE già verificato di recente — USA PRIMA QUESTO, cerca sul web solo se non basta:
${catalogLines(catalogo)}

Due casi:
- La richiesta è un TITOLO SPECIFICO ("quo vado", "aggiungi Breaking Bad") → 1 solo risultato:
  quel titolo esatto, con dove si vede OGGI in Italia.
- La richiesta è un CONSIGLIO ("commedia stile quo vado", "una serie crime corta") → 3-4
  proposte azzeccate, possibilmente su piattaforme DIVERSE così l'utente sceglie.

Rispondi SOLO con un JSON, nessun altro testo:
{"films":[{"title":"…","kind":"film" o "serie","platform":"Netflix / Prime Video / RaiPlay / cinema / …" oppure null,"info":"una riga: genere, anno, perché c'entra; per le serie anche stagioni e se in corso","link":"https://…" oppure null}]}

Regole:
- "platform": SOLO se verificata (dal catalogo o dalla ricerca), per l'ITALIA. Mai inventata.
- "info": massimo una riga, in italiano.
- Niente prezzi. Se un dato non è certo: null.`;

  const raw = await callClaude(prompt, 3);
  try {
    return parsePicks(raw);
  } catch {
    console.error("suggestWatch: JSON non valido:", raw.slice(0, 300));
    return [];
  }
}

/** FASE 2 (background): allarga la ricerca e salva ~12-15 titoli affini nel catalogo. */
export async function deepenFilmCatalog(query: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;

  const prompt = `Un utente italiano ha chiesto per la sua watchlist: "${query}"

Costruisci una lista di 12-15 titoli AFFINI a questa richiesta (film e/o serie), pensando
a cosa potrebbe chiedere di simile in futuro. Per ciascuno verifica con la ricerca web
dove si vede OGGI in Italia (piattaforma streaming o TV).

Rispondi SOLO con un JSON array, nessun altro testo:
[{"title":"…","kind":"film" o "serie","genres":"es. commedia, italiano","platform":"…" oppure null,"info":"una riga","link":"https://…" oppure null}]

Regole: piattaforme solo verificate e per l'Italia, niente prezzi, niente titoli inventati.`;

  try {
    const raw = await callClaude(prompt, 6);
    const parsed = JSON.parse(extractJson(raw)) as unknown[];
    if (!Array.isArray(parsed)) return;
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const films: CatalogFilm[] = parsed
      .map((f) => {
        const o = f as Record<string, unknown>;
        const title = str(o.title);
        if (!title) return null;
        return {
          title,
          kind: o.kind === "serie" ? "serie" : "film",
          genres: str(o.genres),
          platform: str(o.platform),
          info: str(o.info),
          link: str(o.link)?.startsWith("http") ? str(o.link) : null,
        };
      })
      .filter((f): f is CatalogFilm => f !== null);
    if (films.length > 0) await saveCatalogFilms(films);
  } catch (e) {
    console.error("deepenFilmCatalog fallita (non blocca nulla):", e);
  }
}
