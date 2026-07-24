"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Onboarding "a scomparsa" del profilo (S1 rework allenamento).
   Compare in cima ad Allenamento SOLO finché il profilo non esiste su Supabase:
   4 scelte rapide a chip + un campo libero opzionale. Salvato il profilo,
   la card sparisce da tutti i dispositivi (il dato sta sul server, non in locale).
   "Più tardi" la nasconde solo per questa visita — niente flag persistenti. */

const OBIETTIVI = [
  { v: "dimagrire", label: "Dimagrire" },
  { v: "massa", label: "Massa" },
  { v: "tonificare", label: "Tonificare" },
  { v: "forma", label: "Restare in forma" },
];
const LIVELLI = [
  { v: "principiante", label: "Principiante" },
  { v: "intermedio", label: "Intermedio" },
  { v: "avanzato", label: "Avanzato" },
];
const STILI = [
  { v: "chill", label: "🌿 Chill" },
  { v: "duro", label: "💪 Duro" },
];
const NUMS = [0, 1, 2, 3, 4, 5];

export default function ProfiloSetup() {
  const router = useRouter();
  const [hidden, setHidden] = useState(false);
  const [obiettivo, setObiettivo] = useState("");
  const [livello, setLivello] = useState("");
  const [palestra, setPalestra] = useState<number | null>(null);
  const [corsa, setCorsa] = useState<number | null>(null);
  const [stile, setStile] = useState("");
  const [vincoli, setVincoli] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  if (hidden) return null;
  const ready = !!obiettivo && !!livello && palestra !== null;

  async function save() {
    if (!ready || saving) return;
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          obiettivo,
          livello,
          sessioni: { palestra: palestra ?? 0, corsa: corsa ?? 0 },
          stile: stile || undefined,
          vincoli: vincoli.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); // il server ora vede il profilo → la card sparisce
    } catch {
      setErr("Non sono riuscito a salvare, riprova");
      setSaving(false);
    }
  }

  const chip = (on: boolean): React.CSSProperties => ({
    padding: "8px 13px",
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${on ? "transparent" : "var(--k-line)"}`,
    background: on ? "var(--k-accent)" : "var(--k-surface-2)",
    color: on ? "var(--k-accent-ink)" : "var(--k-text-2)",
  });
  const label: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: ".4px",
    textTransform: "uppercase",
    color: "var(--k-text-3)",
    margin: "14px 0 8px",
  };
  const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };

  return (
    <div style={{ background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, padding: "16px 16px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--k-text)", margin: 0 }}>Dimmi come ti alleni 🐋</h3>
      </div>
      <p style={{ fontSize: 13, color: "var(--k-text-2)", lineHeight: 1.5, margin: "6px 0 0" }}>
        Poche risposte e Keiko si regola da sola — e più carichi (scheda, sessioni), più diventa precisa.
      </p>

      <div style={label}>Obiettivo</div>
      <div style={row}>
        {OBIETTIVI.map((o) => (
          <button key={o.v} onClick={() => setObiettivo(o.v)} style={chip(obiettivo === o.v)}>{o.label}</button>
        ))}
      </div>

      <div style={label}>Livello</div>
      <div style={row}>
        {LIVELLI.map((l) => (
          <button key={l.v} onClick={() => setLivello(l.v)} style={chip(livello === l.v)}>{l.label}</button>
        ))}
      </div>

      <div style={label}>Palestra a settimana</div>
      <div style={row}>
        {NUMS.map((x) => (
          <button key={x} onClick={() => setPalestra(x)} style={chip(palestra === x)}>{x}</button>
        ))}
      </div>

      <div style={label}>Corsa a settimana</div>
      <div style={row}>
        {NUMS.map((x) => (
          <button key={x} onClick={() => setCorsa(x)} style={chip(corsa === x)}>{x}</button>
        ))}
      </div>

      <div style={label}>Come mi vuoi</div>
      <div style={row}>
        {STILI.map((s) => (
          <button key={s.v} onClick={() => setStile(s.v)} style={chip(stile === s.v)}>{s.label}</button>
        ))}
      </div>

      <div style={label}>Vincoli o infortuni (opzionale)</div>
      <input
        value={vincoli}
        onChange={(e) => setVincoli(e.target.value)}
        placeholder="es. ginocchio delicato, niente stacchi…"
        style={{ width: "100%", boxSizing: "border-box", background: "var(--k-surface-2)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "11px 13px", color: "var(--k-text)", fontSize: 14, fontFamily: "inherit", outline: 0 }}
      />

      {err && <p style={{ fontSize: 13, color: "#E2705F", margin: "10px 0 0" }}>{err}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => setHidden(true)} disabled={saving} className="ds-btn" style={{ height: 46, padding: "0 16px" }}>Più tardi</button>
        <button onClick={save} disabled={!ready || saving} className="ds-btn primary" style={{ flex: 1, height: 46, opacity: ready ? 1 : 0.45 }}>
          {saving ? "Salvo…" : "Salva profilo"}
        </button>
      </div>
    </div>
  );
}
