/* ═════════ D4 · lo stepper − valore + ═════════
   Registrare un dato senza tastiera. I due tasti sono 44×44: si prendono
   al primo colpo anche in palestra. */

export function Step({
  val,
  unit,
  dec,
  inc,
}: {
  val: number | string;
  unit?: string;
  dec?: () => void;
  inc?: () => void;
}) {
  return (
    <span className="step">
      <button className="tap" onClick={dec}>
        −
      </button>
      <span className="val">
        {val}
        <em>{unit}</em>
      </span>
      <button className="tap" onClick={inc}>
        +
      </button>
    </span>
  );
}

export default Step;
