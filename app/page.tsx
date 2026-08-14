import SwipeShell from "./components/SwipeShell";
import KeikoPreview from "./components/keiko/KeikoPreview";
import type { WorkoutSetRow } from "@/lib/supabase";
import KeikoHomeV4 from "./components/keiko/KeikoHomeV4";
import { mapLive } from "./components/keiko/keikoLive";
import { getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays, getAllTripPlans, getTodos, getWatchlist, getOnboardedAt, getTicketsForBeats, saveBeatState, getLastPerformance, getPastiAnnotatiConRicetta } from "@/lib/supabase";
import { battitoDiOggi, GIORNI_INDIETRO, GIORNI_AVANTI, type Battito } from "@/lib/battiti";
import { immaginePerBattito } from "@/lib/event-image";
import { posterFor } from "@/lib/tmdb";
import { resolveEventImage } from "@/lib/event-image";
import { cityImage } from "@/lib/unsplash";
import { weatherFor } from "@/lib/weather";
import { mealImage } from "@/lib/food";
import { exerciseImage } from "@/lib/wger";
import { signOut } from "@/auth";
import { requireLogin } from "@/lib/require-login";

// La home deve SEMPRE leggere i dati freschi da Supabase: senza questo, Next.js
// può servire una versione in cache e gli eventi appena aggiunti non compaiono
// finché non si forza un ricaricamento. (Causa del "sembra non salvato".)
export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Home di default = REDESIGN v4 (KeikoHomeV4). Paracadute non cancellati:
  //   /?v2      → KeikoPreview (la Home usata finora)
  //   /?classic → SwipeShell   (la primissima Home)
  const sp = await searchParams;
  // Il nome dell'account Google: l'onboarding non lo chiede più, lo mostra.
  const session = await requireLogin();
  const classic = "classic" in sp;
  const v2 = "v2" in sp;   // paracadute: Home precedente
  // `onboardedAt` viaggia insieme al resto (K14b): niente chiamata di rete in
  // più dal telefono, è una query in parallelo alle altre.
  const [events, diet, workout, trainedDays, trips, todos, watchlist, onboardedAt] = await Promise.all([
    getUpcomingTickets(),
    getDietPlan(),
    getWorkoutPlan(),
    getTrainedDays(),
    getAllTripPlans(),
    getTodos(),
    getWatchlist(),
    getOnboardedAt(),
  ]);

  /* «L'ultima volta» degli esercizi di oggi NON si legge qui.
     Misurato: cinque letture in fila costavano ~330ms sulla mediana di ogni
     apertura della Home — e sono un dato che si vede solo aprendo il pannello
     dell'allenamento. Pagare all'apertura della pagina piu' usata dell'app un
     dato che quasi sempre nessuno guarda e' pagare nel posto sbagliato.
     Quindi e' una server action, che il pannello chiama quando si apre: niente
     rotta nuova in app/api, e `getLastPerformance` resta la stessa funzione
     che usa gia' la pagina Allenamento. */
  async function leggiUltimaVolta(nomi: string[]): Promise<Record<string, WorkoutSetRow[]>> {
    "use server";
    await requireLogin();
    const fuori: Record<string, WorkoutSetRow[]> = {};
    const unici = [...new Set(nomi.filter(Boolean))].slice(0, 20);
    (await Promise.all(unici.map((n) => getLastPerformance(n)))).forEach((righe, i) => {
      if (righe.length > 0) fuori[unici[i]] = righe;
    });
    return fuori;
  }

  // Server action passata all'appbar della Home per il logout discreto.
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  // Home vecchia: solo dietro /?classic (non cancellata, resta raggiungibile).
  if (classic) {
    return (
      <SwipeShell
        events={events}
        trips={trips}
        todos={todos}
        watchCount={watchlist.filter((w) => !w.seen).length}
        diet={diet?.week ?? null}
        dietUpdatedAt={diet?.updatedAt ?? null}
        workout={workout?.week ?? null}
        workoutUpdatedAt={workout?.updatedAt ?? null}
        trainedDays={trainedDays}
        logoutAction={logout}
      />
    );
  }

  // Default (e alias /?v2): home nuova con dati veri. Mapping in keikoLive.
  /* Le annotazioni di OGGI, col titolo della ricetta dove c'e': servono a
     «come si cucina» nel pannello del cibo. Una lettura sola, e le ricette si
     chiedono solo se un pasto ne ha una. */
  const annotazioniOggi = await getPastiAnnotatiConRicetta(new Date().toISOString().slice(0, 10));

  const live = mapLive({
    events,
    todos,
    diet: diet?.week ?? null,
    workout: workout?.week ?? null,
    trainedDays,
    trips,
    watch: watchlist,
      annotazioni: annotazioniOggi,
  });
  // Arricchimento foto/meteo. RESILIENTE: se qualcosa va storto la home si
  // carica lo stesso (senza quelle foto) invece di dare errore/503.
  try {
    if (live.watch?.title) {
      live.watch = { ...live.watch, poster: await posterFor(live.watch.title, "film") };
    }
    const eventsToPhoto = [...live.heroEvents, ...live.upcoming.slice(0, 6)];
    await Promise.all([
      ...eventsToPhoto.map(async (e) => {
        const [img, w] = await Promise.all([
          // L'evento si passa per intero: così il nome della foto di Google si
          // cerca una volta e poi si riusa da `enrichment`, invece di ripagarlo
          // a ogni apertura della home.
          resolveEventImage(e.type, e.title, e.location, { id: e.id, enrichment: e.enrichment }),
          e.location ? weatherFor(e.location) : Promise.resolve(null),
        ]);
        e.image = img;
        e.weather = w;
      }),
      // Viaggio/città: foto vera da Unsplash (se c'è la chiave), altrimenti gradiente.
      (async () => {
        if (live.trip?.title) live.trip = { ...live.trip, image: await cityImage(live.trip.title) };
      })(),
      (async () => {
        const food = live.diet?.nextOpt || live.diet?.nextPasto;
        if (live.diet && food) live.diet = { ...live.diet, image: await mealImage(food) };
      })(),
      (async () => {
        const ex = live.gym?.first || live.gym?.title;
        if (live.gym && ex && !live.gym.rest) live.gym = { ...live.gym, image: await exerciseImage(ex) };
      })(),
    ]);
  } catch (e) {
    console.error("Arricchimento home fallito (la pagina si carica comunque):", e);
  }

  /* I BATTITI (docs/SPEC-BATTITI.md). Un solo battito in home, il più fresco;
     se non ne batte nessuno la card non esiste — mai uno stato vuoto.
     Come tutto il resto dell'arricchimento: se qualcosa va storto, la home si
     carica lo stesso, semplicemente senza battito. */
  let battito: Battito | null = null;
  try {
    const eventi = await getTicketsForBeats(GIORNI_INDIETRO, GIORNI_AVANTI);
    battito = battitoDiOggi(eventi);
    // Si segna "mostrato" UNA volta sola: serve a E2 (chi ha già visto il
    // battito in home non deve riceverlo anche in notifica). Se è già segnato
    // non si riscrive niente, così aprire la home non costa una scrittura.
    if (battito) {
      const evento = eventi.find((e) => e.id === battito!.eventoId);
      const gia = evento?.beats?.[battito.chiave];
      if (!gia) await saveBeatState(battito.eventoId, battito.chiave, "mostrato");
      // La foto della card: la catena la decide la tabella dei battiti, le
      // chiamate esterne le fa una volta sola e le ricorda (anche i buchi).
      if (evento) {
        const { foto, categoria } = await immaginePerBattito(battito.immagini, evento, battito.artista);
        battito = { ...battito, foto, categoria };
      }
    }
  } catch (e) {
    console.error("Battiti non disponibili (la home si carica comunque):", e);
  }
  // Paracadute: la Home precedente resta raggiungibile su /?v2.
  if (v2) return <KeikoPreview live={live} logoutAction={logout} />;
  // Default: la nuova Home redesign.
  return <KeikoHomeV4 live={live} logoutAction={logout} accountName={session.user?.name ?? ""} onboardedAt={onboardedAt} battito={battito} chiediUltimaVolta={leggiUltimaVolta} />;
}
