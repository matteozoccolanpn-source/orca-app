// Sistema immagini del redesign — il "cervello" che decide QUALE immagine
// mostra ogni card, con una cascata: foto specifica → pool categoria →
// gradiente di categoria (livello 0, sempre disponibile, zero raccolta foto).
//
// Livello 0 (ora): ogni card usa il gradiente della sua categoria. Deterministico
// per costruzione → la stessa entità mostra lo stesso look in home e nelle sezioni
// (coerenza), senza bisogno di salvare nulla su DB.
// Livello 1+ (dopo): se `entity.image` contiene una foto reale (TMDB/Places/pool
// curato), quella vince; il gradiente resta come fallback se la foto non carica.

export type ImageCategory =
  | "cena" | "volo" | "treno" | "concerto" | "sport" | "hotel" | "museo"
  | "festa" | "lavoro" | "dieta" | "film" | "viaggio" | "default";

export type ImageResult = {
  /** Foto reale, se disponibile (livello 1+). */
  url?: string;
  /** Gradiente CSS di categoria — sempre presente (livello 0 / fallback). */
  gradient: string;
  category: ImageCategory;
};

// Mappa il "type" degli eventi dell'app → categoria immagine.
const TYPE_TO_CAT: Record<string, ImageCategory> = {
  restaurant: "cena", dinner: "cena", cena: "cena",
  flight: "volo", volo: "volo",
  train: "treno", treno: "treno",
  concert: "concerto", concerto: "concerto",
  sport: "sport", gp: "sport",
  hotel: "hotel",
  museum: "museo", museo: "museo",
  party: "festa", festa: "festa", compleanno: "festa",
  work: "lavoro", meeting: "lavoro", lavoro: "lavoro",
  diet: "dieta", dieta: "dieta",
  watch: "film", film: "film",
  travel: "viaggio", viaggio: "viaggio",
};

export function catFor(type?: string | null): ImageCategory {
  const t = (type ?? "").toLowerCase().trim();
  return TYPE_TO_CAT[t] ?? "default";
}

/** Gradiente CSS della categoria (definito in app/ds.css come --k-cat-*). */
export function gradientFor(category: ImageCategory): string {
  return `var(--k-cat-${category})`;
}

/** Hash stabile: stessa stringa → stesso numero (per scelta deterministica dai pool). */
export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Indice deterministico dentro un pool di N foto: stessa entità → stessa foto,
 *  entità diverse → foto diverse. (Usato quando esisteranno i pool reali, livello 2.) */
export function poolIndex(id: string, count: number): number {
  return count > 0 ? hashStr(id) % count : 0;
}

/** Risolve l'immagine di un'entità. Livello 0: gradiente categoria.
 *  Se `image` è una foto reale, quella vince (gradiente resta come fallback). */
export function resolveImage(entity: {
  id?: string;
  type?: string | null;
  category?: ImageCategory;
  image?: string | null;
}): ImageResult {
  const category = entity.category ?? catFor(entity.type);
  const gradient = gradientFor(category);
  if (entity.image && /^https?:\/\//.test(entity.image)) {
    return { url: entity.image, gradient, category };
  }
  return { gradient, category };
}

/** Tutte le categorie (per anteprima palette). */
export const ALL_CATEGORIES: ImageCategory[] = [
  "cena", "concerto", "sport", "volo", "treno", "hotel", "museo",
  "festa", "lavoro", "dieta", "film", "viaggio", "default",
];
