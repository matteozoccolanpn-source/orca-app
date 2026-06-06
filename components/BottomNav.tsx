"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, CalendarDays, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
  isCenter?: boolean;
}

const tabs: Tab[] = [
  { href: "/",         icon: Home,         label: "Home" },
  { href: "/search",   icon: Search,       label: "Cerca" },
  { href: "/add",      icon: Plus,         label: "Aggiungi", isCenter: true },
  { href: "/calendar", icon: CalendarDays, label: "Calendario" },
  { href: "/profile",  icon: User,         label: "Profilo" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/[0.06] bg-black/60 px-2 backdrop-blur-2xl backdrop-saturate-150"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        if (tab.isCenter) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="relative -top-3 flex size-12 flex-shrink-0 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              <Icon className="size-5 text-primary-foreground" />
            </Link>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            className="flex flex-1 flex-col items-center gap-0.5 py-2"
          >
            <Icon
              className={`size-5 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-wide transition-colors ${
                isActive ? "text-primary" : "opacity-0"
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
