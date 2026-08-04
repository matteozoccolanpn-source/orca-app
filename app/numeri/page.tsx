import { notFound } from "next/navigation";
import { auth, OWNER_EMAIL } from "@/auth";
import { getNumeri } from "@/lib/supabase";
import "../ds.css";

// K9 — la riga dei numeri. Non è un cruscotto: quattro numeri e basta.
// Visibile SOLO al proprietario, stesso trattamento di /api/debug/* (K67):
// per chiunque altro la pagina finge di non esistere (404), così non si scopre
// nemmeno che esiste.

export const dynamic = "force-dynamic";

export default async function Numeri() {
  const session = await auth();
  const email = (session?.user?.email ?? "").trim().toLowerCase();
  if (email !== OWNER_EMAIL) notFound();

  const n = await getNumeri();

  const numeri = [
    { valore: n.iscritti, titolo: "Iscritti", sotto: "hanno aperto Keiko almeno una volta" },
    { valore: n.attivi7, titolo: "Attivi 7 giorni", sotto: "aperta nell'ultima settimana" },
    { valore: n.attivi30, titolo: "Attivi 30 giorni", sotto: "aperta nell'ultimo mese" },
    { valore: n.conContenuti, titolo: "Con contenuti", sotto: "almeno un evento, una dieta o una scheda" },
  ];

  return (
    <div className="ds" style={{ minHeight: "100dvh", background: "var(--k-bg)", padding: "calc(env(safe-area-inset-top) + 40px) 20px 40px", maxWidth: 440, margin: "0 auto" }}>
      <h1 className="ds-display" style={{ fontSize: 24, color: "var(--k-text)", margin: "0 0 4px" }}>I numeri</h1>
      <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: "0 0 24px" }}>
        Aggiornati adesso.
      </p>

      {numeri.map((x) => (
        <div key={x.titolo} style={{ display: "flex", alignItems: "baseline", gap: 14, padding: "16px 0", borderTop: "1px solid var(--k-line)" }}>
          <div className="ds-display" style={{ fontSize: 34, color: "var(--k-accent)", minWidth: 62, lineHeight: 1 }}>{x.valore}</div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--k-text)" }}>{x.titolo}</div>
            <div style={{ fontSize: 12.5, color: "var(--k-text-3)", marginTop: 2 }}>{x.sotto}</div>
          </div>
        </div>
      ))}

      <p style={{ fontSize: 12, color: "var(--k-text-3)", margin: "26px 2px 0", lineHeight: 1.55, paddingTop: 16, borderTop: "1px solid var(--k-line)" }}>
        &quot;Iscritti&quot; conta chi ha aperto l&apos;app da quando esiste questa pagina: chi è entrato
        prima e non è più tornato non compare. Gli attivi si contano dall&apos;ultima apertura,
        registrata una volta al giorno.
      </p>
    </div>
  );
}
