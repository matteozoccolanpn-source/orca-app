"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Recipe } from "@/lib/supabase";
import "../ds.css";

/* CUCINA V1 — cerca, guarda, salva (docs/SPEC-CUCINA.md).
 *
 * Quello che NON c'è, per scelta: calorie, macro, riferimenti al piano
 * alimentare. «Fit» è una parola che l'utente aggiunge alla ricerca, non un
 * giudizio di Keiko. Questa sezione non parla mai con la dieta.
 *
 * Il video non si incorpora e non si copia: si apre su TikTok/YouTube, così la
 * visualizzazione va a chi l'ha girato. */

type Risultato = {
  titolo: string;
  url: string;
  miniatura: string | null;
  autore: string | null;
  piattaforma: "tiktok" | "youtube" | "web";
  dominio: string;
};

const CHIP = ["Virale", "Fit", "Easy", "Veloce", "Veg"] as const;

const LOGO: Record<string, string> = { tiktok: "🎵", youtube: "▶", web: "🌐" };

export default function CucinaView({ ricette, ricercaAttiva }: { ricette: Recipe[]; ricercaAttiva: boolean }) {
  const router = useRouter();
  const [domanda, setDomanda] = useState("");
  const [scelte, setScelte] = useState<string[]>([]);
  const [risultati, setRisultati] = useState<Risultato[] | null>(null);
  const [cerco, setCerco] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [lista, setLista] = useState<Recipe[]>(ricette);
  const [salvate, setSalvate] = useState<Set<string>>(new Set(ricette.map((r) => r.url)));
  const [filtro, setFiltro] = useState("");

  const toast = (t: string) => {
    if (msgT.current) clearTimeout(msgT.current);
    setMsg(t);
    msgT.current = setTimeout(() => setMsg(null), 4000);
  };

  const ricettario = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return f ? lista.filter((r) => r.title.toLowerCase().includes(f)) : lista;
  }, [lista, filtro]);

  async function cerca() {
    const q = domanda.trim();
    if (!q) return;
    setCerco(true);
    setRisultati(null);
    try {
      const url = `/api/cucina/search?q=${encodeURIComponent(q)}&stile=${encodeURIComponent(scelte.map((s) => s.toLowerCase()).join(","))}`;
      const res = await fetch(url, { credentials: "include" });
      const d = await res.json();
      if (d?.senzaChiave) {
        setRisultati([]);
        toast("La ricerca arriva presto");
      } else {
        setRisultati((d?.risultati ?? []) as Risultato[]);
        if ((d?.risultati ?? []).length === 0) toast("Non ho trovato niente, prova con altre parole");
      }
    } catch {
      setRisultati([]);
      toast("Qualcosa non torna, riprova");
    } finally {
      setCerco(false);
    }
  }

  async function salva(r: Risultato) {
    setSalvate((s) => new Set(s).add(r.url));   // subito, senza aspettare il server
    try {
      const res = await fetch("/api/cucina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: r.titolo,
          url: r.url,
          thumbnail: r.miniatura,
          author: r.autore,
          platform: r.piattaforma,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error);
      setLista((l) => [d.ricetta as Recipe, ...l.filter((x) => x.url !== r.url)]);
      toast("Nel ricettario ✓");
    } catch {
      setSalvate((s) => { const n = new Set(s); n.delete(r.url); return n; });
      toast("Non salvata, riprova");
    }
  }

  /** Elimina con Annulla, come in Guarda: sparisce subito, torna se ci ripensi. */
  async function elimina(r: Recipe) {
    const prima = lista;
    setLista((l) => l.filter((x) => x.id !== r.id));
    setSalvate((s) => { const n = new Set(s); n.delete(r.url); return n; });
    let annullato = false;

    if (msgT.current) clearTimeout(msgT.current);
    setMsg(`__ANNULLA__${r.title}`);
    const t = setTimeout(async () => {
      setMsg(null);
      if (annullato) return;
      try {
        const res = await fetch(`/api/cucina?id=${encodeURIComponent(r.id)}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error();
        router.refresh();
      } catch {
        setLista(prima);
        toast("Non eliminata, riprova");
      }
    }, 4000);
    msgT.current = t;

    (window as unknown as { __annullaCucina?: () => void }).__annullaCucina = () => {
      annullato = true;
      clearTimeout(t);
      setMsg(null);
      setLista(prima);
      setSalvate((s) => new Set(s).add(r.url));
    };
  }

  const vuotoTotale = lista.length === 0 && risultati === null;

  return (
    <div className="ds" style={{ minHeight: "100dvh", background: "var(--k-bg)", color: "var(--k-text)", padding: "calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 92px)", maxWidth: 560, margin: "0 auto" }}>
      <h1 className="ds-display" style={{ fontSize: 24, margin: "0 0 4px" }}>Ricettario</h1>
      <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "0 0 18px" }}>
        Cerco la ricetta, tu cucini.
      </p>

      {/* la domanda */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={domanda}
          onChange={(e) => setDomanda(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") cerca(); }}
          placeholder="Cosa c'è in frigo? Che voglia hai?"
          style={{ flex: 1, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "12px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, minHeight: 44 }}
        />
        <button
          onClick={cerca}
          disabled={cerco || !domanda.trim()}
          className="ds-btn primary"
          style={{ height: 44, padding: "0 18px", fontWeight: 700, opacity: cerco || !domanda.trim() ? 0.5 : 1 }}
        >
          {cerco ? "…" : "Cerca"}
        </button>
      </div>

      {/* le chip di stile: parole in più nella ricerca, niente giudizi */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 0" }}>
        {CHIP.map((c) => {
          const on = scelte.includes(c);
          return (
            <button
              key={c}
              onClick={() => setScelte((s) => (on ? s.filter((x) => x !== c) : [...s, c]))}
              style={{
                minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                background: on ? "var(--k-accent)" : "transparent",
                color: on ? "var(--k-accent-ink)" : "var(--k-text-2)",
                border: `1px solid ${on ? "transparent" : "var(--k-line)"}`,
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {!ricercaAttiva && (
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "14px 2px 0" }}>
          La ricerca arriva presto. Il ricettario funziona già.
        </p>
      )}

      {/* i risultati */}
      {cerco && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12, marginTop: 20 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="k-skel" style={{ aspectRatio: "2 / 3", borderRadius: 16, background: "var(--k-surface)" }} />
          ))}
        </div>
      )}

      {!cerco && risultati && risultati.length > 0 && (
        <>
          <h2 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "24px 2px 12px" }}>
            Trovate · {risultati.length}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
            {risultati.map((r) => (
              <div key={r.url} className="ds-card" style={{ display: "flex", flexDirection: "column", background: "var(--k-surface)" }}>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ display: "block", position: "relative", aspectRatio: "2 / 3", textDecoration: "none" }}>
                  {r.miniatura ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.miniatura} alt="" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, background: "var(--k-cat-cena)", display: "grid", placeItems: "center", fontSize: 30 }}>🍳</div>
                  )}
                  <div className="ds-scrim" />
                  <span style={{ position: "absolute", top: 8, left: 8, zIndex: 3, background: "rgba(12,12,15,.72)", borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>
                    {LOGO[r.piattaforma]} {r.piattaforma === "web" ? r.dominio : r.piattaforma}
                  </span>
                  <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, zIndex: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: "var(--k-tshadow)" }}>
                      {r.titolo}
                    </div>
                    {r.autore && <div style={{ fontSize: 11.5, color: "var(--k-text-2)", marginTop: 3, textShadow: "var(--k-tshadow)" }}>{r.autore}</div>}
                  </div>
                </a>
                <button
                  onClick={() => salva(r)}
                  disabled={salvate.has(r.url)}
                  className="ds-btn"
                  style={{ margin: 8, minHeight: 44, fontSize: 13, fontWeight: 700, opacity: salvate.has(r.url) ? 0.55 : 1 }}
                >
                  {salvate.has(r.url) ? "Salvata ✓" : "Salva"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* il ricettario */}
      {lista.length > 0 && (
        <>
          <h2 style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".5px", textTransform: "uppercase", color: "var(--k-text-3)", margin: "28px 2px 12px" }}>
            Il ricettario · {lista.length}
          </h2>
          {lista.length > 3 && (
            <input
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Cerca fra le tue"
              style={{ width: "100%", background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 12, padding: "10px 14px", color: "var(--k-text)", fontSize: 16, fontFamily: "inherit", outline: 0, minHeight: 44, marginBottom: 12, boxSizing: "border-box" }}
            />
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {ricettario.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 16, padding: 10 }}>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit", minHeight: 44 }}>
                  {r.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.thumbnail} alt="" loading="lazy" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", flex: "none" }} />
                  ) : (
                    <span style={{ width: 54, height: 54, borderRadius: 12, flex: "none", display: "grid", placeItems: "center", background: "var(--k-cat-cena)", fontSize: 22 }}>🍳</span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--k-text-3)", marginTop: 2 }}>
                      {LOGO[r.platform] ?? "🌐"} {r.author || r.platform}
                    </span>
                  </span>
                </a>
                <button
                  onClick={() => elimina(r)}
                  aria-label={`Togli ${r.title}`}
                  style={{ width: 44, height: 44, flex: "none", display: "grid", placeItems: "center", background: "none", border: 0, color: "var(--k-text-3)", fontSize: 15, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ))}
            {ricettario.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "2px" }}>Nessuna con questo nome.</p>
            )}
          </div>
        </>
      )}

      {/* il vuoto ben fatto: l'orca e un invito, non una pagina spenta */}
      {vuotoTotale && (
        <div style={{ textAlign: "center", padding: "56px 12px 40px" }}>
          <div style={{ fontSize: 44 }} aria-hidden>🐋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>Che c&apos;è nel frigo?</div>
          <p style={{ fontSize: 13, color: "var(--k-text-3)", marginTop: 6, lineHeight: 1.5 }}>
            Cerco la ricetta, tu cucini.
          </p>
        </div>
      )}

      {/* toast (con Annulla per l'eliminazione, come in Guarda) */}
      {msg && (
        <div
          role="status"
          style={{
            position: "fixed", left: 16, right: 16, bottom: "calc(env(safe-area-inset-bottom) + 92px)",
            maxWidth: 520, margin: "0 auto", zIndex: 60,
            background: "color-mix(in srgb, var(--k-text) 8%, var(--k-surface))",
            border: "1px solid var(--k-line)", borderRadius: 14, padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 10, fontSize: 13.5,
            boxShadow: "0 14px 40px rgba(0,0,0,.45)",
          }}
        >
          {msg.startsWith("__ANNULLA__") ? (
            <>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Tolta: {msg.replace("__ANNULLA__", "")}
              </span>
              <button
                onClick={() => (window as unknown as { __annullaCucina?: () => void }).__annullaCucina?.()}
                style={{ background: "none", border: 0, color: "var(--k-accent)", fontWeight: 700, fontSize: 13.5, minHeight: 44, cursor: "pointer" }}
              >
                Annulla
              </button>
            </>
          ) : (
            <span>{msg}</span>
          )}
        </div>
      )}
    </div>
  );
}
