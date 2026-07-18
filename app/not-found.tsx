import Link from "next/link";
import "./ds.css";

// Pagina 404 in-brand (nero caldo + ambra), non quella grigia di default.
export default function NotFound() {
  return (
    <div className="ds" style={{ minHeight: "100dvh", background: "var(--k-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <div style={{ fontSize: 56, marginBottom: 8 }}>🐋</div>
      <span className="ds-display" style={{ fontSize: 26, color: "var(--k-text)" }}>
        kei<span style={{ color: "var(--k-accent)" }}>ko</span>
      </span>
      <p style={{ fontSize: 16, color: "var(--k-text)", fontWeight: 600, margin: "18px 0 4px" }}>Questa pagina non esiste</p>
      <p style={{ fontSize: 13.5, color: "var(--k-text-3)", margin: "0 0 22px", maxWidth: 300 }}>Forse il link è vecchio o hai sbagliato indirizzo. Nessun problema.</p>
      <Link href="/" className="ds-btn primary" style={{ height: 48, padding: "0 22px", textDecoration: "none" }}>Torna alla home</Link>
    </div>
  );
}
