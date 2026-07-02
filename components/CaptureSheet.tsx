"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, ImagePlus, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import {
  EventForm,
  toDatetime,
  splitDatetime,
  type EventFormValue,
} from "@/app/components/EventForm";

type State = "idle" | "parsing" | "confirming" | "saving" | "success" | "error";

interface Parsed {
  title: string;
  type: string;
  datetime: string;
  location: string;
  reference: string;
  city: string;
}

const STEPS = ["Scrivi", "Keiko legge", "Controlli", "Fatto"];

/**
 * Sheet di cattura "Dimmi tutto" aperta dal ＋ della bottom nav.
 * - Campo testo (CTA "Invia"): pipeline testo collegata → /api/upload (branch text).
 * - Allega screenshot (CTA secondaria): flusso immagine → /api/upload (branch image).
 * - Entrambi: conferma con EventForm → /api/upload/confirm. Estraggono anche `city`.
 *   Non duplica logica di backend e non modifica /add.
 */
export default function CaptureSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirm, setConfirm] = useState<EventFormValue | null>(null);
  // city non è modificabile nel form: la porto a parte dal parsing fino al salvataggio
  const [pendingCity, setPendingCity] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setText("");
    setState("idle");
    setErrorMsg("");
    setConfirm(null);
    setPendingCity("");
  }
  function close() {
    reset();
    onClose();
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Solo immagini (PNG, JPG, HEIC)");
      setState("error");
      return;
    }
    setState("parsing");
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      const p = data.parsed as Parsed;
      const { date, time } = splitDatetime(p.datetime);
      setConfirm({ title: p.title, type: p.type, date, time, location: p.location, reference: p.reference });
      setPendingCity(p.city || "");
      setState("confirming");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  // Flusso TESTO: stessa pipeline dell'immagine ma manda "text" invece di "image".
  // Riusa /api/upload (che già supporta il testo) → conferma con EventForm → /api/upload/confirm.
  async function handleText() {
    if (!text.trim()) return;
    setState("parsing");
    const fd = new FormData();
    fd.append("text", text.trim());
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      const p = data.parsed as Parsed;
      const { date, time } = splitDatetime(p.datetime);
      setConfirm({ title: p.title, type: p.type, date, time, location: p.location, reference: p.reference });
      setPendingCity(p.city || "");
      setState("confirming");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  async function handleSave() {
    if (!confirm) return;
    setState("saving");
    const payload: Parsed = {
      title: confirm.title,
      type: confirm.type,
      datetime: toDatetime(confirm),
      location: confirm.location,
      reference: confirm.reference,
      city: pendingCity,
    };
    try {
      const res = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore sconosciuto");
      setState("success");
      setTimeout(() => {
        close();
        router.refresh();
      }, 1400);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  if (!open) return null;
  const busy = state === "parsing" || state === "saving";
  // Mentre leggo o salvo (busy) o mentre sei sul form di conferma ("confirming"),
  // il tocco sullo sfondo NON deve chiudere: altrimenti l'evento appena letto si
  // perde prima del "Salva". Per uscire restano la X e il bottone "Annulla".
  const lockClose = busy || state === "confirming";

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "var(--scrim)" }} onClick={lockClose ? undefined : close} />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] max-w-lg overflow-y-auto"
        style={{
          background: "var(--surface)",
          borderRadius: "var(--r-xl) var(--r-xl) 0 0",
          boxShadow: "0 -22px 54px -12px rgba(0,0,0,.6)",
          padding: "12px var(--s5)",
          paddingBottom: "calc(var(--s6) + env(safe-area-inset-bottom))",
        }}
      >
        {/* grip + chiudi */}
        <div className="mx-auto" style={{ width: 40, height: 5, borderRadius: 3, background: "color-mix(in srgb, var(--on-surface) 22%, transparent)", margin: "2px auto var(--s5)" }} />
        <button
          type="button"
          onClick={close}
          disabled={busy}
          aria-label="Chiudi"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl disabled:opacity-40"
          style={{ color: "var(--on-surface-2)" }}
        >
          <X className="size-5" />
        </button>

        {/* ---------- idle: titolo + campo (inerte) + allega screenshot ---------- */}
        {state === "idle" && (
          <>
            <div style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-xl)", color: "var(--on-surface)", letterSpacing: "-.02em" }}>
              Aggiungi a Keiko
            </div>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", marginTop: "var(--s1)", marginBottom: "var(--s4)", lineHeight: 1.45 }}>
              Scrivi, incolla o allega uno screenshot. Ci penso io.
            </p>

            {/* Campo testo — collegato: il bottone "Invia" qui sotto lo manda a /api/upload */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="es. 'volo domani 6am Ryanair' · 'cena giovedì 20:30 da Marco' · oppure incolla 4 lezioni e le creo tutte."
              className="w-full resize-none outline-none placeholder:[color:var(--on-surface-3)]"
              style={{
                background: "var(--inset)",
                border: "1px solid var(--inset-line)",
                borderRadius: "var(--r-md)",
                padding: "var(--s4)",
                minHeight: 96,
                color: "var(--on-surface)",
                fontSize: "var(--fs-base)",
                lineHeight: 1.5,
              }}
            />

            {/* passi */}
            <div className="flex flex-wrap items-center" style={{ gap: 7, marginTop: "var(--s5)", fontSize: 11, fontWeight: "var(--fw-med)", color: "var(--on-surface-3)" }}>
              {STEPS.map((s, i) => (
                <span key={s} className="inline-flex items-center" style={{ gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "var(--r-pill)", background: i === 0 ? "var(--accent-strong)" : "color-mix(in srgb, var(--on-surface) 22%, transparent)" }} />
                  {s}
                </span>
              ))}
            </div>

            {/* CTA primaria = Invia testo (pipeline testo, riusa /api/upload) */}
            <button
              type="button"
              onClick={handleText}
              disabled={!text.trim()}
              className="mt-[var(--s4)] flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-40"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", minHeight: "var(--tap)", borderRadius: "var(--r-sm)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
            >
              Invia
            </button>

            {/* CTA secondaria = allega screenshot (flusso immagine reale) */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-[var(--s3)] flex w-full items-center justify-center gap-2 transition-transform duration-200 active:scale-[0.98]"
              style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", minHeight: "var(--tap)", borderRadius: "var(--r-sm)", border: "1px solid var(--inset-line)", background: "var(--inset)", color: "var(--on-surface)" }}
            >
              <ImagePlus className="size-[18px] flex-none" />
              Allega screenshot
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <div className="flex items-center justify-center gap-2" style={{ marginTop: "var(--s4)", fontSize: 11.5, fontWeight: "var(--fw-med)", color: "var(--on-surface-3)" }}>
              <ShieldCheck className="size-3.5" style={{ color: "var(--green)" }} />
              I tuoi dati · zero pubblicità · server in EU
            </div>
          </>
        )}

        {/* ---------- parsing / saving ---------- */}
        {busy && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="grid size-16 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
              <Loader2 className="size-7 animate-spin" style={{ color: "var(--accent-strong)" }} />
            </div>
            <p style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--on-surface)" }}>
              {state === "saving" ? "Salvataggio…" : "Keiko sta leggendo…"}
            </p>
          </div>
        )}

        {/* ---------- confirming: riusa EventForm ---------- */}
        {state === "confirming" && confirm && (
          <EventForm value={confirm} onChange={setConfirm} onCancel={close} onSave={handleSave} />
        )}

        {/* ---------- success ---------- */}
        {state === "success" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="size-14" style={{ color: "var(--accent-strong)" }} />
            <p style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--on-surface)" }}>Salvato</p>
          </div>
        )}

        {/* ---------- error ---------- */}
        {state === "error" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <AlertCircle className="size-12" style={{ color: "var(--destructive)" }} />
            <p className="text-center" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>{errorMsg}</p>
            <button type="button" onClick={reset} className="underline underline-offset-2" style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--accent-strong)" }}>
              Riprova
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
