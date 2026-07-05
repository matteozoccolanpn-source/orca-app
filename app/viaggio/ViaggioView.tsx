"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KeikoShell, { useKeikoToast } from "@/app/components/keiko/KeikoShell";
import type { TripPlanRow } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * /viaggio — vista Itinerario (v2.3). Portata 1:1 da #tripView del
 * mockup keiko-final.html. Presentazione soltanto: i backend
 * (/api/trip/edit-slot, /api/trip/generate) restano invariati.
 *  - vHero: art + kicker + titolo + sottotitolo + Aggiorna/Messaggio.
 *  - .slot per ogni tappa reale: Cambia (alternative), Modifica (Claude),
 *    ⌄ dettagli, tbc "notifica tappa · presto".
 *  - "Da sapere & link" (logistica + link reali), "Messaggio pronto".
 * ------------------------------------------------------------------ */

type Opt = { cosa?: string; nota?: string; link?: string };
// Slot: le attività (fisso:false) hanno più opzioni scambiabili; le ancore una.
// cosa/nota tenuti per retro-compatibilità coi piani vecchi senza "opzioni".
type Slot = { quando?: string; fisso?: boolean; opzioni?: Opt[]; cosa?: string; nota?: string };
type Plan = {
  riassunto?: string;
  slot?: Slot[];
  logistica?: { info?: string; fonte?: string }[];
  link?: { label?: string; url?: string }[];
  messaggio?: string;
};

// Art dell'hero itinerario — copiato 1:1 dal mockup (#tripView .vHero .art).
const HERO_ART =
  "radial-gradient(110% 80% at 85% -6%,rgba(214,178,110,.5) 0%,transparent 55%)," +
  "linear-gradient(168deg,#7A4A22 0%,#3A2410 60%,#1B1007 100%)";

function fmtRange(a: string | null, b: string | null): string {
  if (!a) return "";
  const opt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const da = new Date(a + "T00:00:00");
  const db = b ? new Date(b + "T00:00:00") : da;
  const s = new Intl.DateTimeFormat("it-IT", opt).format(da);
  const e = new Intl.DateTimeFormat("it-IT", opt).format(db);
  return s === e ? s : `${s} – ${e}`;
}

const smooth = (): ScrollBehavior =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";

const oneLine: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

export default function ViaggioView({ trips }: { trips: TripPlanRow[] }) {
  // Titolo del guscio = città del viaggio più vicino (i piani sono ordinati per data).
  const title = trips.length > 0 ? trips[0].city : "Itinerario";
  return (
    <KeikoShell title={title} badge={trips.length > 0 ? "PRONTO ✓" : undefined} backHref="/?v2">
      {trips.length === 0 ? <EmptyState /> : trips.map((t) => <TripBlock key={t.id} trip={t} />)}
    </KeikoShell>
  );
}

function EmptyState() {
  return (
    <div className="slot" style={{ marginTop: 14, textAlign: "center", padding: 20 }}>
      <div style={{ fontSize: "var(--fs-md)", fontWeight: 800, color: "var(--text)" }}>Nessun itinerario pronto</div>
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-2)", marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
        Quando Keiko riconosce un viaggio e prepara il piano, lo trovi qui.
      </p>
    </div>
  );
}

function TripBlock({ trip }: { trip: TripPlanRow }) {
  const router = useRouter();
  const toast = useKeikoToast();
  const plan = (trip.plan ?? {}) as Plan;
  const slot = plan.slot ?? [];
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);

  // "Aggiorna" — rigenera i piani pendenti (riusa /api/trip/generate), poi ricarica.
  async function aggiorna() {
    if (busy) return;
    setBusy(true);
    heroRef.current?.classList.add("shim");
    try {
      const res = await fetch("/api/trip/generate", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast("Itinerario fresco: tutto confermato ✅");
      router.refresh();
    } catch (e) {
      console.error("trip/generate fallita:", e);
      toast("Qualcosa non torna, riprovo");
    } finally {
      setTimeout(() => heroRef.current?.classList.remove("shim"), 1000);
      setBusy(false);
    }
  }

  // "Messaggio pronto" dell'hero: copia il messaggio negli appunti.
  async function copiaMessaggio() {
    if (!plan.messaggio) return;
    try {
      await navigator.clipboard.writeText(plan.messaggio);
      toast("Messaggio copiato — incollalo dove vuoi \u{1F4AC}");
    } catch {
      toast("Copia non riuscita, riprovo");
    }
  }

  return (
    <section style={{ marginTop: 14 }}>
      {/* HERO itinerario */}
      <div className="vHero" ref={heroRef}>
        <div className="art" style={{ position: "absolute", inset: 0, background: HERO_ART }} />
        <div className="shade" />
        <span className="vk">Itinerario &middot; {fmtRange(trip.start_date, trip.end_date)}</span>
        <h4 style={oneLine}>Viaggio a {trip.city}</h4>
        {plan.riassunto && (
          <div
            className="vs2"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {plan.riassunto}
          </div>
        )}
        <div className="vActs">
          <button className="chipA" onClick={aggiorna} disabled={busy}>
            {busy ? "\u{1F504} Aggiorno…" : "\u{1F504} Aggiorna"}
          </button>
          {plan.messaggio && (
            <button className="chipA" onClick={copiaMessaggio}>
              &#128172; Messaggio pronto
            </button>
          )}
        </div>
      </div>

      {/* SEQUENZA — le tappe reali del piano */}
      {slot.length > 0 && (
        <>
          <div className="agLbl">La sequenza &middot; tocca &#8964; per i dettagli</div>
          {slot.map((s, i) => (
            <SlotRow key={i} step={s} clusterKey={trip.cluster_key} index={i} />
          ))}
        </>
      )}

      {/* Da sapere & link */}
      <DaSapere logistica={plan.logistica} link={plan.link} />

      {/* Messaggio pronto */}
      {plan.messaggio && <MessaggioCard testo={plan.messaggio} />}

      {slot.length > 1 && (
        <button
          className="btn line"
          style={{ width: "100%" }}
          onClick={() => toast("Quale tappa cambiamo? \u{1F501}")}
        >
          Scambia una tappa
        </button>
      )}
    </section>
  );
}

/* Una tappa: .sh (orario + nome + ⌄) · dettaglio espandibile · .sa con
   Cambia (alternative locali), Modifica (edit-slot via Claude), tbc. */
function SlotRow({ step, clusterKey, index }: { step: Slot; clusterKey: string; index: number }) {
  const router = useRouter();
  const toast = useKeikoToast();
  // Retro-compatibilità: senza "opzioni", uso cosa/nota come opzione unica.
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

  // La barra bassa può coprire il tasto Invia: al focus centriamo il form.
  useEffect(() => {
    if (editing) formRef.current?.scrollIntoView({ behavior: smooth(), block: "center" });
  }, [editing]);

  const opt = opzioni[sel] ?? {};
  const hasDetail = !!(opt.nota || opt.link);
  const swappable = !step.fisso && opzioni.length > 1;

  // Modifica testuale: Keiko riscrive SOLO questa tappa, poi ricarica il piano.
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
      toast("Tappa aggiornata ✓");
      router.refresh();
    } catch (e) {
      console.error("edit-slot fallita:", e);
      toast("Qualcosa non torna, riprovo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="slot">
      <div className="sh">
        {step.quando && <span className="st2">{step.quando}</span>}
        <span className="sn" style={oneLine}>
          {opt.cosa ?? "Tappa"}
        </span>
        {hasDetail && (
          <span
            className="sx"
            role="button"
            tabIndex={0}
            aria-expanded={open}
            aria-label="Mostra i dettagli"
            onClick={() => setOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen((o) => !o);
              }
            }}
            style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform .2s" }}
          >
            &#8964;
          </span>
        )}
      </div>

      {open && hasDetail && (
        <div style={{ marginTop: 8 }}>
          {opt.nota && (
            <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-2)", lineHeight: 1.5, fontWeight: 600 }}>
              {opt.nota}
            </div>
          )}
          {opt.link && (
            <a
              href={opt.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "var(--fs-xs)", fontWeight: 800, color: "var(--accent)", display: "inline-block", marginTop: 6 }}
            >
              Apri &rsaquo;
            </a>
          )}
        </div>
      )}

      <div className="sa">
        {swappable && (
          <button
            className="chipA dk"
            onClick={() => {
              setSel((s) => (s + 1) % opzioni.length);
              setOpen(false);
            }}
          >
            &#128260; Cambia ({sel + 1}/{opzioni.length})
          </button>
        )}
        <button className="chipA dk" onClick={() => setEditing((e) => !e)}>
          &#9998; Modifica
        </button>
        <span
          className="tbc"
          role="button"
          tabIndex={0}
          onClick={() => toast("Ci sto lavorando \u{1F527}")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toast("Ci sto lavorando \u{1F527}");
            }
          }}
          style={{ cursor: "pointer" }}
        >
          notifica tappa &middot; presto
        </span>
      </div>

      {editing && (
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            chiediModifica();
          }}
          style={{ display: "flex", gap: 8, marginTop: 9, scrollMarginBlock: 120 }}
        >
          <input
            type="text"
            value={richiesta}
            onChange={(e) => setRichiesta(e.target.value)}
            placeholder={step.fisso ? "es. consigli per questa tappa…" : "es. spostala al pomeriggio…"}
            maxLength={300}
            disabled={busy}
            autoFocus
            style={{
              minWidth: 0,
              flex: 1,
              fontFamily: "var(--f)",
              fontSize: "var(--fs-sm)",
              fontWeight: 600,
              color: "var(--text)",
              background: "var(--bg-2)",
              border: "1px solid var(--card-line)",
              borderRadius: "var(--r-md)",
              padding: "10px 12px",
              outline: "none",
            }}
          />
          <button type="submit" className="btn acc" disabled={busy || !richiesta.trim()} style={{ flex: "none", opacity: busy || !richiesta.trim() ? 0.6 : 1 }}>
            {busy ? "Ci penso…" : "Invia"}
          </button>
        </form>
      )}
    </div>
  );
}

/* "Da sapere & link" — logistica (con fonte) + link utili, dati reali del piano. */
function DaSapere({
  logistica,
  link,
}: {
  logistica?: { info?: string; fonte?: string }[];
  link?: { label?: string; url?: string }[];
}) {
  const toast = useKeikoToast();
  const logs = (logistica ?? []).filter((l) => l.info);
  const links = (link ?? []).filter((l) => l.label && l.url);
  if (logs.length === 0 && links.length === 0) return null;

  const glyph = (label: string): string => {
    const t = label.toLowerCase();
    if (/(meteo|sole|pioggia|temp)/.test(t)) return "☀";
    if (/(bigliett|ticket)/.test(t)) return "\u{1F3AB}";
    return "\u{1F4CD}";
  };

  return (
    <>
      <div className="agLbl">Da sapere &amp; link</div>
      <div className="slot">
        {logs.map((l, i) =>
          l.fonte ? (
            <a key={`g${i}`} className="linkRow" href={l.fonte} target="_blank" rel="noopener noreferrer">
              {"\u{1F4CD}"} {l.info}
              <span>&rsaquo;</span>
            </a>
          ) : (
            <div key={`g${i}`} className="linkRow" style={{ cursor: "default" }}>
              {"\u{1F4CD}"} {l.info}
            </div>
          )
        )}
        {links.map((l, i) => (
          <a
            key={`l${i}`}
            className="linkRow"
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => toast("Apro il link \u{1F5FA}")}
          >
            {glyph(l.label!)} {l.label}
            <span>&rsaquo;</span>
          </a>
        ))}
      </div>
    </>
  );
}

/* "Messaggio pronto" — testo reale + Copia (appunti) e WhatsApp (wa.me). */
function MessaggioCard({ testo }: { testo: string }) {
  const toast = useKeikoToast();

  async function copia() {
    try {
      await navigator.clipboard.writeText(testo);
      toast("Copiato ✓");
    } catch {
      toast("Copia non riuscita, riprovo");
    }
  }

  function whatsapp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(testo)}`, "_blank", "noopener,noreferrer");
    toast("Apro WhatsApp \u{1F4AC}");
  }

  return (
    <>
      <div className="agLbl">Messaggio pronto</div>
      <div className="msgCard">
        <p>&laquo;{testo}&raquo;</p>
        <div className="sa">
          <button className="chipA dk" onClick={copia}>
            &#128203; Copia
          </button>
          <button className="chipA dk" onClick={whatsapp}>
            &#128172; WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}
