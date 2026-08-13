import { Attesa, AttesaTesta, AttesaWide, AttesaSec, AttesaElenco } from "@/app/components/v2/Attesa";

/* L'Allenamento che arriva: la card del giorno, poi gli esercizi in elenco. */
export default function Loading() {
  return (
    <Attesa>
      <AttesaTesta />
      <AttesaWide />
      <AttesaSec />
      <AttesaElenco n={5} />
    </Attesa>
  );
}
