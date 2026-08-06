// Sceglie la fonte immagine giusta in base al TIPO di evento:
//  - concerto → Spotify (foto artista)
//  - sport    → TheSportsDB (evento/squadra)
//  - ristorante/hotel/museo/treno/volo → Google Places (foto del luogo)
//  - altro (cena, generico) → null → gradiente
// Ogni fonte è "a prova di errore": senza chiave restituisce null.

import { spotifyArtistImage } from "./spotify";
import { sportEventImage } from "./sportsdb";
import { placePhotoName, placePhotoUrl } from "./google-places";
import { savePlacePhotoName, type EventEnrichment } from "./supabase";
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
