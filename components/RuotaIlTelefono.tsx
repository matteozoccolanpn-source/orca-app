// La scialuppa per la rotazione.
//
// Su Android basta `orientation: "portrait"` nel manifesto. Su iPhone no: il
// manifesto non viene letto e `screen.orientation.lock()` non esiste, quindi da
// web la rotazione non si blocca. L'unica cosa che si può fare è coprire lo
// schermo e chiedere di rimettere il telefono dritto.
//
// Non c'è nessun JavaScript: chi decide se si vede è solo il CSS, in
// app/globals.css (`.keiko-ruota`, che si accende in orizzontale sotto i 520px
// di altezza). Così si accende sui telefoni girati e resta spento su iPad e
// computer, dove la finestra è alta comunque.
//
// `className="ds"` serve a far risolvere le variabili di colore del design
// system: nessun colore nuovo, l'accento è quello di sempre.

export default function RuotaIlTelefono() {
  return (
    <div className="ds keiko-ruota" aria-hidden="true">
      <div style={{ fontSize: 44, marginBottom: 14 }}>🐋</div>
      <p className="ds-display" style={{ fontSize: 21, color: "var(--k-text)", margin: 0 }}>
        Keiko si usa in verticale
      </p>
    </div>
  );
}
