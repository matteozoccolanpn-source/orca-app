"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ExternalLink, Copy, Check, MapPin, RefreshCw, Pencil } from "lucide-react";
import type { TripPlanRow } from "@/lib/supabase";

// Forma del piano salvato in trip_plans.plan (generato dalla fase pesante).
// Tutto opzionale: renderizziamo solo ciò che c'è.
type Opt = { cosa?: string; nota?: string; link?: string };
// Slot: le attività (fisso:false) hanno più opzioni scambiabili; le ancore (fisso:true) una.
// cosa/nota tenuti per retro-compatibilità coi piani vecchi senza "opzioni".
type Slot = { quando?: string; fisso?: boolean; opzioni?: Opt[]; cosa?: string; nota?: string };
type Plan = {
  riassunto?: string;
  slot?: Slot[];
  logistica?: { info?: string; fonte?: string }[];
  link?: { label?: string; url?: string }[];
  messaggio?: string;
};

function fmtRange(a: string | null, b: string | null): string {
  if (!a) return "";
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const da = new Date(a + "T00:00:00");
  const db = b ? new Date(b + "T00:00:00") : da;
  const s = new Intl.DateTimeFormat("it-IT", opt).format(da);
  const e = new Intl.DateTimeFormat("it-IT", opt).format(db);
  return s === e ? s : `${s} – ${e}`;
}

export default function ViaggioView({ trips }: { trips: TripPlanRow[] }) {
  return (
    <div
      className="relative mx-auto min-h-[100dvh] w-full max-w-lg"
      style={{ padding: "var(--s3) var(--gutter) 140px", color: "var(--app-text)" }}
    >
      <header className="flex items-center gap-[var(--s2)]" style={{ paddingBlock: "var(--s3)" }}>
        <Link
          href="/"
          aria-label="Indietro"
          className="grid place-items-center transition-transform active:scale-95"
          style={{ width: "var(--tap)", height: "var(--tap)", marginLeft: -10, color: "var(--app-2)" }}
        >
          <ChevronLeft className="size-6" />
        </Link>
        <span style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-xl)", letterSpacing: "-.03em" }}>
          Plot
        </span>
      </header>

      {trips.length === 0 ? (
        <EmptyState />
      ) : (
        trips.map((t) => <TripBlock key={t.id} trip={t} />)
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="text-center"
      style={{
        borderRadius: "var(--r-xl)",
        background: "var(--surface)",
        border: "1px solid var(--tile-line)",
        boxShadow: "var(--sh-card)",
        padding: "var(--s8) var(--s5)",
        marginTop: "var(--s4)",
      }}
    >
      <p style={{ fontWeight: "var(--fw-bold)", fontSize: "var(--fs-base)", color: "var(--on-surface)" }}>
        Nessun plot pronto
      </p>
      <p className="mt-1" style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>
        Quando Keiko riconosce un viaggio e ne prepara il piano, lo trovi qui.
      </p>
    </div>
  );
}

function TripBlock({ trip }: { trip: TripPlanRow }) {
  const plan = (trip.plan ?? {}) as Plan;
  const slot = plan.slot ?? [];

  return (
    <section style={{ marginTop: "var(--s4)" }}>
      {/* Intestazione viaggio */}
      <div
        className="text-white"
        style={{ borderRadius: "var(--r-xl)", background: "var(--cat-treno)", padding: "var(--s4)", boxShadow: "var(--sh-card)" }}
      >
        <span
          className="inline-flex items-center gap-1.5"
          style={{ fontSize: "var(--fs-cap)", fontWeight: "var(--fw-semi)", background: "rgba(255,255,255,.22)", padding: "6px 12px", borderRadius: "var(--r-pill)" }}
        >
          <MapPin className="size-3.5" /> {fmtRange(trip.start_date, trip.end_date)}
        </span>
        <div style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-lg)", marginTop: "var(--s2)", letterSpacing: "-.02em" }}>
          Viaggio a {trip.city}
        </div>
        {plan.riassunto && (
          <p style={{ fontSize: "var(--fs-sm)", marginTop: "var(--s1)", lineHeight: 1.4, opacity: 0.95 }}>{plan.riassunto}</p>
        )}
      </div>

      {/* SEQUENZA — protagonista. Ogni tappa si tocca per il dettaglio. */}
      {slot.length > 0 && (
        <>
          <SectionTitle>La sequenza</SectionTitle>
          <div style={{ borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--tile-line)", overflow: "hidden" }}>
            {slot.map((s, i) => (
              <StepRow key={i} step={s} first={i === 0} clusterKey={trip.cluster_key} index={i} />
            ))}
          </div>
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--app-faint)", marginTop: "var(--s2)", marginLeft: 2 }}>
            Tocca una tappa per i dettagli. Con la matita chiedi una modifica a Keiko.
          </p>
        </>
      )}

      {/* Dettagli operativi + link, collassati per non disperdere */}
      <Extras logistica={plan.logistica} link={plan.link} />

      {/* Messaggio pronto da condividere */}
      {plan.messaggio && <MessaggioCard testo={plan.messaggio} />}
    </section>
  );
}

/* Una tappa della sequenza: chiusa mostra quando + cosa; aperta rivela la nota (+ link).
   Le attività (fisso:false) con più opzioni hanno il tasto "Cambia" (swap istantaneo). */
function StepRow({ step, first, clusterKey, index }: { step: Slot; first: boolean; clusterKey: string; index: number }) {
  const router = useRouter();
  // Retro-compatibilità: se non ci sono "opzioni", uso cosa/nota come opzione unica.
  const opzioni: Opt[] =
    step.opzioni && step.opzioni.length > 0
      ? step.opzioni
      : step.cosa
      ? [{ cosa: step.cosa, nota: step.nota }]
      : [];

  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [richiesta, setRichiesta] = useState("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // La barra "Chiedi a Keiko" galleggia in basso e può coprire il bottone Invia:
  // quando apri la modifica, centriamo il form sullo schermo, lontano dalla barra.
  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [editing]);
  const opt = opzioni[sel] ?? {};
  const hasDetail = !!(opt.nota || opt.link);
  const swappable = !step.fisso && opzioni.length > 1;

  // Manda la richiesta a Keiko: riscrive SOLO questa tappa, poi ricarica il piano.
  async function chiediModifica() {
    const r = richiesta.trim();
    if (!r || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/trip/edit-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clusterKey, slotIndex: index, richiesta: r }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setEditing(false);
      setRichiesta("");
      setSel(0);
      router.refresh();
    } catch (e) {
      console.error("edit-slot fallita:", e);
      const msg = e instanceof Error && e.message ? e.message : "errore sconosciuto";
      window.alert("Modifica fallita: " + msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: first ? "none" : "1px solid var(--inset-line)" }}>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-[var(--s3)] text-left"
        style={{ padding: "var(--s3)", cursor: hasDetail ? "pointer" : "default" }}
      >
        <div className="min-w-0 flex-1">
          {step.quando && (
            <div className="tabular-nums" style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-bold)", color: "var(--accent-strong)" }}>
              {step.quando}
            </div>
          )}
          {opt.cosa && (
            <div style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: "var(--on-surface)", marginTop: 2, lineHeight: 1.3 }}>
              {opt.cosa}
            </div>
          )}
        </div>
        {hasDetail && (
          <ChevronDown
            className="size-[18px] flex-none transition-transform duration-200"
            style={{ color: "var(--app-faint)", transform: open ? "rotate(180deg)" : "none", marginTop: 2 }}
          />
        )}
      </button>

      {open && (
        <div style={{ padding: "0 var(--s3) var(--s3)" }}>
          {opt.nota && (
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)", lineHeight: 1.45 }}>{opt.nota}</div>
          )}
          {opt.link && (
            <a
              href={opt.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1"
              style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)", marginTop: 6 }}
            >
              Apri <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-[var(--s2)]" style={{ padding: "0 var(--s3) var(--s3)" }}>
          {swappable && (
            <button
              type="button"
              onClick={() => {
                setSel((s) => (s + 1) % opzioni.length);
                setOpen(false);
              }}
              className="inline-flex items-center gap-1.5 transition-transform active:scale-[0.98]"
              style={{
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-semi)",
                color: "var(--accent-strong)",
                background: "var(--inset)",
                border: "1px solid var(--inset-line)",
                borderRadius: "var(--r-pill)",
                padding: "6px 12px",
              }}
            >
              <RefreshCw className="size-3.5" /> Cambia ({sel + 1}/{opzioni.length})
            </button>
          )}

          {/* Modifica testuale: Keiko riscrive SOLO questa tappa */}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="inline-flex items-center gap-1.5 transition-transform active:scale-[0.98]"
            style={{
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-semi)",
              color: editing ? "var(--accent-strong)" : "var(--app-2)",
              background: "var(--inset)",
              border: "1px solid var(--inset-line)",
              borderRadius: "var(--r-pill)",
              padding: "6px 12px",
            }}
          >
            <Pencil className="size-3.5" /> Modifica
          </button>
      </div>

      {editing && (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            chiediModifica();
          }}
          className="relative z-50 flex items-center gap-[var(--s2)]"
          style={{ padding: "0 var(--s3) var(--s3)", scrollMarginBlock: 120 }}
        >
          <input
            type="text"
            value={richiesta}
            onChange={(e) => setRichiesta(e.target.value)}
            placeholder={step.fisso ? "es. consigli per questa tappa…" : "es. spostalo al pomeriggio…"}
            maxLength={300}
            disabled={busy}
            autoFocus
            className="min-w-0 flex-1 outline-none"
            style={{
              fontSize: "var(--fs-sm)",
              color: "var(--on-surface)",
              background: "var(--inset)",
              border: "1px solid var(--inset-line)",
              borderRadius: "var(--r-sm)",
              padding: "10px 12px",
            }}
          />
          <button
            type="button"
            onClick={chiediModifica}
            disabled={busy || !richiesta.trim()}
            className="flex-none text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-semi)",
              background: "var(--keiko-grad)",
              borderRadius: "var(--r-sm)",
              padding: "10px 14px",
              boxShadow: "var(--sh-btn)",
            }}
          >
            {busy ? "Keiko ci pensa…" : "Invia"}
          </button>
        </form>
      )}
    </div>
  );
}

/* Blocco secondario collassabile: logistica (con fonti) + link utili. */
function Extras({
  logistica,
  link,
}: {
  logistica?: { info?: string; fonte?: string }[];
  link?: { label?: string; url?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const hasLog = !!logistica && logistica.length > 0;
  const hasLink = !!link && link.length > 0;
  if (!hasLog && !hasLink) return null;

  return (
    <div style={{ marginTop: "var(--sec)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2"
        style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
      >
        <span style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>Da sapere & link</span>
        <ChevronDown
          className="ml-auto size-[18px] flex-none transition-transform duration-200"
          style={{ color: "var(--app-faint)", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-[var(--s2)]" style={{ marginTop: "var(--s2)" }}>
          {hasLog &&
            logistica!.map((l, i) => (
              <div key={i} style={{ borderRadius: "var(--r-md)", background: "var(--tile)", border: "1px solid var(--tile-line)", padding: "var(--s3)" }}>
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface)", lineHeight: 1.4 }}>{l.info}</div>
                {l.fonte && (
                  <a
                    href={l.fonte}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1"
                    style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)", marginTop: 6 }}
                  >
                    Fonte <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            ))}

          {hasLink && (
            <div className="flex flex-wrap gap-[var(--s2)]" style={{ marginTop: hasLog ? "var(--s1)" : 0 }}>
              {link!.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-transform active:scale-[0.98]"
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: "var(--fw-semi)",
                    color: "var(--on-surface)",
                    background: "var(--inset)",
                    border: "1px solid var(--inset-line)",
                    borderRadius: "var(--r-pill)",
                    padding: "8px 14px",
                  }}
                >
                  {l.label} <ExternalLink className="size-3.5" style={{ color: "var(--app-2)" }} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{ fontSize: "var(--fs-cap)", fontWeight: "var(--fw-bold)", letterSpacing: ".07em", color: "var(--app-faint)", margin: "var(--sec) 0.5px var(--s3)" }}
    >
      {children}
    </p>
  );
}

function MessaggioCard({ testo }: { testo: string }) {
  const [copied, setCopied] = useState(false);

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard non disponibile: ignora */
    }
  }

  return (
    <>
      <SectionTitle>Messaggio pronto</SectionTitle>
      <div style={{ borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--tile-line)", padding: "var(--s3)" }}>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{testo}</p>
        <button
          type="button"
          onClick={copia}
          className="mt-[var(--s3)] inline-flex w-full items-center justify-center gap-2 text-white transition-transform active:scale-[0.98]"
          style={{ minHeight: "var(--tap)", borderRadius: "var(--r-sm)", fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
        >
          {copied ? <Check className="size-[17px]" /> : <Copy className="size-[17px]" />}
          {copied ? "Copiato" : "Copia messaggio"}
        </button>
      </div>
    </>
  );
}
