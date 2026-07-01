"use client";

import { useLayoutEffect, useRef, useState } from "react";
import HomeView from "./HomeView";
import SaluteView from "@/app/salute/SaluteView";
import AllenamentoView from "@/app/allenamento/AllenamentoView";
import type { Ticket, DietWeek, WorkoutWeek } from "@/lib/supabase";

/* ------------------------------------------------------------------ *
 * Guscio a swipe orizzontale: Dieta ← Home → Allenamento.
 * Usa lo scroll-snap NATIVO del browser: così il gesto verticale scrolla
 * dentro la schermata e quello orizzontale cambia schermata, senza conflitti.
 * ------------------------------------------------------------------ */

const PANELS = ["Dieta", "Home", "Allenamento"];
const HOME_INDEX = 1;

export default function SwipeShell({
  events,
  diet,
  dietUpdatedAt,
  workout,
  workoutUpdatedAt,
  trainedDays,
  logoutAction,
}: {
  events: Ticket[];
  diet: DietWeek | null;
  dietUpdatedAt: string | null;
  workout: WorkoutWeek | null;
  workoutUpdatedAt: string | null;
  trainedDays: string[];
  logoutAction?: () => Promise<void>;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(HOME_INDEX);

  // Parti da Home (centro) senza far vedere lo scatto: prima del primo paint.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.clientWidth * HOME_INDEX;
  }, []);

  function goTo(i: number) {
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  }

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(i);
  }

  return (
    <>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-[100dvh] w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorX: "contain" }}
      >
        <Panel>
          <SaluteView week={diet} updatedAt={dietUpdatedAt} embedded />
        </Panel>
        <Panel>
          <HomeView
            events={events}
            diet={diet}
            workout={workout}
            trainedDays={trainedDays}
            logoutAction={logoutAction}
          />
        </Panel>
        <Panel>
          <AllenamentoView
            week={workout}
            updatedAt={workoutUpdatedAt}
            trainedDays={trainedDays}
            embedded
          />
        </Panel>
      </div>

      {/* Indicatore: 3 puntini, tap per saltare a una schermata. */}
      <div
        className="fixed inset-x-0 z-40 flex justify-center"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div
          className="flex items-center gap-2 backdrop-blur-xl"
          style={{
            background: "var(--bar)",
            border: "1px solid var(--bar-line)",
            borderRadius: "var(--r-pill)",
            padding: "8px 12px",
          }}
        >
          {PANELS.map((label, i) => {
            const on = i === active;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goTo(i)}
                aria-label={label}
                aria-current={on ? "true" : undefined}
                className="transition-all duration-200"
                style={{
                  height: 7,
                  width: on ? 22 : 7,
                  borderRadius: "var(--r-pill)",
                  background: on ? "var(--accent-strong)" : "color-mix(in srgb, var(--on-surface) 28%, transparent)",
                }}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

/* Un pannello a tutta larghezza che scrolla in verticale al suo interno. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-full flex-none basis-full snap-start overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ overscrollBehaviorY: "contain" }}
    >
      {children}
    </div>
  );
}
