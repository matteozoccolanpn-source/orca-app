import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import mammoth from "mammoth";
import { spendAi, claudeFetch, isAiCapReached, AI_CAP_MESSAGE } from "@/lib/ai";
import {
  createTripDocument,
  saveTripFacts,
  markTripDocumentError,
  assegnaTripKey,
  resolveGiorno,
  type FactKind,
  type NuovoFatto,
} from "@/lib/trip-docs";

/* VIAGGI — il viaggio caricato da fuori, PARTE 1.1/1.2/1.4
 * (docs/PROMPT-CODE-20-VIAGGI-DOCUMENTI.md).
 *
 * Un file = una chiamata a Claude = un `trip_documents`. Se un file non si
 * legge, si segna in errore e SI CONTINUA con gli altri (§1.1) — tranne se
 * l'errore è il tetto AI esaurito, che vale per tutti e ferma il giro.
 *
 * .docx → mammoth estrae il testo (verbatim, ce l'abbiamo già: non serve
 * chiedere a Claude di trascriverlo). PDF/immagine → Claude legge il
 * documento nativamente (stesso blocco `document` di diet/workout upload) e
 * QUESTA volta gli si chiede anche una trascrizione verbatim, perché senza
 * Storage (decisione di Matteo, 27 agosto 2026) quella trascrizione È la
 * fonte conservata: non c'è il file originale a cui tornare.
 *
 * Il peso AI: come "piano" (5), non "cattura" — leggere un programma di 15
 * giorni è dello stesso ordine di grandezza di leggere una dieta o una
 * scheda intera (che infatti pesano uguale). "cattura" (1) è per PARTE 2, la
 * domanda su un viaggio già caricato: lì lo dice esplicitamente il documento. */

export const maxDuration = 120; // più file in un giro solo: il 60s di diet/workout è per UN documento

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const KIND_VALIDI: FactKind[] = ["volo", "treno", "hotel", "visita", "contatto", "altro"];

function isDocx(file: File): boolean {
  return file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");
}

interface FattoGrezzo {
  tipo?: string;
  giorno?: string;
  ora?: string;
  ora_fine?: string;
  cosa?: string;
  dove?: string;
  codice?: string;
  testo?: string;
}
interface RispostaModello {
  destinazione?: string;
  fatti?: FattoGrezzo[];
  testo_completo?: string;
  avvisi?: string[];
}

function istruzioni(serveTrascrizione: boolean): string {
  return `Sei Keiko. Ti do un documento di viaggio (un programma d'agenzia, un voucher, un biglietto). Estrai SOLO quello che c'è scritto — niente parafrasi, niente completamento col buon senso, niente calcolo di durate o conversioni di fuso orario.

Rispondi SOLO con un oggetto JSON valido, nessun testo intorno, nessun blocco di codice.

Formato ESATTO:
{
  "destinazione": "il paese o la città principale del viaggio, es. \\"Cina\\"",
  "fatti": [
    {
      "tipo": "volo | treno | hotel | visita | contatto | altro",
      "giorno": "il giorno COSÌ COM'È SCRITTO, senza anno se il documento non lo scrive (es. \\"29 ago\\", \\"Sep 01\\")",
      "ora": "l'ora di inizio ESATTAMENTE come scritta (es. \\"18H50\\", \\"07:55\\"), o null se non c'è",
      "ora_fine": "l'ora di fine se il documento la dà, altrimenti null",
      "cosa": "una riga breve: cosa è (es. \\"Volo CA750\\", \\"Sun World Hotel Beijing\\")",
      "dove": "il luogo, se c'è, altrimenti null",
      "codice": "il codice di prenotazione (PNR), SOLO se è scritto esplicitamente — molti programmi d'agenzia non lo danno: in quel caso null, non il numero di volo/treno",
      "testo": "il pezzo di testo originale da cui viene questo fatto, verbatim, senza parafrasarlo"
    }
  ],${serveTrascrizione ? '\n  "testo_completo": "trascrizione VERBATIM, parola per parola, di OGNI riga leggibile del documento — non riassumere, non accorciare, non correggere, non tradurre, non saltare righe per farla stare in meno spazio. Se il documento è lungo, trascrivilo TUTTO comunque: qui non c\'è nessun altro posto dove questo testo resta conservato.",' : ""}
  "avvisi": ["una riga per ogni parte che non sei riuscito a leggere con certezza, es. un nome di mese abbreviato in modo insolito, o se hai dovuto interrompere la trascrizione per mancanza di spazio"]
}

Regole:
- Un fatto per ogni evento con un orario o una prenotazione (volo, treno, hotel, visita guidata, un referente locale con un numero da chiamare).
- Un fatto anche per ogni attività FACOLTATIVA con un prezzo indicato (es. "spettacolo serale opzionale, 372 CNY a persona") anche se non ha un orario esatto: il prezzo è un'informazione che altrimenti si perde.
- Un CONTATTO (referente locale, numero d'emergenza) ha SEMPRE un "giorno": è quello in cui il programma lo nomina per la prima volta, anche se il contatto stesso non ha un orario. Senza il giorno, chi legge non sa quando quel numero serve.
- NON calcolare l'anno delle date, NON sommare o convertire orari, NON dedurre fusi orari: lascia "giorno" e "ora" esattamente come il documento li scrive.
- Se un dato non c'è, usa null. Non inventare mai un codice di prenotazione, un orario o un indirizzo che non è scritto.
- Mantieni l'italiano per "tipo", il resto nella lingua del documento.${serveTrascrizione ? "\n- \"testo_completo\" NON è un riassunto: è la fonte che resta, l'unica copia del documento che l'app conserva. Un errore di trascrizione qui è meno grave di una riga saltata — se non sei sicuro di una parola, trascrivi comunque quello che vedi." : ""}`;
}

interface RisultatoElaborazione {
  fileName: string;
  status: "ok" | "error";
  error?: string;
  tripKey?: string;
  nuovo?: boolean;
  destinazione?: string;
  fattiSalvati?: number;
  avvisi?: string[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  // Se il client sta già guardando un viaggio, un file che fallisce ci si
  // attacca comunque (invece di finire in un "senza-viaggio" che nessuno apre
  // più): vedi `erroreFile`.
  const tripKeyHint = ((formData.get("tripKeyHint") as string | null) ?? "").trim() || null;

  const risultati: RisultatoElaborazione[] = [];
  for (const file of files) {
    try {
      risultati.push(await elaboraFile(file, tripKeyHint));
    } catch (e) {
      if (isAiCapReached(e)) return NextResponse.json({ error: AI_CAP_MESSAGE }, { status: 429 });
      console.error("[trip-docs] file fallito:", file.name, e);
      risultati.push(await erroreFile(file, tripKeyHint, e instanceof Error ? e.message : "errore sconosciuto"));
    }
  }
  return NextResponse.json({ risultati });
}

/* Registra DAVVERO il fallimento — non solo nella risposta HTTP di questo
 * giro, che sparisce se l'utente chiude la pagina. Senza questa riga
 * `status`/`error_message` di trip_documents non venivano mai scritte
 * (trovato da Matteo il 27 agosto 2026): un file che non si legge in aeroporto
 * deve restare visibile anche tornando sulla pagina più tardi. */
async function erroreFile(file: File, tripKeyHint: string | null, messaggio: string): Promise<RisultatoElaborazione> {
  try {
    await createTripDocument({
      tripKey: tripKeyHint || "senza-viaggio",
      destination: "—",
      fileName: file.name,
      mimeType: file.type || "sconosciuto",
      extractedText: "",
      status: "error",
      errorMessage: messaggio,
    });
  } catch (e) {
    // Anche scrivere la riga di errore può fallire: non si nasconde il primo
    // guasto dietro il secondo, si registra e si passa comunque il messaggio
    // originale a chi ha chiamato.
    console.error("[trip-docs] impossibile registrare l'errore per", file.name, e);
  }
  return { fileName: file.name, status: "error", error: messaggio };
}

async function elaboraFile(file: File, tripKeyHint: string | null): Promise<RisultatoElaborazione> {
  const fileName = file.name;
  let extractedText = "";
  let content: object[] = [];
  let serveTrascrizione = false;

  if (isDocx(file)) {
    const buf = Buffer.from(await file.arrayBuffer());
    const estratto = await mammoth.extractRawText({ buffer: buf });
    extractedText = estratto.value.trim();
    if (!extractedText) return erroreFile(file, tripKeyHint, "Il documento sembra vuoto: non ci ho trovato testo leggibile.");
    content = [{ type: "text", text: extractedText }];
  } else if (file.type === "application/pdf") {
    if (file.size > 20 * 1024 * 1024) return erroreFile(file, tripKeyHint, "PDF troppo grande (max 20MB)");
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }];
    serveTrascrizione = true;
  } else if (file.type.startsWith("image/")) {
    if (file.size > 10 * 1024 * 1024) return erroreFile(file, tripKeyHint, "Immagine troppo grande (max 10MB)");
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    content = [{ type: "image", source: { type: "base64", media_type: file.type, data: b64 } }];
    serveTrascrizione = true;
  } else {
    return erroreFile(file, tripKeyHint, "Formato non riconosciuto: serve un PDF, un'immagine o un .docx");
  }

  content.push({ type: "text", text: istruzioni(serveTrascrizione) });

  await spendAi("piano");
  const res = await claudeFetch(
    // 16000 come diet/workout: quando serveTrascrizione=true la risposta porta
    // sia i fatti sia il testo intero — un programma lungo può sforare 8000
    // e tagliare proprio la trascrizione, che qui è la fonte conservata.
    { model: "claude-sonnet-4-5", max_tokens: 16000, messages: [{ role: "user", content }] },
    undefined,
    { operazione: "piano", modello: "claude-sonnet-4-5" }
  );
  if (!res.ok) {
    const err = await res.text();
    console.error("[trip-docs] Claude API error:", err);
    return erroreFile(file, tripKeyHint, "Keiko non è riuscita a leggere questo file.");
  }

  const data = await res.json();
  const testo = (data.content ?? [])
    .filter((b: { type?: string }) => b.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("");

  let parsed: RispostaModello;
  try {
    parsed = JSON.parse(testo.replace(/```json|```/g, "").trim());
  } catch {
    console.error("[trip-docs] risposta non-JSON:", testo.slice(0, 300));
    return erroreFile(file, tripKeyHint, "La lettura non ha prodotto una struttura valida.");
  }

  if (serveTrascrizione) extractedText = (parsed.testo_completo ?? "").trim() || "(nessun testo leggibile trovato)";

  const destinazione = (parsed.destinazione ?? "").trim() || "Viaggio";
  const caricatoIl = new Date();
  const fattiGrezzi = Array.isArray(parsed.fatti) ? parsed.fatti : [];
  const fattiRisolti = fattiGrezzi
    .filter((f) => (f.cosa ?? "").trim().length > 0)
    .map((f) => {
      const { day, incerto } = resolveGiorno(f.giorno, caricatoIl);
      const kindGrezzo = (f.tipo ?? "altro").trim().toLowerCase();
      const kind = (KIND_VALIDI as string[]).includes(kindGrezzo) ? (kindGrezzo as FactKind) : "altro";
      const fatto: NuovoFatto = {
        kind,
        day,
        time_text: f.ora?.trim() || null,
        time_end_text: f.ora_fine?.trim() || null,
        title: (f.cosa ?? "").trim().slice(0, 200),
        place: f.dove?.trim() || null,
        reference: f.codice?.trim() || null,
        raw_text: (f.testo ?? f.cosa ?? "").trim().slice(0, 1000),
      };
      return { fatto, incerto };
    });

  const giorni = fattiRisolti.map((f) => f.fatto.day).filter((d): d is string => !!d);
  const minDay = giorni.length ? giorni.reduce((a, b) => (b < a ? b : a)) : null;
  const maxDay = giorni.length ? giorni.reduce((a, b) => (b > a ? b : a)) : null;

  const { tripKey, nuovo } = await assegnaTripKey(destinazione, minDay, maxDay);
  const { id: documentId } = await createTripDocument({
    tripKey,
    destination: destinazione,
    fileName,
    mimeType: file.type || (isDocx(file) ? DOCX_MIME : "text/plain"),
    extractedText,
    status: "ok",
  });
  try {
    await saveTripFacts(
      documentId,
      fattiRisolti.map((f) => f.fatto)
    );
  } catch (e) {
    // Il documento è già scritto 'ok': senza questa correzione resterebbe
    // così, con zero fatti — un successo finto mentre la risposta all'utente
    // dice "errore". Si marca la riga vera invece di lasciarla contraddire
    // quello che si sta per rispondere.
    console.error("[trip-docs] salvataggio fatti fallito, correggo la riga a 'error':", e);
    const msg = "Il documento è stato letto ma il salvataggio dei fatti è fallito: riprova a caricarlo.";
    await markTripDocumentError(documentId, msg).catch((e2) => console.error("[trip-docs] anche la correzione è fallita:", e2));
    return { fileName, status: "error", error: msg };
  }

  const avvisi = [...(parsed.avvisi ?? [])];
  const incerti = fattiRisolti.filter((f) => f.incerto).length;
  if (incerti > 0) {
    avvisi.push(
      `${incerti} data${incerti > 1 ? "e" : ""} troppo lontan${incerti > 1 ? "e" : "a"} dalla data di caricamento: non ho indovinato l'anno, controllala tu.`
    );
  }

  return { fileName, status: "ok", tripKey, nuovo, destinazione, fattiSalvati: fattiRisolti.length, avvisi };
}
