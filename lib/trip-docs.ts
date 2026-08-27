import { createHash } from "crypto";
import { userDb } from "./supabase-user";

/* VIAGGI — il viaggio caricato da fuori (docs/PROMPT-CODE-20-VIAGGI-DOCUMENTI.md).
 *
 * Il livello dati per `trip_documents` e `trip_facts` (docs/sql/trip-documents.sql).
 * NON tocca `tickets` né `trip_plans`: `assembleTimeline` LEGGE da `tickets` per
 * riconoscere i doppioni (PARTE 1.4), mai scrive lì.
 *
 * NIENTE FILE ORIGINALE CONSERVATO (decisione di Matteo, 27 agosto 2026): la
 * fonte è `extracted_text` — testo, non byte del file.
 */

const MULTIUSER_RLS = process.env.MULTIUSER_RLS === "1";

async function db() {
  if (!MULTIUSER_RLS) {
    throw new Error('MULTIUSER_RLS mancante: rifiuto di girare senza isolamento dati (imposta MULTIUSER_RLS="1")');
  }
  const u = await userDb();
  if (!u) throw new Error("trip-docs: utente non autenticato");
  return u.db;
}

export type FactKind = "volo" | "treno" | "hotel" | "visita" | "contatto" | "altro";

export interface TripDocumentRow {
  id: string;
  trip_key: string;
  destination: string;
  file_name: string;
  mime_type: string;
  extracted_text: string;
  uploaded_at: string;
  status: "ok" | "error";
  error_message: string | null;
  file_hash: string | null;
  text_hash: string | null;
}

/* ═════════ DOPPIONI FRA DOCUMENTI (28 agosto 2026) ═════════
 * Due hash, due garanzie diverse — vedi docs/sql/trip-documents-hash.sql:
 *   file_hash — i byte grezzi. Sempre prima di Claude, per ogni formato.
 *   text_hash — il testo estratto normalizzato. Gratis prima di Claude SOLO
 *     per un .docx (mammoth); per PDF/immagine il testo esiste solo dopo la
 *     trascrizione, quindi lì il controllo arriva dopo la spesa AI — evita
 *     il doppione nella linea del tempo, non evita il costo della chiamata. */
export function hashFile(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
/* SOLO PER IL CONFRONTO — mai per quello che si salva o si mostra.
 * `extractedText` (la fonte conservata, PARTE 1.2) non passa MAI da qui:
 * questa funzione esiste solo dentro hashTesto(), il cui risultato va in
 * `text_hash`, non in `extracted_text`. "Shanghai - Doha" nella fonte resta
 * "Shanghai - Doha".
 *
 * Un apostrofo tipografico contro uno dritto su 7132 caratteri identici
 * cambia il digest per intero -- trovato collaudando il 27 agosto 2026:
 * mammoth scrive "what\u2019s", Claude trascrive "what's". Il secondo giro
 * (28 agosto) ha aggiunto lo spazio intorno al trattino: mammoth conserva
 * l'a capo di un "...FENGHUANG\n-CHONGQING..." (diventa uno spazio dopo la
 * riduzione), Claude lo trascrive come sequenza continua, senza spazio.
 * Provata contro i due testi veri (mammoth e trascrizione di Claude dello
 * stesso documento) DOPO ogni aggiunta, con un diff ad allineamento (non a
 * posizione fissa, che con un solo inserimento sembra migliaia di
 * differenze): stesso digest.
 *
 * Il text_hash fra mammoth e una trascrizione resta comunque BEST-EFFORT per
 * natura -- vedi docs/NON-ORA.md: non e' una promessa di scovare ogni
 * doppione, sotto c'e' la fusione di sostanza. */
function normalizzaPerHash(testo: string): string {
  return testo
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u2032]/g, "'") // apostrofi tipografici -> dritto
    .replace(/[\u201C\u201D\u2033]/g, '"') // virgolette tipografiche -> dritte
    .replace(/[\u2013\u2014\u2212]/g, "-") // trattini lunghi/meno -> trattino
    .replace(/\u2026/g, "...") // ellissi tipografica -> tre punti
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F]/g, " ") // spazi unicode -> spazio normale
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-"); // spazi intorno al trattino: un a-capo a meta' di un composto li mette solo da un lato
}

export function hashTesto(testo: string): string {
  return createHash("sha256").update(normalizzaPerHash(testo)).digest("hex");
}

export interface DocumentoTrovato {
  id: string;
  fileName: string;
  uploadedAt: string;
  tripKey: string;
}

async function trovaDocumentoUguale(campo: "file_hash" | "text_hash", hash: string): Promise<DocumentoTrovato | null> {
  const client = await db();
  const { data, error } = await client
    .from("trip_documents")
    .select("id, file_name, uploaded_at, trip_key")
    .eq(campo, hash)
    .eq("status", "ok")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const d = data as { id: string; file_name: string; uploaded_at: string; trip_key: string };
  return { id: d.id, fileName: d.file_name, uploadedAt: d.uploaded_at, tripKey: d.trip_key };
}

/** Confronta su TUTTI i documenti dell'utente (RLS fa già lo scoping): al
 *  momento del controllo il trip_key del file nuovo non si conosce ancora. */
export async function trovaPerFileHash(hash: string): Promise<DocumentoTrovato | null> {
  return trovaDocumentoUguale("file_hash", hash);
}
export async function trovaPerTextHash(hash: string): Promise<DocumentoTrovato | null> {
  return trovaDocumentoUguale("text_hash", hash);
}

export interface TripFactRow {
  id: string;
  document_id: string;
  kind: FactKind;
  day: string | null; // YYYY-MM-DD, anno dedotto — vedi resolveGiorno
  time_text: string | null; // ora ESATTA come scritta, es. "18H50"
  time_end_text: string | null;
  title: string;
  place: string | null;
  reference: string | null;
  raw_text: string;
  created_at: string;
}

export type NuovoFatto = Omit<TripFactRow, "id" | "document_id" | "created_at">;

/* ═════════ ANNO MANCANTE (PARTE 0, punto 2) ═════════
 * I documenti di viaggio scrivono "29 ago" senza anno. Si deduce dalla data di
 * caricamento: l'anno corrente, o il successivo se la data è già passata di
 * più di ~3 giorni (capodanno). Oltre ~18 mesi di distanza non si indovina:
 * si segnala (`incerto: true`) invece di scrivere una data probabilmente sbagliata. */
const MESI: Record<string, number> = {
  gen: 1, jan: 1, feb: 2, mar: 3, apr: 4, mag: 5, may: 5, giu: 6, jun: 6,
  lug: 7, jul: 7, ago: 8, aug: 8, set: 9, sep: 9, ott: 10, oct: 10, nov: 11, dic: 12, dec: 12,
};

function parseMeseGiorno(testo: string): { month: number; day: number } | null {
  const t = testo.trim().toLowerCase();
  // "29 ago" / "29 agosto" / "1 settembre"
  let m = /(\d{1,2})\s*[°º]?\s*([a-zàèéìòù]{3,})/i.exec(t);
  if (!m) {
    // "aug 29" / "sep 01"
    m = /([a-zàèéìòù]{3,})\s*(\d{1,2})/i.exec(t);
    if (!m) return null;
    const mese = MESI[m[1].slice(0, 3)];
    const day = Number(m[2]);
    if (!mese || !day || day < 1 || day > 31) return null;
    return { month: mese, day };
  }
  const day = Number(m[1]);
  const mese = MESI[m[2].slice(0, 3)];
  if (!mese || !day || day < 1 || day > 31) return null;
  return { month: mese, day };
}

export function resolveGiorno(
  giornoTesto: string | null | undefined,
  caricatoIl: Date = new Date()
): { day: string | null; incerto: boolean } {
  if (!giornoTesto) return { day: null, incerto: false };
  const md = parseMeseGiorno(giornoTesto);
  if (!md) return { day: null, incerto: false };
  const annoBase = caricatoIl.getUTCFullYear();
  const grazia = 3 * 24 * 3600 * 1000;
  let candidata = new Date(Date.UTC(annoBase, md.month - 1, md.day));
  if (candidata.getTime() < caricatoIl.getTime() - grazia) {
    candidata = new Date(Date.UTC(annoBase + 1, md.month - 1, md.day));
  }
  const mesiDistanza = (candidata.getTime() - caricatoIl.getTime()) / (30 * 24 * 3600 * 1000);
  return { day: candidata.toISOString().slice(0, 10), incerto: mesiDistanza > 18 };
}

/* Normalizza un'ora scritta in mille modi ("18H50", "18:50", "07.55") in
 * "HH:MM" per il CONFRONTO (non per la visualizzazione: quella resta il testo
 * originale, sempre — vedi time_text). null se non riconoscibile. */
export function normalizzaOra(testo: string | null | undefined): string | null {
  if (!testo) return null;
  const m = /(\d{1,2})\s*[:hH.]\s*(\d{2})/.exec(testo);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return `${String(h).padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function slug(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "viaggio"
  );
}

export interface TripGroup {
  tripKey: string;
  destination: string;
  minDay: string | null;
  maxDay: string | null;
}

/* Tutti i "viaggi" (trip_key) di cui esiste almeno un documento ok, con la
 * destinazione e il range di giorni dedotti dai fatti. Volume piccolo (uso
 * personale): si aggrega in JS invece di scrivere una vista SQL apposta. */
export async function listTripGroups(): Promise<TripGroup[]> {
  const client = await db();
  const [docsRes, factsRes] = await Promise.all([
    client.from("trip_documents").select("id, trip_key, destination, status"),
    client.from("trip_facts").select("document_id, day"),
  ]);
  if (docsRes.error) throw new Error(docsRes.error.message);
  if (factsRes.error) throw new Error(factsRes.error.message);
  const docs = (docsRes.data ?? []) as { id: string; trip_key: string; destination: string; status: string }[];
  const facts = (factsRes.data ?? []) as { document_id: string; day: string | null }[];

  const tripKeyDiDoc = new Map(docs.map((d) => [d.id, d.trip_key]));
  const byTrip = new Map<string, TripGroup>();
  // Prima i viaggi con almeno un documento OK: la destinazione mostrata è la
  // loro, non quella (spesso "—") di un documento fallito attaccato lì sopra.
  for (const d of docs) {
    if (d.status !== "ok") continue;
    if (!byTrip.has(d.trip_key)) byTrip.set(d.trip_key, { tripKey: d.trip_key, destination: d.destination, minDay: null, maxDay: null });
  }
  // Poi i viaggi che hanno SOLO documenti falliti: restano visibili — un
  // caricamento che va storto non deve sparire nel nulla (vedi PARTE 1.1).
  for (const d of docs) {
    if (!byTrip.has(d.trip_key)) byTrip.set(d.trip_key, { tripKey: d.trip_key, destination: d.destination, minDay: null, maxDay: null });
  }
  for (const f of facts) {
    if (!f.day) continue;
    const tripKey = tripKeyDiDoc.get(f.document_id);
    if (!tripKey) continue;
    const g = byTrip.get(tripKey);
    if (!g) continue;
    if (!g.minDay || f.day < g.minDay) g.minDay = f.day;
    if (!g.maxDay || f.day > g.maxDay) g.maxDay = f.day;
  }
  return [...byTrip.values()];
}

/* ═════════ A QUALE VIAGGIO APPARTIENE (PARTE 0, punto 2 — rivisto) ═════════
 * Dedotto da destinazione + date, MAI silenzioso: chi chiama mostra sempre
 * `nuovo`/`tripKey` all'utente, che può "staccare" con `detachTripDocument`.
 * Stessa destinazione (slug) + range di giorni che si sovrappone (o è vicino
 * entro 3 giorni) → stesso viaggio. Altrimenti, un viaggio nuovo. */
export async function assegnaTripKey(
  destinazione: string,
  minDay: string | null,
  maxDay: string | null
): Promise<{ tripKey: string; nuovo: boolean }> {
  const destSlug = slug(destinazione);
  if (minDay && maxDay) {
    const gruppi = await listTripGroups();
    for (const g of gruppi) {
      if (slug(g.destination) !== destSlug) continue;
      if (!g.minDay || !g.maxDay) continue;
      const sovrapposto = minDay <= addDays(g.maxDay, 3) && g.minDay <= addDays(maxDay, 3);
      if (sovrapposto) return { tripKey: g.tripKey, nuovo: false };
    }
  }
  return { tripKey: `${destSlug}-${minDay ?? new Date().toISOString().slice(0, 10)}`, nuovo: true };
}

export async function createTripDocument(fields: {
  tripKey: string;
  destination: string;
  fileName: string;
  mimeType: string;
  extractedText: string;
  status: "ok" | "error";
  errorMessage?: string | null;
  fileHash?: string | null;
  textHash?: string | null;
}): Promise<{ id: string }> {
  const client = await db();
  const { data, error } = await client
    .from("trip_documents")
    .insert({
      trip_key: fields.tripKey,
      destination: fields.destination,
      file_name: fields.fileName,
      mime_type: fields.mimeType,
      extracted_text: fields.extractedText,
      status: fields.status,
      error_message: fields.errorMessage ?? null,
      file_hash: fields.fileHash ?? null,
      text_hash: fields.textHash ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: (data as { id: string }).id };
}

/* Corregge una riga già scritta 'ok' quando il salvataggio dei FATTI fallisce
 * dopo che il documento è già stato inserito: senza questo, resterebbe una
 * riga 'ok' con zero fatti — un successo finto — mentre l'utente ha già
 * ricevuto un errore. Vedi route.ts: si chiama solo in quel caso preciso. */
export async function markTripDocumentError(documentId: string, message: string): Promise<void> {
  const client = await db();
  const { error } = await client.from("trip_documents").update({ status: "error", error_message: message }).eq("id", documentId);
  if (error) throw new Error(error.message);
}

export async function saveTripFacts(documentId: string, facts: NuovoFatto[]): Promise<void> {
  if (facts.length === 0) return;
  const client = await db();
  const { error } = await client.from("trip_facts").insert(facts.map((f) => ({ document_id: documentId, ...f })));
  if (error) throw new Error(error.message);
}

export async function getTripDocuments(tripKey: string): Promise<TripDocumentRow[]> {
  const client = await db();
  const { data, error } = await client
    .from("trip_documents")
    .select("*")
    .eq("trip_key", tripKey)
    .order("uploaded_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TripDocumentRow[];
}

export async function getTripFacts(tripKey: string): Promise<TripFactRow[]> {
  const client = await db();
  const { data: docs, error: docsErr } = await client.from("trip_documents").select("id").eq("trip_key", tripKey);
  if (docsErr) throw new Error(docsErr.message);
  const ids = (docs ?? []).map((d) => (d as { id: string }).id);
  if (ids.length === 0) return [];
  const { data, error } = await client
    .from("trip_facts")
    .select("*")
    .in("document_id", ids)
    .order("day", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TripFactRow[];
}

/* "Staccare": il documento (e i suoi fatti, che lo seguono via document_id)
 * escono dal viaggio corrente e diventano un viaggio a sé. Non tocca
 * trip_facts: aggiornando solo trip_documents.trip_key i fatti seguono da soli. */
export async function detachTripDocument(documentId: string): Promise<{ tripKey: string }> {
  const client = await db();
  const { data: doc, error: getErr } = await client
    .from("trip_documents")
    .select("id, destination")
    .eq("id", documentId)
    .single();
  if (getErr) throw new Error(getErr.message);
  const destination = (doc as { destination: string }).destination;
  const nuovaChiave = `${slug(destination)}-${documentId.slice(0, 8)}`;
  const { error: updErr } = await client.from("trip_documents").update({ trip_key: nuovaChiave }).eq("id", documentId);
  if (updErr) throw new Error(updErr.message);
  return { tripKey: nuovaChiave };
}

/* ═════════ LA LINEA DEL TEMPO — fatti + biglietti, senza doppioni (PARTE 1.4) ═════════ */

export type Provenienza =
  | { tipo: "documento"; fileName: string; raw: string }
  | { tipo: "biglietto"; ticketId: string; reference: string | null };

export interface TimelineItem {
  id: string;
  day: string | null;
  timeText: string | null;
  timeEndText: string | null;
  kind: FactKind;
  title: string;
  place: string | null;
  reference: string | null;
  provenienze: Provenienza[];
  /* Le provenienze non concordano (orario diverso, per es.): quando succede
   * NON si fondono in una riga — restano DUE TimelineItem, con lo stesso
   * `conflictGroup`, e la UI le mostra vicine e marcate. Sceglierne una in
   * silenzio è la cosa peggiore che questa schermata possa fare (§1.4). */
  conflitto: boolean;
  conflictGroup?: string;
  /* Stesso giorno+tipo+luogo di un altro fatto-documento, ma le parole del
   * titolo non bastano a dire con certezza che è la stessa cosa (28 agosto
   * 2026): non si fonde — resta una riga, ma non muta come se non ci fosse
   * nessun sospetto. Vedi `classificaSostanza`. */
  possibileDoppioneDi?: string;
}

interface TicketRow {
  id: string;
  title: string;
  type: string;
  datetime: string;
  location: string;
  reference: string | null;
  city: string;
}

const TIPO_TICKET_TO_KIND: Record<string, FactKind> = { flight: "volo", train: "treno", hotel: "hotel" };

function romeDayOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(iso));
}
function romeTimeOf(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso)
  );
}

/* Il "codice" che compare in entrambi i testi quando è lo stesso volo/treno:
 * es. "QR869", "G351". Serve al secondo aggancio, quando non c'è reference. */
function codiceIn(testo: string): string | null {
  const m = /\b([A-Z]{1,3}\d{2,4})\b/.exec(testo.toUpperCase());
  return m ? m[1] : null;
}

/* ═════════ DOPPIONI FRA DOCUMENTI DELLO STESSO VIAGGIO (28 agosto 2026) ═════════
 * Un secondo documento (o lo stesso file ricaricato, se l'hash non l'ha già
 * fermato in upload — vedi trovaPerFileHash/trovaPerTextHash) descrive lo
 * stesso fatto con parole diverse: "Terracotta Army visit" contro "...
 * visiting". Il confronto testuale non basta perché l'AI riformula ogni
 * volta; qui si guarda la SOSTANZA. */

const RIEMPITIVI = new Set([
  // italiano
  "il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "di", "da", "in", "con", "su", "per",
  "tra", "fra", "e", "o", "ma", "che", "del", "della", "dei", "delle", "al", "allo", "alla",
  "ai", "agli", "alle", "visita", "referente", "locale",
  // inglese (i titoli spesso arrivano non tradotti)
  "the", "a", "an", "of", "to", "on", "with", "and", "or", "at", "by", "from", "tour",
  "guided", "visit", "visiting", "contact",
]);

function paroleNormali(testo: string): string[] {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normPlace(place: string | null): string {
  return paroleNormali(place ?? "").join(" ");
}

/* Le parole che DECIDONO se due fatti sono la stessa cosa: quelle del
 * titolo meno il tipo, meno il luogo, meno i riempitivi generici. Senza
 * questa pulizia "visita" + "Xian" basterebbero a fondere due visite
 * DIVERSE nella stessa città lo stesso giorno — l'obiezione di Matteo del
 * 28 agosto, verificata a mano contro i 37 fatti veri del documento cinese
 * prima di scrivere questa funzione. */
function paroleDecisive(titolo: string, kind: string, place: string | null): Set<string> {
  const daTogliere = new Set([...paroleNormali(kind), ...paroleNormali(place ?? ""), ...RIEMPITIVI]);
  return new Set(paroleNormali(titolo).filter((p) => p.length > 2 && !daTogliere.has(p)));
}

type FattoConfrontabile = { day: string | null; kind: FactKind; place: string | null; title: string };
type Relazione = "stesso" | "forse" | "estranei";

/* Il TETTO DI FIDUCIA (29 agosto 2026): "stesso" richiede giorno certo E
 * luogo uguale, oltre al resto. Quando manca uno dei due — un luogo scritto
 * con specificità diversa, o un contatto senza un giorno vero — il massimo
 * possibile è "forse": un avviso, mai una fusione. Allargare i CRITERI DI
 * FUSIONE per inseguire questi residui sarebbe il modo di finire a fondere
 * cose davvero diverse (l'obiezione di Matteo, stessa data): qui si allarga
 * solo COSA SI FA VEDERE quando non si è sicuri, non quando si fonde. */
function classificaSostanza(a: FattoConfrontabile, b: FattoConfrontabile): Relazione {
  if (a.kind !== b.kind) return "estranei";

  /* Un contatto non è un evento: il giorno in cui il documento lo nomina è
   * un dettaglio di trascrizione, non del fatto (Bilin compariva sia in
   * testa sia in fondo al documento, in due giorni diversi). Per gli altri
   * tipi il giorno resta un cancello duro, come sempre. */
  const eContatto = a.kind === "contatto";
  const giornoUguale = a.day === b.day;
  if (!eContatto && !giornoUguale) return "estranei";
  const giornoCerto = giornoUguale;

  /* Il codice (G351, MU2431...) prima del luogo: per un treno/volo il luogo
   * è spesso un percorso scritto diverso da due estrazioni pur essendo LO
   * STESSO treno — trovato collaudando il 28 agosto 2026. */
  const codA = codiceIn(a.title);
  const codB = codiceIn(b.title);
  if (codA || codB) {
    if (codA !== codB) return "estranei";
    return giornoCerto ? "stesso" : "forse";
  }

  const luogoUguale = normPlace(a.place) === normPlace(b.place);
  const wa = paroleDecisive(a.title, a.kind, a.place);
  const wb = paroleDecisive(b.title, b.kind, b.place);
  const comuni = [...wa].filter((p) => wb.has(p)).length;
  const soglia = Math.min(wa.size, wb.size) <= 1 ? 1 : 2;
  if (comuni < soglia) return "estranei";
  return giornoCerto && luogoUguale ? "stesso" : "forse";
}

export async function assembleTimeline(tripKey: string): Promise<TimelineItem[]> {
  const facts = await getTripFacts(tripKey);
  const docs = await getTripDocuments(tripKey);
  const fileNameById = new Map(docs.map((d) => [d.id, d.file_name]));

  const giorni = facts.map((f) => f.day).filter((d): d is string => !!d);
  const grezzi: TimelineItem[] = facts.map((f) => ({
    id: f.id,
    day: f.day,
    timeText: f.time_text,
    timeEndText: f.time_end_text,
    kind: f.kind,
    title: f.title,
    place: f.place,
    reference: f.reference,
    provenienze: [{ tipo: "documento", fileName: fileNameById.get(f.document_id) ?? "documento", raw: f.raw_text }],
    conflitto: false,
  }));

  /* FUSIONE FRA DOCUMENTI DELLO STESSO VIAGGIO (28 agosto 2026) — PRIMA dei
   * biglietti: due documenti che raccontano lo stesso fatto con parole
   * diverse non devono raddoppiare la linea del tempo. Si fonde SOLO qui,
   * alla lettura: `trip_facts` non perde mai una riga, per costruzione — se
   * la regola si rivelasse sbagliata domani, i dati sono tutti ancora lì. */
  const items: TimelineItem[] = [];
  for (const it of grezzi) {
    const gemello = items.find((x) => classificaSostanza(it, x) === "stesso");
    if (gemello) {
      gemello.provenienze.push(...it.provenienze);
      continue;
    }
    const sospetto = items.find((x) => classificaSostanza(it, x) === "forse");
    if (sospetto) {
      const gruppo = sospetto.possibileDoppioneDi ?? sospetto.id;
      sospetto.possibileDoppioneDi = gruppo;
      it.possibileDoppioneDi = gruppo;
    }
    items.push(it);
  }

  if (giorni.length === 0) return items;
  const minDay = giorni.reduce((a, b) => (b < a ? b : a));
  const maxDay = giorni.reduce((a, b) => (b > a ? b : a));

  const client = await db();
  const { data, error } = await client
    .from("tickets")
    .select("id, title, type, datetime, location, reference, city")
    .gte("datetime", `${addDays(minDay, -1)}T00:00:00+00:00`)
    .lt("datetime", `${addDays(maxDay, 2)}T00:00:00+00:00`)
    .not("title", "ilike", "%[PABLO]%");
  if (error) throw new Error(error.message);
  const tickets = (data ?? []) as TicketRow[];

  for (const t of tickets) {
    const day = romeDayOf(t.datetime);
    if (day < minDay || day > maxDay) continue;
    const time = romeTimeOf(t.datetime);
    const kind = TIPO_TICKET_TO_KIND[t.type?.toLowerCase()] ?? "altro";
    const cod = codiceIn(t.title);

    // 1) stesso codice di prenotazione
    let match = t.reference
      ? items.find((it) => it.reference && it.reference.trim().toUpperCase() === t.reference!.trim().toUpperCase())
      : undefined;
    // 2) altrimenti: stesso giorno + stesso tipo + stesso codice volo/treno nel testo
    if (!match && cod) {
      match = items.find(
        (it) =>
          it.day === day &&
          it.kind === kind &&
          (codiceIn(it.title) === cod || it.provenienze.some((p) => p.tipo === "documento" && codiceIn(p.raw) === cod))
      );
    }

    if (match) {
      const orarioFatto = normalizzaOra(match.timeText);
      const discorda = !!orarioFatto && orarioFatto !== time;
      if (discorda) {
        // NON si fondono: l'orario del biglietto è un fatto diverso da quello
        // del documento, e sceglierne uno in silenzio è vietato (§1.4). Restano
        // due righe, agganciate dallo stesso conflictGroup.
        const gruppo = match.id;
        match.conflitto = true;
        match.conflictGroup = gruppo;
        items.push({
          id: `ticket-${t.id}`,
          day,
          timeText: time,
          timeEndText: null,
          kind,
          title: t.title,
          place: t.location || t.city || null,
          reference: t.reference,
          provenienze: [{ tipo: "biglietto", ticketId: t.id, reference: t.reference }],
          conflitto: true,
          conflictGroup: gruppo,
        });
      } else {
        match.provenienze.push({ tipo: "biglietto", ticketId: t.id, reference: t.reference });
      }
    } else {
      items.push({
        id: `ticket-${t.id}`,
        day,
        timeText: time,
        timeEndText: null,
        kind,
        title: t.title,
        place: t.location || t.city || null,
        reference: t.reference,
        provenienze: [{ tipo: "biglietto", ticketId: t.id, reference: t.reference }],
        conflitto: false,
      });
    }
  }

  items.sort((a, b) => {
    if ((a.day ?? "") !== (b.day ?? "")) return (a.day ?? "").localeCompare(b.day ?? "");
    return (normalizzaOra(a.timeText) ?? "99:99").localeCompare(normalizzaOra(b.timeText) ?? "99:99");
  });
  return items;
}
