"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import HeyKeikoBar from "./HeyKeikoBar";
import AddButton from "./AddButton";
import RuotaIlTelefono from "./RuotaIlTelefono";

/* Chrome globale della vecchia app (barra "Chiedi a Keiko" flottante + FAB ＋).
 * Dopo l'inversione dell'interruttore la home NUOVA è il default: la chrome
 * vecchia va montata SOLO sulla home vecchia, cioè `/?classic`. Ovunque altro
 * (home nuova, /v2/*, pagine interne v2.3) NON va montata: superficie = tab bar
 * nuova / KeikoShell. Conditional render: i componenti restano per la vecchia home. */
function Inner() {
  const params = useSearchParams();
  const pathname = usePathname();
  if (!(pathname === "/" && params.has("classic"))) return null;
  return (
    <>
      <HeyKeikoBar />
      <AddButton />
    </>
  );
}

/* IL TOAST DELLA CATTURA.
 * Prima la conferma era una schermata "Salvato" che tratteneva l'utente 1,4
 * secondi dentro il foglio. Adesso il foglio si chiude subito e la conferma
 * arriva qui, leggera, sulla home: "2 in agenda · Vedi".
 *
 * Sta nella chrome globale perché deve sopravvivere alla chiusura del foglio,
 * che si smonta. Comunica per evento ("keiko-toast"): nessun contesto nuovo da
 * passare a mano per tutta l'app.
 *
 * NON ci passano gli errori né il tetto giornaliero: quelli restano nel foglio
 * con il loro messaggio, dove si leggono con calma. Qui va solo ciò che è
 * andato bene — doppioni compresi, che non sono un errore: tono neutro. */
function ToastKeiko() {
  const router = useRouter();
  const [testo, setTesto] = useState<string | null>(null);
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    let uscita: ReturnType<typeof setTimeout>;
    let pulizia: ReturnType<typeof setTimeout>;
    function arriva(e: Event) {
      const t = (e as CustomEvent<{ testo?: string }>).detail?.testo;
      if (!t) return;
      clearTimeout(uscita);
      clearTimeout(pulizia);
      setTesto(t);
      setDentro(true);
      uscita = setTimeout(() => setDentro(false), 3600);
      pulizia = setTimeout(() => setTesto(null), 4200);
    }
    window.addEventListener("keiko-toast", arriva);
    return () => {
      window.removeEventListener("keiko-toast", arriva);
      clearTimeout(uscita);
      clearTimeout(pulizia);
    };
  }, []);

  if (!testo) return null;

  return (
    <>
      <style>{`
        @keyframes keiko-toast-in { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @keyframes keiko-toast-out { from { opacity: 1 } to { opacity: 0; transform: translateY(8px) } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes keiko-toast-in { from { opacity: 0 } to { opacity: 1 } }
          @keyframes keiko-toast-out { from { opacity: 1 } to { opacity: 0 } }
        }
      `}</style>
    <div
      role="status"
      style={{
        position: "fixed", left: 18, right: 18, zIndex: 90,
        bottom: "calc(env(safe-area-inset-bottom) + 92px)",
        margin: "0 auto", maxWidth: 480,
        background: "color-mix(in srgb, var(--on-surface) 6%, var(--surface))",
        border: "1px solid var(--inset-line)",
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 11,
        fontSize: 13.5, color: "var(--on-surface)",
        boxShadow: "0 14px 40px rgba(0,0,0,.45)",
        // Lo stato BASE è "visibile": l'animazione è solo l'entrata, e non ha
        // fill-mode. Così se per qualsiasi motivo l'animazione non parte, il
        // toast si vede lo stesso — invece di restare invisibile per sempre,
        // che è come si rompeva quando l'entrata dipendeva da un frame.
        opacity: 1,
        animation: dentro
          ? "keiko-toast-in .5s cubic-bezier(.22,.61,.36,1)"
          : "keiko-toast-out .4s ease forwards",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26, height: 26, borderRadius: "50%", flex: "none",
          display: "grid", placeItems: "center", fontSize: 13,
          background: "color-mix(in srgb, var(--green) 15%, transparent)", color: "var(--green)",
        }}
      >
        ✓
      </span>
      <span style={{ fontWeight: 700 }}>{testo}</span>
      <button
        type="button"
        onClick={() => { setDentro(false); router.push("/"); router.refresh(); }}
        style={{ marginLeft: "auto", color: "var(--accent-strong)", fontWeight: 700, fontSize: 13.5, minHeight: 44, paddingLeft: 8 }}
      >
        Vedi
      </button>
    </div>
    </>
  );
}

export default function GlobalChrome() {
  // useSearchParams richiede un confine Suspense.
  // RuotaIlTelefono sta FUORI da <Inner />: quella si spegne ovunque tranne
  // sulla home vecchia, mentre il telefono si può girare in qualsiasi schermata.
  return (
    <>
      <Suspense fallback={null}>
        <Inner />
      </Suspense>
      <RuotaIlTelefono />
      <ToastKeiko />
    </>
  );
}
