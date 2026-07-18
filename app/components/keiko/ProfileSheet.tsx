"use client";

/* Profilo (design v4): nome (per i saluti, salvato sul dispositivo) + logout.
   Il logout riusa la server action passata dalla pagina (come la Home vecchia). */

export default function ProfileSheet({
  name, onName, city, onCity, onClose, logoutAction,
}: {
  name: string;
  onName: (v: string) => void;
  city?: string;
  onCity?: (v: string) => void;
  onClose: () => void;
  logoutAction?: () => Promise<void>;
}) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 92, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" }}>
      <div
        className="ds"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, margin: "0 auto", background: "var(--k-bg)", borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: "1px solid rgba(255,255,255,.06)", padding: "12px 20px calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#3a2f22,#241d15)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 20 }}>🐋</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--k-text)", margin: 0 }}>Profilo</h2>
          <button onClick={onClose} aria-label="Chiudi" style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", background: "var(--k-surface)", border: "1px solid var(--k-line)", color: "var(--k-text-2)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "0 2px 6px" }}>Il tuo nome</label>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Il tuo nome"
          style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 15, fontFamily: "inherit", outline: 0 }}
        />
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Keiko lo usa per salutarti in home.</p>

        {onCity && (
          <>
            <label style={{ display: "block", fontSize: 12.5, color: "var(--k-text-3)", margin: "18px 2px 6px" }}>La tua città</label>
            <input
              value={city ?? ""}
              onChange={(e) => onCity(e.target.value)}
              placeholder="Es. Milano"
              style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 15, fontFamily: "inherit", outline: 0 }}
            />
            <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "8px 2px 0" }}>Per il meteo di oggi nella home.</p>
          </>
        )}

        {logoutAction && (
          <form action={logoutAction} style={{ marginTop: 26 }}>
            <button type="submit" className="ds-btn" style={{ width: "100%", height: 48 }}>Esci</button>
          </form>
        )}
      </div>
    </div>
  );
}
