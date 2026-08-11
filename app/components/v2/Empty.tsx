import type { ReactNode } from "react";

/* ═════════ A8 · stato vuoto: UNA forma sola ═════════
   Icona, titolo, riga di spiegazione, e al massimo un'azione. `soon` è la
   pillola tratteggiata «arriva presto», che non si può premere. */

export function Empty({
  icon,
  t,
  m,
  cta,
  onCta,
  soon,
}: {
  icon: ReactNode;
  t: string;
  /** ammette <br/>: nel mock è dangerouslySetInnerHTML */
  m: string;
  cta?: string;
  onCta?: () => void;
  soon?: string;
}) {
  return (
    <div className="srf empty">
      <span className="ic">{icon}</span>
      <div className="t">{t}</div>
      <div className="m" dangerouslySetInnerHTML={{ __html: m }} />
      {cta && (
        <div>
          <button className="cta tap" onClick={onCta}>
            {cta}
          </button>
        </div>
      )}
      {soon && (
        <span className="soon" aria-disabled="true">
          {soon}
        </span>
      )}
    </div>
  );
}

export default Empty;
