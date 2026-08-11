/* ═════════ l'anello ═════════
   Quanto è fatto di quanto c'è da fare. Il foglio di keiko-v2-mock.html porta
   il CSS di .ring ma non lo usa in nessuna schermata: la geometria (44×44,
   r 18, tratto 3.5, circonferenza 113) è quella di docs/mockups/cucina-v2-mock.html,
   dove l'anello è disegnato per esteso. Se un giorno cambia, si cambia lì. */

const R = 18;
const C = 113; /* 2πr ≈ 113,1 — il mock scrive 113 */

export function Ring({ val, tot, label }: { val: number; tot: number; label?: string }) {
  const done = tot > 0 ? Math.max(0, Math.min(1, val / tot)) : 0;
  return (
    <span className="ring">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle className="bgc" cx="22" cy="22" r={R} strokeWidth="3.5" />
        <circle
          className="fg"
          cx="22"
          cy="22"
          r={R}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - done)}
        />
      </svg>
      <span className="n">{label ?? `${val}/${tot}`}</span>
    </span>
  );
}

export default Ring;
