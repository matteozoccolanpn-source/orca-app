// Sceglie la fonte immagine giusta in base al TIPO di evento:
//  - concerto → Spotify (foto artista)
//  - sport    → TheSportsDB (evento/squadra)
//  - ristorante/hotel/museo/treno/volo → Google Places (foto del luogo)
//  - altro (cena, generico) → null → gradiente
// Ogni fonte è "a prova di errore": senza chiave restituisce null.

import { spotifyArtistImage } from "./spotify";
import { sportEventImage } from "./sportsdb";
import { placeImage as googlePlaceImage } from "./google-places";

function artistFromTitle(title: string): string {
  // "Ultimo - Stadio San Siro" → "Ultimo"
  return (title ?? "").split(/\s*[-–—@|]\s*/)[0].trim();
}

const PLACE_TYPES = new Set(["restaurant", "hotel", "museum", "train", "flight", "train_station"]);

export async function resolveEventImage(type: string, title: string, location: string | null): Promise<string | null> {
  const t = (type ?? "").toLowerCase();
  if (t === "concert") return spotifyArtistImage(artistFromTitle(title));
  if (t === "sport") return sportEventImage(title);
  if (PLACE_TYPES.has(t)) {
    const loc = (location ?? "").trim();
    return loc ? googlePlaceImage(loc.split(",")[0].trim()) : null;
  }
  return null;
}
