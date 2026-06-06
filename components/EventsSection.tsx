"use client";

import { useState } from "react";
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
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Prossimi eventi
      </h2>
      <div className="mb-4">
        <CategoryBar
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          counts={counts}
        />
      </div>
      <div className="flex flex-col gap-3">
        {filtered.length > 0 ? (
          filtered.map((event) => <Ticket key={event.id} {...event} />)
        ) : (
          <p className="text-sm text-muted-foreground">Nessun evento in questa categoria.</p>
        )}
      </div>
    </section>
  );
}
