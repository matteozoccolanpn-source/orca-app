// "Chiedi a Keiko": risposta AI a domande dell'utente, basata SOLO sui suoi dati
// (eventi, to-do, dieta, allenamento). Riusa il modello e la chiave già in uso
// nel resto dell'app — nessuna dipendenza o modello nuovo.

const MODEL = "claude-sonnet-4-5";

export async function askKeiko(q: string, context: unknown): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Al momento non riesco a rispondere (manca la configurazione AI).";
  }

  const oggi = new Date().toLocaleDateString("it-IT", {
    timeZone: "Europe/Rome", weekday: "long", day: "numeric", month: "long",
  });

  const system = `Sei Keiko, l'assistente personale dell'utente dentro la sua app "calendario della vita".
Oggi è ${oggi} (fuso Europe/Rome).
Rispondi in ITALIANO, in modo BREVE (max 3-4 frasi), concreto e amichevole, come un consulente personale.
Usa SOLO i dati forniti nel CONTESTO (eventi, to-do, dieta, allenamento). NON inventare orari, luoghi o dettagli.
Se l'informazione non c'è nei dati, dillo con gentilezza (es. "Non lo trovo tra i tuoi dati 😊") e, se utile, suggerisci come aggiungerlo.
La dieta e l'allenamento sono organizzati per giorno della settimana (lun, mar, mer, gio, ven, sab, dom).`;

  const messages = [
    { role: "user", content: `CONTESTO (dati dell'utente, JSON):\n${JSON.stringify(context)}\n\nDOMANDA: ${q}` },
  ];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = (data?.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();
    return text || "Su questa non ho ancora una risposta 😊";
  } catch (e) {
    console.error("askKeiko error:", e);
    return "Ho avuto un intoppo nel rispondere, riprova tra un attimo.";
  }
}
