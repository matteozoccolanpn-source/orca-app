"use client";

import SmartMedia from "@/components/SmartMedia";
import { catFor } from "@/lib/smart-image";
import { mapsUrl, type LiveEvent } from "./keikoLive";

/* Pannello dettaglio evento nel design v4 (bottom-sheet). Read-only v1:
   foto/gradiente + orario + luogo + Maps + "Trovato da Keiko" (link).
   Modifica/Elimina si aggiungono nella slice successiva. */

export default function EventSheet({ ev, onClose }: { ev: LiveEvent; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}
    >
      <div
        className="ds"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92vh", overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div style={{ position: "relative" }}>
          <SmartMedia
            variant="hero"
            category={catFor(ev.type)}
            glyph={ev.emoji}
            display
            chip={`${ev.emoji} ${ev.catLabel}`}
            title={ev.title}
            meta={<><span className="k">{ev.when}</span>{ev.location ? ` · ${ev.location}` : ""}</>}
            style={{ borderRadius: 0, border: 0, boxShadow: "none" }}
          />
          <button
            onClick={onClose}
            aria-label="Chiudi"
            style={{ position: "absolute", top: 12, right: 12, zIndex: 6, width: 32, height: 32, borderRadius: "50%", background: "rgba(10,10,12,.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", color: "#fff", fontSize: 15, cursor: "pointer" }}
          >✕</button>
        </div>

        <div style={{ padding: "16px 20px 0" }}>
          {ev.location && (
            <a href={mapsUrl(ev.mapsQ)} target="_blank" rel="noreferrer" className="ds-btn primary" style={{ width: "100%", textDecoration: "none" }}>📍 Apri in Maps</a>
          )}

          {ev.enrichment?.summary && (
            <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.5, color: "var(--k-text-2)" }}>{ev.enrichment.summary}</p>
          )}
          {(ev.enrichment?.links ?? []).map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" className="ds-btn" style={{ width: "100%", marginTop: 8, justifyContent: "flex-start", textDecoration: "none" }}>🔗 {l.label}</a>
          ))}
          {!ev.enrichment && (
            <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--k-text-3)" }}>Keiko può trovare online info e link utili su questo evento (arriva alla creazione).</p>
          )}
        </div>
      </div>
    </div>
  );
}
