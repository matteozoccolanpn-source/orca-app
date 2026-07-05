"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X, Loader2, Check } from "lucide-react";
import type { DietMeal } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * Scambio alimento — versione v2.3 (token keiko, niente viola).
 * Riusa gli STESSI endpoint del vecchio pannello:
 *   POST /api/diet/swap {opzione}                  → { alimenti[] }
 *   POST /api/diet/swap {opzione, alimento, motivo}→ { alternative[] }
 * e committa via onCommit (→ /api/diet/save). Vive dentro app/salute
 * per non trascinare i colori del vecchio design nella shell Keiko.
 * ------------------------------------------------------------------ */

type Motivo = "equivalente" | "non_mi_piace" | "allergia";
const MOTIVI: { key: Motivo; label: string }[] = [
  { key: "equivalente", label: "Equivalente" },
  { key: "non_mi_piace", label: "Non mi piace" },
  { key: "allergia", label: "Allergia" },
];

export default function DietSwap({
  meal,
  onCommit,
  onClose,
}: {
  meal: DietMeal;
  onCommit: (optionIndex: number, newText: string) => Promise<void>;
  onClose: () => void;
}) {
  // La riga di oggi mostra la prima opzione: è quella che scambiamo.
  const optionIndex = 0;
  const opzione = meal.opzioni.length > 0 ? meal.opzioni[optionIndex] : "";

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [alimenti, setAlimenti] = useState<string[]>([]);
  const [alimento, setAlimento] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Motivo>("equivalente");
  const [alternative, setAlternative] = useState<string[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [err, setErr] = useState("");

  async function fetchFoods() {
    setStatus("loading");
    setErr("");
    try {
      const res = await fetch("/api/diet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ opzione }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa non torna");
      setAlimenti(Array.isArray(data.alimenti) ? data.alimenti : []);
      setStatus("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Qualcosa non torna");
      setStatus("error");
    }
  }

  async function fetchAlternatives() {
    if (!alimento) return;
    setLoadingAlts(true);
    setAlternative([]);
    setErr("");
    try {
      const res = await fetch("/api/diet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ opzione, alimento, motivo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa non torna");
      setAlternative(Array.isArray(data.alternative) ? data.alternative : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Qualcosa non torna");
    } finally {
      setLoadingAlts(false);
    }
  }

  async function pick(line: string) {
    setCommitting(true);
    try {
      await onCommit(optionIndex, line);
      onClose();
    } catch {
      // l'errore lo gestisce il genitore
    } finally {
      setCommitting(false);
    }
  }

  useEffect(() => {
    fetchFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--card-line)",
        borderRadius: "var(--r-md)",
        padding: 12,
        marginTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: "var(--fs-sm)", fontWeight: 800, color: "var(--text)" }}>Scambia un alimento</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="back"
          style={{ width: 28, height: 28, fontSize: 13 }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {status === "loading" && <Loader label="Leggo i cibi…" />}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)" }}>{err}</p>
          <button
            type="button"
            onClick={fetchFoods}
            style={{ marginTop: 6, background: "none", border: 0, color: "var(--accent)", fontWeight: 800, fontSize: "var(--fs-xs)", cursor: "pointer" }}
          >
            Riprovo
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          <Label>Quale cibo cambiamo?</Label>
          <ChipRow>
            {alimenti.map((a) => (
              <PickChip key={a} label={a} active={alimento === a} onClick={() => { setAlimento(a); setAlternative([]); }} />
            ))}
          </ChipRow>

          <Label>Perché?</Label>
          <ChipRow>
            {MOTIVI.map((m) => (
              <PickChip key={m.key} label={m.label} active={motivo === m.key} onClick={() => { setMotivo(m.key); setAlternative([]); }} />
            ))}
          </ChipRow>

          <button
            type="button"
            className="btn acc"
            onClick={fetchAlternatives}
            disabled={!alimento || loadingAlts}
            style={{ width: "100%", marginTop: 4, opacity: !alimento || loadingAlts ? 0.5 : 1 }}
          >
            {loadingAlts ? <Loader2 style={{ width: 15, height: 15 }} className="k-spin" /> : <RefreshCw style={{ width: 15, height: 15 }} />}
            {loadingAlts ? "Cerco…" : "Trova alternative"}
          </button>

          {alternative.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Label>Scegli il sostituto</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {alternative.map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => pick(line)}
                    disabled={committing}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      textAlign: "left",
                      background: "var(--paper)",
                      border: "1px solid var(--card-line)",
                      borderRadius: "var(--r-md)",
                      padding: "10px 12px",
                      fontSize: "var(--fs-sm)",
                      fontWeight: 700,
                      color: "var(--ink)",
                      lineHeight: 1.35,
                      cursor: "pointer",
                      opacity: committing ? 0.6 : 1,
                      fontFamily: "var(--f)",
                    }}
                  >
                    <Check style={{ width: 15, height: 15, flex: "none", color: "var(--ink-2)" }} />
                    <span style={{ minWidth: 0 }}>{line}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 0" }}>
      <Loader2 style={{ width: 15, height: 15, color: "var(--accent)" }} className="k-spin" />
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)" }}>{label}</span>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)", margin: "0 0 7px" }}>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>{children}</div>;
}

function PickChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="chipA"
      style={{
        background: active ? "var(--accent-soft)" : "rgba(21,32,47,.09)",
        color: active ? "var(--accent)" : "var(--ink)",
        border: active ? "1px solid var(--accent)" : "1px solid transparent",
      }}
    >
      {label}
    </button>
  );
}
