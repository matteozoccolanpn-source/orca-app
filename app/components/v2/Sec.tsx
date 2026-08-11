import type { ReactNode } from "react";

/* ═════════ A1 · titolo di sezione: UNA lingua sola ═════════
   `sm` è la riga di stato a destra del titolo; `more` è il tasto in coda,
   e A6 ammette due sole etichette: «vedi tutti» e «gestisci». */

export function Sec({
  children,
  sm,
  more,
  onMore,
}: {
  children: ReactNode;
  sm?: ReactNode;
  more?: string;
  onMore?: () => void;
}) {
  return (
    <div className="sec">
      {children}
      {sm && <span className="sm">{sm}</span>}
      {more && (
        <span className="more tap" onClick={onMore}>
          {more}
        </span>
      )}
    </div>
  );
}

export default Sec;
