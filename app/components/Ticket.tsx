"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface TicketProps {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type?: string;
}

const DELETE_WIDTH = 72;

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

function formatCompact(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const datePart = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Rome",
  }).format(d);

  const timePart = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Rome",
  }).format(d);

  return `${datePart} · ${timePart}`;
}

function mapsUrl(location: string): string {
  if (!location) return "https://www.google.com/maps";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
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

export default function Ticket({
  id,
  emoji,
  title,
  datetime,
  location,
  type = "",
}: TicketProps) {
  const router = useRouter();
  const [offset, setOffset]           = useState(0);
  const [showMenu, setShowMenu]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [removed, setRemoved]         = useState(false);
  const startX      = useRef(0);
  const startOffset = useRef(0);

  const displayEmoji = resolveEmoji(type, emoji);
  const typeLabel    = resolveLabel(type);
  const formattedDate = formatCompact(datetime);

  const typeRow = [typeLabel, location].filter(Boolean).join(" · ").toUpperCase();

  function openSwipeDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setShowConfirm(true);
    setError(null);
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startOffset.current = offset;
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - startX.current;
    const next = Math.min(0, Math.max(-DELETE_WIDTH, startOffset.current + delta));
    setOffset(next);
  }

  function onTouchEnd() {
    if (offset < -DELETE_WIDTH / 2) setOffset(-DELETE_WIDTH);
    else setOffset(0);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    setShowMenu(false);

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
      setOffset(0);
    } finally {
      setLoading(false);
    }
  }

  if (removed) return null;

  return (
    <>
      {/* Swipe-to-delete outer shell — unchanged */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-red-600 md:hidden">
          <button
            type="button"
            onClick={openSwipeDelete}
            disabled={loading}
            aria-label="Elimina evento"
            className="flex h-full w-full items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Sliding card surface */}
        <div
          className={loading ? "pointer-events-none opacity-50" : ""}
          style={{ transform: `translateX(${offset}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <Card className="flex gap-3 rounded-2xl border-border/40 bg-card px-4 py-3 transition-all duration-200 hover:border-primary/30 hover:bg-white/[0.03]">
            {/* Emoji — anchored left, spans all rows */}
            <span className="flex-shrink-0 self-start pt-[3px] text-[18px] leading-none">
              {displayEmoji}
            </span>

            {/* Content column */}
            <div className="min-w-0 flex-1">
              {/* Row 1: TYPE · LOCATION | menu */}
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {typeRow}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
                  aria-label="Opzioni"
                  className="-mr-1 flex-shrink-0 rounded-md px-1.5 py-0.5 text-sm leading-none text-muted-foreground/50 transition-colors hover:bg-white/10 hover:text-foreground"
                >
                  ···
                </button>
              </div>

              {/* Row 2: title — display font */}
              <p className="mt-0.5 truncate font-display text-[15px] font-bold leading-snug text-foreground">
                {title}
              </p>

              {/* Row 3: date — mono, accent */}
              {formattedDate && (
                <p className="mt-1 font-mono text-[11px] text-primary/70">
                  {formattedDate}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {error && (
        <p className="mt-1 px-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Options sheet */}
      <Sheet open={showMenu} onOpenChange={setShowMenu}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-border bg-card"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="text-left font-display text-base font-bold text-foreground">
              {title}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1">
            <a
              href={mapsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
              onClick={() => setShowMenu(false)}
            >
              <span>🗺</span>
              <span>Apri in Maps</span>
            </a>
            <button
              type="button"
              onClick={() => { setShowMenu(false); setShowConfirm(true); }}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <TrashIcon className="h-4 w-4" />
              <span>Elimina</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

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
