// Sceglie la fonte immagine giusta in base al TIPO di evento:
//  - concerto → Spotify (foto artista)
//  - sport    → TheSportsDB (evento/squadra)
//  - ristorante/hotel/museo/treno/volo → Google Places (foto del luogo)
//  - altro (cena, generico) → null → gradiente
// Ogni fonte è "a prova di errore": senza chiave restituisce null.

import { spotifyArtistImage } from "./spotify";
import { sportEventImage } from "./sportsdb";
import { placeImage as googlePlaceImage } from "./google-places";
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

export async function resolveEventImage(type: string, title: string, location: string | null): Promise<string | null> {
  const t = (type ?? "").toLowerCase();
  let specific: string | null = null;
  if (t === "concert") specific = await spotifyArtistImage(artistFromTitle(title));
  else if (t === "sport") specific = await sportEventImage(title);
  else if (PLACE_TYPES.has(t)) {
    const loc = (location ?? "").trim();
    specific = loc ? await googlePlaceImage(loc.split(",")[0].trim()) : null;
  }
  if (specific) return specific;
  // Fallback (E1+): foto a tema Unsplash per categoria, variata per titolo.
  // Se anche questa manca, nel client resta l'illustrazione di categoria.
  const category = catFor(type, title);
  return unsplashPhoto(CAT_QUERY[category] ?? CAT_QUERY.default, title);
}
