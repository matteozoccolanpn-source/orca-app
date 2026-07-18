"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm, toDatetime, splitDatetime, type EventFormValue } from "@/app/components/EventForm";
import { gradientFor, catFor } from "@/lib/smart-image";
import { mapsUrl, type LiveEvent } from "./keikoLive";

/* Pannello dettaglio evento (design v4).
   - Azioni client-side (sempre): Aggiungi al calendario (.ics), Condividi, Maps.
   - Azioni con login (solo se !demo): Modifica (/api/update), Elimina (/api/delete).
   In anteprima pubblica (demo) le azioni con login sono nascoste: niente tasti morti. */

function downloadIcs(ev: LiveEvent) {
  const dt = ev.datetime ? new Date(ev.datetime) : null;
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = dt ? fmt(dt) : "";
  const end = dt ? fmt(new Date(dt.getTime() + 2 * 3600 * 1000)) : "";
  const esc = (s: string) => (s ?? "").replace(/([,;])/g, "\\$1");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Keiko//IT", "BEGIN:VEVENT",
    `SUMMARY:${esc(ev.title)}`,
    start ? `DTSTART:${start}` : "",
    end ? `DTEND:${end}` : "",
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${ev.title.slice(0, 40)}.ics`; a.click();
  URL.revokeObjectURL(url);
}

async function share(ev: LiveEvent) {
  const text = `${ev.title} — ${ev.when}${ev.location ? ` · ${ev.location}` : ""}`;
  try {
    if (navigator.share) await navigator.share({ title: ev.title, text });
    else { await navigator.clipboard.writeText(text); }
  } catch { /* annullato */ }
}

export default function EventSheet({ ev, onClose, demo = false }: { ev: LiveEvent; onClose: () => void; demo?: boolean }) {
  const router = useRouter();
  const gradient = gradientFor(catFor(ev.type));
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const { date, time } = splitDatetime(ev.datetime);
  const [form, setForm] = useState<EventFormValue>({ title: ev.title, type: ev.type, date, time, location: ev.location, reference: "" });

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id: ev.id, title: form.title, type: form.type, datetime: toDatetime(form), location: form.location, reference: form.reference }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); onClose();
    } catch { window.alert("Non sono riuscito a salvare, riprova"); }
    finally { setBusy(false); }
  }

  async function del() {
    setBusy(true);
    try {
      const res = await fetch("/api/delete", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id: ev.id }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); onClose();
    } catch { window.alert("Non sono riuscito a eliminare, riprova"); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
      <div
        className="ds"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", paddingBottom: "calc(env(safe-area-inset-bottom) + 22px)" }}
      >
        {mode === "edit" ? (
          <div style={{ padding: "18px 20px 0" }}>
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)" }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--k-text)", margin: "6px 0 16px" }}>Modifica evento</h2>
            <EventForm value={form} onChange={setForm} onCancel={() => setMode("view")} onSave={save} saving={busy} saveLabel="Salva" intro="" />
          </div>
        ) : (
          <>
            {/* foto strip (titolo/orario sotto per controllo) */}
            <div style={{ position: "relative", height: 180, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", background: gradient }}>
              {ev.image && <img src={ev.image} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
              {!ev.image && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 74, opacity: .16 }} aria-hidden>{ev.emoji}</div>}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(6,6,8,.5) 0%, transparent 30%, transparent 70%, rgba(6,6,8,.4) 100%)" }} />
              <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.35)" }} />
              <div className="ds-chip" style={{ position: "absolute", top: 16, left: 16 }}>{ev.emoji} {ev.catLabel}</div>
              <button onClick={onClose} aria-label="Chiudi" style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderRadius: "50%", background: "rgba(10,10,12,.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.16)", color: "#fff", fontSize: 15, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ padding: "18px 20px 0" }}>
              <h2 style={{ fontSize: 25, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-.01em", color: "var(--k-text)", margin: 0 }}>{ev.title}</h2>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--k-accent)", marginTop: 8 }}>{ev.when}</div>
              {ev.location && <div style={{ fontSize: 15, color: "var(--k-text-2)", marginTop: 3 }}>{ev.location}</div>}

              {/* azioni sempre disponibili */}
              <button onClick={() => downloadIcs(ev)} className="ds-btn primary" style={{ width: "100%", height: 52, borderRadius: 16, fontSize: 16, marginTop: 18 }}>📅 Aggiungi al calendario</button>
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                {ev.location && <a href={mapsUrl(ev.mapsQ)} target="_blank" rel="noreferrer" className="ds-btn" style={{ flex: 1, height: 46, textDecoration: "none" }}>📍 Maps</a>}
                <button onClick={() => share(ev)} className="ds-btn" style={{ flex: 1, height: 46 }}>📤 Condividi</button>
              </div>

              {/* azioni con login: Modifica / Elimina */}
              {!demo && (
                confirmDel ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "12px 14px", background: "rgba(226,112,95,.10)", border: "1px solid rgba(226,112,95,.35)", borderRadius: 14 }}>
                    <span style={{ flex: 1, fontSize: 13.5, color: "var(--k-text-2)" }}>Eliminare questo evento?</span>
                    <button onClick={() => setConfirmDel(false)} disabled={busy} className="ds-btn" style={{ height: 40, padding: "0 14px" }}>Annulla</button>
                    <button onClick={del} disabled={busy} className="ds-btn danger" style={{ height: 40, padding: "0 14px" }}>{busy ? "…" : "Elimina"}</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button onClick={() => setMode("edit")} className="ds-btn" style={{ flex: 1, height: 46 }}>✏️ Modifica</button>
                    <button onClick={() => setConfirmDel(true)} className="ds-btn danger" style={{ flex: 1, height: 46 }}>🗑 Elimina</button>
                  </div>
                )
              )}

              {/* Info & link (card) */}
              <div style={{ marginTop: 18, background: "rgba(255,255,255,.04)", border: "1px solid var(--k-line)", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase", color: "var(--k-text-3)", marginBottom: 10 }}>Trovato da Keiko ✨</div>
                {ev.enrichment?.summary && <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--k-text-2)", margin: "0 0 10px" }}>{ev.enrichment.summary}</p>}
                {(ev.enrichment?.links ?? []).map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className="ds-btn" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start", textDecoration: "none", height: 44 }}>🔗 {l.label}</a>
                ))}
                {!ev.enrichment && <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: 0 }}>Keiko cerca online sito, biglietti e come arrivare — compaiono qui alla creazione dell&apos;evento.</p>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
