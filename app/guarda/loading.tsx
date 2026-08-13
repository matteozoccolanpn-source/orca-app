import { Attesa, AttesaTesta, AttesaChips, AttesaSec, AttesaGriglia } from "@/app/components/v2/Attesa";

/* La Guarda che arriva: la barra, i filtri, e la griglia di locandine 2:3. */
export default function Loading() {
  return (
    <Attesa>
      <AttesaTesta />
      <AttesaChips n={5} />
      <AttesaSec />
      <AttesaGriglia n={6} rapporto="2 / 3" />
    </Attesa>
  );
}
