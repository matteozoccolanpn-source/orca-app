import { I } from "./icons";

/* ═════════ D1 · la barra che diventa pannello ═════════
   Questa è la barra ferma. Non è un campo di testo: è un tasto grande che
   apre il pannello (AskPanel). Il testo dentro è il suggerimento della
   sezione, e quando si preme è anche la domanda che parte. */

export function Ask({
  placeholder,
  onAsk,
}: {
  placeholder?: string;
  onAsk: (q: string) => void;
}) {
  const ph = placeholder || "Chiedi o cambia qualcosa…";
  return (
    <div className="ask tap" onClick={() => onAsk(ph)}>
      <span style={{ color: "var(--teal)", flex: "none", display: "flex" }}>
        {I.orca(19)}
      </span>
      <span className="ph-txt">{ph}</span>
      <span className="go">{I.right({ s: 14 })}</span>
    </div>
  );
}

export default Ask;
