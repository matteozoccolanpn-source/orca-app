"use client";

// Schermata mostrata mentre una pagina carica i dati.
// REGOLA: lo splash "keiko" compare SOLO alla vera apertura dell'app (avvio a
// freddo o ricarica). Quando ci si sposta TRA le pagine (Home/Dieta/Sport/Guarda)
// NON si rivede la scritta: solo uno sfondo scuro, così non lampeggia il bianco.
//
// Come distingue "apertura" da "navigazione": una variabile di modulo ricorda se
// lo splash è già stato mostrato in questa sessione.
//  - sul server (primo render, apertura) window non esiste -> splash
//  - sul client, dalla seconda volta in poi resta true -> solo fondo scuro.
let splashShownThisSession = false;

export default function Loading() {
  const isColdOpen = typeof window === "undefined" || !splashShownThisSession;
  if (typeof window !== "undefined") splashShownThisSession = true;

  // Navigazione tra pagine: nessuna scritta, solo fondo scuro (niente lampo bianco).
  if (!isColdOpen) {
    return <div aria-hidden style={{ position: "fixed", inset: 0, background: "#0C0E13", zIndex: 60 }} />;
  }

  // Apertura dell'app: splash Keiko.
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
