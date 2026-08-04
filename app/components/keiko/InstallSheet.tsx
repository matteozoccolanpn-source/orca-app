"use client";

/* K15 — il pannello "mettimi nella schermata Home" (e, dopo, "ti avviso io").
   Un pannello vero, non una strisciolina: su iPhone senza questo gesto gli
   avvisi non partono, ed è la cosa che tiene viva l'app.

   Tre facce, decise da lib/install-client.ts:
     guida-ios     → i tre passaggi, con l'icona di Condividi disegnata
     guida-android → il tasto che apre l'invito del browser
     avvisi        → il permesso, chiesto SOLO dove può funzionare

   I testi vengono da docs/UI-VOICE.md: Keiko "ti avvisa", non "invia notifiche
   push", e non nomina mai le cose tecniche. */

import { useState } from "react";
import SheetShell from "./SheetShell";
import { enableNotifications } from "@/lib/push-client";
import { installaDaAndroid, rimanda, dimenticaRinvio, type CosaMostrare } from "@/lib/install-client";

/* L'icona di Condividi di iOS, disegnata: il quadrato con la freccia in su.
   Descriverla a parole non basta — va riconosciuta al volo nella barra. */
function IconaCondividi({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5V4" />
      <path d="M8.4 7.6 12 4l3.6 3.6" />
      <path d="M7.2 10.6H5.6A1.6 1.6 0 0 0 4 12.2v6.2A1.6 1.6 0 0 0 5.6 20h12.8a1.6 1.6 0 0 0 1.6-1.6v-6.2a1.6 1.6 0 0 0-1.6-1.6h-1.6" />
    </svg>
  );
}

/* Il "+" dentro il quadratino: la voce da cercare nell'elenco di iOS. */
function IconaAggiungi({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

function Passo({ n, icona, children }: { n: number; icona?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", flex: "none", background: "var(--k-surface)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: "var(--k-text-2)" }}>{n}</div>
      <div style={{ fontSize: 14.5, color: "var(--k-text)", lineHeight: 1.45, flex: 1 }}>{children}</div>
      {icona && (
        <div style={{ width: 42, height: 42, borderRadius: 11, flex: "none", background: "var(--k-surface)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", color: "var(--k-accent)" }}>
          {icona}
        </div>
      )}
    </div>
  );
}

export default function InstallSheet({ modo, onClose, onFatto, onNonOra, primaDellOnboarding = false, zIndex = 95 }: {
  modo: Exclude<CosaMostrare, null>;
  /** chiusura "non ora": rimanda, non ripropone domani */
  onClose: () => void;
  /** gli avvisi sono stati attivati davvero */
  onFatto?: () => void;
  /** K14b: "Non ora" quando l'invito arriva PRIMA dell'onboarding — non chiude
   *  e basta, fa partire l'onboarding qui nel browser. */
  onNonOra?: () => void;
  /** K14b: l'invito arriva prima dell'onboarding (browser da telefono, mai
   *  fatto). Cambia il testo: qui installare viene prima di tutto il resto. */
  primaDellOnboarding?: boolean;
  zIndex?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const chiudiRimandando = () => { rimanda(); onClose(); };

  async function attivaAvvisi() {
    setBusy(true); setMsg(null);
    try {
      const r = await enableNotifications();
      if (r.ok) {
        dimenticaRinvio();
        onFatto?.();
        onClose();
        return;
      }
      if (r.error === "ios-install") setMsg("Da qui non ci riesco: aprimi dall'icona 🐋 nella tua schermata Home.");
      else if (r.error === "denied") setMsg("Hai detto di no al browser. Puoi cambiare idea dalle impostazioni del telefono.");
      else if (r.error === "no-key") setMsg("Qualcosa non torna da parte mia. Riprova più tardi.");
      else setMsg("Qualcosa non torna, riprovo? (" + r.error + ")");
    } catch {
      setMsg("Qualcosa non torna, riprovo?");
    } finally {
      setBusy(false);
    }
  }

  async function aggiungiSuAndroid() {
    setBusy(true);
    const ok = await installaDaAndroid();
    setBusy(false);
    if (ok) { dimenticaRinvio(); onClose(); }
    else chiudiRimandando();
  }

  const titolo = modo === "avvisi" ? "Ti avviso io" : "Mettimi nella tua schermata Home";

  return (
    <SheetShell onClose={chiudiRimandando} zIndex={zIndex}>
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#3a2f22,#241d15)", border: "1px solid var(--k-line)", display: "grid", placeItems: "center", fontSize: 20 }}>🐋</div>
          <h2 className="ds-display" style={{ fontSize: 21, fontWeight: 600, color: "var(--k-text)", margin: 0, lineHeight: 1.2 }}>{titolo}</h2>
          <button onClick={chiudiRimandando} aria-label="Chiudi" style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: "50%", flex: "none", background: "var(--k-surface)", border: "1px solid var(--k-line)", color: "var(--k-text-2)", fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>

        {modo === "guida-ios" && (
          <>
            {/* K14b: quando l'invito precede l'onboarding, la prima riga dice
                perché conviene installare ADESSO invece che dopo. */}
            {primaDellOnboarding && (
              <p style={{ fontSize: 14.5, color: "var(--k-text)", fontWeight: 600, lineHeight: 1.5, margin: "10px 2px 8px" }}>
                Installami prima: notifiche e posizione funzionano solo dall&apos;icona. Ci metti 10 secondi.
              </p>
            )}
            <p style={{ fontSize: 14.5, color: "var(--k-text-2)", lineHeight: 1.55, margin: "10px 2px 6px" }}>
              Da lì posso avvisarti: quando esci per il treno, quando c&apos;è da allenarsi, quando scade un to-do.
              Dal browser non ci riesco.
            </p>
            <div style={{ marginTop: 8, borderTop: "1px solid var(--k-line)" }}>
              <Passo n={1} icona={<IconaCondividi />}>Tocca <b style={{ color: "var(--k-text)" }}>Condividi</b>, in fondo allo schermo</Passo>
              <div style={{ borderTop: "1px solid var(--k-line)" }} />
              <Passo n={2} icona={<IconaAggiungi />}>Scorri e scegli <b style={{ color: "var(--k-text)" }}>Aggiungi a schermata Home</b></Passo>
              <div style={{ borderTop: "1px solid var(--k-line)" }} />
              <Passo n={3}>Tocca <b style={{ color: "var(--k-text)" }}>Aggiungi</b>, in alto a destra</Passo>
            </div>
            <p style={{ fontSize: 13, color: "var(--k-text-3)", lineHeight: 1.55, margin: "14px 2px 0", paddingTop: 14, borderTop: "1px solid var(--k-line)" }}>
              Poi aprimi dall&apos;icona 🐋: da lì ti chiedo il permesso per gli avvisi.
            </p>
            {/* K14b: aprendo dall'icona iPhone tratta Keiko come un'app a sé, con
                i suoi cookie. Dirlo prima evita lo spavento del "e perché mi
                richiede l'accesso?". */}
            {primaDellOnboarding && (
              <p style={{ fontSize: 11.5, color: "var(--k-text-3)", lineHeight: 1.5, margin: "10px 2px 0" }}>
                Dall&apos;icona ti richiederà l&apos;accesso Google una volta: è normale, per iPhone è un&apos;app separata.
              </p>
            )}
            <button onClick={chiudiRimandando} className="ds-btn primary" style={{ width: "100%", height: 48, marginTop: 18, fontSize: 15, fontWeight: 700 }}>
              Ho capito
            </button>
            {onNonOra && (
              <button onClick={() => { rimanda(); onNonOra(); }} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 13.5, cursor: "pointer", width: "100%", marginTop: 12, padding: 8 }}>
                Non ora
              </button>
            )}
          </>
        )}

        {modo === "guida-android" && (
          <>
            <p style={{ fontSize: 14.5, color: "var(--k-text-2)", lineHeight: 1.55, margin: "10px 2px 0" }}>
              Così mi apri con un tocco solo, e ti avviso in tempo: il treno, l&apos;allenamento, i to-do che scadono.
            </p>
            <button onClick={aggiungiSuAndroid} disabled={busy} className="ds-btn primary" style={{ width: "100%", height: 48, marginTop: 20, fontSize: 15, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
              {busy ? "…" : "Aggiungi Keiko"}
            </button>
            <button onClick={() => { if (onNonOra) { rimanda(); onNonOra(); } else chiudiRimandando(); }} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 13.5, cursor: "pointer", width: "100%", marginTop: 12, padding: 8 }}>
              Non ora
            </button>
          </>
        )}

        {modo === "avvisi" && (
          <>
            <p style={{ fontSize: 14.5, color: "var(--k-text-2)", lineHeight: 1.55, margin: "10px 2px 0" }}>
              Quando è ora di uscire per il treno, quando c&apos;è da allenarsi, quando scade un to-do.
              Solo le tue cose: niente altro.
            </p>
            <button onClick={attivaAvvisi} disabled={busy} className="ds-btn primary" style={{ width: "100%", height: 48, marginTop: 20, fontSize: 15, fontWeight: 700, opacity: busy ? 0.5 : 1 }}>
              {busy ? "…" : "Avvisami"}
            </button>
            <button onClick={chiudiRimandando} style={{ background: "none", border: 0, color: "var(--k-text-3)", fontSize: 13.5, cursor: "pointer", width: "100%", marginTop: 12, padding: 8 }}>
              Non ora
            </button>
          </>
        )}

        {msg && <p style={{ fontSize: 13, color: "var(--k-text-2)", margin: "12px 2px 0", lineHeight: 1.5 }}>{msg}</p>}
      </div>
    </SheetShell>
  );
}
