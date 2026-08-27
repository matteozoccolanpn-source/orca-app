import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { spendAi, claudeFetch, isAiCapReached, AI_CAP_MESSAGE } from "@/lib/ai";
import { getTripFacts, getTripDocuments } from "@/lib/trip-docs";

/* VIAGGI — "Chiedi al viaggio" (PARTE 2).
 *
 * Il peso è "cattura" (1), non "piano": qui non si legge un documento intero,
 * si risponde su fatti già estratti — è il documento stesso a dirlo.
 *
 * Il costo si tiene basso mandando al modello i FATTI (poche righe ciascuno),
 * non i testi originali: sono la leva indicata nel PROMPT-CODE-20 PARTE 2, e
 * bastano a rispondere perché sono già la struttura, non la prosa.
 *
 * REGOLA FERREA: se la risposta non è nei fatti, "so" è false e la risposta è
 * "non lo so" — mai una frase plausibile costruita dal buon senso. */

const SISTEMA = `Sei Keiko. Rispondi a una domanda SOLO usando i fatti qui sotto, presi dai documenti di viaggio che l'utente ha caricato. Non usare conoscenza generale, non completare col buon senso, non dedurre nulla che non sia scritto nei fatti.

Rispondi SOLO con un oggetto JSON valido, nessun testo intorno:
{"so": true, "risposta": "risposta breve e diretta, in italiano", "fonti": ["nome del file da cui viene la risposta", "..."]}

Se la risposta alla domanda NON è tra i fatti dati:
{"so": false, "risposta": "Non lo so: non è scritto in nessuno dei documenti che mi hai dato.", "fonti": []}

Non scrivere mai una risposta plausibile che non sia ricavata dai fatti — è meglio dire che non lo sai.`;

interface FattoContesto {
  giorno: string | null;
  ora: string | null;
  tipo: string;
  cosa: string;
  dove: string | null;
  codice: string | null;
  documento: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { tripKey?: string; domanda?: string };
  const tripKey = (body.tripKey ?? "").trim();
  const domanda = (body.domanda ?? "").trim();
  if (!tripKey || !domanda) return NextResponse.json({ error: "Servono tripKey e domanda" }, { status: 400 });

  try {
    const [facts, docs] = await Promise.all([getTripFacts(tripKey), getTripDocuments(tripKey)]);
    if (facts.length === 0) {
      return NextResponse.json({ so: false, risposta: "Non ho ancora nessun documento di questo viaggio da leggere.", fonti: [] });
    }
    const fileNameById = new Map(docs.map((d) => [d.id, d.file_name]));
    const contesto: FattoContesto[] = facts.map((f) => ({
      giorno: f.day,
      ora: f.time_text,
      tipo: f.kind,
      cosa: f.title,
      dove: f.place,
      codice: f.reference,
      documento: fileNameById.get(f.document_id) ?? "documento",
    }));

    await spendAi("cattura");
    const res = await claudeFetch(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system: SISTEMA,
        messages: [
          {
            role: "user",
            content: `FATTI DEL VIAGGIO:\n${JSON.stringify(contesto)}\n\nDOMANDA: "${domanda}"`,
          },
        ],
      },
      undefined,
      { operazione: "cattura", modello: "claude-sonnet-4-5" }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("[trip-docs] ask: Claude API error:", err);
      return NextResponse.json({ error: "Keiko non ha risposto." }, { status: 502 });
    }
    const data = await res.json();
    const testo = (data.content ?? [])
      .filter((b: { type?: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("");
    let parsed: { so?: boolean; risposta?: string; fonti?: string[] };
    try {
      parsed = JSON.parse(testo.replace(/```json|```/g, "").trim());
    } catch {
      console.error("[trip-docs] ask: risposta non-JSON:", testo.slice(0, 300));
      return NextResponse.json({ so: false, risposta: "Non sono riuscita a rispondere: riprova.", fonti: [] });
    }
    return NextResponse.json({
      so: parsed.so ?? false,
      risposta: (parsed.risposta ?? "").trim() || "Non lo so: non è scritto in nessuno dei documenti che mi hai dato.",
      fonti: Array.isArray(parsed.fonti) ? parsed.fonti : [],
    });
  } catch (e) {
    if (isAiCapReached(e)) return NextResponse.json({ error: AI_CAP_MESSAGE }, { status: 429 });
    console.error("[trip-docs] ask fallita:", e);
    return NextResponse.json({ error: "Qualcosa non ha funzionato." }, { status: 500 });
  }
}
