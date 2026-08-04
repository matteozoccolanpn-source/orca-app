/**
 * VERIFICA K4, seconda parte — la ROTTA vera, da capo a fondo.
 *
 * Qui non chiamo la funzione: chiamo `/api/account/delete` con un cookie di
 * sessione firmato per l'utente finto, esattamente come farebbe il suo browser.
 * Così passo dalla catena completa: cookie → auth() → uid → token → RLS → DELETE.
 * Alla fine controllo che le righe di Matteo e Federica siano intatte.
 */
import { createClient } from "@supabase/supabase-js";
import { encode } from "next-auth/jwt";
import { TABELLE_PERSONALI } from "@/lib/supabase";
import { uuidForEmail } from "@/lib/user";

const MATTEO = "2c875815-a9b2-5a28-9e9e-6051128a8d4d";
const FEDERICA = "0cff1757-ab3c-5567-a138-e4f2cd87f335";
const EMAIL_FINTA = "keiko-prova-k4@example.com";
const FINTO = uuidForEmail(EMAIL_FINTA);
const TABELLE = [...TABELLE_PERSONALI, "usage"];
const BASE = "http://localhost:3000";
const COOKIE = "authjs.session-token"; // in locale niente prefisso __Secure-

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function conta(uid: string): Promise<Record<string, number | string>> {
  const out: Record<string, number | string> = {};
  for (const t of TABELLE) {
    const { count, error } = await svc.from(t).select("*", { count: "exact", head: true }).eq("user_id", uid);
    out[t] = error ? `ERR ${error.message}` : count ?? 0;
  }
  return out;
}

async function semina() {
  const esito: Record<string, string> = {};
  for (const t of TABELLE_PERSONALI) {
    const { data } = await svc.from(t).select("*").limit(1);
    if (!data?.length) { esito[t] = "vuota"; continue; }
    const riga: Record<string, unknown> = { ...data[0], user_id: FINTO };
    delete riga.id;
    if (typeof riga.endpoint === "string") riga.endpoint = riga.endpoint + "-prova-k4b";
    if (typeof riga.cluster_key === "string") riga.cluster_key = "prova-k4b";
    if (t === "workout_set") delete riga.session_id;
    const ins = await svc.from(t).insert(riga);
    esito[t] = ins.error ? `NO: ${ins.error.message}` : "ok";
  }
  const { data: s } = await svc.from("workout_session")
    .insert({ user_id: FINTO, day: "2020-01-02", titolo: "prova k4" }).select("id").single();
  esito.workout_session = s?.id ? "ok" : "NO";
  if (s?.id) {
    const r = await svc.from("workout_set")
      .insert({ session_id: s.id, user_id: FINTO, esercizio: "prova k4", serie: 1, ripetizioni: 1 });
    esito.workout_set = r.error ? `NO: ${r.error.message}` : "ok";
  }
  const u = await svc.from("usage").insert({ user_id: FINTO, giorno: "2020-01-02", origine: "utente", chiamate: 7 });
  esito.usage = u.error ? `NO: ${u.error.message}` : "ok";
  const tr = await svc.from("trips").insert({ user_id: FINTO });
  esito.trips = tr.error ? `NO: ${tr.error.message}` : "ok";
  return esito;
}

function diff(a: Record<string, number | string>, b: Record<string, number | string>) {
  return TABELLE.filter((t) => String(a[t]) !== String(b[t])).map((t) => `${t}: ${a[t]} → ${b[t]}`);
}

async function main() {
  const token = await encode({
    token: { email: EMAIL_FINTA, name: "Prova K4", sub: "prova-k4" },
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE,
  });
  console.log("uid finto:", FINTO);

  console.log("\n--- semino ---");
  console.log(await semina());
  const fintoPrima = await conta(FINTO);
  const matteoPrima = await conta(MATTEO);
  const fedePrima = await conta(FEDERICA);
  console.log("finto PRIMA:", fintoPrima);

  const chiama = (body: string) =>
    fetch(`${BASE}/api/account/delete`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${COOKIE}=${token}` },
      body,
    });

  console.log("\n--- con sessione ma SENZA conferma ---");
  const senza = await chiama("{}");
  console.log(senza.status, await senza.text());
  const dopoSenza = await conta(FINTO);
  console.log("righe del finto toccate:", diff(fintoPrima, dopoSenza).length ? diff(fintoPrima, dopoSenza) : "NESSUNA ✓");

  console.log("\n--- con sessione e conferma SBAGLIATA ---");
  const male = await chiama(JSON.stringify({ conferma: "cancella" }));
  console.log(male.status, await male.text());

  console.log("\n--- con sessione e conferma GIUSTA ---");
  const ok = await chiama(JSON.stringify({ conferma: "CANCELLA" }));
  console.log(ok.status, await ok.text());

  console.log("\n--- dopo ---");
  const fintoDopo = await conta(FINTO);
  console.log("finto DOPO:", fintoDopo);
  const restano = TABELLE.filter((t) => typeof fintoDopo[t] === "number" && (fintoDopo[t] as number) > 0);
  console.log("righe del finto rimaste:", restano.length ? restano.map((t) => `${t}=${fintoDopo[t]}`) : "NESSUNA ✓");
  const dm = diff(matteoPrima, await conta(MATTEO));
  const df = diff(fedePrima, await conta(FEDERICA));
  console.log("Matteo cambiato  :", dm.length ? dm : "NO ✓");
  console.log("Federica cambiata:", df.length ? df : "NO ✓");

  for (const t of TABELLE) await svc.from(t).delete().eq("user_id", FINTO);
  console.log("\nresiduo finto:", await conta(FINTO));
}

main().catch((e) => { console.error("ESPLOSO:", e); process.exit(1); });
