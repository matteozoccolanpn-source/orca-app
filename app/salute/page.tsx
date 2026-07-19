import SaluteView from "./SaluteView";
import { requireLogin } from "@/lib/require-login";
import { getDietPlan } from "@/lib/supabase";
import { mealImage } from "@/lib/food";
import { unsplashPhoto } from "@/lib/unsplash";

// Come la home: leggiamo sempre i dati freschi da Supabase, così la settimana
// appena caricata compare senza dover forzare un ricaricamento.
export const dynamic = "force-dynamic";

export default async function SalutePage() {
  await requireLogin();
  const diet = await getDietPlan();
  const week = diet?.week ?? null;
  // foto del piatto (o cibo generico) dietro l'hero dieta; null → resta il gradiente
  const dayKey = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][new Date().getDay()];
  const firstMeal = week?.[dayKey]?.[0]?.opzioni?.[0] ?? null;
  const heroImage = (firstMeal ? await mealImage(firstMeal) : null) ?? (await unsplashPhoto("healthy food bowl"));
  return <SaluteView week={week} updatedAt={diet?.updatedAt ?? null} heroImage={heroImage} />;
}
