"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Ticket from "@/app/components/Ticket";
import CategoryBar from "@/components/CategoryBar";

interface Event {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type: string;
}

interface EventsSectionProps {
  events: Event[];
}

export default function EventsSection({ events }: EventsSectionProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const counts: Record<string, number> = {};
  for (const e of events) {
    const t = e.type?.toLowerCase() ?? "other";
    counts[t] = (counts[t] ?? 0) + 1;
  }

  const filtered =
    activeCategory === "all"
      ? events
      : events.filter((e) => e.type?.toLowerCase() === activeCategory);

  return (
    <section>
      <p className="mb-3 px-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
        Prossimi eventi
      </p>

      <div className="mb-4">
        <CategoryBar
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          counts={counts}
        />
      </div>

      {filtered.length > 0 ? (
        <div key={activeCategory} className="flex flex-col gap-2.5">
          {filtered.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.2, ease: "easeOut" }}
            >
              <Ticket {...event} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-4xl">🏖️</span>
          <p className="text-sm font-medium text-foreground">Tutto libero</p>
          <p className="text-xs text-muted-foreground">Nessun evento in questa categoria</p>
        </div>
      )}
    </section>
  );
}
