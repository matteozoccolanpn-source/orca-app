"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/* S2 rework allenamento — card "Creami tu una scheda" (L0).
   Visibile SOLO quando: profilo compilato E nessuna scheda caricata (lo decide
   la pagina server). Un tap → /api/workout/generate → Claude prepara la settimana
   dal profilo → salvata come una scheda normale (la pagina si ricarica da sola).
   Avvertenza sempre visibile: il top resta la scheda del professionista. */

export default function GeneraScheda() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [err, setErr] = useState("");

  async function generate() {
    if (state === "working") return;
    setState("working");
    setErr("");
    try {
      const res = await fetch("/api/workout/generate", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qualcosa è andato storto");
      router.refresh(); // la scheda ora esiste → questa card sparisce, appare la settimana
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setState("error");
    }
  }

  return (
    <div style={{ background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, padding: "16px 16px 18px", marginBottom: 18 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--k-text)", margin: 0 }}>Non hai una scheda? ✨</h3>
      <p style={{ fontSize: 13, color: "var(--k-text-2)", lineHeight: 1.5, margin: "6px 0 0" }}>
        Te ne preparo una di base io, dal tuo profilo (sessioni, livello, vincoli).
        La sostituisci quando vuoi caricando quella vera.
      </p>

      {state === "working" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, color: "var(--k-text-2)", fontSize: 14 }}>
          <span className="ds-spin" style={{ width: 18, height: 18, border: "2px solid var(--k-line)", borderTopColor: "var(--k-accent)", borderRadius: "50%", display: "inline-block", animation: "kSpin 0.8s linear infinite" }} />
          <style>{`@keyframes kSpin{to{transform:rotate(360deg)}}`}</style>
          Preparo la tua settimana…
        </div>
      ) : (
        <button onClick={generate} className="ds-btn primary" style={{ width: "100%", height: 46, marginTop: 14 }}>
          ✨ Creami tu una scheda
        </button>
      )}

      {err && <p style={{ fontSize: 13, color: "#E2705F", margin: "10px 0 0" }}>{err}</p>}

      <p style={{ fontSize: 11.5, color: "var(--k-text-3)", lineHeight: 1.45, margin: "12px 0 0" }}>
        ⚠️ Scheda generica di partenza, non un programma medico o professionale:
        il massimo resta la scheda fatta dal tuo trainer — caricala appena ce l&apos;hai.
      </p>
    </div>
  );
}
