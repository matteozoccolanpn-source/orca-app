import SwipeShell from "./components/SwipeShell";
import KeikoPreview from "./components/keiko/KeikoPreview";
import KeikoHomeV4 from "./components/keiko/KeikoHomeV4";
import { mapLive } from "./components/keiko/keikoLive";
import { getUpcomingTickets, getDietPlan, getWorkoutPlan, getTrainedDays, getAllTripPlans, getTodos, getWatchlist } from "@/lib/supabase";
import { posterFor } from "@/lib/tmdb";
import { placeImage, placeQueryForEvent } from "@/lib/place-image";
import { signOut } from "@/auth";

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
  const classic = "classic" in sp;
  const v2 = "v2" in sp;   // paracadute: Home precedente
  const [events, diet, workout, trainedDays, trips, todos, watchlist] = await Promise.all([
    getUpcomingTickets(),
    getDietPlan(),
    getWorkoutPlan(),
    getTrainedDays(),
    getAllTripPlans(),
    getTodos(),
    getWatchlist(),
  ]);

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
  const live = mapLive({
    events,
    todos,
    diet: diet?.week ?? null,
    workout: workout?.week ?? null,
    trainedDays,
    trips,
    watch: watchlist,
  });
  // Locandina reale (TMDB) per il riquadro "Guarda" della home (se c'è la chiave).
  if (live.watch?.title) {
    live.watch = { ...live.watch, poster: await posterFor(live.watch.title, "film") };
  }

  // Foto dei luoghi (Wikipedia, gratis) per eroe + "in arrivo" + viaggio.
  // Solo per luoghi riconoscibili; altrimenti resta il gradiente.
  const eventsToPhoto = [...live.heroEvents, ...live.upcoming.slice(0, 6)];
  await Promise.all([
    ...eventsToPhoto.map(async (e) => {
      const q = placeQueryForEvent(e.type, e.location, e.title);
      if (q) e.image = await placeImage(q);
    }),
    (async () => {
      if (live.trip?.title) live.trip = { ...live.trip, image: await placeImage(live.trip.title) };
    })(),
  ]);
  // Paracadute: la Home precedente resta raggiungibile su /?v2.
  if (v2) return <KeikoPreview live={live} logoutAction={logout} />;
  // Default: la nuova Home redesign.
  return <KeikoHomeV4 live={live} logoutAction={logout} />;
}
