"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Recipe } from "@/lib/supabase";
import { I } from "@/app/components/v2/icons";
import { Poster } from "@/app/components/v2/Poster";
import { Empty } from "@/app/components/v2/Empty";

/* ═════════ IL RICETTARIO — la pagina intera (blocco 8.2) ═════════
 *
 * SCHERMATA PIENA, non foglio, e per la stessa ragione dello storico degli
 * allenamenti e di quello dei pasti: qui si scorre a lungo, e un foglio si
 * chiude trascinandolo in giu'. Sarebbero due gesti opposti sullo stesso dito.
 *
 * ⚠️ LA RICERCA QUI DENTRO E' LOCALE, e non e' un dettaglio di prestazioni.
 * `/api/cucina/search` cerca sul WEB (Tavily), passa dall'interprete e COSTA UN
 * CREDITO a ricerca: usarla per cercare fra le TUE ricette vorrebbe dire pagare
 * per cercare nel posto sbagliato. Le ricette salvate sono gia' tutte qui —
 * `getRecipes()` ne porta fino a 200 — e filtrarle e' una riga di JavaScript.
 *
 * I FILTRI SONO TRE, E TRE DEVONO RESTARE: testo del titolo, piattaforma, gia'
 * fatte. Sono i soli con un dato vero dietro.
 * 🚫 Niente «sotto i 30 minuti»: `extracted.tempo` e' la stringa che ha scritto
 * il creator («20 min», «un'oretta», «il tempo di una serie tv»), c'e' solo a
 * volte e non e' confrontabile — per filtrarci sopra bisognerebbe interpretarla,
 * cioe' indovinare. La difficolta' non esiste proprio come dato.
 *
 * 🚫 Il video non si incorpora: da qui si apre la ricetta, e dalla ricetta si va
 * sulla piattaforma del creator. La visualizzazione va a chi l'ha girata.
 */

const K2: React.CSSProperties = { background: "transparent", maxWidth: "none", height: "auto" };

type Piattaforma = "tiktok" | "youtube" | "web";

/** Minuscolo e senza accenti: «perù» si trova scrivendo «peru», e «Pollo» si
 *  trova scrivendo «pollo». Chi cerca non sa com'e' scritto il titolo. */
function piatto(s: string): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function nomePiattaforma(p: string): string {
  return p === "tiktok" ? "TikTok" : p === "youtube" ? "YouTube" : "Web";
}

export default function Ricettario({
  ricette,
  queryIniziale = "",
  onApri,
  onClose,
}: {
  ricette: Recipe[];
  /** Quello che stavi gia' scrivendo nella Cucina: si porta dietro, o la
   *  ricerca ricomincerebbe da capo appena si apre il contesto. */
  queryIniziale?: string;
  onApri: (r: Recipe) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(queryIniziale);
  const [piattaforma, setPiattaforma] = useState<Piattaforma | null>(null);
  const [soloFatte, setSoloFatte] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Le piattaforme che ci sono DAVVERO nel ricettario. Un chip «YouTube» che
     non filtra niente perche' non hai salvato nessun video di YouTube non e'
     un filtro, e' un vicolo cieco con un'etichetta. */
  const piattaformePresenti = useMemo(() => {
    const viste = new Set<Piattaforma>();
    for (const r of ricette) {
      const p = r.platform === "tiktok" || r.platform === "youtube" ? r.platform : "web";
      viste.add(p);
    }
    return (["tiktok", "youtube", "web"] as Piattaforma[]).filter((p) => viste.has(p));
  }, [ricette]);

  const quanteFatte = useMemo(() => ricette.filter((r) => r.timesCooked > 0).length, [ricette]);

  const filtrate = useMemo(() => {
    const t = piatto(q.trim());
    return ricette.filter((r) => {
      if (t && !piatto(r.title).includes(t) && !piatto(r.author ?? "").includes(t)) return false;
      if (piattaforma) {
        const p = r.platform === "tiktok" || r.platform === "youtube" ? r.platform : "web";
        if (p !== piattaforma) return false;
      }
      if (soloFatte && r.timesCooked <= 0) return false;
      return true;
    });
  }, [ricette, q, piattaforma, soloFatte]);

  const filtriAccesi = !!q.trim() || !!piattaforma || soloFatte;

  if (typeof document === "undefined") return null;

  const pannello = (
    <div className="k2" style={K2}>
      <div className="full" role="dialog" aria-modal="true" aria-label="Il tuo ricettario">
        <div className="topbar">
          <div className="r1">
            <button className="x tap" onClick={onClose} aria-label="Indietro" style={{ color: "inherit" }}>
              {I.back({ s: 15 })}
            </button>
            <span className="col">
              <span className="t">Il tuo ricettario</span>
              <span className="m">
                {filtriAccesi
                  ? `${filtrate.length} di ${ricette.length}`
                  : `${ricette.length} ${ricette.length === 1 ? "ricetta salvata" : "ricette salvate"}`}
              </span>
            </span>
          </div>
        </div>

        <div className="fullpad">
          {/* La barra di ricerca. NON e' `.ask`: quella ha il bordo teal e
              l'orca, e vuol dire «Keiko capisce e va a cercare fuori» — cioe'
              un credito. Questa e' una lente su una superficie neutra, e non
              chiama nessuno: filtra quello che hai gia' in mano. Due cose
              diverse devono avere due facce diverse. */}
          {ricette.length > 0 && (
            <div
              className="srf"
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", marginTop: 0 }}
            >
              <span style={{ color: "var(--meta)", flex: "none", display: "flex" }}>{I.search({ s: 16 })}</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca fra le tue ricette"
                aria-label="Cerca fra le tue ricette"
                /* 16px: sotto i 16 iOS ingrandisce la pagina al primo tocco e
                   non torna piu' indietro. */
                style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
              />
              {q && (
                <button
                  className="tap"
                  onClick={() => setQ("")}
                  aria-label="Cancella la ricerca"
                  style={{ flex: "none", background: "none", border: 0, color: "var(--meta)", cursor: "pointer", display: "flex", padding: 0 }}
                >
                  {I.close({ s: 13 })}
                </button>
              )}
            </div>
          )}

          {/* I filtri: solo quelli che hanno un dato dietro, e solo quando
              quel dato c'e'. */}
          {(piattaformePresenti.length > 1 || quanteFatte > 0) && (
            <div className="chips" style={{ marginTop: 10, overflow: "visible", flexWrap: "wrap" }}>
              {piattaformePresenti.length > 1 && piattaformePresenti.map((p) => (
                <button
                  key={p}
                  className={"chip tap" + (piattaforma === p ? " on" : "")}
                  onClick={() => setPiattaforma((v) => (v === p ? null : p))}
                  style={{ minHeight: 40 }}
                >
                  {nomePiattaforma(p)}
                </button>
              ))}
              {quanteFatte > 0 && (
                <button
                  className={"chip tap" + (soloFatte ? " on" : "")}
                  onClick={() => setSoloFatte((v) => !v)}
                  style={{ minHeight: 40 }}
                >
                  già fatte
                </button>
              )}
            </div>
          )}

          {/* Le copertine, grandi, in colonna: e' un ricettario, e un ricettario
              si sfoglia guardando. */}
          {filtrate.length > 0 && (
            <div className="g2" style={{ marginTop: 14 }}>
              {filtrate.map((r) => (
                <Poster
                  key={r.id}
                  img={r.thumbnail}
                  t={r.title}
                  m={r.timesCooked > 0
                    ? `fatta ${r.timesCooked} ${r.timesCooked === 1 ? "volta" : "volte"}`
                    : (r.author || nomePiattaforma(r.platform))}
                  badge={r.platform === "tiktok" ? "TikTok" : r.platform === "youtube" ? "YouTube" : undefined}
                  onClick={() => onApri(r)}
                  ariaLabel={r.title}
                />
              ))}
            </div>
          )}

          {/* Due vuoti diversi, perche' sono due situazioni diverse: non hai
              ancora salvato niente, oppure hai cercato una cosa che qui dentro
              non c'e'. Dire la stessa frase in tutt'e due i casi manderebbe a
              cercare un tasto che non serve. */}
          {ricette.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <Empty
                icon={I.pot({ s: 24 })}
                t="Il ricettario è vuoto"
                m="Cerco la ricetta, tu cucini.<br/>Quelle che salvi restano qui, anche senza rete."
              />
            </div>
          )}

          {ricette.length > 0 && filtrate.length === 0 && (
            <div style={{ marginTop: 16 }}>
              <Empty
                icon={I.search({ s: 24 })}
                t="Nessuna con questi filtri"
                m="Prova con meno parole, o togli un filtro.<br/>Qui si cerca solo fra le tue: quelle nuove si cercano dalla Cucina."
                cta="Togli i filtri"
                onCta={() => { setQ(""); setPiattaforma(null); setSoloFatte(false); }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(pannello, document.body);
}
