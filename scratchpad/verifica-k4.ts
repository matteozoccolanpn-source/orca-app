/**
 * VERIFICA K4 — "cancella tutti i miei dati" cancella SOLO i dati di chi chiede.
 *
 * Metodo (nessun dato vero viene toccato):
 *   1. invento un TERZO utente ("keiko-prova-k4@example.com") — non è nella
 *      lista invitati, quindi non potrebbe nemmeno entrare nell'app;
 *   2. gli copio addosso una riga per ogni tabella (copio una riga esistente,
 *      cambio il proprietario: così le colonne sono per forza giuste);
 *   3. conto le righe di Matteo e Federica PRIMA;
 *   4. eseguo la cancellazione col SUO token (stesso identico codice dell'app);
 *   5. conto di nuovo: le sue devono essere 0, quelle degli altri due identiche;
 *   6. prova dell'attacco: col token del finto provo a cancellare le righe di
 *      Matteo → devono restare tutte;
 *   7. pulizia finale.
 */
import { createClient } from "@supabase/supabase-js";
import { deleteDataForUser, deleteUsageForUser, TABELLE_PERSONALI } from "@/lib/supabase";
import { uuidForEmail } from "@/lib/user";
import { mintSupabaseJwt } from "@/lib/supabase-jwt";

const MATTEO = "2c875815-a9b2-5a28-9e9e-6051128a8d4d";
const FEDERICA = "0cff1757-ab3c-5567-a138-e4f2cd87f335";
const FINTO = uuidForEmail("keiko-prova-k4@example.com");

const TABELLE = [...TABELLE_PERSONALI, "usage"];

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

function comeUtente(uid: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${mintSupabaseJwt(uid)}` } },
  });
}

async function conta(uid: string): Promise<Record<string, number | string>> {
  const out: Record<string, number | string> = {};
  for (const t of TABELLE) {
    const { count, error } = await svc.from(t).select("*", { count: "exact", head: true }).eq("user_id", uid);
    out[t] = error ? `ERR ${error.code ?? ""} ${error.message}` : count ?? 0;
  }
  return out;
}

async function semina(): Promise<Record<string, string>> {
  const esito: Record<string, string> = {};
  for (const t of TABELLE) {
    const { data, error } = await svc.from(t).select("*").limit(1);
    if (error) { esito[t] = `tabella non leggibile: ${error.message}`; continue; }
    if (!data?.length) { esito[t] = "vuota: niente da copiare"; continue; }
    const riga: Record<string, unknown> = { ...data[0], user_id: FINTO };
    delete riga.id;                                    // lascia fare al default
    if (typeof riga.endpoint === "string") riga.endpoint = riga.endpoint + "-prova-k4";
    if (typeof riga.cluster_key === "string") riga.cluster_key = "prova-k4";
    if (t === "workout_set") delete riga.session_id;    // la lego dopo, se serve
    const ins = await svc.from(t).insert(riga);
    esito[t] = ins.error ? `NON seminata: ${ins.error.message}` : "seminata (copia)";
  }

  // Le tabelle vuote non si possono copiare: qui le righe le scrivo a mano.
  if (esito.workout_session?.startsWith("vuota")) {
    const { data, error } = await svc
      .from("workout_session")
      .insert({ user_id: FINTO, day: "2020-01-01", titolo: "prova k4" })
      .select("id")
      .single();
    esito.workout_session = error ? `NON seminata: ${error.message}` : "seminata (a mano)";
    if (data?.id && esito.workout_set?.startsWith("vuota")) {
      const s = await svc.from("workout_set").insert({
        session_id: data.id, user_id: FINTO, esercizio: "prova k4", serie: 1, ripetizioni: 1,
      });
      esito.workout_set = s.error ? `NON seminata: ${s.error.message}` : "seminata (a mano)";
    }
  }
  if (esito.usage?.startsWith("vuota")) {
    const { error } = await svc.from("usage").insert({ user_id: FINTO, giorno: "2020-01-01", origine: "utente", chiamate: 3 });
    esito.usage = error ? `NON seminata: ${error.message}` : "seminata (a mano)";
  }
  if (esito.trips?.startsWith("vuota")) {
    const { error } = await svc.from("trips").insert({ user_id: FINTO });
    esito.trips = error ? `NON seminata: ${error.message}` : "seminata (a mano)";
  }
  return esito;
}

function diff(prima: Record<string, number | string>, dopo: Record<string, number | string>): string[] {
  return TABELLE.filter((t) => String(prima[t]) !== String(dopo[t])).map((t) => `${t}: ${prima[t]} → ${dopo[t]}`);
}

async function main() {
  console.log("uid finto:", FINTO);
  console.log("\n--- 1. semino il finto ---");
  console.log(await semina());

  const fintoPrima = await conta(FINTO);
  const matteoPrima = await conta(MATTEO);
  const fedePrima = await conta(FEDERICA);
  console.log("\n--- 2. righe PRIMA ---");
  console.log("finto   :", fintoPrima);
  console.log("matteo  :", matteoPrima);
  console.log("federica:", fedePrima);

  console.log("\n--- 3. PROVA DELL'ATTACCO: token del finto, uid di Matteo ---");
  const attacco = await deleteDataForUser(comeUtente(FINTO), MATTEO);
  console.log(attacco.map((e) => `${e.tabella}: ${e.righe}${e.errore ? " ERR " + e.errore : ""}${e.saltata ? " (saltata)" : ""}`).join("\n"));

  const matteoDopoAttacco = await conta(MATTEO);
  const dannoAttacco = diff(matteoPrima, matteoDopoAttacco);
  console.log("righe di Matteo cambiate dall'attacco:", dannoAttacco.length ? dannoAttacco : "NESSUNA ✓");

  console.log("\n--- 4. cancellazione vera, col token del finto e il suo uid ---");
  const esiti = await deleteDataForUser(comeUtente(FINTO), FINTO);
  esiti.push(await deleteUsageForUser(FINTO));
  console.log(esiti.map((e) => `${e.tabella}: ${e.righe}${e.errore ? " ERR " + e.errore : ""}${e.saltata ? " (saltata)" : ""}`).join("\n"));

  const fintoDopo = await conta(FINTO);
  const matteoDopo = await conta(MATTEO);
  const fedeDopo = await conta(FEDERICA);
  console.log("\n--- 5. righe DOPO ---");
  console.log("finto   :", fintoDopo);
  const restano = TABELLE.filter((t) => typeof fintoDopo[t] === "number" && (fintoDopo[t] as number) > 0);
  console.log("righe del finto rimaste:", restano.length ? restano.map((t) => `${t}=${fintoDopo[t]}`) : "NESSUNA ✓");
  const dm = diff(matteoPrima, matteoDopo);
  const df = diff(fedePrima, fedeDopo);
  console.log("Matteo cambiato  :", dm.length ? dm : "NO ✓");
  console.log("Federica cambiata:", df.length ? df : "NO ✓");

  console.log("\n--- 6. pulizia (col servizio, per sicurezza) ---");
  for (const t of TABELLE) {
    const { error } = await svc.from(t).delete().eq("user_id", FINTO);
    if (error && !error.message.includes("does not exist")) console.log(`pulizia ${t}: ${error.message}`);
  }
  console.log("residuo finto:", await conta(FINTO));
}

main().catch((e) => { console.error("ESPLOSO:", e); process.exit(1); });
