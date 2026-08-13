import type { ReactNode } from "react";

/* ═════════ L'ATTESA DI UNA SEZIONE ═════════
 *
 * I pezzi con cui si costruisce il `loading.tsx` di ogni rotta. Non è un
 * componente unico con dieci interruttori: ogni sezione ha una forma sua, e
 * comporla in tre righe è più chiaro che configurarla.
 *
 * La regola è una: **l'attesa deve avere la FORMA di quello che arriva.**
 * Uno scheletro che non somiglia alla pagina fa saltare il layout quando i
 * dati atterrano, ed è peggio di uno schermo fermo — la pagina «scatta» sotto
 * gli occhi proprio nel momento in cui inizi a leggerla.
 *
 * E non c'è nessun testo: uno scheletro non ha bisogno di dirsi. «Caricamento…»
 * è la didascalia di una cosa che si vede già.
 */

/** Il guscio: `.k2` e le spaziature della pagina vera. */
export function Attesa({ children }: { children: ReactNode }) {
  return (
    <div className="k2" aria-busy="true" aria-label="Sto aprendo">
      <div className="screen">{children}</div>
    </div>
  );
}

/** La testata: titolo grande e riga di stato. */
export function AttesaTesta({ conStatus = true }: { conStatus?: boolean }) {
  return (
    <div style={{ marginTop: 4 }}>
      <span className="sk sk-line" style={{ display: "block", width: "42%", height: 22 }} />
      {conStatus && <span className="sk sk-line" style={{ display: "block", width: "66%", height: 11, marginTop: 8 }} />}
    </div>
  );
}

/** Una riga di chip. */
export function AttesaChips({ n = 4 }: { n?: number }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      {Array.from({ length: n }).map((_, i) => (
        <span key={i} className="sk" style={{ height: 34, width: 62 + (i % 3) * 18, borderRadius: 999, flex: "none" }} />
      ))}
    </div>
  );
}

/** Una card larga con la foto a sinistra (`.wide` del sistema). */
export function AttesaWide() {
  return (
    <div className="srf" style={{ display: "flex", gap: 11, padding: 8, marginTop: 12 }}>
      <span className="sk" style={{ width: 84, height: 84, borderRadius: "var(--r-in)", flex: "none" }} />
      <span style={{ flex: 1, paddingTop: 6 }}>
        <span className="sk sk-line" style={{ display: "block", width: "36%", height: 10 }} />
        <span className="sk sk-line" style={{ display: "block", width: "72%", height: 15, marginTop: 8 }} />
        <span className="sk sk-line" style={{ display: "block", width: "50%", height: 10, marginTop: 8 }} />
      </span>
    </div>
  );
}

/** La griglia a due colonne delle card con foto (`.g2` + `.content`). */
export function AttesaGriglia({ n = 4, rapporto = "16 / 10" }: { n?: number; rapporto?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginTop: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div className="srf" key={i} style={{ padding: 7 }}>
          <span className="sk" style={{ display: "block", aspectRatio: rapporto, borderRadius: "var(--r-in)" }} />
          <span className="sk sk-line" style={{ display: "block", width: "84%", marginTop: 9 }} />
          <span className="sk sk-line" style={{ display: "block", width: "54%", height: 10, marginTop: 5 }} />
        </div>
      ))}
    </div>
  );
}

/** Un elenco di righe dentro una superficie (`.srf .list`). */
export function AttesaElenco({ n = 4 }: { n?: number }) {
  return (
    <div className="srf" style={{ marginTop: 12 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 12px", borderTop: i ? "1px solid var(--line)" : undefined }}>
          <span className="sk" style={{ width: 32, height: 32, borderRadius: "var(--r-in)", flex: "none" }} />
          <span style={{ flex: 1 }}>
            <span className="sk sk-line" style={{ display: "block", width: `${72 - i * 7}%` }} />
            <span className="sk sk-line" style={{ display: "block", width: "40%", height: 10, marginTop: 6 }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Il titolo di una sezione (`.sec`). */
export function AttesaSec() {
  return <span className="sk sk-line" style={{ display: "block", width: "30%", height: 14, margin: "24px 2px 4px" }} />;
}
