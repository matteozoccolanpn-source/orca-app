"use client";

import { useState } from "react";
import { formatDatetime } from "@/lib/format";
import { ActionBar } from "./actions";

interface TicketProps {
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type?: string;
}

export default function Ticket({ emoji, title, datetime, location, type = "" }: TicketProps) {
  const [expanded, setExpanded] = useState(false);
  const { date, time } = formatDatetime(datetime);

  return (
    <div className="relative flex flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08]">
      {/* Subtle left accent line */}
      <div className="pointer-events-none absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-blue-400/30" />

      {/* Tappable header — collapses/expands the action panel */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-6 py-5 text-left"
      >
        <span className="text-2xl leading-none">{emoji}</span>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <h3 className="text-base font-semibold tracking-wide text-white">{title}</h3>
          <div className="flex flex-col gap-0.5 text-sm text-white/50">
            {date && (
              <span>
                {date}
                {time && <span className="ml-2 font-medium text-white/70">· {time}</span>}
              </span>
            )}
            {location && <span className="truncate">{location}</span>}
          </div>
        </div>

        {/* Rotating chevron signals expandability */}
        <span
          className={`ml-2 flex-shrink-0 text-xs text-white/30 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {/* Accordion action panel */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 pb-5">
          <div className="mb-4 h-px bg-white/[0.07]" />
          <ActionBar type={type} location={location} />
        </div>
      </div>
    </div>
  );
}
