"use client";

import { createContext, useContext, useRef, useState } from "react";
import "../../keiko.css";
import KeikoNav, { PAGE_PB } from "./KeikoNav";

/* "viaggio" non e' un tab con icona sua: e' una sotto-pagina della Home,
   quindi accende "Home" invece di lasciare la barra tutta spenta. */
type Tab = "home" | "dieta" | "sport" | "guarda" | "viaggio";

/* ------------------------------------------------------------------ *
 * SHELL CONDIVISO delle pagine interne Keiko (v2.3). Fornito dal
 * coordinatore: le pagine (/salute, /allenamento, /guarda, /viaggio)
 * avvolgono il loro corpo qui dentro e NON gestiscono tema/chrome.
 *  - .keiko + mood (scuro/chiaro): da ?mood=chiaro|scuro, poi localStorage
 *    'keiko-mood', default scuro. (Il test dei due mood usa ?mood.)
 *  - .view con viewHead (back + titolo + badge) e viewBody (children).
 *  - toast condiviso via useKeikoToast().
 * ------------------------------------------------------------------ */

const ToastCtx = createContext<(msg: string, action?: string, onAction?: () => void) => void>(() => {});
export function useKeikoToast() { return useContext(ToastCtx); }

export default function KeikoShell({
  title, badge, backHref = "/", active, children,
}: {
  title: string;
  badge?: React.ReactNode;   // testo, oppure un comando (es. il link al Ricettario)
  backHref?: string;
  active?: Tab;
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<{ msg: string; action?: string; onAction?: () => void } | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (msg: string, action?: string, onAction?: () => void) => {
    setToast({ msg, action, onAction });
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), action ? 4200 : 1900);
  };

  return (
    <ToastCtx.Provider value={showToast}>
      <div className="keiko">
        <div className="view open">
          <div className="viewHead">
            <a className="back" href={backHref} aria-label="Indietro">‹</a>
            <h2>{title}</h2>
            {badge && <span className="vs">{badge}</span>}
          </div>
          <div className="viewBody" style={{ paddingBottom: PAGE_PB }}>{children}</div>
          <div className={`toast${toast ? " show" : ""}`}>
            <span>{toast?.msg}</span>
            {toast?.action && (
              <button className="tact" onClick={() => { toast.onAction?.(); setToast(null); }}>{toast.action}</button>
            )}
          </div>
        </div>
        <div className="ds"><KeikoNav active={active} /></div>
      </div>
    </ToastCtx.Provider>
  );
}
