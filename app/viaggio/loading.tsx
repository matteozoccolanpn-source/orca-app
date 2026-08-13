import { Attesa, AttesaTesta, AttesaWide, AttesaSec, AttesaElenco } from "@/app/components/v2/Attesa";

/* Il Viaggio che arriva: la card della meta, poi l'itinerario in elenco.
   Come /salute: la sezione e' v1, lo scheletro e' del sistema. */
export default function Loading() {
  return (
    <Attesa>
      <AttesaTesta />
      <AttesaWide />
      <AttesaSec />
      <AttesaElenco n={4} />
    </Attesa>
  );
}
