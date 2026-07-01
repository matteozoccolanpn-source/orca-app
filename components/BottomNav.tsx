"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Plus, Salad, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CaptureSheet from "@/components/CaptureSheet";

interface Tab {
  href: string;
  icon: LucideIcon;
  label: string;
  isCenter?: boolean;
}

const tabs: Tab[] = [
  { href: "/",         icon: Home,       label: "Home" },
  { href: "/search",   icon: Wallet,     label: "Wallet" },
  { href: "/add",      icon: Plus,       label: "Aggiungi", isCenter: true },
  { href: "/salute",   icon: Salad,      label: "Salute" },
  { href: "/profile",  icon: User,       label: "Profilo" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Il ＋ centrale apre la sheet di cattura (non naviga più a /add).
  const [capture, setCapture] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-around backdrop-blur-2xl backdrop-saturate-150"
        style={{
          background: "var(--bar)",
          borderTop: "1px solid var(--bar-line)",
          padding: "10px var(--s5) calc(14px + env(safe-area-inset-bottom))",
        }}
        aria-label="Navigazione principale"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;

          // FAB centrale "Aggiungi" — rialzato, apre la cattura
          if (tab.isCenter) {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => setCapture(true)}
                aria-label={tab.label}
                className="flex flex-col items-center gap-[3px]"
                style={{ minWidth: "var(--tap)" }}
              >
                <span
                  className="flex items-center justify-center rounded-full text-white"
                  style={{
                    width: 52,
                    height: 52,
                    marginTop: -18,
                    background: "var(--keiko-grad)",
                    boxShadow: "0 13px 26px -8px rgba(95, 71, 214, .55)",
                  }}
                >
                  <Icon className="size-6" />
                </span>
                <span className="text-[11px] font-medium" style={{ color: "var(--accent-strong)" }}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-col items-center gap-[3px] transition-colors duration-200 ease-out active:scale-95"
              style={{ minWidth: "var(--tap)", color: isActive ? "var(--accent-strong)" : "var(--app-faint)" }}
            >
              <Icon className="size-[22px]" />
              <span className="text-[11px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
      <CaptureSheet open={capture} onClose={() => setCapture(false)} />
    </>
  );
}
