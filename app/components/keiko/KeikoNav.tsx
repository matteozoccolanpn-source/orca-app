"use client";

import { useRouter } from "next/navigation";

/* Barra di navigazione in basso, condivisa tra le pagine (design v4).
   `active` evidenzia il tab corrente. `onAdd` (opzionale) per il "+":
   se non passato, va alla pagina /add. */

/* Altezza UTILE della barra: lo spazio in cui vivono icone ed etichette.
   Non è l'altezza totale — sotto ci va anche la safe-area. */
export const NAV_H = 84;

/* L'altezza totale della barra. La safe-area si SOMMA a NAV_H, non ci sta
   dentro: era questo il bug delle card tagliate in fondo alla home.
   Con `height: 84px` fisso e `padding-bottom: 18px + safe-area`, su un iPhone
   con l'home-indicator (34px) allo spazio utile restavano 84-18-34 = 32px —
   e le icone sono alte 44, il tasto "+" 56. Non ci stavano: traboccavano
   SOPRA la barra, sopra il suo sfondo, addosso all'ultima card della pagina.
   Su desktop (safe-area = 0) lo spazio era 66px e non si vedeva niente, che è
   il motivo per cui il difetto si notava solo dal telefono. */
export const NAV_TOTALE = `calc(${NAV_H}px + env(safe-area-inset-bottom))`;

/* Spazio da riservare in fondo alle pagine perché l'ultimo elemento non finisca
   sotto la barra. Tre pezzi, tutti misurati e non tirati a caso:
     84px  la barra
     +24   quanto il tasto "+" sporge sopra la barra (ha margin-top -24)
     +20   aria di respiro, così l'ultima card non tocca il bordo
     + la safe-area, che è sotto la barra e va comunque scavalcata.
   Unico valore per tutta l'app: KeikoShell, KeikoHomeV4, GuardaView, CucinaView. */
export const PAGE_PB = `calc(${NAV_H + 24 + 20}px + env(safe-area-inset-bottom))`;

/* "viaggio" non ha un'icona sua in barra (il viaggio si apre dalle card della
   Home): è una sotto-pagina della Home, quindi accende "Home" invece di
   lasciare la barra tutta spenta. */
type Tab = "home" | "cucina" | "dieta" | "sport" | "guarda" | "viaggio";

export default function KeikoNav({ active, onAdd, demo = false }: { active?: Tab; onAdd?: () => void; demo?: boolean }) {
  const router = useRouter();
  // In anteprima pubblica (demo, es. /ds-preview) la barra è solo vetrina: i tap
  // restano inerti come nella Home v4, niente redirect al login.
  const go = (href: string) => { if (!demo) router.push(href); };
  const add = () => {
    if (demo) return;
    if (onAdd) onAdd();
    else router.push("/add");
  };
  /* La sfumatura arrivava a coprire solo al 45%: nella meta' alta il testo
     sotto (i titoli delle locandine della Guarda) traspariva a meta' e non si
     leggeva ne' spariva. Adesso chiude prima e c'e' una sfocatura sotto.
     Posizione e altezza della barra non cambiano: e' solo il fondo. */
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: NAV_TOTALE, background: "linear-gradient(180deg,rgba(10,11,14,0) 0%,rgba(10,11,14,.72) 18%,rgba(10,11,14,.94) 34%,rgba(10,11,14,.99) 48%)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 20px", paddingBottom: "calc(18px + env(safe-area-inset-bottom))", maxWidth: 440, margin: "0 auto", zIndex: 30 }}>
      <NavItem label="Home" active={active === "home" || active === "viaggio"} icon={<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>} onClick={() => go("/")} />
      {/* La Cucina non si raggiungeva dalla barra: ci si arrivava solo da un
          link dentro /salute. La voce e' sua, e la Dieta si apre dalla riga
          che sta dentro la Cucina, nella sezione del piano.
          Il disegno e' quello di `I.pot` del set V2, ricopiato qui invece che
          chiamato: NavItem prende i tracciati e li mette nel suo <svg>, che e'
          22px con tratto 2 come tutte le altre voci. Chiamare I.pot avrebbe
          portato dentro il suo tratto 1.8, e una sola icona piu' sottile
          delle altre quattro si vede. */}
      <NavItem label="Cucina" active={active === "cucina"} icon={<path d="M7 3v7c0 1.5 1 2 2.5 2S12 12 12 10.5V3M9.5 3v18M17 3c-2 1.5-2.5 5-2.5 8 0 0 1 .8 2.5.8V21" />} onClick={() => go("/cucina")} />
      <button onClick={add} aria-label="Aggiungi" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--k-accent)", color: "var(--k-accent-ink)", border: 0, display: "grid", placeItems: "center", fontSize: 30, lineHeight: 1, paddingBottom: 2, boxShadow: "0 8px 20px rgba(255,184,77,.28), 0 2px 6px rgba(0,0,0,.4)", marginTop: -24, cursor: "pointer" }}>+</button>
      <NavItem label="Allenamento" active={active === "sport"} icon={<><path d="M6 12h12M4 9v6M20 9v6M8 8v8M16 8v8" /></>} onClick={() => go("/allenamento")} />
      <NavItem label="Guarda" active={active === "guarda"} icon={<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" /></>} onClick={() => go("/guarda")} />
    </nav>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, minWidth: 44, minHeight: 44, padding: "0 4px", whiteSpace: "nowrap", background: "none", border: 0, color: active ? "var(--k-text)" : "#9BA0A8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
      {label}
    </button>
  );
}
