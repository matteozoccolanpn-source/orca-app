"use client";

import type { ReactNode, CSSProperties } from "react";

/* Card UNICA del redesign v4: foto (o gradiente-categoria) + scrim + chip + testo.
   Un solo linguaggio per eventi, dieta, allenamento, viaggio, film.
   Livello 0: se `image` manca, usa il gradiente della categoria (nessuna foto da raccogliere). */

type Variant = "hero" | "square" | "mini" | "poster";

const RATIO: Record<Variant, string> = {
  hero: "16 / 9",
  square: "1 / 1",
  mini: "16 / 11",
  poster: "2 / 3",
};

export default function SmartMedia({
  variant = "square",
  image,
  category = "default",
  chip,
  chipAmber = false,
  title,
  meta,
  display = false,
  glyph,
  onClick,
  style,
  topRight,
}: {
  variant?: Variant;
  image?: string | null;
  category?: string;
  chip?: ReactNode;
  chipAmber?: boolean;
  title: string;
  meta?: ReactNode;
  display?: boolean;         // titolo in Fraunces (solo hero)
  glyph?: string;            // emoji grande sfumata quando non c'è foto
  onClick?: () => void;
  style?: CSSProperties;
  topRight?: ReactNode;      // es. ⋯ o anello progressi
}) {
  return (
    <div className={`ds-card ${variant}`} style={{ aspectRatio: RATIO[variant], ...style }} onClick={onClick}>
      {image ? (
        <img className="ds-ph" src={image} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className="ds-ph" style={{ background: `var(--k-cat-${category})` }} />
      )}
      {!image && glyph && <div className="ds-glyph" aria-hidden>{glyph}</div>}
      <div className="ds-scrim" />
      {chip && <div className={`ds-chip${chipAmber ? " amber" : ""}`}>{chip}</div>}
      {topRight}
      <div className="ds-cbody">
        <h3 className={display ? "ds-display" : undefined}>{title}</h3>
        {meta && <div className="ds-meta">{meta}</div>}
      </div>
    </div>
  );
}
