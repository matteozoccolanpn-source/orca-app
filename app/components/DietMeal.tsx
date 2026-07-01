"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coffee,
  Apple,
  UtensilsCrossed,
  Cookie,
  Moon,
  Utensils,
  RefreshCw,
  Replace,
  X,
  Loader2,
  RotateCcw,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DietMeal } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * UI dieta — tutto via token v15, nessun colore hardcoded.
 * MealRow è l'unico modo in cui un pasto viene mostrato (home + /salute),
 * così lo stile "opzione + cambia + scambia alimento" resta identico ovunque.
 * ------------------------------------------------------------------ */

/* Ordine e nomi estesi dei giorni. Le chiavi sono quelle del backend. */
export const DAY_ORDER = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
export const DAY_FULL: Record<string, string> = {
  lun: "Lunedì",
  mar: "Martedì",
  mer: "Mercoledì",
  gio: "Giovedì",
  ven: "Venerdì",
  sab: "Sabato",
  dom: "Domenica",
};

/** La chiave giorno di oggi (getDay(): 0=domenica). */
export function todayDietKey(): string {
  return ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][new Date().getDay()];
}

/* Icona coerente col nome del pasto (match "morbido" sul testo). */
function iconForMeal(pasto: string): LucideIcon {
  const p = pasto.toLowerCase();
  if (p.includes("colazione")) return Coffee;
  if (p.includes("spuntino")) return Apple;
  if (p.includes("pranzo")) return UtensilsCrossed;
  if (p.includes("merenda")) return Cookie;
  if (p.includes("cena")) return Moon;
  return Utensils;
}

type Motivo = "equivalente" | "non_mi_piace" | "allergia";
const MOTIVI: { key: Motivo; label: string }[] = [
  { key: "equivalente", label: "Equivalente" },
  { key: "non_mi_piace", label: "Non mi piace" },
  { key: "allergia", label: "Allergia" },
];

/**
 * Una riga-pasto: nome del pasto + UNA opzione visibile.
 * - "cambia" (RefreshCw): scorre le ALTERNATIVE INTERE del pasto (solo per guardare).
 * - "scambia alimento" (Replace): apre un pannello per cambiare UN singolo cibo.
 * Lo scambio è TEMPORANEO (stato locale). Se il genitore passa `onCommit`, compare
 * "Rendi definitivo" che riscrive quell'opzione nel piano salvato.
 */
export function MealRow({
  meal,
  onCommit,
}: {
  meal: DietMeal;
  onCommit?: (optionIndex: number, newText: string) => Promise<void>;
}) {
  const [idx, setIdx] = useState(0);
  const [localText, setLocalText] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [committing, setCommitting] = useState(false);

  const opzioni = meal.opzioni.length > 0 ? meal.opzioni : ["—"];
  const many = opzioni.length > 1;
  const Icon = iconForMeal(meal.pasto);

  const shown = localText ?? opzioni[idx];
  const swapped = localText !== null;

  // Scorrere le alternative intere azzera lo scambio (appartiene all'opzione mostrata).
  const next = () => {
    setLocalText(null);
    setPanelOpen(false);
    setIdx((i) => (i + 1) % opzioni.length);
  };
  const revert = () => setLocalText(null);
  const commit = async () => {
    if (!onCommit || localText === null) return;
    setCommitting(true);
    try {
      await onCommit(idx, localText);
      setLocalText(null); // dopo il refresh l'opzione salvata è già quella nuova
    } catch {
      // l'errore lo gestisce il genitore; qui restiamo sul testo temporaneo
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--inset)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-md)",
        padding: "var(--s3)",
        gap: "var(--s2)",
      }}
    >
      {/* ----- riga principale ----- */}
      <div className="flex items-center gap-[var(--s3)]">
        <span
          className="grid flex-none place-items-center"
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--r-sm)",
            background: "color-mix(in srgb, var(--primary) 14%, transparent)",
            color: "var(--accent-strong)",
          }}
        >
          <Icon className="size-[19px]" />
        </span>

        <div className="min-w-0 flex-1">
          <div
            className="flex items-center gap-2 uppercase"
            style={{
              fontSize: "10.5px",
              fontWeight: "var(--fw-semi)",
              letterSpacing: ".04em",
              color: "var(--on-surface-2)",
            }}
          >
            {meal.pasto}
            {many && !swapped && (
              <span className="tabular-nums" style={{ color: "var(--on-surface-3)", letterSpacing: 0 }}>
                {idx + 1}/{opzioni.length}
              </span>
            )}
            {swapped && (
              <span style={{ color: "var(--accent-strong)", letterSpacing: 0 }}>· modificato</span>
            )}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={shown}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: "var(--fs-sm)",
                fontWeight: "var(--fw-med)",
                color: "var(--on-surface)",
                lineHeight: 1.35,
                marginTop: 2,
              }}
            >
              {shown}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* azioni: scambia alimento + (se più alternative) cambia */}
        <div className="flex flex-none items-center" style={{ gap: "var(--s1)" }}>
          <IconAction
            Icon={Replace}
            label="Scambia alimento"
            active={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
          />
          {many && <IconAction Icon={RefreshCw} label="Cambia opzione" onClick={next} />}
        </div>
      </div>

      {/* ----- pannello scambio alimento ----- */}
      <AnimatePresence initial={false}>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <SwapPanel
              opzione={shown}
              onApply={(line) => {
                setLocalText(line);
                setPanelOpen(false);
              }}
              onClose={() => setPanelOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----- barra "modificato": torna indietro / rendi definitivo ----- */}
      {swapped && !panelOpen && (
        <div className="flex items-center gap-[var(--s2)]" style={{ marginTop: 2 }}>
          <button
            type="button"
            onClick={revert}
            className="inline-flex items-center gap-1.5 transition-transform duration-200 active:scale-95"
            style={{
              minHeight: 34,
              padding: "0 10px",
              borderRadius: "var(--r-sm)",
              background: "var(--surface)",
              border: "1px solid var(--inset-line)",
              color: "var(--on-surface-2)",
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-semi)",
            }}
          >
            <RotateCcw className="size-[14px]" />
            Originale
          </button>
          {onCommit ? (
            <button
              type="button"
              onClick={commit}
              disabled={committing}
              className="inline-flex flex-1 items-center justify-center gap-1.5 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-60"
              style={{
                minHeight: 34,
                borderRadius: "var(--r-sm)",
                background: "var(--keiko-grad)",
                boxShadow: "var(--sh-btn)",
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-semi)",
              }}
            >
              {committing ? <Loader2 className="size-[14px] animate-spin" /> : <Check className="size-[14px]" />}
              {committing ? "Salvo…" : "Rendi definitivo"}
            </button>
          ) : (
            <span
              className="flex-1"
              style={{ fontSize: "10.5px", color: "var(--on-surface-3)", lineHeight: 1.3 }}
            >
              Definitivo dalla pagina Salute
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* Piccolo bottone-icona con area tap ampia. */
function IconAction({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid place-items-center transition-transform duration-200 active:scale-90"
      style={{
        width: 38,
        height: 38,
        borderRadius: "var(--r-sm)",
        background: active ? "color-mix(in srgb, var(--primary) 16%, transparent)" : "transparent",
        color: "var(--accent-strong)",
      }}
    >
      <Icon className="size-[16px]" />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Pannello scambio alimento: legge i cibi (Keiko) → scegli cibo + motivo →
 * 1–2 alternative → tocchi e applichi (temporaneo).
 * ------------------------------------------------------------------ */
function SwapPanel({
  opzione,
  onApply,
  onClose,
}: {
  opzione: string;
  onApply: (line: string) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"loadingFoods" | "ready" | "error">("loadingFoods");
  const [alimenti, setAlimenti] = useState<string[]>([]);
  const [alimento, setAlimento] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Motivo>("equivalente");
  const [alternative, setAlternative] = useState<string[]>([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  const [err, setErr] = useState("");

  async function fetchFoods() {
    setStatus("loadingFoods");
    setErr("");
    try {
      const res = await fetch("/api/diet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ opzione }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore");
      setAlimenti(Array.isArray(data.alimenti) ? data.alimenti : []);
      setStatus("ready");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore");
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
      if (!res.ok) throw new Error(data.error || "Errore");
      setAlternative(Array.isArray(data.alternative) ? data.alternative : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoadingAlts(false);
    }
  }

  // Carica i cibi appena si apre il pannello.
  useEffect(() => {
    fetchFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-md)",
        padding: "var(--s3)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: "var(--s3)" }}>
        <span style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-bold)", color: "var(--on-surface)" }}>
          Scambia un alimento
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="grid size-7 place-items-center rounded-full active:scale-90"
          style={{ background: "var(--inset)", color: "var(--on-surface-2)" }}
        >
          <X className="size-3.5" />
        </button>
      </div>

      {status === "loadingFoods" && <PanelLoader label="Keiko legge i cibi…" />}

      {status === "error" && (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)" }}>{err}</p>
          <button
            type="button"
            onClick={fetchFoods}
            className="underline underline-offset-2"
            style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
          >
            Riprova
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          <PanelLabel>Quale cibo cambiare?</PanelLabel>
          <div className="flex flex-wrap gap-[var(--s2)]" style={{ marginBottom: "var(--s3)" }}>
            {alimenti.map((a) => (
              <SelectChip
                key={a}
                label={a}
                active={alimento === a}
                onClick={() => {
                  setAlimento(a);
                  setAlternative([]);
                }}
              />
            ))}
          </div>

          <PanelLabel>Perché?</PanelLabel>
          <div className="flex flex-wrap gap-[var(--s2)]" style={{ marginBottom: "var(--s3)" }}>
            {MOTIVI.map((m) => (
              <SelectChip
                key={m.key}
                label={m.label}
                active={motivo === m.key}
                onClick={() => {
                  setMotivo(m.key);
                  setAlternative([]);
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAlternatives}
            disabled={!alimento || loadingAlts}
            className="flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-40"
            style={{
              minHeight: 40,
              borderRadius: "var(--r-sm)",
              background: "var(--keiko-grad)",
              boxShadow: "var(--sh-btn)",
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-semi)",
            }}
          >
            {loadingAlts ? <Loader2 className="size-[16px] animate-spin" /> : <Replace className="size-[16px]" />}
            {loadingAlts ? "Cerco…" : "Trova alternative"}
          </button>

          {err && status === "ready" && (
            <p className="mt-[var(--s2)] text-center" style={{ fontSize: "var(--fs-xs)", color: "var(--destructive)" }}>
              {err}
            </p>
          )}

          {alternative.length > 0 && (
            <div style={{ marginTop: "var(--s3)" }}>
              <PanelLabel>Scegli il sostituto</PanelLabel>
              <div className="flex flex-col gap-[var(--s2)]">
                {alternative.map((line) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => onApply(line)}
                    className="w-full text-left transition-transform duration-200 active:scale-[0.99]"
                    style={{
                      background: "var(--inset)",
                      border: "1px solid var(--inset-line)",
                      borderRadius: "var(--r-sm)",
                      padding: "10px 12px",
                      fontSize: "var(--fs-sm)",
                      fontWeight: "var(--fw-med)",
                      color: "var(--on-surface)",
                      lineHeight: 1.35,
                    }}
                  >
                    {line}
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

function PanelLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Loader2 className="size-[16px] animate-spin" style={{ color: "var(--accent-strong)" }} />
      <span style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)" }}>{label}</span>
    </div>
  );
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase"
      style={{
        fontSize: "10px",
        fontWeight: "var(--fw-bold)",
        letterSpacing: ".05em",
        color: "var(--on-surface-3)",
        marginBottom: "var(--s2)",
      }}
    >
      {children}
    </div>
  );
}

function SelectChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="transition-transform duration-200 active:scale-95"
      style={{
        padding: "7px 12px",
        borderRadius: "var(--r-pill)",
        fontSize: "var(--fs-xs)",
        fontWeight: "var(--fw-semi)",
        background: active ? "color-mix(in srgb, var(--primary) 16%, transparent)" : "var(--inset)",
        border: active
          ? "1px solid color-mix(in srgb, var(--primary) 50%, transparent)"
          : "1px solid var(--inset-line)",
        color: active ? "var(--accent-strong)" : "var(--on-surface-2)",
      }}
    >
      {label}
    </button>
  );
}
