"use client";

import { useState } from "react";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { Feedback } from "@/app/components/v2/Feedback";
import { I } from "@/app/components/v2/icons";

/* «CHIEDI A KEIKO», sul sistema V2.
 *
 * Gli stati sono quelli del pannello del sistema: fermo → sta pensando →
 * risultato. Due differenze da `AskPanel`, e sono volute:
 *  - mentre pensa ci sono gli SCHELETRI, non l'orb che gira. Uno scheletro ha
 *    la forma di quello che sta arrivando e dice «sta per esserci del testo»;
 *    un cerchio che ruota dice solo «aspetta»;
 *  - `AskPanel` disegna un'anteprima con il diff — «ecco cosa cambierei» — e
 *    qui non c'è niente da cambiare: si fa una domanda e arriva una risposta.
 *    Il diff non si finge. Le classi del pannello (`.panel`, `.ph-head`,
 *    `.bd`, `.why`) sono le sue, quindi la forma è quella del sistema.
 *
 * Sotto la risposta c'è il perché in teal, coi pollici e «spiegami perché»
 * (`Feedback`): ogni cosa che Keiko dice si può contestare.
 *
 * LE CHIAMATE NON CAMBIANO: /api/ask e /api/search, in parallelo. */

type SearchRes = {
  events: { id: string; title: string; datetime: string; location: string | null }[];
  todos: { id: string; text: string; day: string; time: string | null }[];
};

function fmtWhen(dt: string) {
  try { return new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(dt)); }
  catch { return dt; }
}

// to-do: "2026-07-03" + "20:00:00" → "gio 3 lug · 20:00"
function fmtDay(day: string, time?: string | null) {
  try {
    const base = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" }).format(new Date(day + "T00:00:00"));
    return base + (time ? ` · ${time.slice(0, 5)}` : "");
  } catch { return day + (time ? ` · ${time.slice(0, 5)}` : ""); }
}

// rende il **grassetto** del markdown come testo forte reale
function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700, color: "var(--txt)" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

const ESEMPI = ["che allenamento ho oggi?", "cosa mangio a cena?", "quando è il prossimo volo?"];

export default function AskSheet({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [chiesto, setChiesto] = useState("");   // la domanda a cui sta rispondendo
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [res, setRes] = useState<SearchRes | null>(null);

  async function run(testo?: string) {
    const query = (testo ?? q).trim();
    if (!query) return;
    setChiesto(query);
    setBusy(true); setAnswer(null); setRes(null);
    try {
      const [ai, s] = await Promise.all([
        fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) }).then((r) => r.json()).catch(() => ({ answer: "" })),
        fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: query }) }).then((r) => r.json()).catch(() => ({ events: [], todos: [] })),
      ]);
      // Quando non sa, lo dice e basta: niente faccina che addolcisce un buco.
      setAnswer(typeof ai?.answer === "string" && ai.answer ? ai.answer : "Su questa non ho ancora una risposta. Me la segno.");
      setRes({ events: s?.events ?? [], todos: s?.todos ?? [] });
    } catch {
      setAnswer("Ho avuto un intoppo, riprova.");
    } finally {
      setBusy(false);
    }
  }

  const hasLinks = res && (res.events.length > 0 || res.todos.length > 0);

  return (
    <div className="k2" style={K2_FOGLIO}>
      <Sheet onClose={onClose}>
        <div className="plain-head">
          <h2>Chiedi a Keiko</h2>
        </div>

        <div className="pad">
          {/* la barra: qui è un campo vero, perché la domanda si scrive */}
          <div className="ask" style={{ marginTop: 14, cursor: "auto" }}>
            <span style={{ color: "var(--teal)", flex: "none", display: "flex" }}>{I.orca(19)}</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
              placeholder="Che allenamento ho oggi?"
              aria-label="La tua domanda"
              /* 16px: sotto i 16 iOS ingrandisce la pagina al primo tocco e
                 non torna più indietro. */
              style={{ flex: 1, minWidth: 0, background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", padding: 0 }}
            />
            <button
              className="go tap"
              onClick={() => run()}
              disabled={busy || !q.trim()}
              aria-label="Chiedi"
              style={{ border: 0, cursor: "pointer", opacity: busy || !q.trim() ? 0.45 : 1 }}
            >
              {I.right({ s: 14 })}
            </button>
          </div>

          {/* ── sta pensando: scheletri, non un cerchio che gira ── */}
          {busy && (
            <div className="srf2 panel glow" style={{ marginTop: 12 }}>
              <div className="ph-head">
                <span style={{ color: "var(--teal)", display: "flex" }}>{I.orca(18)}</span>
                <span className="ph-q">{chiesto}</span>
                <span className="ph-st">ci sto pensando</span>
              </div>
              <div className="bd">
                <span className="sk sk-line" style={{ display: "block", width: "92%" }} />
                <span className="sk sk-line" style={{ display: "block", width: "78%" }} />
                <span className="sk sk-line" style={{ display: "block", width: "54%" }} />
              </div>
            </div>
          )}

          {/* ── la risposta ── */}
          {!busy && answer && (
            <div className="srf2 panel glow" style={{ marginTop: 12 }}>
              <div className="ph-head">
                <span style={{ color: "var(--teal)", display: "flex" }}>{I.orca(18)}</span>
                <span className="ph-q">{chiesto}</span>
                <span className="chevhit tap" onClick={() => { setAnswer(null); setRes(null); }}>
                  {I.close({ s: 15 })}
                </span>
              </div>
              <div className="bd">
                <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--txt)", whiteSpace: "pre-wrap" }}>
                  {renderRich(answer)}
                </div>
                {/* Il perché, in teal, coi pollici e «spiegami perché». */}
                <div className="why">
                  {I.tick({ s: 13 })}
                  <span style={{ flex: 1 }}>Risposta dai tuoi dati di oggi</span>
                  <Feedback perche="Guardo i tuoi eventi, i to-do, la dieta e la scheda di allenamento di questi giorni. Se qualcosa non c'è, non lo invento: te lo dico." />
                </div>
              </div>
            </div>
          )}

          {/* ── i collegamenti: righe-azione del sistema ── */}
          {!busy && hasLinks && (
            <>
              <div className="status" style={{ marginTop: 16, marginBottom: 8 }}>Nelle tue cose</div>
              <div className="srf">
                {res!.events.map((e) => (
                  <div className="row-act" key={e.id} style={{ cursor: "default" }}>
                    <span className="ic2">{I.cal({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">{e.title}</span>
                      <span className="m">{fmtWhen(e.datetime)}{e.location ? ` · ${e.location}` : ""}</span>
                    </span>
                  </div>
                ))}
                {res!.todos.map((t) => (
                  <div className="row-act" key={t.id} style={{ cursor: "default" }}>
                    <span className="ic2">{I.tick({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">{t.text}</span>
                      <span className="m">{fmtDay(t.day, t.time)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── fermo: tre esempi, che insegnano cosa si può chiedere ── */}
          {!busy && !answer && (
            <>
              <div className="status" style={{ marginTop: 16, marginBottom: 8 }}>Prova a chiedere</div>
              <div className="srf">
                {ESEMPI.map((s) => (
                  <div
                    className="row-act tap"
                    key={s}
                    onClick={() => { setQ(s); run(s); }}
                    role="button"
                  >
                    <span className="ic2">{I.orca(15)}</span>
                    <span className="in"><span className="t">{s}</span></span>
                    {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
