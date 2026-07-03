"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  Clapperboard,
  Tv,
  Check,
  Plus,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { WatchItem } from "@/lib/supabase";

/* Sezione "Da guardare" — logica TV Time in salsa Keiko:
 * scrivi un titolo secco O una richiesta ("commedia stile quo vado") →
 * proposte con piattaforma verificata → le aggiungi con un tap → spunti "visto". */

type Pick = {
  title: string;
  kind: "film" | "serie";
  platform: string | null;
  info: string | null;
  link: string | null;
};

export default function GuardaView({ items }: { items: WatchItem[] }) {
  const [list, setList] = useState<WatchItem[]>(items);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [showSeen, setShowSeen] = useState(false);

  const daVedere = list.filter((i) => !i.seen);
  const visti = list.filter((i) => i.seen);

  /* Fase 1: chiedi a Keiko (titolo o consiglio). */
  async function cerca() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setPicks([]);
    try {
      const res = await fetch("/api/watch/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as { films?: Pick[]; error?: string };
      if (!res.ok) throw new Error(data.error);
      setPicks(data.films ?? []);
      if ((data.films ?? []).length === 0) window.alert("Non ho trovato niente di convincente, prova a riformulare");
    } catch (e) {
      window.alert("Ricerca fallita: " + (e instanceof Error && e.message ? e.message : "riprova"));
    } finally {
      setBusy(false);
    }
  }

  /* Aggiungi una proposta alla lista. */
  async function aggiungi(p: Pick) {
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
      setPicks((ps) => ps.filter((x) => x.title !== p.title));
    } catch {
      window.alert("Non sono riuscito ad aggiungere, riprova");
    }
  }

  async function toggleSeen(item: WatchItem) {
    const prev = list;
    setList((l) => l.map((i) => (i.id === item.id ? { ...i, seen: !i.seen } : i)));
    try {
      const res = await fetch("/api/watch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: item.id, seen: !item.seen }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev);
      window.alert("Non sono riuscito a salvare, riprova");
    }
  }

  async function elimina(id: string) {
    const prev = list;
    setList((l) => l.filter((i) => i.id !== id));
    try {
      const res = await fetch("/api/watch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setList(prev);
      window.alert("Non sono riuscito a eliminare, riprova");
    }
  }

  return (
    <div
      className="relative mx-auto min-h-[100dvh] w-full max-w-lg"
      style={{ padding: "var(--s3) var(--gutter) 140px", color: "var(--app-text)" }}
    >
      <header className="flex items-center gap-[var(--s2)]" style={{ paddingBlock: "var(--s3)" }}>
        <Link
          href="/"
          aria-label="Indietro"
          className="grid place-items-center transition-transform active:scale-95"
          style={{ width: "var(--tap)", height: "var(--tap)", marginLeft: -10, color: "var(--app-2)" }}
        >
          <ChevronLeft className="size-6" />
        </Link>
        <span style={{ fontWeight: "var(--fw-black)", fontSize: "var(--fs-xl)", letterSpacing: "-.03em" }}>
          Da guardare
        </span>
      </header>

      {/* Barra "Cosa guardiamo?": titolo secco o richiesta di consiglio */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          cerca();
        }}
        className="flex items-center gap-[var(--s2)]"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Un titolo, o "commedia stile Quo Vado"…'
          maxLength={200}
          disabled={busy}
          className="min-w-0 flex-1 outline-none"
          style={{
            fontSize: "var(--fs-sm)",
            color: "var(--on-surface)",
            background: "var(--surface)",
            border: "1px solid var(--tile-line)",
            borderRadius: "var(--r-md)",
            padding: "13px 14px",
          }}
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="flex-none text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{
            fontSize: "var(--fs-sm)",
            fontWeight: "var(--fw-semi)",
            background: "var(--keiko-grad)",
            borderRadius: "var(--r-md)",
            padding: "13px 16px",
            boxShadow: "var(--sh-btn)",
          }}
        >
          {busy ? "Cerco…" : "Trova"}
        </button>
      </form>

      {/* Proposte di Keiko */}
      {picks.length > 0 && (
        <>
          <SectionTitle>
            <Sparkles className="mr-1 inline size-3.5" /> Proposte — tocca + per salvarle
          </SectionTitle>
          <div className="flex flex-col gap-[var(--s2)]">
            {picks.map((p) => (
              <div
                key={p.title}
                className="flex items-start gap-[var(--s3)]"
                style={{ background: "var(--surface)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
              >
                <span
                  className="grid flex-none place-items-center text-white"
                  style={{ width: 40, height: 40, borderRadius: "var(--r-sm)", background: "var(--cat-concerto)" }}
                >
                  {p.kind === "serie" ? <Tv className="size-5" /> : <Clapperboard className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--on-surface)" }}>
                    {p.title}
                    {p.platform && (
                      <span
                        className="ml-2 align-middle"
                        style={{ fontSize: "10.5px", fontWeight: "var(--fw-bold)", color: "var(--accent-strong)", background: "color-mix(in srgb, var(--primary) 14%, transparent)", padding: "2px 8px", borderRadius: "var(--r-pill)" }}
                      >
                        {p.platform}
                      </span>
                    )}
                  </div>
                  {p.info && (
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", marginTop: 2, lineHeight: 1.35 }}>
                      {p.info}
                    </div>
                  )}
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1"
                      style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-semi)", color: "var(--accent-strong)" }}
                    >
                      Scheda <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => aggiungi(p)}
                  aria-label={`Aggiungi ${p.title}`}
                  className="grid flex-none place-items-center text-white active:scale-95"
                  style={{ width: 32, height: 32, borderRadius: "var(--r-pill)", background: "var(--keiko-grad)", boxShadow: "var(--sh-btn)" }}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* La lista */}
      <SectionTitle>Da vedere ({daVedere.length})</SectionTitle>
      {daVedere.length === 0 ? (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--on-surface-2)" }}>
          Lista vuota: scrivi qua sopra un titolo o chiedi un consiglio.
        </p>
      ) : (
        <div style={{ borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--tile-line)", overflow: "hidden" }}>
          {daVedere.map((item, i) => (
            <Row key={item.id} item={item} first={i === 0} onSeen={() => toggleSeen(item)} onDelete={() => elimina(item.id)} />
          ))}
        </div>
      )}

      {/* Visti, collassati */}
      {visti.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowSeen((s) => !s)}
            className="mt-[var(--sec)] flex w-full items-center gap-2"
            style={{ background: "var(--tile)", border: "1px solid var(--tile-line)", borderRadius: "var(--r-lg)", padding: "var(--s3)" }}
          >
            <span style={{ fontWeight: "var(--fw-semi)", fontSize: "var(--fs-sm)", color: "var(--app-text)" }}>
              Visti ({visti.length})
            </span>
            <ChevronDown
              className="ml-auto size-[18px] flex-none transition-transform duration-200"
              style={{ color: "var(--app-faint)", transform: showSeen ? "rotate(180deg)" : "none" }}
            />
          </button>
          {showSeen && (
            <div className="mt-[var(--s2)]" style={{ borderRadius: "var(--r-lg)", background: "var(--surface)", border: "1px solid var(--tile-line)", overflow: "hidden" }}>
              {visti.map((item, i) => (
                <Row key={item.id} item={item} first={i === 0} onSeen={() => toggleSeen(item)} onDelete={() => elimina(item.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ item, first, onSeen, onDelete }: { item: WatchItem; first: boolean; onSeen: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-[var(--s3)]" style={{ padding: "var(--s3)", borderTop: first ? "none" : "1px solid var(--inset-line)" }}>
      {/* Spunta visto */}
      <button
        type="button"
        onClick={onSeen}
        aria-label={item.seen ? "Segna da vedere" : "Segna visto"}
        className="grid flex-none place-items-center active:scale-95"
        style={{ width: 23, height: 23, borderRadius: "var(--r-pill)", border: "2px solid var(--accent-strong)", background: item.seen ? "var(--primary)" : "transparent", color: "#fff" }}
      >
        {item.seen && <Check className="size-3" />}
      </button>

      <span className="flex-none" style={{ color: "var(--app-2)" }}>
        {item.kind === "serie" ? <Tv className="size-4" /> : <Clapperboard className="size-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div
          className="truncate"
          style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semi)", color: item.seen ? "var(--on-surface-2)" : "var(--on-surface)", textDecoration: item.seen ? "line-through" : "none" }}
        >
          {item.title}
        </div>
        {item.info && (
          <div className="truncate" style={{ fontSize: "var(--fs-xs)", color: "var(--on-surface-2)", marginTop: 2 }}>
            {item.info}
          </div>
        )}
      </div>

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Apri scheda"
          className="grid flex-none place-items-center active:scale-95"
          style={{ width: "var(--tap)", height: "var(--tap)", margin: "-10px -8px", color: "var(--accent-strong)" }}
        >
          <ExternalLink className="size-4" />
        </a>
      )}

      <button
        type="button"
        onClick={onDelete}
        aria-label="Elimina"
        className="grid flex-none place-items-center active:scale-95"
        style={{ width: "var(--tap)", height: "var(--tap)", margin: "-10px -10px -10px -8px", color: "var(--app-faint)" }}
      >
        <X className="size-[17px]" />
      </button>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{ fontSize: "var(--fs-cap)", fontWeight: "var(--fw-bold)", letterSpacing: ".07em", color: "var(--app-faint)", margin: "var(--sec) 0.5px var(--s3)" }}
    >
      {children}
    </p>
  );
}
