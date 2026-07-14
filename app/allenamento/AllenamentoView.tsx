"use client";

import { useEffect, useRef, useState } from "react";
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
import { DAY_ORDER, DAY_FULL } from "@/app/components/DietMeal";
import { WorkoutDayCard, currentWeekDates, todayISO } from "@/app/components/WorkoutDay";
import { useKeikoToast } from "@/app/components/keiko/KeikoShell";

type State = "idle" | "parsing" | "success" | "error";

// Gradiente hero allenamento — copiato 1:1 da keiko-final.html (#gymView .art).
const GYM_ART =
  "radial-gradient(110% 80% at 88% -6%,rgba(130,168,215,.46) 0%,transparent 52%),linear-gradient(168deg,#2A4568 0%,#16273F 55%,#0D1728 100%)";

export default function AllenamentoView({
  week,
  updatedAt,
  trainedDays,
  embedded = false,
}: {
  week: WorkoutWeek | null;
  updatedAt: string | null;
  trainedDays: string[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const toast = useKeikoToast();
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
  // Spunta esercizi di oggi: locale/effimero (non c'è backend per singolo esercizio).
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const weekDates = currentWeekDates();

  // Oggi (dati reali)
  const todayIso = todayISO();
  const todayDate = weekDates.find((d) => d.isToday);
  const todayKey = todayDate?.key ?? "";
  const todayDay = week?.[todayKey];
  const todayExercises = todayDay?.esercizi ?? [];
  const todayIsTraining = todayExercises.length > 0;
  const trainedToday = trained.has(todayIso);

  // Ricarica le spunte esercizi di oggi salvate in locale (così persistono al refresh).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`keiko-workout-checked-${todayIso}`);
      if (raw) setChecked(new Set<number>(JSON.parse(raw)));
    } catch { /* no-op */ }
  }, [todayIso]);

  // Anello progressi: esercizi spuntati su totale di oggi.
  const total = todayExercises.length;
  const doneCount = total > 0 ? [...checked].filter((i) => i < total).length : 0;
  const ringP = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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

  // "✓ Fatto oggi" del vHero → riusa /api/workout/log sul giorno di oggi.
  function fattoOggi() {
    const willBe = !trained.has(todayIso);
    toggleTrained(todayIso);
    toast(willBe ? "Segnato: allenamento fatto ✓💪" : "Riaperto");
  }

  // "Riprogramma / sposta sessione" arriverà su Supabase (post-demo): niente bottone finto per ora.

  // Spunta un esercizio → persiste in locale e, se completi tutto, segna il giorno come allenato.
  function toggleExercise(i: number) {
    const next = new Set(checked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setChecked(next);
    try { localStorage.setItem(`keiko-workout-checked-${todayIso}`, JSON.stringify([...next])); } catch { /* no-op */ }
    const doneNow = [...next].filter((n) => n < total).length;
    if (total > 0 && doneNow === total && !trained.has(todayIso)) {
      toggleTrained(todayIso);
      toast("Allenamento completato ✓💪");
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

  /* ============================================================= *
   * VISTA v2.3 (standalone, dentro KeikoShell → scope .keiko)
   * ============================================================= */
  if (!embedded) {
    const todayName = DAY_FULL[todayKey] ?? "Oggi";
    const titolo = todayDay?.titolo?.trim();
    const preview = todayExercises.slice(0, 3).map((e) => e.nome).join(" · ");
    const extra = todayExercises.length > 3 ? ` · +${todayExercises.length - 3}` : "";

    return (
      <>
        {hasPlan ? (
          <>
            {/* ---------- Hero: oggi ---------- */}
            <div className="vHero">
              <div className="art" style={{ position: "absolute", inset: 0, background: GYM_ART }} />
              <div className="shade" />
              <div className="vhRow">
                {todayIsTraining && (
                  <div className="bigRing" style={{ ["--p" as string]: ringP } as React.CSSProperties}>
                    <i>{doneCount}/{total}</i>
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <span className="vk">Oggi · {todayName}</span>
                  <h4 style={ELLIPSIS}>{todayIsTraining ? titolo || "Allenamento di oggi" : "Oggi riposo"}</h4>
                  <div className="vs2" style={ELLIPSIS}>
                    {todayIsTraining ? preview + extra : "Giornata di recupero"}
                  </div>
                </div>
              </div>
              <div className="vActs">
                {todayIsTraining && (
                  <button
                    className="chipA"
                    onClick={fattoOggi}
                    style={trainedToday ? { background: "var(--accent)", color: "#fff" } : undefined}
                  >
                    ✓ Fatto oggi
                  </button>
                )}
              </div>
            </div>

            {/* ---------- Esercizi di oggi ---------- */}
            {todayIsTraining && (
              <>
                <div className="agLbl">Esercizi · tocca per spuntare</div>
                {todayExercises.map((ex, i) => {
                  const d = checked.has(i);
                  return (
                    <div
                      key={i}
                      className={`pRow${d ? " done" : ""}`}
                      role="button"
                      aria-pressed={d}
                      onClick={() => toggleExercise(i)}
                    >
                      <Dumbbell className="pi" style={{ width: 20, height: 20, color: "var(--accent)" }} />
                      <div className="pt">
                        <b>{ex.nome}</b>
                        {ex.dettaglio && <small>{ex.dettaglio}</small>}
                      </div>
                      {d && <Check style={{ width: 17, height: 17, flex: "none", color: "var(--accent)" }} />}
                    </div>
                  );
                })}
              </>
            )}

            {/* ---------- La settimana ---------- */}
            <div className="agLbl">La settimana</div>
            <div className="dayCar">
              {weekDates.map((d) => {
                const day = week?.[d.key];
                const rest = !(day?.esercizi?.length);
                const t = trained.has(d.iso);
                const dv2 = rest
                  ? "Riposo 🌙"
                  : t
                    ? `${day!.titolo?.trim() || "Allenamento"} · fatto ✓`
                    : day!.titolo?.trim() || `${day!.esercizi.length} esercizi`;
                return (
                  <div
                    key={d.iso}
                    className="dcard"
                    style={d.isToday ? { borderColor: "var(--accent)" } : undefined}
                  >
                    <div className="dk2">{d.dn}</div>
                    <div className="dv2">{dv2}</div>
                  </div>
                );
              })}
            </div>


            {/* ---------- Gestione scheda (funzioni reali preservate) ---------- */}
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button className="btn line" style={{ flex: 1 }} onClick={() => setShowUpload((s) => !s)}>
                <Pencil style={{ width: 14, height: 14 }} /> Aggiorna scheda
              </button>
              <button
                className="btn line"
                style={{ flex: 1, color: "#E25549", borderColor: "rgba(226,85,73,.42)" }}
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 style={{ width: 14, height: 14 }} /> {deleting ? "Elimino…" : "Elimina scheda"}
              </button>
            </div>
            {updatedAt && (
              <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: "var(--text-3)", textAlign: "right" }}>
                scheda del {formatUpdated(updatedAt)}
              </div>
            )}
            {showUpload && renderUploadKeiko()}
          </>
        ) : (
          /* ---------- Nessuna scheda ---------- */
          <>
            <div className="vHero">
              <div className="art" style={{ position: "absolute", inset: 0, background: GYM_ART }} />
              <div className="shade" />
              <span className="vk">Allenamento</span>
              <h4 style={{ marginTop: 4 }}>Ancora nessuna scheda</h4>
              <div className="vs2">Carica la foto o il PDF: te la leggo io</div>
              <div className="vActs">
                <button className="chipA" onClick={() => setShowUpload(true)}>📷 Carica la scheda</button>
              </div>
            </div>
            {showUpload && renderUploadKeiko()}
          </>
        )}
      </>
    );
  }

  /* Blocco upload in stile Keiko (usato dalla vista v2.3). */
  function renderUploadKeiko() {
    return (
      <div
        style={{
          marginTop: 14,
          background: "var(--card)",
          border: "1px solid var(--card-line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow)",
          padding: 16,
        }}
      >
        {state === "idle" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                {hasPlan ? "Aggiorna la scheda" : "Carica la scheda"}
              </div>
              {hasPlan && (
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  aria-label="Chiudi"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "var(--bg-2)",
                    color: "var(--text-2)",
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  <X style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2, lineHeight: 1.45, fontWeight: 600 }}>
              Foto della scheda e/o un PDF: ci penso io a leggerla.
            </p>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <KSource
                Icon={ImagePlus}
                label={images.length > 0 ? `${images.length} foto` : "Foto"}
                active={images.length > 0}
                onClick={() => imgRef.current?.click()}
              />
              <KSource
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
              style={{ display: "none" }}
              onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])}
            />
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            />

            {hasSomething && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {images.length > 0 && (
                  <KChip label={`${images.length} foto`} onClear={() => { setImages([]); if (imgRef.current) imgRef.current.value = ""; }} />
                )}
                {pdf && (
                  <KChip label={pdf.name} onClear={() => { setPdf(null); if (pdfRef.current) pdfRef.current.value = ""; }} />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!hasSomething}
              className="btn acc"
              style={{ width: "100%", marginTop: 16, opacity: hasSomething ? 1 : 0.4 }}
            >
              <Sparkles style={{ width: 16, height: 16 }} /> Leggi la scheda
            </button>
          </>
        )}

        {state === "parsing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "28px 0" }}>
            <Loader2 className="animate-spin" style={{ width: 26, height: 26, color: "var(--accent)" }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Keiko sta leggendo…</p>
          </div>
        )}

        {state === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 0", textAlign: "center" }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: "var(--accent)" }} />
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>Scheda aggiornata</p>
            {note && <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.45 }}>{note}</p>}
          </div>
        )}

        {state === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 0", textAlign: "center" }}>
            <AlertCircle style={{ width: 36, height: 36, color: "#E25549" }} />
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>{errorMsg}</p>
            <button
              type="button"
              onClick={() => setState("idle")}
              style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", background: "none", border: 0, textDecoration: "underline", cursor: "pointer" }}
            >
              Riprova
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ============================================================= *
   * VISTA EMBEDDED (home vecchia / SwipeShell — invariata)
   * ============================================================= */
  return (
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-lg">
      <div style={{ padding: "var(--s3) var(--gutter) calc(env(safe-area-inset-bottom) + 150px)" }}>
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

const ELLIPSIS: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

// Il giorno "oggi" tra i 7 della settimana corrente (chiave lun..dom).
function todayKeyFromWeek(weekDates: { key: string; isToday: boolean }[]): string {
  return weekDates.find((d) => d.isToday)?.key ?? "";
}

/* Sorgente file in stile Keiko (vista v2.3). */
function KSource({
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
      className="active:scale-[0.97]"
      style={{
        flex: 1,
        minHeight: 72,
        borderRadius: "var(--r-md)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        background: active ? "var(--accent-soft)" : "var(--bg-2)",
        border: active ? "1px solid var(--accent)" : "1px dashed var(--card-line)",
        color: active ? "var(--accent)" : "var(--text-3)",
        cursor: "pointer",
      }}
    >
      <Icon style={{ width: 22, height: 22 }} />
      <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
    </button>
  );
}

/* Chip file scelto in stile Keiko (vista v2.3). */
function KChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        maxWidth: "100%",
        alignItems: "center",
        gap: 6,
        background: "var(--bg-2)",
        border: "1px solid var(--card-line)",
        borderRadius: 999,
        padding: "5px 6px 5px 11px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text)",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label="Rimuovi"
        style={{ display: "grid", placeItems: "center", width: 20, height: 20, flex: "none", borderRadius: 999, background: "var(--accent-soft)", color: "var(--text-2)", border: 0, cursor: "pointer" }}
      >
        <X style={{ width: 12, height: 12 }} />
      </button>
    </span>
  );
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
