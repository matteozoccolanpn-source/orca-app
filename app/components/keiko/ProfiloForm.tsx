"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* Form del profilo allenamento/dieta (il "seme" della personalizzazione).
   Riutilizzato in DUE posti:
   - onboarding "a scomparsa" in /allenamento (ProfiloSetup, initial = null)
   - modifica dal pannello Profilo in home (ProfileSheet, initial = profilo salvato)
   Salva su /api/profile e chiama onSaved; il refresh lo decide chi lo ospita. */

export type ProfiloValori = {
  obiettivo: string | null;
  livello: string | null;
  sessioni: { palestra?: number; corsa?: number } | null;
  vincoli: string | null;
  stile: string | null;
};

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

export default function ProfiloForm({
  initial = null,
  saveLabel = "Salva profilo",
  onSaved,
}: {
  initial?: ProfiloValori | null;
  saveLabel?: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [obiettivo, setObiettivo] = useState(initial?.obiettivo ?? "");
  const [livello, setLivello] = useState(initial?.livello ?? "");
  const [palestra, setPalestra] = useState<number | null>(initial?.sessioni?.palestra ?? null);
  const [corsa, setCorsa] = useState<number | null>(initial?.sessioni?.corsa ?? null);
  const [stile, setStile] = useState(initial?.stile ?? "");
  const [vincoli, setVincoli] = useState(initial?.vincoli ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
      router.refresh();
      onSaved?.();
    } catch {
      setErr("Non sono riuscito a salvare, riprova");
    } finally {
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
    <div>
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

      <button onClick={save} disabled={!ready || saving} className="ds-btn primary" style={{ width: "100%", height: 46, marginTop: 16, opacity: ready ? 1 : 0.45 }}>
        {saving ? "Salvo…" : saveLabel}
      </button>
    </div>
  );
}
