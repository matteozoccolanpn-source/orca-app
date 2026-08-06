// Sceglie la fonte immagine giusta in base al TIPO di evento:
//  - concerto → Spotify (foto artista)
//  - sport    → TheSportsDB (evento/squadra)
//  - ristorante/hotel/museo/treno/volo → Google Places (foto del luogo)
//  - altro (cena, generico) → null → gradiente
// Ogni fonte è "a prova di errore": senza chiave restituisce null.

import { spotifyArtistImage } from "./spotify";
import { sportEventImage } from "./sportsdb";
import { placePhotoName, placePhotoUrl } from "./google-places";
import { savePlacePhotoName, saveArtistPhoto, type EventEnrichment } from "./supabase";
import { gradientFor } from "./smart-image";
import type { ImmagineDa } from "./battiti";
import { catFor } from "./smart-image";
import { unsplashPhoto } from "./unsplash";

function artistFromTitle(title: string): string {
  // "Ultimo - Stadio San Siro" → "Ultimo"
  return (title ?? "").split(/\s*[-–—@|]\s*/)[0].trim();
}

const PLACE_TYPES = new Set(["restaurant", "hotel", "museum", "train", "flight", "train_station"]);

// Termine di ricerca Unsplash per categoria (fallback quando non c'è una foto
// specifica di luogo/artista). In inglese per risultati migliori.
const CAT_QUERY: Record<string, string> = {
  cena: "restaurant dinner table", volo: "airport airplane", treno: "train railway station",
  concerto: "concert live music stage", sport: "stadium sport", hotel: "hotel room",
  museo: "museum art gallery", festa: "party celebration", lavoro: "office meeting",
  dieta: "healthy food", film: "cinema movie", viaggio: "travel landscape",
  salute: "medical clinic health", studio: "study desk books", appuntamento: "calendar planner",
  default: "minimal lifestyle",
};

/** L'evento a cui appartiene la foto: serve solo per ricordarsi il risultato.
 *  Senza, la ricerca su Google riparte a ogni apertura della home. */
export type EventoDaRicordare = { id: string; enrichment: EventEnrichment | null };

/** La foto del luogo, cercata su Google UNA volta sola per evento.
 *  Se il nome è già in `enrichment`, Google non viene chiamato affatto. */
async function fotoDelLuogo(location: string | null, evento?: EventoDaRicordare): Promise<string | null> {
  const loc = (location ?? "").trim();
  if (!loc) return null;

  // Già cercata in passato: si riusa, anche quando l'esito era "non trovata".
  const ricordata = evento?.enrichment?.placePhoto;
  if (ricordata) return placePhotoUrl(ricordata.name);

  const name = await placePhotoName(loc.split(",")[0].trim());
  // Si salva anche il null: un evento senza foto non deve ripagare la ricerca
  // ogni volta che apri la home.
  if (evento?.id) await savePlacePhotoName(evento.id, name);
  return placePhotoUrl(name);
}

export async function resolveEventImage(
  type: string,
  title: string,
  location: string | null,
  evento?: EventoDaRicordare
): Promise<string | null> {
  const t = (type ?? "").toLowerCase();
  let specific: string | null = null;
  if (t === "concert") specific = await spotifyArtistImage(artistFromTitle(title));
  else if (t === "sport") specific = await sportEventImage(title);
  else if (PLACE_TYPES.has(t)) specific = await fotoDelLuogo(location, evento);
  if (specific) return specific;
  // Fallback (E1+): foto a tema Unsplash per categoria, variata per titolo.
  // Se anche questa manca, nel client resta l'illustrazione di categoria.
  const category = catFor(type, title);
  return unsplashPhoto(CAT_QUERY[category] ?? CAT_QUERY.default, title);
}


// ============================================================================
// LA FOTO DEI BATTITI (docs/SPEC-BATTITI.md)
//
// Stessa disciplina di Google Places, imparata a spese nostre: una chiamata
// esterna si fa UNA volta nella vita dell'evento, e l'esito si ricorda SEMPRE —
// compreso il "non trovato". Senza quella memoria, un artista che Deezer non
// conosce farebbe ripartire la ricerca a ogni apertura della home, per sempre.
//
// Server-side soltanto: l'indirizzo IP dell'utente non deve arrivare a Deezer.
// ============================================================================

/** L'evento con quel poco che serve a risolvere una foto. */
export type EventoPerFoto = {
  id: string;
  title: string;
  type: string;
  location: string | null;
  enrichment: EventEnrichment | null;
};

/** La foto dell'artista, da Deezer. null se non c'è (e il null si ricorda).
 *  Non lancia mai e non fa aspettare: 1,5 secondi e poi si passa oltre. */
async function fotoArtista(nome: string, evento: EventoPerFoto): Promise<string | null> {
  // Già cercata una volta: si riusa l'esito, qualunque fosse.
  const ricordata = evento.enrichment?.artistPhoto;
  if (ricordata) return ricordata.url;

  const q = (nome ?? "").trim();
  if (!q) return null;

  let url: string | null = null;
  try {
    // Una riga per chiamata: se un giorno ne compaiono tante uguali, vuol dire
    // che qualcuno ha rotto la cache e ce ne accorgiamo dai log.
    console.log(JSON.stringify({ tag: "deezer.artist", q }));
    const taglia = AbortSignal.timeout(1500);
    const res = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=1`, {
      signal: taglia,
      cache: "no-store",
    });
    if (res.ok) {
      const d = await res.json();
      const primo = (d?.data ?? [])[0] as { picture_xl?: string; picture_big?: string } | undefined;
      const trovata = primo?.picture_xl || primo?.picture_big || null;
      url = typeof trovata === "string" && trovata.startsWith("http") ? trovata : null;
    }
  } catch (e) {
    // Timeout o rete: si salva "non trovato" e si riproverà solo se un giorno
    // si cancella il campo. Meglio una card sobria che una home che aspetta.
    console.warn("[deezer] ricerca fallita per", q, e instanceof Error ? e.message : e);
  }

  // Si salva SEMPRE, anche il null: è quello che ferma le chiamate ripetute.
  await saveArtistPhoto(evento.id, url);
  return url;
}

/** La foto del luogo dell'evento, con la cache che c'è già (placePhoto). */
async function fotoLuogo(evento: EventoPerFoto): Promise<string | null> {
  return fotoDelLuogo(evento.location, { id: evento.id, enrichment: evento.enrichment });
}

/** Risolve la catena della riga: primo gradino che dà una foto, vince.
 *  Se non ne dà nessuno resta null e la card userà il gradiente di categoria —
 *  che non è un errore, è il livello 0 del design system. */
export async function immaginePerBattito(
  catena: ImmagineDa[],
  evento: EventoPerFoto,
  artista: string
): Promise<{ foto: string | null; gradiente: string; categoria: string }> {
  const categoria = catFor(evento.type, evento.title);
  let foto: string | null = null;
  for (const passo of catena) {
    try {
      foto = passo === "artista" ? await fotoArtista(artista, evento) : await fotoLuogo(evento);
    } catch (e) {
      console.warn("[battiti] foto non risolta:", e);
      foto = null;
    }
    if (foto) break;
  }
  return { foto, gradiente: gradientFor(categoria), categoria };
}
