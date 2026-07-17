"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { Trash2, ChevronDown } from "lucide-react";
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

const THRESHOLD = -72;
// Reveal if swiped past halfway — standard iOS-style snap behaviour
const SNAP_AT = THRESHOLD / 2; // -36

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

interface SecondaryAction { label: string; icon: string; href: string }

function getSecondaryAction(type: string): SecondaryAction | null {
  switch (type?.toLowerCase()) {
    case "train":
    case "flight":  return { label: "Biglietto",    icon: "🎫", href: "#" };
    case "restaurant": return { label: "Chiama",    icon: "📞", href: "tel:" };
    case "hotel":   return { label: "Prenotazione", icon: "🔖", href: "#" };
    default:        return null;
  }
}

const EXPAND_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SPRING = { type: "spring" as const, stiffness: 550, damping: 42 };

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

  // Framer Motion swipe state
  const x             = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, THRESHOLD], [0, 1]);
  const deleteScale   = useTransform(x, [0, THRESHOLD], [0.7, 1]);

  const displayEmoji  = resolveEmoji(type, emoji);
  const typeLabel     = resolveLabel(type);
  const formattedDate = formatEventDate(datetime);
  const typeRow       = [typeLabel, location].filter(Boolean).join(" · ").toUpperCase();
  const secondary     = getSecondaryAction(type);

  function handleDragEnd() {
    if (x.get() < SNAP_AT) {
      animate(x, THRESHOLD, SPRING);
    } else {
      animate(x, 0, SPRING);
    }
  }

  function handleCardTap() {
    // If card is swiped open, tap snaps it back instead of toggling expand
    if (x.get() < -10) {
      animate(x, 0, SPRING);
      return;
    }
    if (!loading) setExpanded((prev) => !prev);
  }

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
      {/* Swipe container */}
      <div className="relative overflow-hidden rounded-2xl">

        {/* Red delete zone — always behind, revealed by swipe */}
        <motion.div
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-2xl bg-destructive"
          style={{ opacity: deleteOpacity }}
        >
          <motion.button
            type="button"
            style={{ scale: deleteScale }}
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
            className="flex flex-col items-center gap-1"
          >
            <Trash2 className="size-4 text-white" />
            <span className="text-[10px] font-medium text-white">Elimina</span>
          </motion.button>
        </motion.div>

        {/* Draggable card surface */}
        <motion.div
          drag="x"
          dragConstraints={{ left: THRESHOLD, right: 0 }}
          dragElastic={{ left: 0.1, right: 0.05 }}
          onDragEnd={() => handleDragEnd()}
          style={{ x }}
          onClick={handleCardTap}
          className={`relative cursor-pointer ${loading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Card className="rounded-2xl border-border/40 bg-card transition-all duration-200 hover:border-primary/30 hover:bg-white/[0.03]">

            {/* Always-visible summary row */}
            <div className="flex gap-3 px-4 py-3">
              <span className="flex-shrink-0 self-start pt-[3px] text-[18px] leading-none">
                {displayEmoji}
              </span>

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

              {/* Animated chevron */}
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-shrink-0 self-center"
              >
                <ChevronDown className="size-3.5 text-muted-foreground/40" />
              </motion.span>
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

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
                      className="self-start text-xs text-destructive/60 transition-colors hover:text-destructive"
                    >
                      Elimina evento
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </Card>
        </motion.div>
      </div>

      {error && (
        <p className="mt-1 px-1 text-xs text-destructive" role="alert">{error}</p>
      )}

      {/* Delete confirmation dialog — 3-step: swipe → button → dialog */}
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
                onClick={() => { setShowConfirm(false); animate(x, 0, SPRING); }}
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
