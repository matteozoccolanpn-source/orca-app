import { NextResponse } from "next/server";
import { spotifyArtistImage } from "@/lib/spotify";
import { mealImage } from "@/lib/food";
import { exerciseImage } from "@/lib/wger";
import { weatherFor } from "@/lib/weather";
import { placeImage } from "@/lib/google-places";

// Diagnosi temporanea delle fonti immagine. Apri /api/img-check nel browser (loggato).
// Dice quali chiavi ci sono, lo stato grezzo di Google Places, e un esempio per fonte.
export const dynamic = "force-dynamic";

export async function GET() {
  // stato grezzo della Places API (NEW): mostra l'errore preciso di Google
  let placesStatus = "chiave assente";
  const gkey = process.env.GOOGLE_PLACES_API_KEY;
  if (gkey) {
    try {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": gkey, "X-Goog-FieldMask": "places.photos" },
        body: JSON.stringify({ textQuery: "Roma", maxResultCount: 1 }),
      });
      const txt = await r.text();
      placesStatus = `HTTP ${r.status} — ${txt.slice(0, 300)}`;
    } catch {
      placesStatus = "errore di rete";
    }
  }

  const [spotify, places, spoonIt, spoonEn, weather, wger] = await Promise.all([
    spotifyArtistImage("Ultimo"),
    placeImage("Roma"),
    mealImage("Uova strapazzate"),
    mealImage("scrambled eggs"),
    weatherFor("Milano"),
    exerciseImage("squat"),
  ]);

  return NextResponse.json({
    chiavi_presenti: {
      spotify: !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET,
      google_places: !!process.env.GOOGLE_PLACES_API_KEY,
      spoonacular: !!process.env.SPOONACULAR_KEY,
    },
    google_places_stato: placesStatus,
    esempi: { spotify, places, spoonacular_it: spoonIt, spoonacular_en: spoonEn, meteo: weather, wger },
  });
}
