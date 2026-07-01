"use client";

import Link from "next/link";
import { Salad, Dumbbell } from "lucide-react";

/* Interruttore iOS-like fra i due domini "Salute": Dieta e Allenamento.
 * Le due pagine (/salute, /allenamento) lo mostrano in cima. */
const TABS = [
  { href: "/salute", label: "Dieta", Icon: Salad },
  { href: "/allenamento", label: "Allenamento", Icon: Dumbbell },
];

export default function HealthTabs({ active }: { active: "salute" | "allenamento" }) {
  return (
    <div
      className="flex gap-1"
      style={{
        background: "var(--inset)",
        border: "1px solid var(--inset-line)",
        borderRadius: "var(--r-md)",
        padding: 4,
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const isActive = href === (active === "salute" ? "/salute" : "/allenamento");
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 items-center justify-center gap-1.5 transition-transform duration-200 active:scale-[0.98]"
            style={{
              minHeight: 38,
              borderRadius: "var(--r-sm)",
              background: isActive ? "var(--surface)" : "transparent",
              boxShadow: isActive ? "var(--sh-card)" : "none",
              color: isActive ? "var(--accent-strong)" : "var(--on-surface-2)",
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-semi)",
            }}
          >
            <Icon className="size-[17px]" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
