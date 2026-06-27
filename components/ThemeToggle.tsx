"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Toggle tema chiaro/scuro. Nessuna dipendenza: aggiunge/rimuove la classe
 * `dark` su <html> e ricorda la scelta in localStorage. Lo script anti-flash
 * in app/layout.tsx applica la preferenza salvata prima del primo paint.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  // Allinea lo stato del bottone alla classe reale dopo l'hydration.
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("keiko-theme", next ? "dark" : "light");
    } catch {
      /* localStorage non disponibile — pazienza */
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      className="grid place-items-center transition-colors active:scale-95"
      style={{ width: "var(--tap)", height: "var(--tap)", margin: -12, color: "var(--app-2)" }}
    >
      {dark ? <Sun className="size-[21px]" /> : <Moon className="size-[21px]" />}
    </button>
  );
}
