"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/search", icon: "🔍", label: "Cerca" },
  { href: "/add", icon: "＋", label: "Aggiungi", isCenter: true },
  { href: "/calendar", icon: "📅", label: "Calendario" },
  { href: "/profile", icon: "👤", label: "Profilo" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around border-t border-white/5 bg-black/70 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        if (tab.isCenter) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative -top-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl shadow-lg shadow-primary/30 transition-transform active:scale-95"
              aria-label={tab.label}
            >
              {tab.icon}
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-2 py-3 transition-colors"
            aria-label={tab.label}
          >
            <span className={`text-2xl leading-none transition-all ${isActive ? "scale-110" : ""}`}>
              {tab.icon}
            </span>
            <span
              className={`text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-transparent"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
