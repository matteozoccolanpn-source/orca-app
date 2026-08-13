import { Attesa, AttesaTesta, AttesaChips, AttesaWide, AttesaSec, AttesaGriglia } from "@/app/components/v2/Attesa";

/* La Cucina che arriva: il piano di oggi in cima, la domanda, il ricettario. */
export default function Loading() {
  return (
    <Attesa>
      <AttesaTesta />
      <AttesaWide />
      <AttesaChips n={4} />
      <AttesaSec />
      <AttesaGriglia n={4} rapporto="16 / 10" />
    </Attesa>
  );
}
