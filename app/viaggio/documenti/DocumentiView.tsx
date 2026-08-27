"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import { Sheet } from "@/app/components/v2/Sheet";
import type { TripGroup, TripDocumentRow, TimelineItem, FactKind } from "@/lib/trip-docs";

/* VIAGGI — il viaggio caricato da fuori (docs/PROMPT-CODE-20-VIAGGI-DOCUMENTI.md).
 * Pagina nuova, separata da ViaggioView.tsx: non tocca i suoi bottoni.
 * Visivamente sul mock docs/mockups/viaggi-mock.html (PARTI 1 e 2). Le foto
 * (PARTE 3) e la scheda-attività coi video (PARTE 4) non ci sono ancora:
 * questa ondata è caricamento + linea del tempo + doppioni + "chiedi".
 */

type RisultatoFile = {
  fileName: string;
  status: "ok" | "error";
  error?: string;
  tripKey?: string;
  nuovo?: boolean;
  destinazione?: string;
  fattiSalvati?: number;
  avvisi?: string[];
};

type Risposta = { domanda: string; so: boolean; risposta: string; fonti: string[] };

const STEP_TESTI = ["Leggo il documento…", "Cerco date, orari e codici…", "Lo incastro con quello che c'è già…"];
const DOMANDE_ESEMPIO = ["cosa è incluso oggi?", "dove dormo stanotte?", "che codice ha il prossimo volo?", "serve il visto?"];

const LABEL_KIND: Record<FactKind, string> = { volo: "volo", treno: "treno", hotel: "hotel", visita: "visita", contatto: "contatto", altro: "" };

function useUploadStep(attivo: boolean): number {
  // Il valore riparte da 0 dentro il timer stesso (un `let` nella chiusura),
  // mai con un setState sincrono nel corpo dell'effetto: qui si aggiorna solo
  // dal callback del timer, che è il posto giusto per farlo.
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!attivo) return;
    let i = 0;
    const id = setInterval(() => setStep(++i % STEP_TESTI.length), 1800);
    return () => clearInterval(id);
  }, [attivo]);
  return attivo ? step : 0;
}

function fmtGiorno(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
  } catch {
    return iso;
  }
}

function raggruppaPerGiorno(items: TimelineItem[]): [string, TimelineItem[]][] {
  const per = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const k = it.day ?? "senza data";
    if (!per.has(k)) per.set(k, []);
    per.get(k)!.push(it);
  }
  return [...per.entries()];
}

/* Le due righe di un conflitto restano vicine invece di finire sparse
 * nell'ordinamento per ora (§1.4: mai una scelta silenziosa). */
function raggruppaConflitti(items: TimelineItem[]): (TimelineItem | [TimelineItem, TimelineItem])[] {
  const usati = new Set<string>();
  const out: (TimelineItem | [TimelineItem, TimelineItem])[] = [];
  for (const it of items) {
    if (usati.has(it.id)) continue;
    if (it.conflictGroup) {
      const pari = items.find((x) => x.id !== it.id && x.conflictGroup === it.conflictGroup);
      if (pari) {
        usati.add(it.id);
        usati.add(pari.id);
        out.push([it, pari]);
        continue;
      }
    }
    usati.add(it.id);
    out.push(it);
  }
  return out;
}

function provenienzaTesto(it: TimelineItem): string {
  return it.provenienze
    .map((p) => (p.tipo === "documento" ? `da ${p.fileName}` : "dal biglietto che avevi già"))
    .join(" · e ");
}

function FactRow({ it }: { it: TimelineItem }) {
  return (
    <div className="fact nopic">
      <div className="in">
        <div className="h">{it.timeText || LABEL_KIND[it.kind]}</div>
        <div className="col">
          <div className="t">{it.title}</div>
          {it.place && <div className="d">{it.place}</div>}
          <div className="src">
            {provenienzaTesto(it)}
            {it.reference && <span className="cod"> · {it.reference}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConflictPair({ pair }: { pair: [TimelineItem, TimelineItem] }) {
  return (
    <div style={{ border: "1px solid rgba(201,106,69,.4)", borderRadius: "var(--r-card)", padding: 8, display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--acc)", padding: "0 4px" }}>
        ⚠️ Il documento e il biglietto non concordano
      </div>
      <FactRow it={pair[0]} />
      <FactRow it={pair[1]} />
    </div>
  );
}

export default function DocumentiView({
  gruppi,
  tripKeyAttivo,
  documenti,
  timeline,
}: {
  gruppi: TripGroup[];
  tripKeyAttivo: string | null;
  documenti: TripDocumentRow[];
  timeline: TimelineItem[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caricando, setCaricando] = useState(false);
  const [risultati, setRisultati] = useState<RisultatoFile[] | null>(null);
  const step = useUploadStep(caricando);

  const [apertoDoc, setApertoDoc] = useState<TripDocumentRow | null>(null);
  const [domanda, setDomanda] = useState("");
  const [chiedendo, setChiedendo] = useState(false);
  const [risposta, setRisposta] = useState<Risposta | null>(null);
  // Stato iniziale letto subito (inizializzatore pigro), non con un setState
  // nel corpo dell'effetto: `navigator` in SSR non c'è, da qui il controllo.
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  // Registra il service worker per questa pagina soltanto (PARTE 1.3): non è
  // legato alle notifiche push, che restano un opt-in separato in
  // lib/push-client.ts. `register` è idempotente — richiamarlo non duplica
  // niente se è già attivo.
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function caricaFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCaricando(true);
    setRisultati(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      // Un file che fallisce non ha destinazione/date da dedurre: se stai già
      // guardando un viaggio, ci si attacca lì invece di finire in un
      // "senza-viaggio" che nessuno riapre più.
      if (tripKeyAttivo) fd.append("tripKeyHint", tripKeyAttivo);
      const res = await fetch("/api/trip/docs/upload", { method: "POST", body: fd, credentials: "include" });
      const data = (await res.json().catch(() => null)) as { risultati?: RisultatoFile[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const elenco = data?.risultati ?? [];
      setRisultati(elenco);
      const primoOk = elenco.find((r) => r.status === "ok" && r.tripKey);
      if (primoOk?.tripKey && primoOk.tripKey !== tripKeyAttivo) {
        router.push(`/viaggio/documenti?trip=${encodeURIComponent(primoOk.tripKey)}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setRisultati([{ fileName: "—", status: "error", error: e instanceof Error ? e.message : "errore sconosciuto" }]);
    } finally {
      setCaricando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function stacca(documentId: string) {
    try {
      const res = await fetch("/api/trip/docs/detach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) throw new Error();
      setApertoDoc(null);
      router.refresh();
    } catch {
      // silenzioso: il bottone resta lì, si può riprovare
    }
  }

  async function chiedi(testo: string) {
    const d = testo.trim();
    if (!d || !tripKeyAttivo || chiedendo) return;
    setChiedendo(true);
    try {
      const res = await fetch("/api/trip/docs/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tripKey: tripKeyAttivo, domanda: d }),
      });
      const data = (await res.json().catch(() => null)) as { so?: boolean; risposta?: string; fonti?: string[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setRisposta({ domanda: d, so: data?.so ?? false, risposta: data?.risposta ?? "", fonti: data?.fonti ?? [] });
      setDomanda("");
    } catch (e) {
      setRisposta({ domanda: d, so: false, risposta: e instanceof Error ? e.message : "Qualcosa non ha funzionato, riprova.", fonti: [] });
    } finally {
      setChiedendo(false);
    }
  }

  const attivo = gruppi.find((g) => g.tripKey === tripKeyAttivo) ?? null;
  const perGiorno = raggruppaPerGiorno(timeline);

  return (
    <div className="k2">
      <div className="screen tripdoc" style={{ paddingBottom: PAGE_PB }}>
        <div className="head" style={{ padding: "6px 2px 14px" }}>
          <div className="col">
            <h1>{attivo?.destination ?? "Il viaggio caricato da fuori"}</h1>
            <div className="status">
              {attivo
                ? `${fmtGiorno(attivo.minDay)} – ${fmtGiorno(attivo.maxDay)} · ${documenti.length} document${documenti.length === 1 ? "o" : "i"}`
                : "Carica il programma, un voucher o un biglietto per cominciare"}
            </div>
          </div>
        </div>

        {offline && (
          // Onesto invece che silenzioso: quello che vedi è l'ultima pagina
          // salvata quando c'era rete, non un dato fresco (§1.3).
          <div className="attach" style={{ marginBottom: 8 }}>
            📡 Sei offline — questa è l&apos;ultima versione salvata. Caricare o chiedere richiede rete.
          </div>
        )}

        {gruppi.length > 1 && (
          <div className="chips" style={{ marginBottom: 4 }}>
            {gruppi.map((g) => (
              <button
                key={g.tripKey}
                className="chip tap"
                style={g.tripKey === tripKeyAttivo ? { background: "var(--teal)", borderColor: "var(--teal)", color: "var(--on-teal)" } : undefined}
                onClick={() => router.push(`/viaggio/documenti?trip=${encodeURIComponent(g.tripKey)}`)}
              >
                {g.destination}
              </button>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,image/*"
          style={{ display: "none" }}
          onChange={(e) => caricaFile(e.target.files)}
        />

        {caricando ? (
          <div className="upstep">
            <span className="dotpulse" />
            {STEP_TESTI[step]}
          </div>
        ) : (
          <button className="updrop tap" onClick={() => fileRef.current?.click()} disabled={offline} style={offline ? { opacity: 0.5 } : undefined}>
            <b>Carica un documento</b> — {offline ? "serve la rete" : "PDF, foto o Word"}
          </button>
        )}

        {risultati && (
          <div className="stack" style={{ marginTop: 8 }}>
            {risultati.map((r, i) => (
              <div key={i} className={`attach${r.status === "error" ? " err" : ""}`}>
                {r.status === "ok"
                  ? `✓ ${r.fileName} — attaccato a ${r.destinazione} (${r.nuovo ? "nuovo viaggio" : "viaggio esistente"}), ${r.fattiSalvati} fatti trovati`
                  : `✗ ${r.fileName} — ${r.error}`}
              </div>
            ))}
          </div>
        )}

        {tripKeyAttivo && (
          <>
            <div className="sec">
              Chiedi al viaggio <span className="sm">risponde dai tuoi documenti</span>
            </div>
            <div className="field">
              <textarea
                value={domanda}
                onChange={(e) => setDomanda(e.target.value)}
                placeholder="es. dove dormo stanotte?"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    chiedi(domanda);
                  }
                }}
              />
              <button className="cta tap" disabled={chiedendo || !domanda.trim() || offline} onClick={() => chiedi(domanda)}>
                {chiedendo ? "…" : "Chiedi"}
              </button>
            </div>
            <div className="chips">
              {DOMANDE_ESEMPIO.map((q) => (
                <button key={q} className="chip tap" onClick={() => chiedi(q)}>
                  {q}
                </button>
              ))}
            </div>
            {risposta && (
              <div className={`qa${risposta.so ? "" : " nope"}`}>
                <div className="q">{risposta.domanda}</div>
                <div className="a">{risposta.risposta}</div>
                {risposta.fonti.length > 0 && <div className="from">da {risposta.fonti.join(", ")}</div>}
              </div>
            )}
          </>
        )}

        {documenti.length > 0 && (
          <>
            <div className="sec">
              I documenti <span className="sm">{documenti.length}</span>
            </div>
            <div className="stack">
              {documenti.map((d) => (
                <button
                  key={d.id}
                  className={`doc tap${d.status === "error" ? " err" : ""}`}
                  onClick={() => d.status === "ok" && setApertoDoc(d)}
                >
                  <span className="ic">📄</span>
                  <span className="col">
                    <span className="nm">{d.file_name}</span>
                    <span className="rd">
                      {d.status === "error" ? d.error_message : `${d.extracted_text.length.toLocaleString("it-IT")} caratteri letti`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {perGiorno.length > 0 && (
          <>
            <div className="sec">La linea del tempo</div>
            {perGiorno.map(([giorno, voci]) => (
              <div key={giorno}>
                <div className="lab" style={{ margin: "16px 2px 8px" }}>
                  {giorno === "senza data" ? "senza data" : fmtGiorno(giorno)}
                </div>
                <div className="stack">
                  {raggruppaConflitti(voci).map((v, i) =>
                    Array.isArray(v) ? <ConflictPair key={i} pair={v} /> : <FactRow key={v.id} it={v} />
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {!tripKeyAttivo && documenti.length === 0 && (
          <div style={{ marginTop: 24, textAlign: "center", color: "var(--meta)", fontSize: 13 }}>
            Nessun viaggio ancora. Il primo documento che carichi lo crea.
          </div>
        )}
      </div>

      {apertoDoc && (
        <Sheet onClose={() => setApertoDoc(null)}>
          <div className="grab" />
          <div className="plain-head">
            <h2>{apertoDoc.file_name}</h2>
            <div className="status">La fonte a cui rimandano i fatti — testo, non il file originale</div>
          </div>
          <div className="pad">
            <p style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "var(--txt2)", marginTop: 14 }}>
              {apertoDoc.extracted_text}
            </p>
            <button className="btn2 wide tap" style={{ marginTop: 16 }} onClick={() => stacca(apertoDoc.id)}>
              Stacca da questo viaggio
            </button>
          </div>
        </Sheet>
      )}

      <KeikoNav active="viaggio" />
    </div>
  );
}
