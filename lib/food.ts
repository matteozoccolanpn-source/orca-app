// Spoonacular — foto di un piatto dal nome. Server-side: usa SPOONACULAR_KEY.
// Spoonacular è tarato sull'INGLESE, quindi prima traduciamo il nome italiano in
// un termine di ricerca inglese semplice, con Claude (stesso modello dell'app).
// La traduzione è in cache 30 giorni: per lo stesso pasto Claude gira una volta sola.
// Senza chiave → null (resta il gradiente).

import { unstable_cache } from "next/cache";

const MODEL = "claude-sonnet-4-5";

const translateFood = unstable_cache(
  async (itName: string): Promise<string> => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return itName;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 30,
          system:
            "Traduci il nome di un cibo/pasto italiano in un termine di ricerca INGLESE semplice e generico, adatto a un database di ricette. Esempi: 'Uova strapazzate' -> 'scrambled eggs'; 'Petto di pollo alla griglia' -> 'grilled chicken breast'; 'Yogurt greco' -> 'greek yogurt'. Rispondi SOLO col termine inglese, nient'altro.",
          messages: [{ role: "user", content: itName }],
        }),
        cache: "no-store",
      });
      if (!res.ok) return itName;
      const data = await res.json();
      const text = (data?.content ?? [])
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("")
        .trim();
      return text || itName;
    } catch {
      return itName;
    }
  },
  ["food-translate-it-en"],
  { revalidate: 2592000 } // 30 giorni
);

export async function mealImage(name: string): Promise<string | null> {
  const key = process.env.SPOONACULAR_KEY;
  // prendi la prima opzione e togli quantità/grammi:
  // "Uova strapazzate/sode 2 +" → "Uova strapazzate"
  const clean = (name ?? "")
    .split("/")[0]
    .split(",")[0]
    .replace(/\d+[.,]?\d*\s*(g|gr|ml|kg|%)?/gi, "")
    .replace(/[+·]/g, "")
    .trim();
  if (!key || !clean) return null;
  try {
    const q = await translateFood(clean); // IT → EN
    const res = await fetch(
      `https://api.spoonacular.com/recipes/complexSearch?number=1&query=${encodeURIComponent(q)}&apiKey=${key}`,
      { next: { revalidate: 2592000 } } // 30 giorni
    );
    if (!res.ok) return null;
    const d = await res.json();
    const img = d?.results?.[0]?.image;
    return typeof img === "string" ? img : null;
  } catch {
    return null;
  }
}
