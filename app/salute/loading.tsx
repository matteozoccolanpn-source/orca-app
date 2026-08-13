import { Attesa, AttesaTesta, AttesaChips, AttesaElenco } from "@/app/components/v2/Attesa";

/* La Dieta e' ancora nel vestito vecchio, ma lo scheletro puo' essere gia' del
   sistema: e' una schermata di transizione, non la sezione. */
export default function Loading() {
  return (
    <Attesa>
      <AttesaTesta />
      <AttesaChips n={7} />
      <AttesaElenco n={4} />
    </Attesa>
  );
}
