"use client";

import { useRef, useState } from "react";
import KeikoShell, { useKeikoToast } from "@/app/components/keiko/KeikoShell";
import type { WatchItem } from "@/lib/supabase";

/* Sezione "Da guardare" — vista #watchView del mockup keiko-final (v2.3).
 * Cablaggi reali preservati: toggle "visto" (PATCH), elimina con Annulla (DELETE
 * differito), aggiunta libera (POST /api/watch), consiglio AI (/api/watch/suggest).
 * Nessun campo poster nel data layer: le cover sono i gradienti del mockup
 * (dune/opp/bear) con titolo in overlay. Niente dati finti: ciò che manca (età,
 * orari) si compatta. */

type Toast = (msg: string, action?: string, onAction?: () => void) => void;
type Pick = { title: string; kind: "film" | "serie"; platform: string | null; info: string | null; link: string | null };

const COVERS = ["dune", "opp", "bear"] as const;
const coverOf = (i: number) => COVERS[i % COVERS.length];
const kindLabel = (k: string) => (k === "serie" ? "Serie" : "Film");

function insertAt<T>(arr: T[], item: T, index: number): T[] {
  const i = Math.max(0, Math.min(index, arr.length));
  return [...arr.slice(0, i), item, ...arr.slice(i)];
}

export default function GuardaView({ items }: { items: WatchItem[] }) {
  const [list, setList] = useState<WatchItem[]>(items);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const busy = useRef(false);

  const count = list.length;
  const badge = `${count} ${count === 1 ? "TITOLO" : "TITOLI"}`;

  /* "visto" — PATCH ottimistico. */
  async function toggleSeen(item: WatchItem, toast: Toast) {
    const next = !item.seen;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: next } : i)));
    toast(next ? "Visto ✓ Com'era?" : "Ok, resta in lista");
    try {
      const res = await fetch("/api/watch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, seen: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: item.seen } : i)));
      toast("Qualcosa non torna, riprovo");
    }
  }

  /* "elimina" — rimozione ottimistica, DELETE differito, con Annulla nel toast. */
  function elimina(item: WatchItem, index: number, toast: Toast) {
    setList((l) => l.filter((i) => i.id !== item.id));
    const commit = () => {
      delete timers.current[item.id];
      fetch("/api/watch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id }),
      })
        .then((r) => {
          if (!r.ok) throw new Error();
        })
        .catch(() => setList((l) => insertAt(l, item, index)));
    };
    timers.current[item.id] = setTimeout(commit, 3800);
    toast("Eliminato 🗑️", "Annulla", () => {
      clearTimeout(timers.current[item.id]);
      delete timers.current[item.id];
      setList((l) => insertAt(l, item, index));
    });
  }

  /* "Dove vederlo" — apre la scheda se c'è, altrimenti mostra l'info reale. */
  function dove(item: WatchItem, toast: Toast) {
    if (item.link) window.open(item.link, "_blank", "noopener");
    else toast(item.info ? item.info : "Non ho ancora la scheda, la cerco 🔎");
  }

  /* "aggiunta libera" — POST /api/watch con un titolo scritto come viene. */
  async function aggiungiTitolo(toast: Toast) {
    const raw = window.prompt("Aggiungi un titolo — anche solo «quel film di Nolan»");
    const title = (raw ?? "").trim();
    if (!title) return;
    const kind = /\b(serie|stagione|s\d)/i.test(title) ? "serie" : "film";
    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, kind, info: null, link: null }),
      });
      const data = (await res.json()) as { item?: WatchItem };
      if (!res.ok || !data.item) throw new Error();
      setList((l) => [data.item!, ...l]);
      toast("Preso in carico ✓");
    } catch {
      toast("Qualcosa non torna, riprovo");
    }
  }

  /* "consiglio AI" — /api/watch/suggest: una proposta, offerta con "Aggiungi". */
  async function consiglio(toast: Toast) {
    if (busy.current) return;
    const raw = window.prompt("Che serata è? es. «commedia leggera», «thriller»");
    if (raw === null) return;
    const query = raw.trim() || "consigliami qualcosa da vedere stasera";
    busy.current = true;
    toast("Ci penso io ✨");
    try {
      const res = await fetch("/api/watch/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });
      const data = (await res.json()) as { films?: Pick[] };
      if (!res.ok) throw new Error();
      const p = (data.films ?? [])[0];
      if (!p) {
        toast("Non ho trovato niente di convincente, riformula");
        return;
      }
      toast(`Stasera ti direi ${p.title} ✨`, "Aggiungi", () => salvaPick(p, toast));
    } catch {
      toast("Qualcosa non torna, riprovo");
    } finally {
      busy.current = false;
    }
  }

  async function salvaPick(p: Pick, toast: Toast) {
    const info = [p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ");
    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: p.title, kind: p.kind, info: info || null, link: p.link }),
      });
      const data = (await res.json()) as { item?: WatchItem };
      if (!res.ok || !data.item) throw new Error();
      setList((l) => [data.item!, ...l]);
      toast("Preso in carico ✓");
    } catch {
      toast("Qualcosa non torna, riprovo");
    }
  }

  return (
    <KeikoShell title="Da guardare" badge={badge} backHref="/?v2">
      <Body
        list={list}
        onToggleSeen={toggleSeen}
        onDelete={elimina}
        onWhere={dove}
        onAdd={aggiungiTitolo}
        onSuggest={consiglio}
      />
    </KeikoShell>
  );
}

/* Corpo sotto il provider del toast (useKeikoToast vive qui). */
function Body({
  list,
  onToggleSeen,
  onDelete,
  onWhere,
  onAdd,
  onSuggest,
}: {
  list: WatchItem[];
  onToggleSeen: (item: WatchItem, toast: Toast) => void;
  onDelete: (item: WatchItem, index: number, toast: Toast) => void;
  onWhere: (item: WatchItem, toast: Toast) => void;
  onAdd: (toast: Toast) => void;
  onSuggest: (toast: Toast) => void;
}) {
  const toast = useKeikoToast();
  const hero = list.find((i) => !i.seen) ?? null;
  const grid = hero ? list.filter((i) => i.id !== hero.id) : list;

  return (
    <>
      {hero && (
        <div
          className="wHero"
          onClick={() => onWhere(hero, toast)}
          role="button"
          tabIndex={0}
        >
          <div className={`cover ${coverOf(list.indexOf(hero))}`} style={HERO_COVER}>
            <span className="ttl" style={CLAMP2}>{hero.title}</span>
          </div>
          <div className="wt">
            <span className="k3">Stasera per te</span>
            <b>{hero.title}</b>
            <small style={CLAMP2}>{hero.info ?? kindLabel(hero.kind)}</small>
            <div className="wa">
              <button
                className="chipA dk"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSeen(hero, toast);
                }}
              >
                {"✓"} Visto
              </button>
              <button
                className="chipA dk"
                onClick={(e) => {
                  e.stopPropagation();
                  onWhere(hero, toast);
                }}
              >
                {"▶"} Dove vederlo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="agLbl">La lista</div>
      <div className="pGrid">
        {grid.map((item) => (
          <div
            key={item.id}
            className={`film${item.seen ? " seen" : ""}`}
            onClick={() => onToggleSeen(item, toast)}
            role="button"
            tabIndex={0}
            style={{ minWidth: 0 }}
          >
            <div className={`cover ${coverOf(list.indexOf(item))}`}>
              <span className="ttl" style={CLAMP3}>{item.title}</span>
            </div>
            <div className="seenMark">{"✅"}</div>
            <button
              type="button"
              aria-label={`Elimina ${item.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item, list.indexOf(item), toast);
              }}
              style={DEL_BTN}
            >
              {"✕"}
            </button>
            <div className="plat" style={PLAT_ELLIPSIS}>
              <b>{kindLabel(item.kind)}</b>
              {item.info ? ` · ${item.info}` : ""}
            </div>
          </div>
        ))}

        <div className="addFilm" onClick={() => onAdd(toast)} role="button" tabIndex={0}>
          <b>{"＋"}</b>
          Aggiungi un titolo
          <br />
          anche solo &laquo;quel film di Nolan&raquo;
        </div>
        <div className="addFilm" onClick={() => onSuggest(toast)} role="button" tabIndex={0}>
          <b>{"✨"}</b>
          Consiglio di Keiko
          <br />
          in base alla tua serata
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <span className="tbc">notifiche uscite &middot; presto</span>
      </div>
    </>
  );
}

/* Il mockup non dà a `.wHero .cover` i tratti strutturali che ha `.film .cover`
 * (position/overflow/radius/flex/padding): senza, il "sole" del gradiente esce
 * e il titolo resta in alto. Li riapplico qui in attesa del fix in keiko.css. */
const HERO_COVER: React.CSSProperties = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--shadow)",
  display: "flex",
  flexDirection: "column",
  padding: 10,
};
const CLAMP2: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const CLAMP3: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};
const PLAT_ELLIPSIS: React.CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const DEL_BTN: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "rgba(6,12,24,.55)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 800,
  display: "grid",
  placeItems: "center",
  border: 0,
  cursor: "pointer",
  zIndex: 2,
  lineHeight: 1,
};
