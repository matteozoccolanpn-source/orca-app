import SmartMedia from "@/components/SmartMedia";
import { ALL_CATEGORIES } from "@/lib/smart-image";

/* Anteprima LIVE del design system v4 nel codice vero. Aprire /ds-preview.
   Livello 0: card con gradiente-categoria (nessuna foto esterna) + una con foto. */

export default function DsPreview() {
  return (
    <div className="ds" style={{ maxWidth: 420, margin: "0 auto", padding: "28px 18px 60px" }}>
      <p style={{ fontSize: 12.5, color: "var(--k-text-3)", fontWeight: 600, margin: 0 }}>
        Giovedì 16 luglio · Milano 24° ☀️
      </p>
      <h1 className="ds-display" style={{ fontSize: 33, lineHeight: 1.02, margin: "2px 0 6px", color: "var(--k-text)" }}>
        Ciao Matteo 👋
      </h1>
      <p style={{ fontSize: 13, color: "var(--k-text-2)", fontWeight: 600, margin: "0 0 20px" }}>
        Design system v4 — livello 0 (gradienti categoria)
      </p>

      <SmartMedia
        variant="hero"
        category="cena"
        chip="🍽 Cena · stasera"
        chipAmber
        display
        title="Cena estiva dipartimento"
        meta={<><span className="k">21:00</span> · con Giulia + team</>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
        <SmartMedia variant="square" category="sport" chip="💪 Allenamento" title="Push day" meta={<>Fatto · 🔥 3 di fila</>} />
        <SmartMedia variant="square" category="default" chip="🥗 Pranzo" chipAmber title="Bowl di pollo" meta={<><span className="k">640 kcal</span> · 52g prot</>} />
        <SmartMedia variant="square" category="hotel" chip="🧭 Viaggio" title="Weekend a Roma" meta={<><span className="k">12–14 lug</span> · pronto</>} />
        <SmartMedia
          variant="square"
          image="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=70"
          chip="🍿 Con foto"
          title="Card con foto reale"
          meta={<><span className="k">Sky</span> · 21:15</>}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button className="ds-btn primary">Primario</button>
        <button className="ds-btn">Secondario</button>
        <button className="ds-btn danger">Elimina</button>
      </div>

      <h2 className="ds-display" style={{ fontSize: 20, margin: "32px 0 12px", color: "var(--k-text)" }}>
        Palette categorie — livello 0
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--k-text-3)", fontWeight: 600, margin: "0 0 12px" }}>
        Ogni categoria ha il suo gradiente: l&apos;app è immersiva anche senza una foto.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {ALL_CATEGORIES.map((c) => (
          <SmartMedia key={c} variant="square" category={c} title={c} style={{ maxHeight: 110 }} />
        ))}
      </div>
    </div>
  );
}
