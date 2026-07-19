"use client";

// Consiglio di Keiko GLOBALE: vive nel layout, quindi la ricerca (in background),
// la pillola in basso a destra e il pannello a 3 opzioni SOPRAVVIVONO ai cambi di
// sezione (Guarda → Dieta → torni e lo ritrovi). Stili "hardcoded" per essere
// identici su ogni pagina, a prescindere dal set di variabili CSS attivo.

import { createContext, useContext, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { motion, type PanInfo } from "framer-motion";
import { useRouter } from "next/navigation";

type Pick = { title: string; kind: "film" | "serie"; platform: string | null; info: string | null; link: string | null; poster?: string | null };
type Ctx = { startInput: () => void };

const SuggestCtx = createContext<Ctx>({ startInput: () => {} });
export const useSuggest = () => useContext(SuggestCtx);

function fetchWithTimeout(url: string, opts: RequestInit, ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return fetch(url, { ...opts, signal: c.signal }).finally(() => clearTimeout(t));
}

const C = { accent: "#f5b44e", ink: "#221803", bg: "#0b0d12", surface: "#171a22", line: "rgba(255,255,255,.10)", text: "#eef0f3", t3: "#8a8f99" };
const SHEET: CSSProperties = { width: "100%", maxWidth: 440, margin: "0 auto", background: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, boxShadow: "0 -8px 40px rgba(0,0,0,.5)", borderTop: `1px solid ${C.line}`, padding: "12px 20px calc(env(safe-area-inset-bottom) + 22px)" };
const OVERLAY: CSSProperties = { position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end" };
const GRAB: CSSProperties = { width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,.2)", margin: "0 auto 16px" };

export default function SuggestProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const busy = useRef(false);
  const [inputOpen, setInputOpen] = useState(false);
  const [text, setText] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Pick[] | null>(null);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const msgT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = (m: string) => { if (msgT.current) clearTimeout(msgT.current); setMsg(m); msgT.current = setTimeout(() => setMsg(null), 4000); };

  const startInput = () => { setText(""); setInputOpen(true); };

  async function run(query: string) {
    if (busy.current) return;
    const q = query.trim() || "consigliami qualcosa da vedere stasera";
    busy.current = true; setSearching(true); setResults(null);
    try {
      const res = await fetchWithTimeout("/api/watch/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ query: q }) }, 60000);
      const data = (await res.json()) as { films?: Pick[] };
      if (!res.ok) throw new Error();
      const picks = (data.films ?? []).slice(0, 3);
      if (!picks.length) { toast("Non ho trovato niente, riformula"); return; }
      setResults(picks);
    } catch (e) {
      toast(e instanceof Error && e.name === "AbortError" ? "Ci ho messo troppo, riprova" : "Qualcosa non torna, riprova");
    } finally { busy.current = false; setSearching(false); }
  }

  async function addPick(p: Pick) {
    try {
      const info = [p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ");
      const res = await fetch("/api/watch", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ title: p.title, kind: p.kind, info: info || null, link: p.link }) });
      if (!res.ok) throw new Error();
      toast(`Aggiunto: ${p.title}`);
      router.refresh();
    } catch { toast("Non aggiunto, riprova"); }
  }

  return (
    <SuggestCtx.Provider value={{ startInput }}>
      {children}
      <style>{`@keyframes kk-spin{to{transform:rotate(360deg)}}`}</style>

      {inputOpen && (
        <div onClick={() => setInputOpen(false)} style={OVERLAY}>
          <motion.div onClick={(e) => e.stopPropagation()} style={SHEET} initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 460, damping: 42 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_e: unknown, info: PanInfo) => { if (info.offset.y > 120 || info.velocity.y > 700) setInputOpen(false); }}>
            <div style={GRAB} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: "0 0 6px" }}>✨ Consiglio di Keiko</h3>
            <p style={{ fontSize: 13, color: C.t3, margin: "0 0 14px" }}>Che serata è? es. «commedia leggera», «thriller» (vuoto = a sorpresa)</p>
            <div style={{ display: "flex", gap: 8 }}>
              <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const q = text; setInputOpen(false); run(q); } }} placeholder="Tipo di serata…" style={{ flex: 1, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: 0 }} />
              <button onClick={() => { const q = text; setInputOpen(false); run(q); }} style={{ height: 44, padding: "0 18px", border: 0, borderRadius: 12, background: C.accent, color: C.ink, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Chiedi</button>
            </div>
          </motion.div>
        </div>
      )}

      {(searching || (results && !open)) && (
        <button onClick={() => { if (results) setOpen(true); }} disabled={searching} style={{ position: "fixed", right: 16, bottom: "calc(100px + env(safe-area-inset-bottom))", zIndex: 65, display: "flex", alignItems: "center", gap: 8, background: C.accent, color: C.ink, border: 0, borderRadius: 999, padding: "11px 16px", fontSize: 13.5, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,.45)", cursor: searching ? "default" : "pointer" }}>
          {searching
            ? <><span style={{ width: 15, height: 15, border: "2px solid rgba(0,0,0,.25)", borderTopColor: C.ink, borderRadius: "50%", display: "inline-block", animation: "kk-spin .8s linear infinite" }} /> Keiko cerca…</>
            : <>✨ {results?.length ?? 0} consigli pronti</>}
        </button>
      )}

      {open && results && (
        <div onClick={() => { setOpen(false); setResults(null); }} style={OVERLAY}>
          <motion.div onClick={(e) => e.stopPropagation()} style={SHEET} initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 460, damping: 42 }} drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_e: unknown, info: PanInfo) => { if (info.offset.y > 120 || info.velocity.y > 700) { setOpen(false); setResults(null); } }}>
            <div style={GRAB} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: C.text, margin: "0 0 4px" }}>✨ Consigli di Keiko</h3>
            <p style={{ fontSize: 12.5, color: C.t3, margin: "0 0 14px" }}>Scegli cosa aggiungere alla lista.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {results.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14 }}>
                  <div style={{ width: 46, height: 68, flex: "none", borderRadius: 8, overflow: "hidden", position: "relative", background: "linear-gradient(150deg,#3a2f52,#1a1526)" }}>
                    {p.poster ? <img src={p.poster} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{p.title}</div>
                    <div style={{ fontSize: 12.5, color: C.t3, marginTop: 2 }}>{[p.kind === "serie" ? "Serie" : "Film", p.info, p.platform ? `su ${p.platform}` : null].filter(Boolean).join(" · ")}</div>
                  </div>
                  <button onClick={() => { addPick(p); const rest = results.filter((_, j) => j !== i); if (rest.length) setResults(rest); else { setResults(null); setOpen(false); } }} style={{ height: 38, padding: "0 14px", border: 0, borderRadius: 10, background: C.accent, color: C.ink, fontWeight: 700, fontSize: 13, flex: "none", cursor: "pointer" }}>Aggiungi</button>
                </div>
              ))}
            </div>
            <button onClick={() => { setOpen(false); setResults(null); }} style={{ width: "100%", height: 44, marginTop: 16, border: `1px solid ${C.line}`, borderRadius: 12, background: C.surface, color: C.text, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Chiudi</button>
          </motion.div>
        </div>
      )}

      {msg && (
        <div style={{ position: "fixed", left: 16, right: 16, bottom: "calc(150px + env(safe-area-inset-bottom))", maxWidth: 408, margin: "0 auto", zIndex: 66, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", boxShadow: "0 10px 30px rgba(0,0,0,.5)", color: C.text, fontSize: 14 }}>{msg}</div>
      )}
    </SuggestCtx.Provider>
  );
}
