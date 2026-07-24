"use client";

import { useState } from "react";
import ProfiloForm from "@/app/components/keiko/ProfiloForm";

/* Onboarding "a scomparsa" del profilo (S1 rework allenamento).
   Compare in cima ad Allenamento SOLO finché il profilo non esiste su Supabase.
   Il form vero è ProfiloForm (condiviso col pannello Profilo in home, dove il
   profilo resta modificabile per sempre). "Più tardi" nasconde solo per questa visita. */

export default function ProfiloSetup() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div style={{ background: "var(--k-surface)", border: "1px solid var(--k-line)", borderRadius: 18, padding: "16px 16px 18px", marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--k-text)", margin: 0 }}>Dimmi come ti alleni 🐋</h3>
        <button onClick={() => setHidden(true)} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 4, flex: "none" }}>Più tardi</button>
      </div>
      <p style={{ fontSize: 13, color: "var(--k-text-2)", lineHeight: 1.5, margin: "6px 0 0" }}>
        Poche risposte e Keiko si regola da sola — e più carichi (scheda, sessioni), più diventa precisa.
        Potrai sempre cambiarle dal Profilo 🐋 in home.
      </p>
      <ProfiloForm />
    </div>
  );
}
