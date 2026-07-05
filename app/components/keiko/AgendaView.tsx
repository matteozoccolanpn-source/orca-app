"use client";

/* ------------------------------------------------------------------ *
 * AgendaView — vista #agendaView del mockup (docs/mockups/keiko-final.html
 * righe 1189-1206). Componente presentazionale prop-driven.
 *
 * SCELTA DICHIARATA: questo componente include l'INTERO `.view#agendaView`
 * (viewHead con back + h2 "In arrivo" + badge, poi viewBody con i gruppi).
 * Motivo: il contratto props espone `onBack()` → il tasto back è mio; il
 * markup resta 1:1 col mockup e il coordinatore ha un blocco drop-in.
 * La visibilità è pilotata da `open` (aggiunge `.open` a `.view`, che toglie
 * il translateX(102%)). Default open=true.
 *
 * Testi fissi copiati dal mockup: h2 "In arrivo", badge "{n} EVENTI".
 * Nessun colore aggiunto: le classi .keiko gestiscono i due mood.
 * ------------------------------------------------------------------ */

// Icona categoria (.ci) — SVG, MAI emoji. Copiate 1:1 dal mockup (EVICONS,
// riga 1539) e dalle .cat2/.catL. 5 chiavi: treno/cena/gp/volo/concerto.
function CatIcon({ k }: { k: string }) {
  const p: Record<string, React.ReactNode> = {
    treno: (<><rect x="6" y="3" width="12" height="12" rx="3" /><path d="M6 9h12M9 15l-2 5M15 15l2 5M9.5 12h.01M14.5 12h.01" /></>),
    cena: (<path d="M7 3v6a2 2 0 0 0 2 2v10M11 3v6a2 2 0 0 1-2 2M17 3c-1.8 1.6-2.5 4.2-2.5 6.5 0 1.8.9 2.5 2.5 2.5v9" />),
    gp: (<path d="M5.5 21V4c3.6-1.8 7.4 1.8 11 0v10.5c-3.6 1.8-7.4-1.8-11 0" strokeLinejoin="round" />),
    volo: (<path d="M21 12 3.5 5l2.7 6.3L3.5 19 21 12Z" strokeLinejoin="round" />),
    concerto: (<><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>),
  };
  return (
    <svg className="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {p[k] ?? p.treno}
    </svg>
  );
}

export type AgendaEvent = {
  id: string;
  iconKey: string; // treno | cena | gp | volo | concerto (per CatIcon)
  art: string;     // classe art già pronta: train | dinner | flightA | concertA | sportA | hotel
  when: string;    // es. "18:05" · "dom · 16:00" · "ven 11 · 6:00"
  catLabel: string; // es. "Treno" · "Formula 1 · Sky"
  title: string;
  info?: string;
};

export type AgendaGroup = {
  label: string;          // fascia: "Oggi" · "Questo weekend" · "Prossima settimana" …
  events: AgendaEvent[];
};

export interface AgendaViewProps {
  groups: AgendaGroup[];
  onOpenEvent: (id: string) => void;
  onBack: () => void;
  open?: boolean; // default true — controlla lo scorrimento .view.open
}

export default function AgendaView({ groups, onOpenEvent, onBack, open = true }: AgendaViewProps) {
  const total = groups.reduce((n, g) => n + g.events.length, 0);
  return (
    <div className={`view${open ? " open" : ""}`} id="agendaView">
      <div className="viewHead">
        <button className="back" onClick={onBack}>‹</button>
        <h2>In arrivo</h2>
        <span className="vs">{total} EVENTI</span>
      </div>
      <div className="viewBody">
        {groups.map((g, gi) => (
          <div key={`${g.label}-${gi}`} style={{ display: "contents" }}>
            <div className="agLbl">{g.label}</div>
            {g.events.map((e) => (
              <div key={e.id} className="agRow" onClick={() => onOpenEvent(e.id)}>
                <div className={`art ${e.art}`} style={{ position: "absolute", inset: 0 }} />
                <div className="pshade" />
                <span className="when">{e.when}</span>
                <span className="cat2"><CatIcon k={e.iconKey} />{e.catLabel}</span>
                <span className="t">{e.title}</span>
                {e.info && <span className="info">{e.info}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
