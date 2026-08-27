"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import KeikoNav, { PAGE_PB } from "@/app/components/keiko/KeikoNav";
import type { TripGroup } from "@/lib/trip-docs";

/* VIAGGI — l'elenco (nav, punto 1 del 27 agosto 2026).
 *
 * Prima d'ora si arrivava dritti dentro un viaggio: `page.tsx` sceglieva da
 * solo quello col giorno più vicino a oggi, senza che nessuno lo scegliesse.
 * Con un solo viaggio funzionava; con due o più, sceglieva lui e la scelta
 * non si vedeva da nessuna parte. Adesso c'è un elenco vero — oggi una carta
 * sola ("Cina"), ma il tocco per aprirla c'è, ed è lo stesso schermo quando
 * i viaggi diventeranno due. */

function fmtGiorno(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
  } catch {
    return iso;
  }
}

export default function TripListView({ gruppi }: { gruppi: TripGroup[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function caricaFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCaricando(true);
    setErrore(null);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const res = await fetch("/api/trip/docs/upload", { method: "POST", body: fd, credentials: "include" });
      const data = (await res.json().catch(() => null)) as { risultati?: { status: string; tripKey?: string; error?: string }[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const primoOk = (data?.risultati ?? []).find((r) => r.status === "ok" && r.tripKey);
      if (primoOk?.tripKey) {
        router.push(`/viaggio/documenti/${encodeURIComponent(primoOk.tripKey)}`);
      } else {
        const primoErr = (data?.risultati ?? []).find((r) => r.error)?.error;
        setErrore(primoErr ?? "Non sono riuscito a leggerlo");
      }
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "errore sconosciuto");
    } finally {
      setCaricando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="k2">
      <div className="screen tripdoc" style={{ paddingBottom: PAGE_PB }}>
        <div className="head" style={{ padding: "6px 2px 14px" }}>
          <div className="col">
            <h1>Viaggi</h1>
            <div className="status">
              {gruppi.length > 0 ? `${gruppi.length} viaggi${gruppi.length === 1 ? "o" : ""}` : "il primo documento che carichi lo crea"}
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,image/*"
          style={{ display: "none" }}
          onChange={(e) => caricaFile(e.target.files)}
        />

        {caricando ? (
          <div className="upstep">
            <span className="dotpulse" />
            Leggo il documento…
          </div>
        ) : (
          <button className="updrop tap" onClick={() => fileRef.current?.click()}>
            <b>Carica un documento</b> — PDF, foto o Word
          </button>
        )}

        {errore && <div className="attach err" style={{ marginTop: 8 }}>✗ {errore}</div>}

        {gruppi.length > 0 && (
          <div className="stack" style={{ marginTop: 16 }}>
            {gruppi.map((g) => (
              <button
                key={g.tripKey}
                className="doc tap"
                onClick={() => router.push(`/viaggio/documenti/${encodeURIComponent(g.tripKey)}`)}
              >
                <span className="ic">🧳</span>
                <span className="col">
                  <span className="nm">{g.destination || "Viaggio"}</span>
                  <span className="rd">{g.minDay ? `${fmtGiorno(g.minDay)} – ${fmtGiorno(g.maxDay)}` : "date non ancora note"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <KeikoNav active="viaggio" />
    </div>
  );
}
