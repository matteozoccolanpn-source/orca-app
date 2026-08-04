"use client";

/* ONBOARDING (K14) — quattro schermate, in un ordine preciso:
   PRIMA si vede funzionare, POI si danno i dati.

     1 · Benvenuto    non chiede niente. Il nome arriva da Google.
     2 · Provami      scrivi una frase → Keiko la trasforma in evento e LO SALVA,
                      così la home non è vuota alla fine. Questa costa 1 operazione
                      del tetto AI (K6): se la giornata è finita si può saltare.
     3 · Città        chiesta dopo, col perché scritto.
     4 · Trasparenza  due caselle facoltative, NESSUNA pre-spuntata.

   Le schermate 5 e 6 (schermata Home e avvisi) NON stanno qui: arrivano dopo,
   dalla home, e sono già fatte (K15 — lib/install-client.ts + InstallSheet).

   Tre cose che prima mancavano: si torna indietro, si riprende dalla schermata
   dove si era rimasti, e se Keiko non capisce la frase non mostra un errore
   tecnico ma i campi da correggere a mano. Chi salta tutto trova un'app che
   funziona lo stesso. */

import { useEffect, useState, type CSSProperties } from "react";
import { catFor, glyphFor, gradientFor } from "@/lib/smart-image";

const PASSO_SALVATO = "keiko-onboarding-passo";
const ULTIMO_PASSO = 3;

type Bozza = { title: string; type: string; date: string; time: string; location: string; reference: string; city: string };
type StatoWow = "scrivi" | "capisco" | "ecco" | "correggi" | "salvo" | "salvato";

const ESEMPI = ["cena venerdì alle 20 da Marco", "palestra giovedì 19", "dentista il 12 alle 9:30"];

/** "ven 7 agosto · 20:00" — formato breve di UI-VOICE. */
function quando(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time || "12:00"}:00`);
    const g = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "long", timeZone: "Europe/Rome" }).format(d);
    return time ? `${g} · ${time}` : g;
  } catch {
    return date;
  }
}

function oggiISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Onboarding({ accountName, name, city, onName, onCity, onDone }: {
  /** Il nome che arriva dall'account Google. Non si chiede: si mostra. */
  accountName?: string;
  name: string;
  city: string;
  onName: (v: string) => void;
  onCity: (v: string) => void;
  /** Chiamata a fine onboarding (anche se si salta tutto). */
  onDone: (haSalvatoEvento: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [c, setC] = useState(city);

  // 1 · il nome: da Google, correggibile solo se l'utente dice "non sei tu?"
  const [correggiNome, setCorreggiNome] = useState(false);
  const nomeMostrato = (name.trim() || accountName?.trim() || "").split(" ")[0] ?? "";

  // 2 · il momento wow
  const [frase, setFrase] = useState("");
  const [wow, setWow] = useState<StatoWow>("scrivi");
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [wowMsg, setWowMsg] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);

  // 4 · i consensi. NON pre-spuntati: si spuntano solo di propria mano.
  const [okSalute, setOkSalute] = useState(false);
  const [okEmail, setOkEmail] = useState(false);

  // Riprendere da dove si era rimasti: se l'app si chiude a metà, si torna alla
  // schermata giusta e non da capo.
  useEffect(() => {
    try {
      const s = Number(localStorage.getItem(PASSO_SALVATO));
      if (Number.isInteger(s) && s > 0 && s <= ULTIMO_PASSO) setStep(s);
    } catch { /* no-op */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(PASSO_SALVATO, String(step)); } catch { /* no-op */ }
  }, [step]);

  function chiudi(haSalvato: boolean) {
    try { localStorage.removeItem(PASSO_SALVATO); } catch { /* no-op */ }
    // K14b — si segna sul SERVER che l'onboarding è finito, in qualunque
    // contesto sia stato fatto. Da qui in poi non riparte più: né in Safari né
    // dall'icona, che su iPhone hanno storage separati.
    // Non si aspetta la risposta: se fallisse, il peggio è rivederlo una volta.
    fetch("/api/profile/onboarded", { method: "POST", credentials: "include", keepalive: true }).catch(() => {});
    onDone(haSalvato);
  }

  const avanti = () => (step < ULTIMO_PASSO ? setStep(step + 1) : fine());
  const indietro = () => setStep((s) => Math.max(0, s - 1));

  async function fine() {
    // I consensi si scrivono solo se qualcosa è stato spuntato: chi non tocca
    // niente non lascia righe, ed è giusto così (non ha acconsentito a nulla).
    const daSalvare = [
      okSalute ? { tipo: "salute", accettato: true } : null,
      okEmail ? { tipo: "email", accettato: true } : null,
    ].filter(Boolean);
    await Promise.all(
      daSalvare.map((b) =>
        fetch("/api/consents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify(b),
        }).catch(() => {})   // un consenso non salvato non blocca l'ingresso nell'app
      )
    );
    chiudi(salvato);
  }

  // ── 2 · dalla frase all'evento ────────────────────────────────────────────
  async function capisci(testo: string) {
    const t = testo.trim();
    if (!t) return;
    setWow("capisco"); setWowMsg(null);
    const fd = new FormData();
    fd.append("text", t);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const d = await res.json().catch(() => ({}));

      // Tetto AI finito (K6): il messaggio è quello di Keiko, non un errore.
      if (res.status === 429) {
        setWowMsg(d?.error ?? "Per oggi mi fermo qui 🌙");
        setWow("scrivi");
        return;
      }
      // Non ho afferrato: mai un errore tecnico al primo minuto. Si correggono
      // i campi a mano e si salva lo stesso.
      if (!res.ok || !d?.parsed) {
        setBozza({ title: t.slice(0, 80), type: "other", date: oggiISO(), time: "12:00", location: "", reference: "", city: "" });
        setWowMsg("Non ho afferrato. Correggi tu: poi lo salvo.");
        setWow("correggi");
        return;
      }
      const p = d.parsed as { title: string; type: string; datetime: string; location: string; reference: string; city: string };
      const [data, ora] = (p.datetime ?? "").split("T");
      setBozza({
        title: p.title || t.slice(0, 80),
        type: p.type || "other",
        date: data || oggiISO(),
        time: (ora ?? "").slice(0, 5) || "12:00",
        location: p.location ?? "",
        reference: p.reference ?? "",
        city: p.city ?? "",
      });
      setWow("ecco");
    } catch {
      setBozza({ title: t.slice(0, 80), type: "other", date: oggiISO(), time: "12:00", location: "", reference: "", city: "" });
      setWowMsg("Non ho afferrato. Correggi tu: poi lo salvo.");
      setWow("correggi");
    }
  }

  async function salva() {
    if (!bozza) return;
    setWow("salvo"); setWowMsg(null);
    try {
      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: bozza.title,
          type: bozza.type,
          datetime: `${bozza.date}T${bozza.time || "12:00"}:00`,
          location: bozza.location,
          reference: bozza.reference,
          city: bozza.city,
        }),
      });
      if (!res.ok) throw new Error();
      setSalvato(true);
      setWow("salvato");
      // se l'evento ha una città e l'utente non ne ha una, parte già suggerita
      if (bozza.city && !c.trim()) setC(bozza.city);
      setTimeout(() => setStep(2), 900);
    } catch {
      setWowMsg("Qualcosa non torna, riprovo?");
      setWow(bozza ? "correggi" : "scrivi");
    }
  }

  // ── stili condivisi ───────────────────────────────────────────────────────
  const input: CSSProperties = { width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "13px 15px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, boxSizing: "border-box" };
  const h1: CSSProperties = { fontSize: 27, color: "var(--k-text)", margin: "0 0 10px", lineHeight: 1.14 };
  const p: CSSProperties = { fontSize: 14.5, color: "var(--k-text-2)", lineHeight: 1.55, margin: 0 };
  const chip: CSSProperties = { display: "inline-block", background: "rgba(255,255,255,.06)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5, color: "var(--k-text-2)", margin: "0 6px 7px 0", cursor: "pointer" };
  const mini: CSSProperties = { fontSize: 11.5, color: "var(--k-text-3)", lineHeight: 1.5, textAlign: "center" };
  const salta: CSSProperties = { background: "none", border: 0, color: "var(--k-text-3)", fontSize: 13.5, cursor: "pointer", width: "100%", marginTop: 12, padding: 8 };

  const cat = bozza ? catFor(bozza.type, bozza.title) : "default";

  return (
    <div className="ds" style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--k-bg)", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 44px) 24px calc(env(safe-area-inset-bottom) + 24px)", maxWidth: 440, margin: "0 auto", overflowY: "auto" }}>
      {/* indietro — prima si poteva solo andare avanti */}
      {step > 0 && (
        <button onClick={indietro} aria-label="Indietro" style={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 12px)", left: 18, background: "none", border: 0, color: "var(--k-text-3)", fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 6 }}>‹</button>
      )}

      <div style={{ display: "flex", gap: 5, marginBottom: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "var(--k-accent)" : "var(--k-line)", transition: "background .2s" }} />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {/* ── 1 · benvenuto ─────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🐋</div>
            <h1 className="ds-display" style={h1}>
              {nomeMostrato ? `Ciao ${nomeMostrato},` : "Ciao,"}<br />sono Keiko.
            </h1>
            <p style={p}>Tengo insieme la tua settimana: eventi, dieta, allenamento, cosa guardare. Tu me lo dici come viene, al resto ci penso io.</p>
            <div style={{ marginTop: 18 }}>
              <span style={{ ...chip, background: "rgba(255,184,77,.13)", borderColor: "rgba(255,184,77,.32)", color: "var(--k-accent)", cursor: "default" }}>«volo domani 6:00»</span>
              <span style={{ ...chip, cursor: "default" }}><span style={{ marginRight: 5 }}>📸</span>uno screenshot</span>
              <span style={{ ...chip, cursor: "default" }}><span style={{ marginRight: 5 }}>📄</span>il PDF della dieta</span>
            </div>
            {correggiNome && (
              <div style={{ marginTop: 20 }}>
                <input autoFocus value={name} onChange={(e) => onName(e.target.value)} placeholder="Come ti chiamo?" style={input} />
                <p style={{ ...mini, textAlign: "left", margin: "8px 2px 0" }}>Lo uso solo per salutarti.</p>
              </div>
            )}
          </>
        )}

        {/* ── 2 · il momento wow ────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h1 className="ds-display" style={h1}>Provami subito.</h1>
            <p style={{ ...p, marginBottom: 16 }}>Scrivi una cosa che hai da fare, come la diresti a voce.</p>

            {(wow === "scrivi" || wow === "capisco") && (
              <>
                <input
                  autoFocus
                  value={frase}
                  onChange={(e) => setFrase(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") capisci(frase); }}
                  placeholder="cena venerdì alle 20 da Marco"
                  disabled={wow === "capisco"}
                  style={input}
                />
                <div style={{ marginTop: 12 }}>
                  {ESEMPI.slice(1).map((e) => (
                    <span key={e} style={chip} onClick={() => { setFrase(e); capisci(e); }}>{e}</span>
                  ))}
                </div>
              </>
            )}

            {wow === "capisco" && <p style={{ ...p, marginTop: 16 }}>Ci penso io ✨</p>}

            {(wow === "ecco" || wow === "salvo" || wow === "salvato") && bozza && (
              <>
                <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--k-text-3)", marginBottom: 8 }}>Ecco cosa capisco</div>
                <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(0,0,0,.5)", boxShadow: "var(--k-shadow)" }}>
                  <div style={{ position: "absolute", inset: 0, background: gradientFor(cat) }} />
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "65%", background: "linear-gradient(180deg,transparent,rgba(4,8,16,.78))" }} />
                  <div style={{ position: "relative", zIndex: 2, padding: 14, minHeight: 118, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div style={{ position: "absolute", top: 12, left: 14, fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--k-accent)", fontWeight: 700 }}>
                      {glyphFor(cat)} {cat === "default" ? "Da fare" : cat}
                    </div>
                    <h4 style={{ margin: 0, fontSize: 17, letterSpacing: "-.015em", color: "var(--k-text)", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{bozza.title}</h4>
                    <div style={{ fontSize: 12.5, color: "var(--k-text-2)", marginTop: 4 }}>
                      <b style={{ color: "var(--k-accent)" }}>{quando(bozza.date, bozza.time)}</b>
                      {bozza.location ? ` · ${bozza.location}` : ""}
                    </div>
                  </div>
                </div>
                {wow === "salvato" && <p style={{ ...p, marginTop: 14 }}>Preso in carico ✓</p>}
              </>
            )}

            {wow === "correggi" && bozza && (
              <>
                <p style={{ ...p, marginBottom: 12 }}>{wowMsg}</p>
                <input value={bozza.title} onChange={(e) => setBozza({ ...bozza, title: e.target.value })} placeholder="Che cos'è" style={input} />
                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input type="date" value={bozza.date} onChange={(e) => setBozza({ ...bozza, date: e.target.value })} style={{ ...input, flex: 1 }} />
                  <input type="time" value={bozza.time} onChange={(e) => setBozza({ ...bozza, time: e.target.value })} style={{ ...input, width: 120 }} />
                </div>
              </>
            )}

            {wowMsg && wow !== "correggi" && <p style={{ ...p, marginTop: 14 }}>{wowMsg}</p>}
          </>
        )}

        {/* ── 3 · la città ──────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
            <h1 className="ds-display" style={h1}>Dove ti trovo?</h1>
            <p style={{ ...p, marginBottom: 18 }}>Mi serve per il meteo del giorno e per dirti quando uscire di casa. La cambi quando vuoi dal profilo.</p>
            <input autoFocus value={c} onChange={(e) => setC(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { onCity(c.trim()); avanti(); } }} placeholder="Es. Milano" style={input} />
          </>
        )}

        {/* ── 4 · trasparenza ───────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h1 className="ds-display" style={{ ...h1, fontSize: 23 }}>Due cose, poi ti lascio in pace.</h1>
            <p style={{ ...p, fontSize: 13, marginBottom: 18 }}>
              I tuoi dati sono tuoi: niente pubblicità, niente rivendita. Il database è in Europa;
              per leggere foto e PDF mi appoggio a un&apos;intelligenza artificiale che elabora negli
              Stati Uniti, con le garanzie di legge. Cancelli tutto quando vuoi, dal profilo.
            </p>

            <Casella on={okSalute} onToggle={() => setOkSalute(!okSalute)} titolo="Dieta e allenamento">
              Per tenere il tuo piano mi serve il consenso sui dati di salute. Serve solo per queste due sezioni, e lo togli quando vuoi.
            </Casella>
            <Casella on={okEmail} onToggle={() => setOkEmail(!okEmail)} titolo="Avvisami per email">
              Solo quando aggiungo qualcosa che ti serve. Poche volte l&apos;anno.
            </Casella>

            <p style={{ ...mini, textAlign: "left", margin: "12px 2px 0" }}>
              Nessuna delle due è obbligatoria. Senza la prima, Keiko funziona lo stesso: solo senza Dieta e Allenamento.
            </p>
          </>
        )}
      </div>

      {/* ── i tasti in fondo, per schermata ─────────────────────────────── */}
      <div style={{ paddingTop: 20 }}>
        {step === 0 && (
          <>
            <button onClick={avanti} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700 }}>Comincia</button>
            <p style={{ ...mini, marginTop: 14 }}>
              {correggiNome ? "Lo cambi quando vuoi dal profilo." : <>Nome preso dal tuo account Google.{" "}
                <button onClick={() => setCorreggiNome(true)} style={{ background: "none", border: 0, color: "var(--k-accent)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Non sei tu?</button></>}
            </p>
          </>
        )}

        {step === 1 && (
          <>
            {(wow === "scrivi" || wow === "capisco") && (
              <button onClick={() => capisci(frase)} disabled={!frase.trim() || wow === "capisco"} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700, opacity: !frase.trim() || wow === "capisco" ? 0.5 : 1 }}>
                {wow === "capisco" ? "…" : "Vediamo"}
              </button>
            )}
            {(wow === "ecco" || wow === "correggi" || wow === "salvo") && (
              <>
                <button onClick={salva} disabled={wow === "salvo"} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700, opacity: wow === "salvo" ? 0.5 : 1 }}>
                  {wow === "salvo" ? "…" : wow === "correggi" ? "Salvalo così" : "Salvalo, è giusto"}
                </button>
                {wow === "ecco" && (
                  <button onClick={() => { setWowMsg(null); setWow("correggi"); }} style={{ ...salta, color: "var(--k-accent)", fontWeight: 700 }}>Modifica</button>
                )}
              </>
            )}
            {wow !== "salvato" && (
              <button onClick={avanti} style={salta}>Salta</button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <button onClick={() => { onCity(c.trim()); avanti(); }} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700 }}>Avanti</button>
            <button onClick={avanti} style={salta}>Non ora</button>
          </>
        )}

        {step === 3 && (
          <button onClick={fine} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700 }}>Iniziamo</button>
        )}
      </div>
    </div>
  );
}

/* Casella di consenso: parte SEMPRE spenta. Si accende solo di propria mano. */
function Casella({ on, onToggle, titolo, children }: { on: boolean; onToggle: () => void; titolo: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onToggle}
      role="checkbox"
      aria-checked={on}
      style={{ display: "flex", gap: 11, alignItems: "flex-start", width: "100%", textAlign: "left", background: "rgba(255,255,255,.04)", border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 13px", marginBottom: 9, cursor: "pointer", fontFamily: "inherit" }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 6, flex: "0 0 20px", marginTop: 1, border: on ? "1.5px solid var(--k-accent)" : "1.5px solid rgba(255,255,255,.3)", background: on ? "var(--k-accent)" : "transparent", color: "var(--k-accent-ink)", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>
        {on ? "✓" : ""}
      </span>
      <span style={{ fontSize: 12.8, lineHeight: 1.45, color: "var(--k-text-3)" }}>
        <b style={{ display: "block", fontSize: 13.5, marginBottom: 2, color: "var(--k-text)" }}>{titolo}</b>
        {children}
      </span>
    </button>
  );
}
