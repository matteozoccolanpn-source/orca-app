import SaluteView from "./SaluteView";
import { getDietPlan } from "@/lib/supabase";
import { mealImage } from "@/lib/food";
import { unsplashPhoto } from "@/lib/unsplash";
import { todayDietKey } from "@/app/components/DietMeal";

// Come la home: leggiamo sempre i dati freschi da Supabase, così la settimana
// appena caricata compare senza dover forzare un ricaricamento.
export const dynamic = "force-dynamic";

export default async function SalutePage() {
  const diet = await getDietPlan();
  const week = diet?.week ?? null;
  // foto del piatto (o cibo generico) dietro l'hero dieta; null → resta il gradiente
  const firstMeal = week?.[todayDietKey()]?.[0]?.opzioni?.[0] ?? null;
  const heroImage = (firstMeal ? await mealImage(firstMeal) : null) ?? (await unsplashPhoto("healthy food bowl"));
  return <SaluteView week={week} updatedAt={diet?.updatedAt ?? null} heroImage={heroImage} />;
}
