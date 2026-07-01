"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  ImagePlus,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Check,
  Pencil,
} from "lucide-react";
import type { WorkoutWeek } from "@/lib/supabase";
import { DAY_ORDER } from "@/app/components/DietMeal";
import { WorkoutDayCard, currentWeekDates, todayISO } from "@/app/components/WorkoutDay";
import HealthTabs from "@/app/components/HealthTabs";

type State = "idle" | "parsing" | "success" | "error";

export default function AllenamentoView({
  week,
  updatedAt,
  trainedDays,
}: {
  week: WorkoutWeek | null;
  updatedAt: string | null;
  trainedDays: string[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [note, setNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const imgRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);

  const hasSomething = images.length > 0 || pdf !== null;

  // C'è già una scheda? (almeno un giorno con esercizi)
  const hasPlan = !!week && DAY_ORDER.some((k) => (week[k]?.esercizi?.length ?? 0) > 0);
  // Se la scheda c'è, l'upload parte chiuso e si apre col bottone "Aggiorna scheda".
  const [showUpload, setShowUpload] = useState(!hasPlan);

  // Monitoraggio: spunte ottimistiche in un Set locale.
  const [trained, setTrained] = useState<Set<string>>(new Set(trainedDays));
  const weekDates = currentWeekDates();

  function resetSelection() {
    setImages([]);
    setPdf(null);
    if (imgRef.current) imgRef.current.value = "";
    if (pdfRef.current) pdfRef.current.value = "";
  }

  async function handleUpload() {
    if (!hasSomething) return;
    setState("parsing");
    setNote("");
    const fd = new FormData();
    for (const img of images) fd.append("images", img);
    if (pdf) fd.append("pdf", pdf);
    try {
      const res = await fetch("/api/workout/upload", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa è andato storto");
      setNote(typeof data.note === "string" ? data.note : "");
      setState("success");
      resetSelection();
      router.refresh();
      setTimeout(() => {
        setState("idle");
        setShowUpload(false); // dopo un caricamento riuscito, si richiude
      }, 1600);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  async function toggleTrained(iso: string) {
    const willBe = !trained.has(iso);
    // Ottimistico: aggiorno subito, poi salvo. Se fallisce, ripristino.
    setTrained((prev) => {
      const nextSet = new Set(prev);
      if (willBe) nextSet.add(iso);
      else nextSet.delete(iso);
      return nextSet;
    });
    try {
      const res = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ day: iso, done: willBe }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setTrained((prev) => {
        const nextSet = new Set(prev);
        if (willBe) nextSet.delete(iso);
        else nextSet.add(iso);
        return nextSet;
      });
      window.alert("Non sono riuscito a salvare, riprova");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Eliminare la scheda salvata? L'azione non si può annullare.")) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/workout/delete", { method: "POST", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Eliminazione fallita");
      }
      setShowUpload(true);
      router.refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Eliminazione fallita");
      setState("error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-lg">
      <div style={{ padding: "var(--s3) var(--gutter) calc(env(safe-area-inset-bottom) + 150px)" }}>
        <div className="pt-[var(--s2)]">
          <HealthTabs active="allenamento" />
        </div>

        {/* ---------- Intestazione (+ Aggiorna scheda se il piano c'è) ---------- */}
        <header className="flex items-start justify-between pb-[var(--s2)] pt-[var(--s3)]">
          <div>
            <div
              className="flex items-center gap-2 text-[length:var(--fs-xl)] -tracking-[0.03em]"
              style={{ fontWeight: "var(--fw-black)", color: "var(--app-text)" }}
            >
              <Dumbbell className="size-[22px]" style={{ color: "var(--accent-strong)" }} />
              Il tuo allenamento
            </div>
            <p
              className="mt-[var(--s1)]"
              style={{ fontSize: "var(--fs-sm)", color: "var(--app-2)", lineHeight: 1.45 }}
            >
              Carica la scheda una volta, poi spunta i giorni in cui ti alleni.
            </p>
          </div>
          {hasPlan && !showUpload && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="flex flex-none items-center gap-1.5 transition-transform duration-200 active:scale-95"
              style={{
                marginTop: 2,
                minHeight: 36,
                padding: "0 12px",
                borderRadius: "var(--r-sm)",
                background: "var(--inset)",
                border: "1px solid var(--inset-line)",
                color: "var(--accent-strong)",
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-semi)",
              }}
            >
              <Pencil className="size-[14px]" />
              Aggiorna scheda
            </button>
          )}
        </header>

        {/* ---------- Blocco upload (collassabile) ---------- */}
        <AnimatePresence initial={false}>
          {showUpload && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-[var(--s3)] overflow-hidden"
            >
              <div
                style={{
                  background: "var(--surface)",
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--tile-line)",
                  boxShadow: "var(--sh-card)",
                  padding: "var(--s4)",
                }}
              >
                {state === "idle" && (
                  <>
                    <div className="flex items-center justify-between">
                      <div style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>
                        {hasPlan ? "Aggiorna la scheda" : "Carica la scheda"}
                      </div>
                      {hasPlan && (
                        <button
                          type="button"
                          onClick={() => setShowUpload(false)}
                          aria-label="Chiudi"
                          className="grid size-7 place-items-center rounded-full active:scale-90"
                          style={{ background: "var(--inset)", color: "var(--on-surface-2)" }}
                        >
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", marginTop: 2, lineHeight: 1.45 }}>
                      Foto della scheda e/o un PDF: ci penso io a leggerla.
                    </p>

                    <div className="flex gap-[var(--s2)]" style={{ marginTop: "var(--s4)" }}>
                      <SourceButton
                        Icon={ImagePlus}
                        label={images.length > 0 ? `${images.length} foto` : "Foto"}
                        active={images.length > 0}
                        onClick={() => imgRef.current?.click()}
                      />
                      <SourceButton
                        Icon={FileText}
                        label={pdf ? "PDF pronto" : "PDF"}
                        active={pdf !== null}
                        onClick={() => pdfRef.current?.click()}
                      />
                    </div>

                    <input
                      ref={imgRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])}
                    />
                    <input
                      ref={pdfRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
                    />

                    {hasSomething && (
                      <div className="flex flex-wrap gap-[var(--s2)]" style={{ marginTop: "var(--s3)" }}>
                        {images.length > 0 && (
                          <Chip label={`${images.length} foto`} onClear={() => { setImages([]); if (imgRef.current) imgRef.current.value = ""; }} />
                        )}
                        {pdf && (
                          <Chip label={pdf.name} onClear={() => { setPdf(null); if (pdfRef.current) pdfRef.current.value = ""; }} />
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={!hasSomething}
                      className="mt-[var(--s4)] flex w-full items-center justify-center gap-2 text-white transition-transform duration-200 active:scale-[0.98] disabled:opacity-40"
                      style={{
                        fontSize: "var(--fs-sm)",
                        fontWeight: "var(--fw-semi)",
                        minHeight: "var(--tap)",
                        borderRadius: "var(--r-sm)",
                        background: "var(--keiko-grad)",
                        boxShadow: "var(--sh-btn)",
                      }}
                    >
                      <Sparkles className="size-[18px] flex-none" />
                      Leggi la scheda
                    </button>
                  </>
                )}

                {state === "parsing" && (
                  <div className="flex flex-col items-center gap-4 py-8">
                    <div className="grid size-16 place-items-center rounded-full" style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                      <Loader2 className="size-7 animate-spin" style={{ color: "var(--accent-strong)" }} />
                    </div>
                    <p style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--on-surface)" }}>
                      Keiko sta leggendo…
                    </p>
                  </div>
                )}

                {state === "success" && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <CheckCircle2 className="size-12" style={{ color: "var(--accent-strong)" }} />
                    <p style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--on-surface)" }}>
                      Scheda aggiornata
                    </p>
                    {note && (
                      <p style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", lineHeight: 1.45 }}>{note}</p>
                    )}
                  </div>
                )}

                {state === "error" && (
                  <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <AlertCircle className="size-11" style={{ color: "var(--destructive)" }} />
                    <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>{errorMsg}</p>
                    <button
                      type="button"
                      onClick={() => setState("idle")}
                      className="underline underline-offset-2"
                      style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-med)", color: "var(--accent-strong)" }}
                    >
                      Riprova
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ---------- Monitoraggio + settimana, oppure empty state ---------- */}
        {hasPlan ? (
          <>
            {/* Striscia dei 7 giorni: tocca per spuntare "allenato" */}
            <div className="mx-0.5 uppercase" style={{ marginTop: "var(--sec)", marginBottom: "var(--s3)", fontSize: "var(--fs-cap)", fontWeight: "var(--fw-bold)", letterSpacing: ".07em", color: "var(--app-faint)" }}>
              Questa settimana
            </div>
            <div
              className="flex gap-1.5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--tile-line)",
                boxShadow: "var(--sh-card)",
                borderRadius: "var(--r-lg)",
                padding: "var(--s3)",
                marginBottom: "var(--s3)",
              }}
            >
              {weekDates.map((d) => {
                const done = trained.has(d.iso);
                return (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => toggleTrained(d.iso)}
                    aria-pressed={done}
                    className="relative flex-1 transition-transform duration-200 active:scale-95"
                    style={{ padding: "6px 0", borderRadius: "var(--r-sm)" }}
                  >
                    <span
                      className="block uppercase"
                      style={{ fontSize: "10px", fontWeight: "var(--fw-semi)", color: d.isToday ? "var(--accent-strong)" : "var(--app-faint)" }}
                    >
                      {d.dn}
                    </span>
                    <span
                      className="mx-auto mt-1.5 grid place-items-center"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "var(--r-pill)",
                        background: done ? "var(--keiko-grad)" : "var(--inset)",
                        border: done ? "none" : "1px solid var(--inset-line)",
                        color: done ? "#fff" : "var(--on-surface-2)",
                        boxShadow: done ? "var(--sh-btn)" : "none",
                      }}
                    >
                      {done ? <Check className="size-4" /> : <span className="tabular-nums" style={{ fontSize: "12px", fontWeight: "var(--fw-bold)" }}>{d.dd}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mx-0.5 flex items-center justify-between uppercase" style={{ marginTop: "var(--sec)", marginBottom: "var(--s3)", fontSize: "var(--fs-cap)", fontWeight: "var(--fw-bold)", letterSpacing: ".07em", color: "var(--app-faint)" }}>
              <span>La scheda</span>
              {updatedAt && <span style={{ letterSpacing: 0 }}>{formatUpdated(updatedAt)}</span>}
            </div>

            {DAY_ORDER.map((k, i) => (
              <WorkoutDayCard
                key={k}
                dayKey={k}
                day={week![k] ?? { esercizi: [] }}
                isToday={k === todayKeyFromWeek(weekDates)}
                index={i}
              />
            ))}

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="mt-[var(--s3)] flex w-full items-center justify-center gap-2 transition-transform duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{
                minHeight: "var(--tap)",
                borderRadius: "var(--r-sm)",
                border: "1px solid color-mix(in srgb, var(--destructive) 35%, transparent)",
                color: "var(--destructive)",
                fontSize: "var(--fs-sm)",
                fontWeight: "var(--fw-semi)",
                background: "transparent",
              }}
            >
              <Trash2 className="size-[17px]" />
              {deleting ? "Elimino…" : "Elimina scheda"}
            </button>
          </>
        ) : (
          !showUpload && <EmptyState onOpen={() => setShowUpload(true)} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

// Il giorno "oggi" tra i 7 della settimana corrente (chiave lun..dom).
function todayKeyFromWeek(weekDates: { key: string; isToday: boolean }[]): string {
  return weekDates.find((d) => d.isToday)?.key ?? "";
}

function SourceButton({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: typeof ImagePlus;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1.5 transition-transform duration-200 active:scale-[0.97]"
      style={{
        minHeight: 76,
        borderRadius: "var(--r-md)",
        background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--inset)",
        border: active
          ? "1px solid color-mix(in srgb, var(--primary) 45%, transparent)"
          : "1px dashed var(--inset-line)",
        color: active ? "var(--accent-strong)" : "var(--on-surface-2)",
      }}
    >
      <Icon className="size-[22px]" />
      <span style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)" }}>{label}</span>
    </button>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5"
      style={{
        background: "var(--inset)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-pill)",
        padding: "5px 6px 5px 11px",
        fontSize: "var(--fs-xs)",
        fontWeight: "var(--fw-med)",
        color: "var(--on-surface)",
      }}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Rimuovi"
        className="grid size-5 flex-none place-items-center rounded-full active:scale-90"
        style={{ background: "color-mix(in srgb, var(--on-surface) 12%, transparent)", color: "var(--on-surface-2)" }}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div
      className="text-center"
      style={{
        marginTop: "var(--sec)",
        borderRadius: "var(--r-xl)",
        background: "var(--surface)",
        border: "1px solid var(--tile-line)",
        boxShadow: "var(--sh-card)",
        padding: "var(--s8) var(--s5)",
      }}
    >
      <div
        className="mx-auto grid size-14 place-items-center rounded-full"
        style={{ background: "color-mix(in srgb, var(--primary) 14%, transparent)", color: "var(--accent-strong)" }}
      >
        <Dumbbell className="size-7" />
      </div>
      <p className="mt-[var(--s3)]" style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>
        Ancora nessuna scheda
      </p>
      <p className="mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", lineHeight: 1.45 }}>
        Carica la foto o il PDF della tua scheda: te la organizzo per giorno.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-[var(--s4)] inline-flex items-center gap-2 text-white transition-transform duration-200 active:scale-[0.98]"
        style={{
          minHeight: "var(--tap)",
          padding: "0 18px",
          borderRadius: "var(--r-sm)",
          background: "var(--keiko-grad)",
          boxShadow: "var(--sh-btn)",
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-semi)",
        }}
      >
        <Sparkles className="size-[17px]" />
        Carica la scheda
      </button>
    </div>
  );
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d);
}
