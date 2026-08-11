import type { ReactNode } from "react";

/* ═════════ A11 · due soli chip ═════════
   Il chip-filtro: si accende (`on`) e basta. `warm` è la variante con
   l'accento caldo, usata dove il filtro è un'azione e non un vaglio. */

export function Chip({
  children,
  on,
  warm,
  onClick,
}: {
  children: ReactNode;
  on?: boolean;
  warm?: boolean;
  onClick?: () => void;
}) {
  return (
    <span
      className={"chip tap" + (warm ? " warm" : "") + (on ? " on" : "")}
      onClick={onClick}
    >
      {children}
    </span>
  );
}

export default Chip;
