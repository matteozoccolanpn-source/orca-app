"use client"

import { motion } from 'framer-motion'
import {
  Plane,
  Train,
  Music,
  Building2,
  UtensilsCrossed,
  Landmark,
  Package,
  type LucideIcon,
} from 'lucide-react'

export interface EventFormValue {
  title: string
  type: string
  date: string
  time: string
  location: string
  reference: string
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  flight: Plane,
  train: Train,
  concert: Music,
  hotel: Building2,
  restaurant: UtensilsCrossed,
  museum: Landmark,
  other: Package,
}

export const TYPE_OPTIONS = [
  { value: 'flight',     label: 'Volo',       icon: TYPE_ICONS.flight },
  { value: 'train',      label: 'Treno',      icon: TYPE_ICONS.train },
  { value: 'concert',    label: 'Concerto',   icon: TYPE_ICONS.concert },
  { value: 'hotel',      label: 'Hotel',      icon: TYPE_ICONS.hotel },
  { value: 'restaurant', label: 'Ristorante', icon: TYPE_ICONS.restaurant },
  { value: 'museum',     label: 'Museo',      icon: TYPE_ICONS.museum },
  { value: 'other',      label: 'Altro',      icon: TYPE_ICONS.other },
]

const inputCls = `w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm
  focus:outline-none focus:ring-1 focus:ring-primary/40`

/** Builds the Airtable `Datetime` value from the split date/time fields. */
export function toDatetime(value: Pick<EventFormValue, 'date' | 'time'>): string {
  return `${value.date}T${value.time}:00`
}

/** Splits an ISO-ish datetime into the `date` / `time` fields the form expects.
 *
 * FIX FUSO (bug "modifica sposta l'orario di -2h"): il DB restituisce l'istante
 * in UTC (es. "…T15:30:00+00:00" per le 17:30 italiane). Spezzare la stringa
 * grezza mostrava l'ora UTC nel form; al salvataggio quell'ora veniva riletta
 * come ora italiana → ogni modifica spostava l'evento indietro di 2 ore.
 * Ora, se la stringa ha un fuso (Z o +hh:mm), convertiamo in ora di Roma
 * PRIMA di spezzarla. Se è "naive" (senza fuso, es. output del parser),
 * è già ora locale da parete e si spezza com'era. */
export function splitDatetime(datetime: string): { date: string; time: string } {
  const raw = datetime ?? ''
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(raw)
  const d = new Date(raw)
  if (!hasOffset || isNaN(d.getTime())) {
    const [date = '', timeFull = '12:00'] = raw.split('T')
    return { date, time: timeFull.slice(0, 5) }
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/**
 * Presentational event form shared by /add (state "confirming") and the hero
 * "Modifica" sheet. Holds no business logic: the parent owns `value` and wires
 * `onSave` / `onCancel`.
 */
export function EventForm({
  value,
  onChange,
  onCancel,
  onSave,
  saving = false,
  saveLabel = 'Salva',
  intro = 'Verifica e modifica i dati prima di salvare',
}: {
  value: EventFormValue
  onChange: (next: EventFormValue) => void
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  saveLabel?: string
  intro?: string
}) {
  const update = <K extends keyof EventFormValue>(key: K, val: EventFormValue[K]) =>
    onChange({ ...value, [key]: val })

  return (
    <div className="flex flex-col gap-5">
      {intro && <p className="text-xs text-muted-foreground/60">{intro}</p>}

      {/* Type pills */}
      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
          <button
            key={opt.value}
            type="button"
            onClick={() => update('type', opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        transition-all duration-150 ${
                          value.type === opt.value
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                            : 'bg-muted text-muted-foreground hover:text-foreground'
                        }`}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
            <span>{opt.label}</span>
          </button>
          )
        })}
      </div>

      {/* Editable fields */}
      <div className="flex flex-col gap-3">
        <Field label="Titolo">
          <input
            value={value.title}
            onChange={(e) => update('title', e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Data" className="flex-1">
            <input
              type="date"
              value={value.date}
              onChange={(e) => update('date', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Ora" className="flex-1">
            <input
              type="time"
              value={value.time}
              onChange={(e) => update('time', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Luogo (opzionale)">
          <input
            value={value.location}
            onChange={(e) => update('location', e.target.value)}
            placeholder="—"
            className={inputCls}
          />
        </Field>

        <Field label="Codice / riferimento (opzionale)">
          <input
            value={value.reference}
            onChange={(e) => update('reference', e.target.value)}
            placeholder="—"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 py-3.5 rounded-2xl border border-border/50
                     text-sm font-medium text-muted-foreground
                     hover:bg-muted/40 transition-colors disabled:opacity-50"
        >
          Annulla
        </button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground
                     font-semibold text-sm tracking-wide
                     shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {saving ? 'Salvataggio…' : saveLabel}
        </motion.button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{label}</span>
      {children}
    </div>
  )
}
