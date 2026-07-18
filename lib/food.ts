// Spoonacular — foto di un piatto dal nome. Server-side: usa SPOONACULAR_KEY.
// Senza chiave → null (resta il gradiente). Nota: Spoonacular è tarato
// sull'inglese, quindi i nomi molto italiani possono non avere match perfetto.

export async function mealImage(name: string): Promise<string | null> {
  const key = process.env.SPOONACULAR_KEY;
  // togli quantità/grammi per una ricerca più pulita: "Yogurt greco 0% 200g" → "Yogurt greco"
  const q = (name ?? "").replace(/\d+[.,]?\d*\s*(g|gr|ml|kg|%)?/gi, "").replace(/[+·]/g, "").trim();
  if (!key || !q) return null;
  try {
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
