import type { CSSProperties, ReactElement, ReactNode } from "react";

/* ═════════ icone · set unico ═════════
   Portate 1:1 da docs/mockups/keiko-v2-mock.html (const I).
   Tratto 1.8 di serie, size come prop. Nessuna icona nuova senza motivo scritto. */

export type IconProps = {
  /** misura in px (quadrata). 16 se non passata. */
  s?: number;
  /** classe sull'<svg> (nel mock serve solo per `chev`) */
  c?: string;
  /** stile in linea sull'<svg> (rotazioni del chevron) */
  st?: CSSProperties;
};

export type Icon = (p?: IconProps) => ReactElement;

/* Non è un componente React: è una funzione che disegna, chiamata come
   `I.chev({ s: 14 })` e non come `<I.chev />`. Ha un nome apposta, altrimenti
   la regola react/display-name la scambia per un componente anonimo. */
function S(d: ReactNode, w?: number): Icon {
  return function disegna(p) {
    return (
      <svg
        className={p?.c}
        width={p?.s || 16}
        height={p?.s || 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={w || 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={p?.st}
      >
        {d}
      </svg>
    );
  };
}

/** la spunta che si disegna: colore e misura espliciti, non è una `Icon` */
const drawck = (c?: string | null, w?: number): ReactElement => (
  <svg
    width={w || 12}
    height={w || 12}
    viewBox="0 0 24 24"
    fill="none"
    stroke={c || "#08191E"}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12l5 5L20 7" />
  </svg>
);

/** l'orca: pieno, non tratteggiato, e prende la misura come numero */
const orca = (s?: number): ReactElement => (
  <svg width={s || 44} height={s || 44} viewBox="0 0 32 32" fill="currentColor">
    <path d="M27 15c-1.7-4.3-5.7-6.8-10.8-6.8-4.5 0-8.3 2.1-9.9 5.4-.6 1.2-.8 2.5-.6 3.7-1.6.4-2.6 1.2-3 2.4 1.1.2 2.2.1 3.3-.2 1.5 2.9 5 4.8 9.4 4.8 3.2 0 6-1 8-2.6.9.9 2.1 1.4 3.5 1.5-.3-1.3-.9-2.4-1.8-3.2.9-1.1 1.5-2.4 1.9-3.8.2-.4.2-.8 0-1.2z" />
  </svg>
);

export const I = {
  chev: S(<path d="M6 9l6 6 6-6" />, 2),
  right: S(<path d="M9 6l6 6-6 6" />, 2),
  back: S(<path d="M15 18l-6-6 6-6" />, 2),
  close: S(<path d="M6 6l12 12M18 6L6 18" />, 2),
  plus: S(<path d="M12 5v14M5 12h14" />, 2),
  info: S(
    <g>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </g>,
    2,
  ),
  hist: S(
    <g>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" />
      <path d="M3 3v5h5" />
    </g>,
    2,
  ),
  swap: S(<path d="M7 16l-4-4 4-4M3 12h18M17 8l4 4-4 4" />),
  up: S(<path d="M12 16V4M7 9l5-5 5 5M4 20h16" />),
  pen: S(<path d="M17 3a2.8 2.8 0 114 4L7.5 20.5 2 22l1.5-5.5z" />),
  doc: S(
    <g>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6" />
      <path d="M9 13h6M9 17h6" />
    </g>,
  ),
  dumb: S(<path d="M6 12h12M4 9v6M20 9v6" />),
  pot: S(
    <path d="M7 3v7c0 1.5 1 2 2.5 2S12 12 12 10.5V3M9.5 3v18M17 3c-2 1.5-2.5 5-2.5 8 0 0 1 .8 2.5.8V21" />,
  ),
  tv: S(
    <g>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9l5 3-5 3z" />
    </g>,
  ),
  home: S(<path d="M3 11l9-8 9 8M5 10v10h14V10" />),
  cal: S(
    <g>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </g>,
  ),
  plane: S(<path d="M2 13l20-7-7 20-3-8z" />),
  bed: S(<path d="M3 18v-8h18v8M3 14h18M3 18v2M21 18v2M7 10V7h5v3" />),
  ticket: S(
    <g>
      <path d="M4 8a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2a2 2 0 000-4z" />
      <path d="M14 6v12" />
    </g>,
  ),
  train: S(
    <g>
      <rect x="5" y="4" width="14" height="12" rx="3" />
      <path d="M5 11h14M8 20l2-3M16 20l-2-3" />
    </g>,
  ),
  sun: S(
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </g>,
  ),
  card: S(
    <g>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </g>,
  ),
  walk: S(
    <g>
      <circle cx="13" cy="4" r="2" />
      <path d="M11 21l2-6-3-3 1-5 3 3 3 1M10 12l-3 9" />
    </g>,
  ),
  map: S(
    <g>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </g>,
  ),
  copy: S(
    <g>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </g>,
  ),
  search: S(
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </g>,
  ),
  film: S(
    <g>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 12h18" />
    </g>,
  ),
  mic: S(
    <g>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" />
    </g>,
  ),
  star: S(<path d="M12 4l2.3 5 5.7.6-4.3 3.8 1.3 5.6L12 16l-5 3 1.3-5.6L4 9.6 9.7 9z" />),
  play: S(<path d="M6 4l14 8-14 8z" />),
  cart: S(
    <g>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h3l2.6 12h11L21 7H6" />
    </g>,
  ),
  flame: S(<path d="M12 3s5 4.5 5 9a5 5 0 01-10 0c0-2 1-3 1-3s0 2 1.5 2S12 6 12 3z" />),
  bolt: S(<path d="M13 3L5 14h6l-1 7 8-11h-6z" />),
  up2: S(<path d="M12 19V6M6 12l6-6 6 6" />, 2.4),
  dn2: S(<path d="M12 5v13M6 12l6 6 6-6" />, 2.4),
  tick: S(<path d="M20 6L9 17l-5-5" />, 2),
  drawck,
  thumbUp: S(<path d="M7 21V10l5-7 1 1-1 5h6a2 2 0 012 2.4l-1.6 7A2 2 0 0116 20H7z" />),
  thumbDn: S(<path d="M17 3v11l-5 7-1-1 1-5H6a2 2 0 01-2-2.4l1.6-7A2 2 0 017.6 4H17z" />),
  orca,
};
