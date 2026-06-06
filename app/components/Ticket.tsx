"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDatetime } from "@/lib/format";
import { ActionBar } from "./actions";

interface TicketProps {
  id: string;
  emoji: string;
  title: string;
  datetime: string;
  location: string;
  type?: string;
}

const DELETE_WIDTH = 72;

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
  const [expanded, setExpanded] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const { date, time } = formatDatetime(datetime);

  function openConfirm(e: React.MouseEvent) {
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
    if (offset < -DELETE_WIDTH / 2) {
      setOffset(-DELETE_WIDTH);
    } else {
      setOffset(0);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Eliminazione fallita");
      }

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
      <div className="relative overflow-hidden rounded-2xl">
        {/* Mobile swipe — delete zone behind the card */}
        <div className="absolute inset-y-0 right-0 flex w-[72px] items-center justify-center bg-red-600 md:hidden">
          <button
            type="button"
            onClick={openConfirm}
            disabled={loading}
            aria-label="Elimina evento"
            className="flex h-full w-full items-center justify-center text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Sliding card surface */}
        <div
          className={`relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0a0a] backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] ${
            loading ? "pointer-events-none opacity-50" : ""
          }`}
          style={{ transform: `translateX(${offset}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="pointer-events-none absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-blue-400/30" />

          <div className="flex w-full items-center gap-3 px-6 py-5">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="text-2xl leading-none">{emoji}</span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
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

              <span
                className={`ml-2 flex-shrink-0 text-xs text-white/30 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>

            {/* Desktop delete button */}
            <button
              type="button"
              onClick={openConfirm}
              disabled={loading}
              aria-label="Elimina evento"
              className="hidden flex-shrink-0 rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 md:flex"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>

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

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20">
              <span className="text-xs text-white/60">Eliminazione…</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1 px-1 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141414] p-6 shadow-2xl">
            <h4 id="delete-dialog-title" className="text-base font-semibold text-white">
              Eliminare questo evento?
            </h4>
            <p className="mt-2 text-sm text-white/60">{title}</p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
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
