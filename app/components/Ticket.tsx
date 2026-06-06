"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { formatEventDate } from "@/lib/format";

interface TicketProps {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type?: string;
}

const TYPE_EMOJI: Record<string, string> = {
  train:      "🚆",
  flight:     "✈️",
  concert:    "🎵",
  hotel:      "🏨",
  museum:     "🎨",
  restaurant: "🍽️",
};

const TYPE_LABEL: Record<string, string> = {
  train:      "Treno",
  flight:     "Volo",
  concert:    "Concerto",
  hotel:      "Hotel",
  museum:     "Museo",
  restaurant: "Ristorante",
};

function resolveEmoji(type: string, fallback: string): string {
  return TYPE_EMOJI[type?.toLowerCase()] ?? fallback ?? "📌";
}

function resolveLabel(type: string): string {
  return TYPE_LABEL[type?.toLowerCase()] ?? "Evento";
}

function mapsUrl(location: string): string {
  if (!location) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

interface SecondaryAction {
  label: string;
  icon: string;
  href: string;
}

function getSecondaryAction(type: string): SecondaryAction | null {
  switch (type?.toLowerCase()) {
    case "train":
    case "flight":
      return { label: "Biglietto", icon: "🎫", href: "#" };
    case "restaurant":
      return { label: "Chiama", icon: "📞", href: "tel:" };
    case "hotel":
      return { label: "Prenotazione", icon: "🔖", href: "#" };
    default:
      return null;
  }
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

const EXPAND_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function Ticket({
  id,
  emoji,
  title,
  datetime,
  location,
  type = "",
}: TicketProps) {
  const router = useRouter();
  const [expanded, setExpanded]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [removed, setRemoved]         = useState(false);

  const displayEmoji  = resolveEmoji(type, emoji);
  const typeLabel     = resolveLabel(type);
  const formattedDate = formatEventDate(datetime);
  const typeRow       = [typeLabel, location].filter(Boolean).join(" · ").toUpperCase();
  const secondary     = getSecondaryAction(type);

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) throw new Error(data.error ?? "Eliminazione fallita");

      setRemoved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eliminazione fallita");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  if (removed) return null;

  return (
    <>
      <Card
        onClick={() => !loading && setExpanded((prev) => !prev)}
        className={`cursor-pointer rounded-2xl border-border/40 bg-card transition-all duration-200 hover:border-primary/30 hover:bg-white/[0.03] ${loading ? "pointer-events-none opacity-50" : ""}`}
      >
        {/* Always-visible summary row */}
        <div className="flex gap-3 px-4 py-3">
          {/* Emoji */}
          <span className="flex-shrink-0 self-start pt-[3px] text-[18px] leading-none">
            {displayEmoji}
          </span>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {typeRow}
            </span>
            <p className="mt-0.5 truncate font-display text-[15px] font-bold leading-snug text-foreground">
              {title}
            </p>
            {formattedDate && (
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.06em] text-primary/60">
                {formattedDate}
              </p>
            )}
          </div>

          {/* Expand chevron */}
          <span
            className={`flex-shrink-0 self-center text-xs text-muted-foreground/40 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </div>

        {/* Expandable detail panel */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EXPAND_EASE }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 border-t border-border/30 px-4 pb-4 pt-3">
                {/* Action buttons */}
                <div className="flex gap-2">
                  <a
                    href={mapsUrl(location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                  >
                    <span>📍</span>
                    <span>Apri in Maps</span>
                  </a>
                  {secondary && (
                    <a
                      href={secondary.href}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                    >
                      <span>{secondary.icon}</span>
                      <span>{secondary.label}</span>
                    </a>
                  )}
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(true);
                  }}
                  className="self-start text-xs text-destructive/60 transition-colors hover:text-destructive"
                >
                  Elimina evento
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {error && (
        <p className="mt-1 px-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Delete confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h4
              id="delete-dialog-title"
              className="font-display text-base font-bold text-foreground"
            >
              Eliminare questo evento?
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">{title}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Eliminazione…" : "Elimina"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
