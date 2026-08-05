import { notFound } from "next/navigation";
import { auth, OWNER_EMAIL } from "@/auth";
import { getNumeri } from "@/lib/supabase";
import { usoPerOperazione, PREZZI_AGGIORNATI_AL } from "@/lib/ai";
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
  const uso = await usoPerOperazione(7);
  const totale = uso.reduce((s, r) => s + r.dollari, 0);
  const tokenInTot = uso.reduce((s, r) => s + r.tokenIn, 0);
  const dallaCache = uso.reduce((s, r) => s + r.cacheLetti, 0);
  const soldi = (d: number) => (d < 0.01 && d > 0 ? "<$0,01" : `$${d.toFixed(2)}`);
  const migliaia = (t: number) => (t >= 1000 ? `${Math.round(t / 1000)}k` : String(t));

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

      {/* Ultimi 7 giorni, per operazione. Non è un cruscotto nemmeno questo:
          serve a rispondere a una domanda sola, "cosa mi sta costando". */}
      <h2 className="ds-display" style={{ fontSize: 17, color: "var(--k-text)", margin: "34px 0 2px", paddingTop: 22, borderTop: "1px solid var(--k-line)" }}>
        Ultimi 7 giorni
      </h2>
      <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "0 0 14px" }}>
        Cosa ha chiesto l&apos;AI, e quanto è costato.
      </p>

      {uso.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--k-text-3)", margin: 0 }}>
          Ancora niente da contare.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, color: "var(--k-text)" }}>
          <thead>
            <tr style={{ color: "var(--k-text-3)", fontSize: 11.5, textAlign: "right" }}>
              <th style={{ textAlign: "left", fontWeight: 500, padding: "0 0 6px" }}>Operazione</th>
              <th style={{ fontWeight: 500, padding: "0 0 6px" }}>Volte</th>
              <th style={{ fontWeight: 500, padding: "0 0 6px" }}>Token in</th>
              <th style={{ fontWeight: 500, padding: "0 0 6px" }}>out</th>
              <th style={{ fontWeight: 500, padding: "0 0 6px" }}>Stima</th>
            </tr>
          </thead>
          <tbody>
            {uso.map((r) => (
              <tr key={r.operazione} style={{ textAlign: "right", borderTop: "1px solid var(--k-line)" }}>
                <td style={{ textAlign: "left", padding: "9px 0", fontWeight: 600 }}>
                  {r.operazione}
                  {/* Le ricerche web si pagano a parte dai token: se ce ne sono
                      vanno viste, ma non meritano una colonna tutta loro. */}
                  {r.ricercheWeb > 0 && (
                    <div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--k-text-3)", marginTop: 2 }}>
                      {r.ricercheWeb} ricerche web
                    </div>
                  )}
                </td>
                <td style={{ padding: "9px 0" }}>{r.volte}</td>
                <td style={{ padding: "9px 0", color: "var(--k-text-3)" }}>{migliaia(r.tokenIn)}</td>
                <td style={{ padding: "9px 0", color: "var(--k-text-3)" }}>{migliaia(r.tokenOut)}</td>
                <td style={{ padding: "9px 0", color: "var(--k-accent)", fontWeight: 600 }}>{soldi(r.dollari)}</td>
              </tr>
            ))}
            <tr style={{ textAlign: "right", borderTop: "1px solid var(--k-line)" }}>
              <td style={{ textAlign: "left", padding: "9px 0", color: "var(--k-text-3)" }} colSpan={4}>
                In tutto
              </td>
              <td style={{ padding: "9px 0", color: "var(--k-accent)", fontWeight: 600 }}>{soldi(totale)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {uso.length > 0 && dallaCache > 0 && (
        <p style={{ fontSize: 12.5, color: "var(--k-text-3)", margin: "12px 2px 0" }}>
          Dalla cache: {migliaia(dallaCache)} token su {migliaia(tokenInTot)} in entrata — quelli
          costano un decimo.
        </p>
      )}

      <p style={{ fontSize: 12, color: "var(--k-text-3)", margin: "14px 2px 0", lineHeight: 1.55 }}>
        I conti sono fatti così: token nuovi a prezzo pieno, quelli riletti dalla cache a un
        decimo, quelli messi in cache 1,25 volte, più le ricerche web che si pagano a ricerca.
        I prezzi sono scritti a mano in lib/ai.ts, controllati sul listino di Anthropic il{" "}
        {PREZZI_AGGIORNATI_AL}: se il listino cambia, questa cifra sbaglia in silenzio.
        &quot;Volte&quot; sono le richieste dell&apos;utente; un consiglio che cerca sul web fa
        più di una chiamata, e i token sono di tutte.
      </p>

      <p style={{ fontSize: 12, color: "var(--k-text-3)", margin: "26px 2px 0", lineHeight: 1.55, paddingTop: 16, borderTop: "1px solid var(--k-line)" }}>
        &quot;Iscritti&quot; conta chi ha aperto l&apos;app da quando esiste questa pagina: chi è entrato
        prima e non è più tornato non compare. Gli attivi si contano dall&apos;ultima apertura,
        registrata una volta al giorno.
      </p>
    </div>
  );
}
