"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./ds.css";

// Schermata d'errore in-brand: mai la pagina grigia di default.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="ds" style={{ minHeight: "100dvh", background: "var(--k-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 52, marginBottom: 10 }}>🐋</div>
      <p style={{ fontSize: 17, color: "var(--k-text)", fontWeight: 600, margin: "0 0 4px" }}>Qualcosa è andato storto</p>
      <p style={{ fontSize: 13.5, color: "var(--k-text-3)", margin: "0 0 22px", maxWidth: 300 }}>Un intoppo temporaneo. Riprova, di solito basta.</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={reset} className="ds-btn primary" style={{ height: 48, padding: "0 22px" }}>Riprova</button>
        <Link href="/" className="ds-btn" style={{ height: 48, padding: "0 20px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Home</Link>
      </div>
    </div>
  );
}
