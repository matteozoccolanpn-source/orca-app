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
  | "festa" | "lavoro" | "dieta" | "film" | "viaggio"
  | "salute" | "studio" | "appuntamento" | "default";

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

export function catFor(type?: string | null, title?: string | null): ImageCategory {
  const t = (type ?? "").toLowerCase().trim();
  const direct = TYPE_TO_CAT[t];
  if (direct) return direct;
  // Tipo generico/sconosciuto (es. "other", ""): deduci la categoria dal testo,
  // così anche "visita nutrizionista" o "lezione inglese" hanno un look dedicato
  // invece del gradiente "default" spento (E1 — mai vuoto).
  return inferCategory(`${t} ${title ?? ""}`);
}

// Parole chiave → categoria. Ordine = priorità (la prima che combacia vince).
const KEYWORDS: [RegExp, ImageCategory][] = [
  [/nutrizionist|dietolog|medic|dottor|dentist|visita|analisi|ospedal|clinic|fisioterap|psicolog|terapi|checkup|vaccin|prelievo|ecograf|oculist|dermatolog|tampone/, "salute"],
  [/lezione|cors[oi]\b|esame|univers|scuola|studio|inglese|tutor|ripetizion|laurea|compiti|seminari|workshop|patente/, "studio"],
  [/palestra|allenament|gym|workout|partita|calcio|tennis|corsa|corse|running|yoga|piscina|nuoto|padel|basket|match/, "sport"],
  [/complean|festa|apericena|aperitiv|party|brindisi|nubilato|celibato/, "festa"],
  [/riunion|meeting|call\b|ufficio|colloqui|lavoro|briefing|standup|presentazion/, "lavoro"],
  [/concert|live\b|tour|festival/, "concerto"],
  [/cena|pranzo|ristorante|brunch|colazione|trattoria|pizzeria/, "cena"],
  [/volo|aeroport|flight|imbarco/, "volo"],
  [/treno|stazion|frecciaross|italo/, "treno"],
  [/hotel|albergo|check-?in|soggiorn|\bb&b\b|bnb/, "hotel"],
  [/museo|mostra|galleria|\bexpo\b/, "museo"],
  [/viaggio|vacanz|\btrip\b|gita|weekend fuori/, "viaggio"],
  [/appuntament|incontro/, "appuntamento"],
];

function inferCategory(text: string): ImageCategory {
  const s = text.toLowerCase();
  for (const [re, cat] of KEYWORDS) if (re.test(s)) return cat;
  return "default";
}

// Emoji di riserva per categoria: se l'evento non ha un'emoji propria, la card
// mostra comunque un'icona sensata (mai vuoto).
const GLYPH: Record<ImageCategory, string> = {
  cena: "🍽️", volo: "✈️", treno: "🚆", concerto: "🎵", sport: "🏋️", hotel: "🏨",
  museo: "🏛️", festa: "🎉", lavoro: "💼", dieta: "🥗", film: "🍿", viaggio: "🧭",
  salute: "🩺", studio: "📚", appuntamento: "📌", default: "🗓️",
};

export function glyphFor(category: ImageCategory): string {
  return GLYPH[category] ?? "🗓️";
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
  "festa", "lavoro", "dieta", "film", "viaggio",
  "salute", "studio", "appuntamento", "default",
];
