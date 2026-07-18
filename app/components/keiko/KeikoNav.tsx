"use client";

import { useRouter } from "next/navigation";

/* Barra di navigazione in basso, condivisa tra le pagine (design v4).
   `active` evidenzia il tab corrente. `onAdd` (opzionale) per il "+":
   se non passato, va alla pagina /add. */

type Tab = "home" | "dieta" | "sport" | "guarda";

export default function KeikoNav({ active, onAdd }: { active?: Tab; onAdd?: () => void }) {
  const router = useRouter();
  const go = (href: string) => router.push(href);
  const add = () => (onAdd ? onAdd() : router.push("/add"));
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 84, background: "linear-gradient(180deg,rgba(10,11,14,0),rgba(10,11,14,.97) 45%)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 20px 18px", maxWidth: 440, margin: "0 auto", zIndex: 30 }}>
      <NavItem label="Home" active={active === "home"} icon={<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>} onClick={() => go("/")} />
      <NavItem label="Dieta" active={active === "dieta"} icon={<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>} onClick={() => go("/salute")} />
      <button onClick={add} aria-label="Aggiungi" style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--k-accent)", color: "var(--k-accent-ink)", border: 0, display: "grid", placeItems: "center", fontSize: 30, lineHeight: 1, paddingBottom: 2, boxShadow: "0 8px 20px rgba(255,184,77,.28), 0 2px 6px rgba(0,0,0,.4)", marginTop: -24, cursor: "pointer" }}>+</button>
      <NavItem label="Sport" active={active === "sport"} icon={<><path d="M6 12h12M4 9v6M20 9v6M8 8v8M16 8v8" /></>} onClick={() => go("/allenamento")} />
      <NavItem label="Guarda" active={active === "guarda"} icon={<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9l5 3-5 3z" /></>} onClick={() => go("/guarda")} />
    </nav>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: 0, color: active ? "var(--k-text)" : "#9BA0A8", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">{icon}</svg>
      {label}
    </button>
  );
}
