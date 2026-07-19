"use client";

// Onboarding primo avvio (X6): 3 passi rapidi (nome → città → come si usa),
// così l'app è usabile subito, anche senza aver caricato dieta/allenamento.
// Salva nome/città in locale (stesse chiavi del profilo) e un flag keiko-onboarded.

import { useState, type CSSProperties } from "react";

export default function Onboarding({ name, city, onName, onCity, onDone }: {
  name: string;
  city: string;
  onName: (v: string) => void;
  onCity: (v: string) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [n, setN] = useState(name);
  const [c, setC] = useState(city);

  function next() {
    if (step === 0) onName(n.trim());
    if (step === 1) onCity(c.trim());
    if (step < 2) setStep(step + 1);
    else onDone();
  }

  const input: CSSProperties = { width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "13px 15px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, marginTop: 16, boxSizing: "border-box" };
  const h1: CSSProperties = { fontSize: 28, color: "var(--k-text)", margin: "0 0 8px", lineHeight: 1.12 };
  const p: CSSProperties = { fontSize: 15, color: "var(--k-text-2)", lineHeight: 1.55, margin: 0 };
  const emoji: CSSProperties = { fontSize: 40, marginBottom: 12 };

  return (
    <div className="ds" style={{ position: "fixed", inset: 0, zIndex: 100, background: "var(--k-bg)", display: "flex", flexDirection: "column", padding: "calc(env(safe-area-inset-top) + 44px) 24px calc(env(safe-area-inset-bottom) + 24px)", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? "var(--k-accent)" : "var(--k-line)", transition: "background .2s" }} />
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {step === 0 && (
          <>
            <div style={emoji}>🐋</div>
            <h1 className="ds-display" style={h1}>Ciao, sono Keiko</h1>
            <p style={p}>Organizzo i tuoi eventi, la dieta, l&apos;allenamento e cosa guardare — in un posto solo. Come ti chiami?</p>
            <input autoFocus value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") next(); }} placeholder="Il tuo nome" style={input} />
          </>
        )}
        {step === 1 && (
          <>
            <div style={emoji}>📍</div>
            <h1 className="ds-display" style={h1}>La tua città</h1>
            <p style={p}>Mi serve per il meteo di oggi in home. Puoi cambiarla quando vuoi dal profilo.</p>
            <input autoFocus value={c} onChange={(e) => setC(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") next(); }} placeholder="Es. Milano" style={input} />
          </>
        )}
        {step === 2 && (
          <>
            <div style={emoji}>✨</div>
            <h1 className="ds-display" style={h1}>Tutto pronto{n.trim() ? `, ${n.trim()}` : ""}!</h1>
            <p style={p}>
              <b style={{ color: "var(--k-text)" }}>➕ Aggiungi</b> — tocca il + e scrivi (o incolla uno screenshot): «volo domani 6:00», «cena giovedì da Marco»… ci penso io.
              <br /><br />
              <b style={{ color: "var(--k-text)" }}>🥗 Dieta · 💪 Sport</b> — carica il tuo piano dalle sezioni in basso, quando vuoi.
              <br /><br />
              <b style={{ color: "var(--k-text)" }}>🍿 Guarda</b> — la tua lista di film e serie, coi consigli di Keiko.
            </p>
          </>
        )}
      </div>

      <button onClick={next} className="ds-btn primary" style={{ width: "100%", height: 52, fontSize: 16, fontWeight: 700 }}>
        {step < 2 ? "Avanti" : "Inizia"}
      </button>
      {step < 2 && (
        <button onClick={onDone} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 14, cursor: "pointer", marginTop: 14, padding: 8 }}>Salta</button>
      )}
    </div>
  );
}
