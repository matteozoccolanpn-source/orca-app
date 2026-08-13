"use client";

// Consiglio di Keiko GLOBALE: vive nel layout, quindi la ricerca (in background),
// la pillola in basso a destra e il pannello dei risultati SOPRAVVIVONO ai cambi
// di sezione (Guarda → Dieta → torni e lo ritrovi).
//
// ONDATA 2 — cambia solo il vestito. La meccanica è quella di prima: stessa
// rotta, stesso timeout di 60s, stesso `busy`, stesso router.refresh(). Quello
// che cambia è come si vede, ora nel sistema V2 (app/keiko-v2.css, tutto sotto
// .k2). Tre decisioni di Matteo dell'11 agosto:
//  1. il consiglio NON si sposta nella barra di Guarda: resta qui, e da lì lo
//     apre il tasto terracotta in fondo alla barra;
//  2. i titoli restano TRE, perché tre ne dà l'API e l'API non si tocca: si
//     disegnano come tre card motivate in colonna;
//  3. il tetto giornaliero (429) non è più un toast ma una card dentro il
//     foglio, con le parole che manda il server — che sono già quelle giuste.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { I } from "@/app/components/v2/icons";
import { Img } from "@/app/components/v2/Img";
import { Sheet } from "@/app/components/v2/Sheet";
import { Feedback } from "@/app/components/v2/Feedback";
import { SchedaTitolo } from "@/app/components/v2/SchedaTitolo";
import { chiediDettagli, chiediSimili, chiediPiattaforme, type DettaglioTitolo, type TitoloSimile } from "@/app/components/v2/watch-rotte";

type Pick = { title: string; kind: "film" | "serie"; platform: string | null; info: string | null; link: string | null; poster?: string | null };

/* Uno stato per una richiesta: fermo finche' non serve, «chiedo» mentre
   arriva, «risposto» quando c'e' — anche se e' vuota. Tre parole invece di
   due booleani che possono contraddirsi. */
type Ric<T> = { stato: "fermo" | "chiedo" | "risposto"; d: T };

/* La foto dei titoli simili. `SchedaTitolo` non se la disegna: gliela passa
   chi lo monta, ed e' voluto — la Home ha il suo ripiego col gradiente di
   categoria, qui basta la locandina con la cornice `.ph` del sistema. La
   differenza fra le due schermate resta una scelta, non una sbavatura. */
function FotoSimile({ src, style }: { src?: string | null; style?: React.CSSProperties }) {
  return <span className="ph" style={style}>{src && <Img src={src} />}</span>;
}
type Ctx = { startInput: () => void };

const SuggestCtx = createContext<Ctx>({ startInput: () => {} });
export const useSuggest = () => useContext(SuggestCtx);

function fetchWithTimeout(url: string, opts: RequestInit, ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}

/* I fogli di Keiko vivono nel layout, fuori da qualsiasi `.k2`: senza questo
   guscio le classi del sistema V2 non li raggiungerebbero. Fondo trasparente e
   larghezza libera perché `.k2` è pensato per essere UNA pagina, e qui invece
   è solo il contenitore di un foglio che sta sopra a un'altra pagina. */
const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };

export default function SuggestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const busy = useRef(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Pick[] | null>(null);

  /* ── LA SCHEDA DI UN CONSIGLIO ──
     Prima queste righe erano testo e basta: reagiva solo il tasto «aggiungi»
     sotto. Toccare il titolo, che e' la parte grande della riga e quella che
     il dito prende, non faceva niente.
     Adesso aprono la stessa scheda della Home e della Guarda — trama, genere,
     simili, «Dove vederlo» — che e' `SchedaTitolo`. Le chiamate le fa questa
     schermata, con le regole condivise di `watch-rotte.ts`: gli indirizzi e
     la lettura della risposta sono gli stessi delle altre due, o avremmo tre
     pannelli uguali con tre comportamenti. */
  const [aperto, setAperto] = useState<Pick | null>(null);
  const [dett, setDett] = useState<Ric<DettaglioTitolo | null>>({ stato: "fermo", d: null });
  const [simili, setSimili] = useState<Ric<TitoloSimile[]>>({ stato: "fermo", d: [] });
  const [dove, setDove] = useState<Ric<string[]>>({ stato: "fermo", d: [] });

  useEffect(() => {
    if (!aperto) { setDett({ stato: "fermo", d: null }); setSimili({ stato: "fermo", d: [] }); setDove({ stato: "fermo", d: [] }); return; }
    let vivo = true;
    setDett({ stato: "chiedo", d: null });
    setSimili({ stato: "chiedo", d: [] });
    chiediDettagli(aperto.title, aperto.kind)
      .then((d) => { if (vivo) setDett({ stato: "risposto", d }); })
      .catch(() => { if (vivo) setDett({ stato: "risposto", d: null }); });
    chiediSimili(aperto.title, aperto.kind)
      .then((l) => { if (vivo) setSimili({ stato: "risposto", d: l }); })
      .catch(() => { if (vivo) setSimili({ stato: "risposto", d: [] }); });
    return () => { vivo = false; };
  }, [aperto]);

  async function apriDove() {
    if (!aperto) return;
    setDove({ stato: "chiedo", d: [] });
    try { setDove({ stato: "risposto", d: await chiediPiattaforme(aperto.title, aperto.kind) }); }
    catch { setDove({ stato: "risposto", d: [] }); }
  }
  const [open, setOpen] = useState(false);
  /* Il tetto giornaliero: quando c'è, il foglio mostra la card al posto dei
     titoli. Tiene la frase del server così com'è. */
  const [capped, setCapped] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => { if (msgT.current) clearTimeout(msgT.current); setMsg(m); msgT.current = setTimeout(() => setMsg(null), 4000); };

  const startInput = () => { setText(""); setInputOpen(true); };

  function chiudiPannello() {
    setOpen(false);
    setResults(null);
    setCapped(null);
  }

  async function run(query: string) {
    if (busy.current) return;
    const q = query.trim() || "consigliami qualcosa da vedere stasera";
    busy.current = true; setSearching(true); setResults(null); setCapped(null);
    try {
      const res = await fetchWithTimeout("/api/watch/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ query: q }) }, 60000);
      const data = (await res.json()) as { films?: Pick[]; error?: string };

      // Il tetto giornaliero non è un guasto: è Keiko che dice che si ferma.
      // Le parole arrivano dal server (429) e si mostrano come sono.
      if (res.status === 429) {
        setCapped(data?.error || "Per oggi mi fermo qui 🌙 — le richieste di oggi sono finite. Domani si riparte.");
        setOpen(true);
        return;
      }
      // Il server ha già scritto la frase giusta anche per gli altri errori:
      // buttarla via e dire "qualcosa non torna" trasforma un messaggio chiaro
      // in un guasto misterioso.
      if (!res.ok) throw new Error(data?.error || "");
      const picks = (data.films ?? []).slice(0, 3);
      if (!picks.length) { toast("Non ho trovato niente, riformula"); return; }
      setResults(picks);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") toast("Ci ho messo troppo, riprova");
      else toast(e instanceof Error && e.message ? e.message : "Qualcosa non torna, riprova");
    } finally { busy.current = false; setSearching(false); }
  }

  async function addPick(p: Pick) {
    try {
      const info = [p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ");
      const res = await fetch("/api/watch", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: p.title, kind: p.kind, info: info || null, link: p.link }) });
      if (!res.ok) throw new Error();
      toast(`Aggiunto: ${p.title}`);
      router.refresh();
    } catch { toast("Non aggiunto, riprova"); }
  }

  const pillaVisibile = searching || ((results || capped) && !open);

  return (
    <SuggestCtx.Provider value={{ startInput }}>
      {children}

      {/* ── «che serata è?» ── */}
      {inputOpen && (
        <div className="k2" style={K2}>
          <Sheet onClose={() => setInputOpen(false)}>
            <div className="plain-head">
              <h2>Consiglio di Keiko</h2>
            </div>
            <div className="pad">
              <div className="sub">
                Che serata è? Per esempio «commedia leggera» o «thriller». Se lasci vuoto, scelgo a sorpresa.
              </div>
              <div className="ask" style={{ marginTop: 16, cursor: "auto" }}>
                <span style={{ color: "var(--teal)", flex: "none", display: "flex" }}>{I.orca(19)}</span>
                <input
                  autoFocus
                  className="ph-txt"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { const q = text; setInputOpen(false); run(q); } }}
                  placeholder="Tipo di serata…"
                  /* 16px: sotto i 16 iOS ingrandisce la pagina da solo */
                  style={{ background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
                />
              </div>
              <button
                className="cta wide tap"
                style={{ marginTop: 12 }}
                onClick={() => { const q = text; setInputOpen(false); run(q); }}
              >
                Chiedi
              </button>
            </div>
          </Sheet>
        </div>
      )}

      {/* ── la pillola: Keiko sta cercando, o i consigli sono pronti ──
          Teal, perché dice uno STATO. Il terracotta resta alla primaria di riga
          e al FAB. Mentre cerca, il pallino che respira è quello del sistema. */}
      {pillaVisibile && (
        <div className="k2" style={K2}>
          <button
            className="btn-teal tap"
            onClick={() => { if (results || capped) setOpen(true); }}
            aria-disabled={searching || undefined}
            style={{
              position: "fixed", right: 16, bottom: "calc(100px + env(safe-area-inset-bottom))",
              zIndex: 65, display: "flex", alignItems: "center", gap: 8,
              background: "rgba(22,24,29,.92)", backdropFilter: "blur(10px)",
              padding: "11px 16px", borderRadius: 999, fontSize: 13,
              boxShadow: "0 8px 24px rgba(0,0,0,.45)",
            }}
          >
            {searching ? (
              <>
                <span className="orb" style={{ width: 14, height: 14 }} />
                Keiko cerca…
              </>
            ) : capped ? (
              <>{I.info({ s: 14 })}Per oggi mi fermo qui</>
            ) : (
              <>{I.orca(14)}{results?.length ?? 0} consigli pronti</>
            )}
          </button>
        </div>
      )}

      {/* ── il foglio: o il tetto, o i tre titoli ── */}
      {open && (results || capped) && (
        <div className="k2" style={K2}>
          <Sheet onClose={chiudiPannello}>
            <div className="plain-head">
              <h2>{capped ? "Per oggi mi fermo qui" : "Consigli di Keiko"}</h2>
            </div>
            <div className="pad">
              {capped ? (
                <>
                  {/* le parole sono quelle del server: qui non si riscrive niente */}
                  <div className="hint warm" style={{ marginTop: 16 }}>
                    {I.info({ s: 14 })}
                    <p>{capped}</p>
                  </div>
                  <button className="btn2 wide tap" style={{ marginTop: 16 }} onClick={chiudiPannello}>Va bene</button>
                </>
              ) : (
                <>
                  <div className="sub">Scegli cosa aggiungere alla lista.</div>

                  {results!.map((p, i) => (
                    <div className="srf2" key={`${p.title}-${i}`} style={{ marginTop: 12, padding: "2px 0 12px" }}>
                      {/* La riga si apre: tutta, non solo il tasto sotto. */}
                      <div className="res tap" role="button" onClick={() => setAperto(p)}>
                        <span className="pw">
                          <b className="fb2" style={{ fontSize: "13px" }}>{p.title.slice(0, 2)}</b>
                          {p.poster && <Img src={p.poster} />}
                        </span>
                        <span className="in">
                          <span className="t">{p.title}</span>
                          <span className="m">
                            {[p.kind === "serie" ? "Serie" : "Film", p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </div>

                      {/* Il perché è `info`: sul giro buono il server ci scrive
                          davvero PERCHÉ quel titolo c'entra con la richiesta.
                          Se non c'è, questa card resta senza: non se ne inventa
                          uno finto. */}
                      {p.info && (
                        <div className="why" style={{ padding: "0 12px" }}>
                          {I.tick({ s: 13 })}
                          <span style={{ flex: 1 }}>{p.info}</span>
                          <Feedback perche={p.info} />
                        </div>
                      )}

                      <div className="pactions" style={{ padding: "0 12px" }}>
                        <button
                          className="cta tap"
                          onClick={() => {
                            addPick(p);
                            const rest = results!.filter((_, j) => j !== i);
                            if (rest.length) setResults(rest);
                            else chiudiPannello();
                          }}
                        >
                          Aggiungi alla lista
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="btn2 wide tap" style={{ marginTop: 16 }} onClick={chiudiPannello}>Chiudi</button>
                </>
              )}
            </div>
          </Sheet>
        </div>
      )}

      {/* ── la scheda di un consiglio ──
          Sopra il pannello dei consigli: si guarda un titolo e si torna
          all'elenco, senza perdere il posto. */}
      {aperto && (
        <div className="k2" style={K2}>
          <Sheet onClose={() => setAperto(null)}>
            <div className="plain-head">
              <h2>{aperto.title}</h2>
              <div className="status">
                {[aperto.kind === "serie" ? "Serie" : "Film", aperto.platform ? `su ${aperto.platform}` : null].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="pad">
              <SchedaTitolo
                dettaglio={{ stato: dett.stato, d: dett.d }}
                simili={{ stato: simili.stato, lista: simili.d }}
                piattaforme={{ stato: dove.stato, lista: dove.d }}
                avanzo={false}
                onAvanza={() => { /* un consiglio non e' ancora tuo: non c'e' niente da avanzare */ }}
                onDove={apriDove}
                /* Toccare un simile lo mette al posto di quello che stai
                   guardando: resti qui e cambi titolo, invece di uscire. */
                onSimile={(titolo) => setAperto({ ...aperto, title: titolo, info: null, platform: null, poster: null })}
                Foto={FotoSimile}
              />
            </div>
          </Sheet>
        </div>
      )}

      {/* Il toast resta per quello che è davvero un intoppo: rete muta, timeout,
          «non ho trovato niente». Il tetto giornaliero non passa più di qui. */}
      {msg && (
        <div className="k2" style={K2}>
          <div className="toast on" style={{ bottom: "calc(150px + env(safe-area-inset-bottom))", zIndex: 66 }}>{msg}</div>
        </div>
      )}
    </SuggestCtx.Provider>
  );
}
