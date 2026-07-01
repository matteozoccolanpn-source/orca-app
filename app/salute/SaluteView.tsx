"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Salad,
  ImagePlus,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { DietWeek } from "@/lib/supabase";
import { DAY_ORDER, DAY_FULL, todayDietKey, MealRow } from "@/app/components/DietMeal";

type State = "idle" | "parsing" | "success" | "error";

export default function SaluteView({
  week,
  updatedAt,
}: {
  week: DietWeek | null;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [note, setNote] = useState("");
  const imgRef = useRef<HTMLInputElement | null>(null);
  const pdfRef = useRef<HTMLInputElement | null>(null);

  const hasSomething = images.length > 0 || pdf !== null;
  const todayKey = todayDietKey();

  // Giorni con almeno un pasto: se nessuno, mostriamo l'empty state.
  const daysWithMeals = week
    ? DAY_ORDER.filter((k) => (week[k]?.length ?? 0) > 0)
    : [];

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
      const res = await fetch("/api/diet/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa è andato storto");
      setNote(typeof data.note === "string" ? data.note : "");
      setState("success");
      resetSelection();
      // Ricarico i dati server (la settimana qui sotto si aggiorna da sola).
      router.refresh();
      setTimeout(() => setState("idle"), 1600);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-lg">
      <div className="pb-[160px]" style={{ padding: "var(--s3) var(--gutter) 0" }}>
        {/* ---------- Intestazione ---------- */}
        <header className="pb-[var(--s2)] pt-[var(--s3)]">
          <div
            className="flex items-center gap-2 text-[length:var(--fs-xl)] -tracking-[0.03em]"
            style={{ fontWeight: "var(--fw-black)", color: "var(--app-text)" }}
          >
            <Salad className="size-[22px]" style={{ color: "var(--accent-strong)" }} />
            La tua dieta
          </div>
          <p
            className="mt-[var(--s1)]"
            style={{ fontSize: "var(--fs-sm)", color: "var(--app-2)", lineHeight: 1.45 }}
          >
            Carica il piano una volta, poi consultalo giorno per giorno.
          </p>
        </header>

        {/* ---------- Blocco upload ---------- */}
        <section
          className="mt-[var(--s4)] overflow-hidden"
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
              <div
                style={{
                  fontWeight: "var(--fw-bold)",
                  fontSize: "var(--fs-base)",
                  color: "var(--on-surface)",
                }}
              >
                Carica o aggiorna la dieta
              </div>
              <p
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--on-surface-2)",
                  marginTop: 2,
                  lineHeight: 1.45,
                }}
              >
                Foto del piano e/o un PDF: ci penso io a leggerlo.
              </p>

              {/* Due sorgenti: foto multiple + PDF */}
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

              {/* Riepilogo scelte, con possibilità di togliere */}
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
                Leggi la dieta
              </button>
            </>
          )}

          {state === "parsing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div
                className="grid size-16 place-items-center rounded-full"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              >
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
                Dieta aggiornata
              </p>
              {note && (
                <p style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", lineHeight: 1.45 }}>
                  {note}
                </p>
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
        </section>

        {/* ---------- Settimana o empty state ---------- */}
        {daysWithMeals.length > 0 ? (
          <>
            <div
              className="mx-0.5 flex items-center justify-between uppercase"
              style={{
                marginTop: "var(--sec)",
                marginBottom: "var(--s3)",
                fontSize: "var(--fs-cap)",
                fontWeight: "var(--fw-bold)",
                letterSpacing: ".07em",
                color: "var(--app-faint)",
              }}
            >
              <span>La settimana</span>
              {updatedAt && <span style={{ letterSpacing: 0 }}>{formatUpdated(updatedAt)}</span>}
            </div>

            {daysWithMeals.map((k, i) => (
              <DayCard key={k} dayKey={k} meals={week![k]} isToday={k === todayKey} index={i} />
            ))}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

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

function DayCard({
  dayKey,
  meals,
  isToday,
  index,
}: {
  dayKey: string;
  meals: import("@/lib/supabase").DietMeal[];
  isToday: boolean;
  index: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index * 0.04, 0.24), ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
      style={{
        background: "var(--surface)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--tile-line)",
        boxShadow: "var(--sh-card)",
        padding: "var(--s3)",
        marginBottom: "var(--s3)",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: "var(--s3)" }}>
        <span
          style={{
            fontWeight: "var(--fw-bold)",
            fontSize: "var(--fs-base)",
            color: "var(--on-surface)",
            letterSpacing: "-.01em",
          }}
        >
          {DAY_FULL[dayKey]}
        </span>
        {isToday && (
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: "var(--fw-bold)",
              color: "#fff",
              background: "var(--keiko-grad)",
              padding: "3px 9px",
              borderRadius: "var(--r-pill)",
            }}
          >
            Oggi
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[var(--s2)]">
        {meals.map((meal, i) => (
          <MealRow key={i} meal={meal} />
        ))}
      </div>
    </motion.section>
  );
}

function EmptyState() {
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
        <Salad className="size-7" />
      </div>
      <p className="mt-[var(--s3)]" style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>
        Ancora nessuna dieta
      </p>
      <p className="mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", lineHeight: 1.45 }}>
        Carica qui sopra le foto o il PDF del tuo piano: te lo organizzo per giorno.
      </p>
    </div>
  );
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d);
}
