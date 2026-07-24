// Schermata di caricamento della home (e delle sezioni).
// Next.js la mostra AUTOMATICAMENTE mentre il componente server aspetta i dati
// (7 query Supabase + foto/meteo). Prima non esisteva → pagina bianca all'avvio.
// È volutamente leggerissima e senza dipendenze: colori fissi (non aspetta il CSS)
// così compare nel primo frame, anche a PWA appena aperta.
export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0C0E13",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
    >
      <style>{`@keyframes keikoPulse{0%,100%{opacity:.25;transform:scale(.85)}50%{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <span
          className="ds-display"
          style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: "#ECE9E3" }}
        >
          kei<span style={{ color: "#FFB84D" }}>ko</span>
        </span>
        <div style={{ display: "flex", gap: 7 }} aria-label="Caricamento">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FFB84D",
                animation: "keikoPulse 1.1s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
