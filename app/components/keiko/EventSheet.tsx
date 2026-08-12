"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventForm, toDatetime, splitDatetime, type EventFormValue } from "@/app/components/EventForm";
import { mapsUrl, type LiveEvent } from "./keikoLive";
import { Sheet, K2_FOGLIO } from "@/app/components/v2/Sheet";
import { SheetHero } from "@/app/components/v2/SheetHero";
import { I } from "@/app/components/v2/icons";

/* LA CARD DELL'EVENTO, sul sistema V2.
   - Azioni client-side (sempre): Aggiungi al calendario (.ics), Maps, Condividi.
   - Azioni con login (solo se !demo): Modifica (/api/update), Elimina (/api/delete).
   In anteprima pubblica (demo) le azioni con login sono nascoste: niente tasti
   morti.

   LA PRIMARIA STA IN ALTO ed è una sola: «Aggiungi al calendario». Le altre
   sono righe-azione, in ordine di quanto le useresti. Prima erano sei bottoni
   quasi uguali, ognuno con la sua emoji davanti. */

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

/* Condividi: dove esiste il foglio di sistema lo usa, altrimenti copia negli
   appunti. Ritorna "copiato" solo nel secondo caso, così il pannello può dirlo:
   prima la copia avveniva in silenzio e sembrava un bottone rotto. */
async function share(ev: LiveEvent): Promise<"condiviso" | "copiato" | null> {
  const text = `${ev.title} — ${ev.when}${ev.location ? ` · ${ev.location}` : ""}`;
  try {
    if (navigator.share) { await navigator.share({ title: ev.title, text }); return "condiviso"; }
    await navigator.clipboard.writeText(text);
    return "copiato";
  } catch { return null; /* annullato */ }
}

export default function EventSheet({ ev, onClose, demo = false, onDelete }: { ev: LiveEvent; onClose: () => void; demo?: boolean; onDelete?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [erroreSalva, setErroreSalva] = useState<string | null>(null);

  const doShare = async () => {
    const esito = await share(ev);
    if (esito === "copiato") { setToast("Copiato negli appunti"); setTimeout(() => setToast(null), 2000); }
  };

  const { date, time } = splitDatetime(ev.datetime);
  const [form, setForm] = useState<EventFormValue>({ title: ev.title, type: ev.type, date, time, location: ev.location, reference: "" });

  async function save() {
    setBusy(true); setErroreSalva(null);
    try {
      const res = await fetch("/api/update", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ id: ev.id, title: form.title, type: form.type, datetime: toDatetime(form), location: form.location, reference: form.reference }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); onClose();
    } catch {
      // `window.alert` è una finestra del browser: non sa niente di noi e
      // blocca tutto. L'errore si dice dentro il foglio, dove è successo.
      setErroreSalva("Non sono riuscito a salvare. Riprova.");
    } finally { setBusy(false); }
  }

  // L'eliminazione vera la gestisce la Home (differita 5s con "Annulla"):
  // qui chiudiamo il pannello e lasciamo che sia lei a cancellare (o annullare).
  function del() {
    onDelete?.();
    onClose();
  }

  const riga = (icona: React.ReactNode, titolo: string, meta: string, onClick: () => void) => (
    <div className="row-act tap" onClick={onClick} role="button">
      <span className="ic2">{icona}</span>
      <span className="in">
        <span className="t">{titolo}</span>
        <span className="m">{meta}</span>
      </span>
      {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
    </div>
  );

  return (
    <div className="k2" style={K2_FOGLIO}>
      <Sheet onClose={onClose}>
        {mode === "edit" ? (
          <>
            <div className="plain-head">
              <h2>Modifica evento</h2>
              <div className="status">Quello che cambi qui vale da subito</div>
            </div>
            <div className="pad">
              {/* I campi di `EventForm` sono già a 16px: sotto i 16 iOS
                  ingrandisce la pagina al primo tocco e non torna indietro. */}
              <EventForm value={form} onChange={setForm} onCancel={() => setMode("view")} onSave={save} saving={busy} saveLabel="Salva" intro="" />
              {erroreSalva && <p className="status">{erroreSalva}</p>}
            </div>
          </>
        ) : (
          <>
            {/* La testata a foto del sistema: metadato, titolo in Fraunces.
                Senza foto resta il fondo della testata, che è già scuro: il
                gradiente di categoria e l'emoji gigante dietro non tornano. */}
            <SheetHero
              img={ev.image ?? ""}
              /* Solo `catLabel`: la data ce l'ha già dentro («Concerto · dom
                 20»), e mettendoci accanto anche `when` la si leggeva due
                 volte nella stessa riga. Visto nel foglio vero, non dedotto. */
              k={ev.catLabel}
              h2={ev.title}
            />

            <div className="pad">
              {/* Il quando, per esteso: è il dato che si viene a cercare qui. */}
              <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em", marginTop: 14 }}>{ev.when}</div>
              {ev.location && <div className="status">{ev.location}</div>}
              {ev.weather && (
                <div className="status">{ev.weather.tempC}° · {ev.weather.text} ora sul posto</div>
              )}

              {/* LA PRIMARIA, una sola, in alto. */}
              <button className="cta wide tap" style={{ marginTop: 14 }} onClick={() => downloadIcs(ev)}>
                {I.cal({ s: 15 })}Aggiungi al calendario
              </button>

              {/* Le altre, righe-azione. */}
              <div className="srf" style={{ marginTop: 12 }}>
                {ev.location && riga(I.map({ s: 16 }), "Come ci arrivo", ev.location, () => window.open(mapsUrl(ev.mapsQ), "_blank", "noopener"))}
                {riga(I.copy({ s: 16 }), "Condividi", "Manda a qualcuno dove e quando", doShare)}
                {!demo && riga(I.pen({ s: 16 }), "Modifica", "Titolo, giorno, ora, luogo", () => setMode("edit"))}
                {!demo && (
                  <div className="row-act tap" onClick={del} role="button">
                    <span className="ic2" style={{ color: "#E57373" }}>{I.close({ s: 16 })}</span>
                    <span className="in">
                      <span className="t" style={{ color: "#E57373" }}>Elimina</span>
                      {/* Si annulla: e' il motivo per cui basta un tocco.
                          Vedi UI-DECISIONI-V2, 3-sexies. */}
                      <span className="m">Hai cinque secondi per annullare</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Quello che Keiko ha trovato online. Se non c'è, lo dice invece
                  di lasciare un riquadro vuoto. */}
              <div className="status" style={{ marginTop: 18, marginBottom: 8 }}>Trovato da Keiko</div>
              {ev.enrichment?.summary ? (
                <div className="srf" style={{ padding: 14 }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--txt2)", margin: 0 }}>{ev.enrichment.summary}</p>
                </div>
              ) : (
                <p className="status" style={{ marginTop: 0 }}>
                  Keiko cerca online sito, biglietti e come arrivare: compaiono qui alla
                  creazione dell&apos;evento.
                </p>
              )}
              {(ev.enrichment?.links ?? []).length > 0 && (
                <div className="srf" style={{ marginTop: 8 }}>
                  {(ev.enrichment?.links ?? []).map((l, i) => (
                    <div className="row-act tap" key={i} onClick={() => window.open(l.url, "_blank", "noopener")} role="button">
                      <span className="ic2">{I.up({ s: 16 })}</span>
                      <span className="in"><span className="t">{l.label}</span></span>
                      {I.chev({ c: "chev", st: { transform: "rotate(-90deg)" } })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Sheet>

      {/* conferma che il tocco ha fatto qualcosa (quando non c'è il foglio di
          sistema per condividere). `.toast` del sistema, con `pointer-events`
          suo: si guarda e basta. */}
      {toast && <div className="toast on" role="status" style={{ zIndex: 130 }}>{toast}</div>}
    </div>
  );
}
