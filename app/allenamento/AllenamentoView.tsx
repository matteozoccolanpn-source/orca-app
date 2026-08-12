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
import type { WorkoutWeek, WorkoutExercise, WorkoutSession, WorkoutSetRow } from "@/lib/supabase";
import type { Consiglio } from "@/lib/coach";
import SessioneLive from "./SessioneLive";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import { I } from "@/app/components/v2/icons";
import { riassuntoSerie } from "@/lib/discipline";
import { Img } from "@/app/components/v2/Img";
import { Sec } from "@/app/components/v2/Sec";
import { Chip as ChipV2 } from "@/app/components/v2/Chip";
import { Check as CheckV2 } from "@/app/components/v2/Check";
import { DayCard } from "@/app/components/v2/DayCard";
import { Empty } from "@/app/components/v2/Empty";
import { Skeleton } from "@/app/components/v2/Skeleton";
import { Sheet } from "@/app/components/v2/Sheet";
import { DAY_ORDER, DAY_FULL } from "@/app/components/DietMeal";

const DAY_LABEL: Record<string, string> = { lun: "Lunedì", mar: "Martedì", mer: "Mercoledì", gio: "Giovedì", ven: "Venerdì", sab: "Sabato", dom: "Domenica" };
import { WorkoutDayCard, currentWeekDates } from "@/app/components/WorkoutDay";

type State = "idle" | "parsing" | "success" | "error";

// Gradiente hero allenamento — copiato 1:1 da keiko-final.html (#gymView .art).
// Era blu (sembrava un'altra app): ora marrone/ambra caldo, coerente col resto.
const GYM_ART =
  "radial-gradient(110% 80% at 88% -6%,rgba(255,184,77,.30) 0%,transparent 52%),linear-gradient(168deg,#3A2E1D 0%,#241A10 55%,#140F0A 100%)";

export default function AllenamentoView({
  week,
  updatedAt,
  trainedDays,
  heroImage = null,
  weekDone = 0,
  weekPlanned = 0,
  streak = 0,
  oggiIso = null,
  sessioneOggi = null,
  ultimaVolta = {},
  storicoSedute = [],
  consiglio = null,
  embedded = false,
  streakDiFila = 0,
}: {
  week: WorkoutWeek | null;
  updatedAt: string | null;
  trainedDays: string[];
  heroImage?: string | null;
  weekDone?: number;
  weekPlanned?: number;
  streak?: number;
  /* Data di oggi calcolata sul server: la stessa con cui e' stata letta la seduta.
     Nella vista dentro lo swipe (embedded) non serve: la ricaviamo dal calendario. */
  oggiIso?: string | null;
  /* S5: la seduta di oggi con le serie VERE (aperta o gia' chiusa). */
  sessioneOggi?: WorkoutSession | null;
  /* S5: per ogni esercizio di oggi, le serie dell'ultima volta che l'hai fatto. */
  ultimaVolta?: Record<string, WorkoutSetRow[]>;
  /* S5: le ultime sedute, per lo storico in fondo alla pagina. */
  storicoSedute?: WorkoutSession[];
  /* S6: la riga in cui l'allenamento incontra il calendario. null = niente da dire. */
  consiglio?: Consiglio | null;
  embedded?: boolean;
  /* Prima viveva nel badge di KeikoShell, con l'emoji. Ora e' un dato come gli
     altri e sta in A-che-punto-sei, dove la spec lo vuole. */
  streakDiFila?: number;
}) {
  const router = useRouter();
  /* Il toast era di KeikoShell, che non avvolge piu' questa pagina: adesso e'
     quello del sistema V2 e vive dentro .k2. Le chiamate restano identiche. */
  const [msg, setMsg] = useState<string>('');
  const msgRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (t: string) => {
    setMsg(t);
    if (msgRef.current) clearTimeout(msgRef.current);
    msgRef.current = setTimeout(() => setMsg(''), 2600);
  };
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
  // S5: le spunte per esercizio NON vivono piu' in localStorage (sparivano
  // cambiando telefono e non servivano a niente). Adesso un esercizio e' "fatto"
  // se ci sono serie vere registrate oggi, punto.
  // `live` = pannello "sto facendo l'allenamento adesso"; `liveIdx` = da quale
  // esercizio parte aperto.
  const [live, setLive] = useState(false);
  const [liveIdx, setLiveIdx] = useState<number | null>(null);
  // Modifica scheda (B): sposta sessione, togli/sostituisci/aggiungi esercizi.
  const [editMode, setEditMode] = useState(false);
  const [selDay, setSelDay] = useState<string>("");
  const [draft, setDraft] = useState<WorkoutExercise[]>([]);
  const [savingWeek, setSavingWeek] = useState(false);
  /* Solo presentazione: quale esercizio e quale giorno sono aperti, il foglio
     della gestione, e l'armamento dell'eliminazione (conferma a due tocchi). */
  const [apertoEx, setApertoEx] = useState<number | null>(null);
  const [apertoGiorno, setApertoGiorno] = useState<string | null>(null);
  const [gestione, setGestione] = useState(false);
  const [armaElimina, setArmaElimina] = useState(false);
  const weekDates = currentWeekDates();

  // Oggi (dati reali)
  const todayDate = weekDates.find((d) => d.isToday);
  const todayIso = oggiIso ?? todayDate?.iso ?? "";
  const todayKey = todayDate?.key ?? "";
  const todayDay = week?.[todayKey];
  const todayExercises = todayDay?.esercizi ?? [];
  const todayIsTraining = todayExercises.length > 0;
  const trainedToday = trained.has(todayIso);

  // Giorno attivo per la modifica: default oggi, selezionabile dal carosello.
  const activeDay = selDay || todayKey;
  const activeDayData = week?.[activeDay];
  const activeExercises = activeDayData?.esercizi ?? [];

  // Le serie di oggi, raggruppate per esercizio: e' la verita' su cosa hai fatto.
  const serieOggi = new Map<string, WorkoutSetRow[]>();
  for (const st of sessioneOggi?.sets ?? []) {
    serieOggi.set(st.esercizio, [...(serieOggi.get(st.esercizio) ?? []), st]);
  }

  // Seduta di oggi ancora aperta = l'hai iniziata e non chiusa: il bottone
  // grande dice "riprendi" invece di "allenati ora".
  const sedutaAperta = sessioneOggi && !sessioneOggi.endedAt ? sessioneOggi : null;

  // Anello progressi: esercizi con almeno una serie registrata, su totale di oggi.
  const total = todayExercises.length;
  const doneCount = todayExercises.filter((ex) => (serieOggi.get(ex.nome)?.length ?? 0) > 0).length;
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

  // "✓ Fatto oggi" del vHero → segna il giorno sul calendario. Non tocca le
  // serie: quelle si registrano dentro il pannello, e restano quello che sono.
  function fattoOggi() {
    const willBe = !trained.has(todayIso);
    toggleTrained(todayIso);
    toast(willBe ? "Allenamento fatto" : "Segnato come da fare");
  }

  // La seduta live e' finita → chiudo il pannello, segno il giorno come
  // allenato (se non lo era) e ricarico, cosi' anello, streak e settimana
  // raccontano subito la stessa cosa.
  function sessioneFinita() {
    setLive(false);
    if (!trained.has(todayIso)) toggleTrained(todayIso);
    toast("Allenamento salvato");
    router.refresh();
  }

  // "Riprogramma / sposta sessione" arriverà su Supabase (post-demo): niente bottone finto per ora.

  // Tocchi un esercizio nell'elenco → si apre il pannello gia' su quello.
  function apriEsercizio(i: number) {
    setLiveIdx(i);
    setLive(true);
  }

  // Chiudo il pannello senza finire: ricarico comunque, cosi' l'elenco qui sotto
  // mostra subito le serie appena registrate.
  function chiudiLive() {
    setLive(false);
    router.refresh();
  }

  function startEdit() {
    setDraft(activeExercises.map((e) => ({ ...e })));
    setEditMode(true);
  }
  async function saveWeek(newWeek: WorkoutWeek) {
    setSavingWeek(true);
    try {
      const res = await fetch("/api/workout/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ week: newWeek }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      window.alert("Non sono riuscito a salvare, riprova");
    } finally {
      setSavingWeek(false);
    }
  }
  // Salva gli esercizi modificati di oggi.
  async function commitExercises() {
    const cleaned = draft.map((e) => ({ nome: e.nome.trim(), dettaglio: e.dettaglio ?? "" })).filter((e) => e.nome);
    const newWeek: WorkoutWeek = { ...(week ?? {}), [activeDay]: { titolo: activeDayData?.titolo, esercizi: cleaned } };
    await saveWeek(newWeek);
    setEditMode(false);
    toast("Scheda aggiornata");
  }
  // Sposta/scambia la sessione di oggi con un altro giorno.
  async function moveSessionTo(target: string) {
    if (!week) return;
    const newWeek: WorkoutWeek = { ...week };
    const cur = newWeek[activeDay] ?? { esercizi: [] };
    const dst = newWeek[target] ?? { esercizi: [] };
    newWeek[target] = cur;
    newWeek[activeDay] = dst;
    await saveWeek(newWeek);
    setEditMode(false);
    toast(`Spostato a ${DAY_LABEL[target] ?? target}`);
  }

  async function handleDelete() {
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
   * VISTA V2 (ondata 3) — l'Allenamento possiede lo schermo.
   * Cambia SOLO il vestito: stato, effetti, rete e gestori sono quelli
   * di prima. Ordine delle sezioni come da prompt dell'11 agosto:
   * testata · hero · esercizi · a che punto sei · la settimana · la scheda.
   * (Il cibo e i programmi non ci sono: il dato non esiste — vedi report.)
   * ============================================================= */
  if (!embedded) {
    const todayName = DAY_FULL[todayKey] ?? "Oggi";
    const titolo = todayDay?.titolo?.trim();
    const preview = todayExercises.slice(0, 3).map((e) => e.nome).join(" · ");
    const extra = todayExercises.length > 3 ? ` · +${todayExercises.length - 3}` : "";

    /* Il prossimo esercizio da fare: nel mock è quello aperto di default. */
    const prossimoIdx = todayExercises.findIndex((ex) => (serieOggi.get(ex.nome)?.length ?? 0) === 0);

    /* La riga di stato sotto il titolo: una sola, e dice la cosa che conta. */
    const statoTestata = !hasPlan
      ? "nessuna scheda caricata"
      : weekPlanned > 0
        ? `${weekDone} di ${weekPlanned} questa settimana`
        : todayIsTraining
          ? `${doneCount} di ${total} oggi`
          : "oggi riposo";

    const ultima = storicoSedute[0] ?? null;

    return (
      <>
        <div className="k2">
          <div className="lights">
            <i className="l1" /><i className="l2" /><i className="l3" /><i className="l4" />
          </div>

          <div className="screen" style={{ paddingBottom: PAGE_PB }}>
            {/* ── testata ── */}
            <div className="head">
              <button className="back tap" onClick={() => router.push("/")} aria-label="Indietro">
                {I.back({ s: 17 })}
              </button>
              <div className="col">
                <h1>Allenamento</h1>
                <div className="status">{statoTestata}</div>
              </div>
            </div>

            <div className="stag">
              {hasPlan ? (
                <>
                  {/* ── hero ── */}
                  <div>
                    <div className="hero">
                      <div className="bg">
                        {heroImage && <Img src={heroImage} />}
                      </div>
                      <div className="body">
                        <div className="toprow">
                          <span className="k">
                            <span className="dot sport" />
                            oggi · {todayName.toLowerCase()}
                          </span>
                          {todayIsTraining && <span className="badge">{doneCount} di {total}</span>}
                        </div>
                        <div className="t">
                          {todayIsTraining ? titolo || "Allenamento di oggi" : "Oggi non c’è allenamento"}
                        </div>
                        <div className="m">
                          {todayIsTraining ? preview + extra : "giornata di recupero"}
                        </div>
                        {todayIsTraining && (
                          <div className="prog"><i style={{ width: `${ringP}%` }} /></div>
                        )}
                        {todayIsTraining && (
                          <div className="row">
                            <button
                              className="cta tap"
                              onClick={() => { setLiveIdx(null); setLive(true); }}
                            >
                              {sedutaAperta ? "Riprendi l’allenamento" : "Allenati ora"}
                            </button>
                            <button
                              className={"btn2 tap" + (trainedToday ? " on" : "")}
                              onClick={fattoOggi}
                              aria-pressed={trainedToday}
                            >
                              {trainedToday ? <>{I.tick({ s: 13 })}Fatto</> : "Fatto oggi"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Il consiglio di Keiko: le parole arrivano dal server e non
                        si riformulano. Se non c'è niente di utile da dire, il
                        riquadro non compare. */}
                    {consiglio && (
                      <div className={"hint" + (consiglio.tono === "calma" ? "" : " warm")}>
                        {I.info({ s: 14 })}
                        <p>
                          <b>{consiglio.titolo}</b>
                          {consiglio.testo ? <> — {consiglio.testo}</> : null}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── gli esercizi di oggi ── */}
                  {todayIsTraining && (
                    <div>
                      <Sec sm="tocca per segnare le serie">Gli esercizi di oggi</Sec>
                      <div className="srf list">
                        {todayExercises.map((ex, i) => {
                          const mie = serieOggi.get(ex.nome) ?? [];
                          const fatto = mie.length > 0;
                          const prec = ultimaVolta[ex.nome] ?? [];
                          const rOggi = riassunto(mie);
                          const aperto = apertoEx === i || (apertoEx === null && i === prossimoIdx);
                          const meta = fatto
                            ? `${mie.length} serie${rOggi ? ` · ${rOggi}` : ""}`
                            : ex.dettaglio || "dalla tua scheda";
                          return (
                            <div
                              key={i}
                              className={
                                "item" + (fatto ? " done" : "") + (aperto ? " openx" : "") +
                                (!fatto && i === prossimoIdx ? " next" : "")
                              }
                            >
                              <div className="item-row tap" onClick={() => apriEsercizio(i)}>
                                {/* La spunta NON si tocca: un esercizio è fatto
                                    quando ci sono serie vere registrate, e le
                                    serie si registrano dentro la sessione. */}
                                <CheckV2 on={fatto} />
                                <span className="in">
                                  <span className="k">{meta}</span>
                                  <span className="tx">{ex.nome}</span>
                                </span>
                                <span
                                  className="chevhit tap"
                                  onClick={(e) => { e.stopPropagation(); setApertoEx(aperto ? -1 : i); }}
                                  aria-label={aperto ? "Chiudi" : "Apri"}
                                >
                                  {I.chev({ c: "chev" })}
                                </span>
                              </div>
                              <div className="item-x">
                                <div className="inner">
                                  <div className="col">
                                    {prec.length > 0 ? (
                                      <span className="rx">l’ultima volta: {riassunto(prec)}</span>
                                    ) : (
                                      <span className="rx">nessuna traccia di questo esercizio</span>
                                    )}
                                    {ex.dettaglio && <span className="rx">dalla scheda: {ex.dettaglio}</span>}
                                    <div className="row">
                                      <button className="tert tap" onClick={() => apriEsercizio(i)}>
                                        {fatto ? "Aggiungi una serie" : "Allenati ora"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {doneCount === total && total > 0 && (
                          <div className="complete">
                            <span className="big-ck">{I.drawck(null, 15)}</span>
                            <span>
                              <span className="t">Scheda completa</span>
                              <span className="m">tutto quello di oggi è segnato</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── A che punto sei ──
                      Niente numeroni e nessun chip di tendenza: il dato per
                      disciplina non esiste nel codice, e una tendenza da due
                      sedute sarebbe inventata. */}
                  {(weekPlanned > 0 || ultima) && (
                    <div>
                      <Sec sm="senza numeroni">A che punto sei</Sec>
                      <div className="srf" style={{ padding: "14px 12px" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.01em" }}>
                          {weekPlanned > 0
                            ? weekDone >= weekPlanned
                              ? "La settimana è piena."
                              : weekDone === 0
                                ? "La settimana è ancora tutta davanti."
                                : "Sei a metà settimana."
                            : "Non c’è ancora una settimana da raccontare."}
                        </div>
                        <div className="status">
                          {weekPlanned > 0 ? `${weekDone} di ${weekPlanned} allenamenti` : "—"}
                          {streakDiFila > 0 ? ` · ${streakDiFila} di fila` : ""}
                        </div>
                      </div>

                      {/* Ultimo allenamento: è quello che hai davvero sollevato,
                          non una spunta sul calendario. */}
                      {storicoSedute.length > 0 && (
                        <div className="srf" style={{ marginTop: 8 }}>
                          {storicoSedute.map((sd) => {
                            const nEx = new Set(sd.sets.map((x) => x.esercizio)).size;
                            return (
                              <div className="row-act" key={sd.id} style={{ cursor: "default" }}>
                                <span className="ic2">{I.hist({ s: 16 })}</span>
                                <span className="in">
                                  <span className="t">{(sd.titolo?.trim() || "Allenamento") + " · " + dataCorta(sd.day)}</span>
                                  <span className="m">
                                    {sd.sets.length === 0
                                      ? "nessuna serie segnata"
                                      : `${sd.sets.length} serie · ${nEx} eserciz${nEx === 1 ? "io" : "i"}`}
                                    {sd.endedAt ? "" : " · in corso"}
                                  </span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── la settimana ── */}
                  <div>
                    <Sec sm="in sola lettura">La settimana</Sec>
                    {weekDates.map((d) => {
                      const day = week?.[d.key];
                      const esercizi = day?.esercizi ?? [];
                      const rest = esercizi.length === 0;
                      const t = trained.has(d.iso);
                      return (
                        <DayCard
                          key={d.iso}
                          /* nel mock la riga di sinistra e' NUMERO sopra e tre
                             lettere sotto: prima erano la stessa cosa due volte */
                          n={Number(d.iso.slice(8, 10))}
                          d={d.key}
                          img={d.isToday ? heroImage : null}
                          today={d.isToday}
                          dot="sport"
                          main={rest ? "Riposo" : day!.titolo?.trim() || `${esercizi.length} esercizi`}
                          meta={rest ? "giornata di recupero" : `${esercizi.length} eserciz${esercizi.length === 1 ? "io" : "i"}${t ? " · fatto" : ""}`}
                          nxt={t ? "fatto" : undefined}
                          open={apertoGiorno === d.key}
                          onToggle={() => setApertoGiorno(apertoGiorno === d.key ? null : d.key)}
                          rows={rest ? [["", "Niente in programma"]] : esercizi.map((e) => [e.dettaglio || "", e.nome] as [string, string])}
                        />
                      );
                    })}
                  </div>

                  {/* ── la tua scheda ── */}
                  <div>
                    <Sec sm={updatedAt ? `del ${formatUpdated(updatedAt)}` : undefined}>La tua scheda</Sec>
                    <div className="hint">
                      {I.info({ s: 14 })}
                      <p>La scheda è del tuo preparatore. <b>Keiko la trascrive e se la ricorda, non la scrive.</b></p>
                    </div>
                    <div className="srf" style={{ marginTop: 8 }}>
                      <div className="row-act tap" onClick={() => setGestione(true)}>
                        <span className="ic2">{I.doc({ s: 16 })}</span>
                        <span className="in">
                          <span className="t">Gestisci la scheda</span>
                          <span className="m">caricala di nuovo, o correggi un giorno</span>
                        </span>
                        <span className="chevhit">{I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ── nessuna scheda caricata ── */
                <div>
                  <Empty
                    icon={I.dumb({ s: 17 })}
                    t="Ancora nessuna scheda"
                    m="carica la foto o il PDF che ti ha dato il preparatore:<br/>te la leggo e me la ricordo io"
                    cta="Carica la tua scheda"
                    onCta={() => setShowUpload(true)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── la sessione: schermo pieno, si chiude senza perdere niente ── */}
          {live && (
            <SessioneLive
              day={todayIso}
              titolo={todayDay?.titolo?.trim() || null}
              esercizi={todayExercises}
              open={sessioneOggi}
              ultimaVolta={ultimaVolta}
              iniziale={liveIdx}
              onClose={chiudiLive}
              onFinita={sessioneFinita}
            />
          )}

          {/* ── gestione scheda ── */}
          {gestione && (
            <Sheet onClose={() => { setGestione(false); setArmaElimina(false); }}>
              <div className="plain-head"><h2>La tua scheda</h2></div>
              <div className="pad">
                <div className="sub">
                  {updatedAt ? `L’ultima che mi hai dato è del ${formatUpdated(updatedAt)}.` : "Non ne ho ancora una."}
                </div>
                <div className="srf" style={{ marginTop: 16 }}>
                  <div className="row-act tap" onClick={() => { setGestione(false); setShowUpload(true); }}>
                    <span className="ic2">{I.up({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">Carica una nuova scheda</span>
                      <span className="m">foto o PDF: la leggo io</span>
                    </span>
                    <span className="chevhit">{I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}</span>
                  </div>
                  <div className="row-act tap" onClick={() => { setGestione(false); startEdit(); }}>
                    <span className="ic2">{I.pen({ s: 16 })}</span>
                    <span className="in">
                      <span className="t">Correggi un giorno</span>
                      <span className="m">togli, aggiungi o sposta gli esercizi</span>
                    </span>
                    <span className="chevhit">{I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}</span>
                  </div>
                </div>

                <div className="danger" style={{ margin: "28px 0 8px" }}>
                  <button
                    className={"tap" + (armaElimina ? " arm" : "")}
                    aria-disabled={deleting || undefined}
                    onClick={() => {
                      if (!armaElimina) { setArmaElimina(true); return; }
                      setGestione(false);
                      setArmaElimina(false);
                      handleDelete();
                    }}
                  >
                    {deleting ? "Elimino…" : armaElimina ? "Tocca di nuovo per eliminare" : "Elimina la scheda"}
                  </button>
                </div>
              </div>
            </Sheet>
          )}

          {/* ── caricamento della scheda ── */}
          {showUpload && (
            <Sheet onClose={() => { if (state !== "parsing") { setShowUpload(false); setState("idle"); } }}>
              <div className="plain-head"><h2>{hasPlan ? "Aggiorna la scheda" : "Carica la scheda"}</h2></div>
              <div className="pad">{renderUploadV2()}</div>
            </Sheet>
          )}

          {/* ── correggi un giorno ── */}
          {editMode && (
            <Sheet onClose={() => setEditMode(false)}>
              <div className="plain-head"><h2>Correggi {DAY_LABEL[activeDay] ?? activeDay}</h2></div>
              <div className="pad">
                <div className="sub">Gli esercizi sono quelli della tua scheda: qui si correggono, non si inventano.</div>

                <div className="status" style={{ marginTop: 18, marginBottom: 6 }}>Il giorno</div>
                <div className="chips" style={{ margin: "0 -16px" }}>
                  {DAY_ORDER.map((k) => (
                    <ChipV2 key={k} on={activeDay === k} onClick={() => { setSelDay(k); setDraft((week?.[k]?.esercizi ?? []).map((e) => ({ ...e }))); }}>
                      {DAY_LABEL[k]?.slice(0, 3).toLowerCase() ?? k}
                    </ChipV2>
                  ))}
                </div>

                <div className="status" style={{ marginTop: 18, marginBottom: 6 }}>Gli esercizi</div>
                <div className="srf">
                  {draft.map((ex, i) => (
                    <div className="row-act" key={i} style={{ cursor: "default" }}>
                      <span className="ic2">{I.dumb({ s: 16 })}</span>
                      <span className="in">
                        <input
                          value={ex.nome}
                          onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                          placeholder="Esercizio"
                          style={{ width: "100%", background: "none", border: 0, outline: 0, color: "var(--txt)", fontSize: 16, fontFamily: "inherit", fontWeight: 600, padding: 0 }}
                        />
                      </span>
                      <span className="chevhit tap" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))} aria-label="Togli">
                        {I.close({ s: 15 })}
                      </span>
                    </div>
                  ))}
                  <button className="addrow tap" onClick={() => setDraft((d) => [...d, { nome: "", dettaglio: "" }])}>
                    {I.plus({ s: 14 })}Aggiungi un esercizio
                  </button>
                </div>
                {draft.length === 0 && (
                  <div className="status" style={{ marginTop: 8 }}>Giorno di riposo — aggiungi un esercizio per creare una sessione.</div>
                )}

                <div className="status" style={{ marginTop: 18, marginBottom: 6 }}>Sposta o scambia con</div>
                <div className="chips" style={{ margin: "0 -16px" }}>
                  {DAY_ORDER.filter((k) => k !== activeDay).map((k) => (
                    <ChipV2 key={k} onClick={() => moveSessionTo(k)}>{DAY_LABEL[k]?.slice(0, 3).toLowerCase() ?? k}</ChipV2>
                  ))}
                </div>

                <button
                  className="cta wide tap"
                  style={{ marginTop: 20 }}
                  aria-disabled={savingWeek || undefined}
                  onClick={commitExercises}
                >
                  {savingWeek ? "Salvo…" : "Salva le correzioni"}
                </button>
              </div>
            </Sheet>
          )}

          <div className={"toast" + (msg ? " on" : "")}>{msg}</div>
        </div>

        {/* La barra resta fuori da .k2: il reset del foglio V2 le toglierebbe i margini. */}
        <KeikoNav active="sport" />
      </>
    );
  }

  /* Il caricamento della scheda, nel sistema V2. Vive dentro un Sheet.
     (Il `renderUploadKeiko` qui sotto resta: lo usa la vista embedded, che è
     la home vecchia e non cambia.) */
  function renderUploadV2() {
    if (state === "parsing") {
      return (
        <>
          <div className="think">
            <span className="orb" />
            <span className="tx">sto leggendo la tua scheda…</span>
          </div>
          <Skeleton rows={3} />
        </>
      );
    }
    if (state === "success") {
      return (
        <>
          <div className="complete" style={{ borderTop: "none" }}>
            <span className="big-ck">{I.drawck(null, 15)}</span>
            <span>
              <span className="t">Scheda aggiornata</span>
              {note && <span className="m">{note}</span>}
            </span>
          </div>
        </>
      );
    }
    if (state === "error") {
      return (
        <>
          <div className="hint warm" style={{ marginTop: 16 }}>
            {I.info({ s: 14 })}
            <p>{errorMsg}</p>
          </div>
          <button className="btn2 wide tap" style={{ marginTop: 16 }} onClick={() => setState("idle")}>Riprova</button>
        </>
      );
    }
    return (
      <>
        <div className="sub">
          Fotografa la scheda che ti ha dato il preparatore, o passami il PDF. La leggo e la metto in ordine: gli esercizi restano i suoi.
        </div>
        <div className="srf" style={{ marginTop: 16 }}>
          <div className="row-act tap" onClick={() => imgRef.current?.click()}>
            <span className="ic2">{I.copy({ s: 16 })}</span>
            <span className="in">
              <span className="t">Foto</span>
              <span className="m">{images.length > 0 ? `${images.length} selezionate` : "una o più foto della scheda"}</span>
            </span>
            {images.length > 0 && <span className="badge">{images.length}</span>}
          </div>
          <div className="row-act tap" onClick={() => pdfRef.current?.click()}>
            <span className="ic2">{I.doc({ s: 16 })}</span>
            <span className="in">
              <span className="t">PDF</span>
              <span className="m">{pdf ? pdf.name : "il file del preparatore"}</span>
            </span>
            {pdf && <span className="badge">1</span>}
          </div>
        </div>

        <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => setImages(e.target.files ? Array.from(e.target.files) : [])} />
        <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />

        {hasSomething && (
          <span className="dchips" style={{ marginTop: 12 }}>
            {images.length > 0 && (
              <span className="dchip tap" onClick={() => { setImages([]); if (imgRef.current) imgRef.current.value = ""; }}>
                <b>foto</b>{images.length} {I.close({ s: 12 })}
              </span>
            )}
            {pdf && (
              <span className="dchip tap" onClick={() => { setPdf(null); if (pdfRef.current) pdfRef.current.value = ""; }}>
                <b>pdf</b>{pdf.name.slice(0, 18)} {I.close({ s: 12 })}
              </span>
            )}
          </span>
        )}

        <button
          className="cta wide tap"
          style={{ marginTop: 20 }}
          aria-disabled={!hasSomething || undefined}
          onClick={handleUpload}
        >
          Leggi la scheda
        </button>
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

/* Un riassunto corto di un gruppo di serie. Con le discipline il conto non e'
   piu' uno solo: i pesi si dicono "4 × 10 a 60 kg", la corsa "5,0 km in 27'10"
   · 5:26/km". La regola sta in lib/discipline, in un posto solo, perche' la
   usano anche la sessione e lo storico. */
function riassunto(rows: WorkoutSetRow[]): string {
  return riassuntoSerie(rows);
}

/* "2026-07-21" -> "mar 21 lug" (senza passare da UTC: la data e' gia' locale). */
function dataCorta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(d);
}
