"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CaptureSheet from "@/components/CaptureSheet";
import EventSheet from "./EventSheet";
import AskSheet from "./AskSheet";
import SmartMedia from "@/components/SmartMedia";
import { catFor } from "@/lib/smart-image";
import type { LiveHome, LiveEvent } from "./keikoLive";
import "../../ds.css";

/* HOME v4 (Fase 2 — slice 1): nuova Home col design bloccato, dati VERI.
   Dietro ?v4 così è additiva (la Home attuale resta). Card unica + gradienti
   categoria (livello 0). Interazioni pesanti (pannello evento, ricerca) nella
   prossima slice. */

export default function KeikoHomeV4({ live, demo = false }: { live: LiveHome; demo?: boolean }) {
  const router = useRouter();
  const [capture, setCapture] = useState(false);
  const [selEv, setSelEv] = useState<LiveEvent | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const heroEv = live.heroEvents[0] ?? live.upcoming[0] ?? null;
  const inArrivo = (heroEv ? live.upcoming : live.upcoming.slice(1)).slice(0, 6);

  // riepilogo giornata
  const nEventiOggi = live.heroEvents.length;
  const gym = live.gym;
  const gymTxt = gym
    ? gym.trainedToday
      ? "💪 allenamento fatto"
      : gym.rest
        ? "🌙 riposo"
        : "💪 allenamento da fare"
    : null;

  const go = (href: string) => { if (!demo) router.push(href); };  // in anteprima pubblica i tap sono inerti (niente redirect a login)

  return (
    <div
      className="ds"
      style={{ minHeight: "100dvh", background: "var(--k-bg)", padding: "0 20px calc(96px + env(safe-area-inset-bottom))", maxWidth: 440, margin: "0 auto" }}
    >
      {/* topbar */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", gap: 12, margin: "0 -20px", padding: "calc(env(safe-area-inset-top) + 12px) 20px 12px", background: "rgba(11,13,18,.82)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <span className="ds-display" style={{ fontSize: 22, color: "var(--k-text)" }}>
          kei<span style={{ color: "var(--k-accent)" }}>ko</span>
        </span>
        <div
          onClick={() => { if (!demo) setAskOpen(true); }}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 999, padding: "10px 14px", color: "var(--k-text-3)", fontSize: 13.5, fontWeight: 500, cursor: "pointer" }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          Chiedi a Keiko…
        </div>
        <button onClick={() => go("/?v2")} aria-label="Profilo" style={{ width: 38, height: 38, borderRadius: "50%", flex: "none", background: "linear-gradient(135deg,#3a2f22,#241d15)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 15, cursor: "pointer" }}>🐋</button>
      </div>

      {/* saluto */}
      <p style={{ fontSize: 13, color: "var(--k-text-3)", fontWeight: 500, margin: "0 0 4px" }}>{live.kickDate}</p>
      <h1 className="ds-display" style={{ fontSize: 24, lineHeight: 1.06, margin: "0 0 8px", color: "var(--k-text)" }}>{live.greeting}</h1>
      <div style={{ fontSize: 13, color: "var(--k-text-2)", fontWeight: 500, margin: "0 0 20px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        Oggi
        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--k-text-3)" }} />
        {nEventiOggi} event{nEventiOggi === 1 ? "o" : "i"}
        {gymTxt && <><span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--k-text-3)" }} /><span style={{ color: gym?.trainedToday ? "var(--k-ok)" : "var(--k-text-2)" }}>{gymTxt}</span></>}
      </div>

      {/* week strip */}
      <div style={{ display: "flex", gap: 6, margin: "0 0 24px" }}>
        {live.week.slice(0, 7).map((d) => (
          <div key={d.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "9px 0", borderRadius: 16, background: d.today ? "var(--k-accent)" : "transparent" }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", color: d.today ? "var(--k-accent-ink)" : "var(--k-text-3)" }}>{d.w.toUpperCase()}</span>
            <b style={{ fontSize: 16, fontWeight: 600, color: d.today ? "var(--k-accent-ink)" : "var(--k-text-2)" }}>{d.n}</b>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: d.d1 ? (d.today ? "var(--k-accent-ink)" : "var(--k-accent)") : "transparent" }} />
          </div>
        ))}
      </div>

      {/* HERO */}
      {heroEv && (
        <EventCard ev={heroEv} variant="hero" onOpen={() => setSelEv(heroEv)} />
      )}

      {/* In arrivo */}
      {inArrivo.length > 0 && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "32px 2px 16px", color: "var(--k-text-3)" }}>In arrivo <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--k-text-3)" }}>· {inArrivo.length}</span></h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", margin: "0 -18px", padding: "0 18px 4px" }}>
            {inArrivo.map((ev) => (
              <div key={ev.id} style={{ minWidth: 214, flex: "none" }}>
                <EventCard ev={ev} variant="mini" onOpen={() => setSelEv(ev)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Oggi per te */}
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.4px", textTransform: "uppercase", margin: "32px 2px 16px", color: "var(--k-text-3)" }}>Oggi per te</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {gym && (
          <SmartMedia variant="square" category="sport" chip="💪 Allenamento" glyph="🏋️" style={{ aspectRatio: "4 / 3" }}
            title={gym.title} meta={<>{gym.trainedToday ? "Fatto" : gym.rest ? "Riposo 🌙" : `${gym.done}/${gym.total}`}</>}
            onClick={() => go("/allenamento")} />
        )}
        {live.diet && (
          <SmartMedia variant="square" category="dieta" chip="🥗 Dieta" chipAmber glyph="🥗" style={{ aspectRatio: "4 / 3" }}
            title={live.diet.nextPasto ?? "Dieta"} meta={live.diet.nextOpt ?? undefined}
            onClick={() => go("/salute")} />
        )}
        {live.trip && (
          <SmartMedia variant="square" category="viaggio" chip="🧭 Viaggio" glyph="🧭" style={{ aspectRatio: "4 / 3" }}
            title={live.trip.title} meta={<><span className="k">{live.trip.range}</span></>}
            onClick={() => go("/viaggio")} />
        )}
        {live.watch && (
          <SmartMedia variant="square" category="film" chip="🍿 Guarda" glyph="🍿" style={{ aspectRatio: "4 / 3" }}
            title={live.watch.title ?? "Da guardare"} meta={live.watch.sub ?? `${live.watch.count} titoli`}
            onClick={() => go("/guarda")} />
        )}
      </div>

      {/* bottom nav */}
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 84, background: "linear-gradient(180deg,rgba(10,11,14,0),rgba(10,11,14,.97) 45%)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 20px 18px", maxWidth: 440, margin: "0 auto" }}>
        <NavItem label="Home" active icon={<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>} onClick={() => {}} />
        <NavItem label="Dieta" icon={<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>} onClick={() => go("/salute")} />
        <button onClick={() => { if (!demo) setCapture(true); }} aria-label="Aggiungi" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--k-accent)", color: "var(--k-accent-ink)", border: 0, display: "grid", placeItems: "center", fontSize: 30, lineHeight: 1, paddingBottom: 2, boxShadow: "0 8px 20px rgba(255,184,77,.28), 0 2px 6px rgba(0,0,0,.4)", marginTop: -24, cursor: "pointer" }}>+</button>
        <NavItem label="Sport" icon={<><path d="M6 12h12M4 9v6M20 9v6M8 8v8M16 8v8" /></>} onClick={() => go("/allenamento")} />
        <NavItem label="Guarda" icon={<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" /></>} onClick={() => go("/guarda")} />
      </nav>

      <CaptureSheet open={capture} onClose={() => setCapture(false)} />
      {selEv && <EventSheet ev={selEv} onClose={() => setSelEv(null)} demo={demo} />}
      {askOpen && <AskSheet onClose={() => setAskOpen(false)} />}
    </div>
  );
}

function EventCard({ ev, variant, onOpen }: { ev: LiveEvent; variant: "hero" | "mini"; onOpen: () => void }) {
  const category = catFor(ev.type);
  const chipLabel = `${ev.emoji} ${ev.catLabel}`;
  return (
    <SmartMedia
      variant={variant}
      category={category}
      chip={chipLabel}
      glyph={ev.emoji}
      display={variant === "hero"}
      title={ev.title}
      meta={<><span className="k">{ev.when}</span>{ev.location ? ` · ${ev.location}` : ""}</>}
      onClick={onOpen}
    />
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: 0, color: active ? "var(--k-text)" : "#9BA0A8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
      {label}
    </button>
  );
}
