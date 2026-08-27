// Google Places API (New) — foto reale di un luogo (ristorante, hotel, museo, città…).
// Server-side: usa GOOGLE_PLACES_API_KEY. Restituisce il "photo name" (risorsa);
// l'immagine vera passa dal nostro proxy /api/place-photo (chiave mai nel client).
// Senza chiave o senza risultato → null (resta il gradiente).

export async function placePhotoName(query: string): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.photos",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
      cache: "no-store",
    });
    // Ogni riga di queste è una chiamata a pagamento: se ne compaiono tante
    // uguali, vuol dire che qualcuno non sta usando il nome già salvato.
    console.log(JSON.stringify({ tag: "places.searchText", query: q }));
    if (!res.ok) return null;
    const d = await res.json();
    const name = d?.places?.[0]?.photos?.[0]?.name; // es. "places/XXX/photos/YYY"
    return typeof name === "string" ? name : null;
  } catch {
    return null;
  }
}

// URL (interno) da mettere in <img src>: passa dal proxy, niente chiave nel client.
export function placePhotoUrl(name: string | null): string | null {
  return name ? `/api/place-photo?name=${encodeURIComponent(name)}` : null;
}

// Comodo: dalla query direttamente all'URL proxy (o null).
export async function placeImage(query: string): Promise<string | null> {
  return placePhotoUrl(await placePhotoName(query));
}

/* ═════════ LA FOTO VERIFICATA (Viaggi, PARTE 3 — 27 agosto 2026) ═════════
 *
 * `placePhotoName` sopra prende il primo risultato e basta: va bene per un
 * ristorante o un hotel dei Battiti, dove una foto anche non perfetta non fa
 * danno. Per un fatto di viaggio la regola è diversa e non negoziabile:
 * un'immagine sbagliata (la Grande Muraglia con la foto di un tempio a caso)
 * è peggio di nessuna immagine. Qui si aggiunge un secondo controllo, oltre
 * al nome: il TIPO di luogo che Google Places dice di aver trovato deve
 * corrispondere al tipo di fatto che si sta cercando. Se Google restituisce
 * un risultato ma non è classificato come un hotel (per una ricerca di
 * hotel) o come un'attrazione/museo/parco (per una visita), non ci si fida —
 * anche se una foto tecnicamente esiste. */

export type LuogoAtteso = "hotel" | "attrazione";

const TIPI_ATTESI: Record<LuogoAtteso, string[]> = {
  hotel: ["lodging"],
  attrazione: [
    "tourist_attraction", "museum", "park", "landmark", "historical_landmark",
    "monument", "place_of_worship", "national_park", "hiking_area", "zoo",
    "aquarium", "cultural_landmark", "natural_feature", "hindu_temple",
    "buddhist_temple", "church", "mosque",
    // "scenic_spot": trovato collaudando sul viaggio in Cina vero (27 agosto
    // 2026) — il tipo che Google Places (New) usa per un belvedere/punto
    // panoramico ("Alba dal monte Xianggong"), assente dall'elenco iniziale.
    "scenic_spot",
  ],
};

export async function placePhotoNameVerificato(query: string, atteso: LuogoAtteso): Promise<string | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const q = (query ?? "").trim();
  if (!key || !q) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.photos,places.types",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
      cache: "no-store",
    });
    console.log(JSON.stringify({ tag: "places.searchText.viaggio", query: q, atteso }));
    if (!res.ok) return null;
    const d = await res.json();
    const p = d?.places?.[0];
    const name = p?.photos?.[0]?.name;
    if (typeof name !== "string") return null;
    const tipiTrovati: string[] = Array.isArray(p?.types) ? p.types : [];
    const combacia = TIPI_ATTESI[atteso].some((t) => tipiTrovati.includes(t));
    if (!combacia) {
      console.log(JSON.stringify({ tag: "places.viaggio.scartata", query: q, atteso, tipiTrovati }));
      return null;
    }
    return name;
  } catch {
    return null;
  }
}
