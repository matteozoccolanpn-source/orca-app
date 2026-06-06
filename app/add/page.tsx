"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type UploadState = 'idle' | 'preview' | 'uploading' | 'parsing' | 'confirming' | 'saving' | 'success' | 'error'
type ActiveTab = 'foto' | 'testo'

interface ParsedData {
  title: string
  type: string
  datetime: string
  location: string
  reference: string
}

interface ConfirmFields {
  title: string
  type: string
  date: string
  time: string
  location: string
  reference: string
}

const TYPE_OPTIONS = [
  { value: 'flight',     label: 'Volo',       emoji: '✈️' },
  { value: 'train',      label: 'Treno',      emoji: '🚆' },
  { value: 'concert',    label: 'Concerto',   emoji: '🎵' },
  { value: 'hotel',      label: 'Hotel',      emoji: '🏨' },
  { value: 'restaurant', label: 'Ristorante', emoji: '🍽' },
  { value: 'museum',     label: 'Museo',      emoji: '🎨' },
  { value: 'other',      label: 'Altro',      emoji: '📦' },
]

const inputCls = `w-full rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 text-sm
  focus:outline-none focus:ring-1 focus:ring-primary/40`

function parsedToConfirm(parsed: ParsedData): ConfirmFields {
  const [date = '', timeFull = '12:00'] = parsed.datetime.split('T')
  return {
    title:     parsed.title,
    type:      parsed.type,
    date,
    time:      timeFull.slice(0, 5),
    location:  parsed.location,
    reference: parsed.reference,
  }
}

export default function AddPage() {
  const [activeTab, setActiveTab]   = useState<ActiveTab>('foto')
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [textInput, setTextInput]   = useState('')
  const [state, setState]           = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg]     = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [confirm, setConfirm]       = useState<ConfirmFields | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const reset = () => {
    setFile(null)
    setPreview(null)
    setState('idle')
    setErrorMsg('')
    setParsedData(null)
    setConfirm(null)
  }

  const switchTab = (tab: ActiveTab) => {
    if (tab === activeTab) return
    reset()
    setActiveTab(tab)
  }

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Solo immagini (PNG, JPG, HEIC)')
      setState('error')
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setState('preview')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const callUpload = async (body: FormData): Promise<ParsedData> => {
    setState('parsing')
    const res = await fetch('/api/upload', {
      method: 'POST',
      body,
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Errore sconosciuto')
    return data.parsed as ParsedData
  }

  const handleSubmitFoto = async () => {
    if (!file) return
    setState('uploading')
    const formData = new FormData()
    formData.append('image', file)
    try {
      const parsed = await callUpload(formData)
      setConfirm(parsedToConfirm(parsed))
      setState('confirming')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Qualcosa è andato storto')
      setState('error')
    }
  }

  const handleAnalyzeText = async () => {
    if (!textInput.trim()) return
    const formData = new FormData()
    formData.append('text', textInput.trim())
    try {
      const parsed = await callUpload(formData)
      setConfirm(parsedToConfirm(parsed))
      setState('confirming')
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Qualcosa è andato storto')
      setState('error')
    }
  }

  const handleSave = async () => {
    if (!confirm) return
    setState('saving')
    const datetime = `${confirm.date}T${confirm.time}:00`
    const payload: ParsedData = {
      title:     confirm.title,
      type:      confirm.type,
      datetime,
      location:  confirm.location,
      reference: confirm.reference,
    }
    try {
      const res = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore sconosciuto')
      setParsedData(payload)
      setState('success')
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 2500)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Qualcosa è andato storto')
      setState('error')
    }
  }

  const updateConfirm = <K extends keyof ConfirmFields>(key: K, value: ConfirmFields[K]) =>
    setConfirm((c) => (c ? { ...c, [key]: value } : c))

  const showTabs = state === 'idle' || state === 'preview'

  return (
    <div className="min-h-screen px-4 pt-8 pb-32">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Aggiungi evento</h1>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Carica uno screenshot o scrivi in testo libero
        </p>
      </div>

      {showTabs && (
        <div className="flex gap-1 mb-6 p-1 bg-muted rounded-2xl">
          {(['foto', 'testo'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground/70'
              }`}
            >
              {tab === 'foto' ? '📷 Foto' : '✏️ Testo'}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {state === 'idle' && activeTab === 'foto' && (
          <motion.div
            key="idle-foto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border/40 rounded-3xl
                       flex flex-col items-center justify-center gap-4
                       py-20 px-8 cursor-pointer
                       hover:border-primary/40 hover:bg-primary/5
                       transition-all duration-300"
          >
            <div className="size-16 rounded-full bg-muted flex items-center justify-center">
              <ImagePlus className="size-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Tocca per scegliere</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Screenshot · Email · WhatsApp
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </motion.div>
        )}

        {state === 'idle' && activeTab === 'testo' && (
          <motion.div
            key="idle-testo"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-4"
          >
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="volo domani 6am Ryanair MXP-LGW, cena giovedì con Marco, treno Roma venerdì..."
              className="w-full h-40 rounded-2xl border border-border/40 bg-muted/30
                         p-4 text-sm resize-none
                         focus:outline-none focus:ring-1 focus:ring-primary/40
                         placeholder:text-muted-foreground/40"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAnalyzeText}
              disabled={!textInput.trim()}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground
                         font-semibold text-sm tracking-wide
                         shadow-lg shadow-primary/25
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analizza
            </motion.button>
          </motion.div>
        )}

        {state === 'preview' && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-4"
          >
            <div className="relative rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="w-full object-cover max-h-72" />
              <button
                onClick={reset}
                className="absolute top-3 right-3 size-8 rounded-full
                           bg-black/60 backdrop-blur-sm
                           flex items-center justify-center"
              >
                <X className="size-4 text-white" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground/60 text-center">
              Claude analizzerà l&apos;immagine ed estrarrà i dati dell&apos;evento
            </p>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmitFoto}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground
                         font-semibold text-sm tracking-wide
                         shadow-lg shadow-primary/25"
            >
              Analizza
            </motion.button>
          </motion.div>
        )}

        {(state === 'uploading' || state === 'parsing' || state === 'saving') && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-20"
          >
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="size-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">
                {state === 'saving'
                  ? 'Salvataggio...'
                  : state === 'uploading'
                  ? 'Caricamento...'
                  : 'Claude sta leggendo...'}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">Ci vogliono pochi secondi</p>
            </div>
          </motion.div>
        )}

        {state === 'confirming' && confirm && (
          <motion.div
            key="confirming"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex flex-col gap-5"
          >
            <p className="text-xs text-muted-foreground/60">
              Verifica e modifica i dati prima di salvare
            </p>

            {/* Type pills */}
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateConfirm('type', opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                              transition-all duration-150 ${
                                confirm.type === opt.value
                                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                                  : 'bg-muted text-muted-foreground hover:text-foreground'
                              }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Editable fields */}
            <div className="flex flex-col gap-3">
              <Field label="Titolo">
                <input
                  value={confirm.title}
                  onChange={(e) => updateConfirm('title', e.target.value)}
                  className={inputCls}
                />
              </Field>

              <div className="flex gap-3">
                <Field label="Data" className="flex-1">
                  <input
                    type="date"
                    value={confirm.date}
                    onChange={(e) => updateConfirm('date', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Ora" className="flex-1">
                  <input
                    type="time"
                    value={confirm.time}
                    onChange={(e) => updateConfirm('time', e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="Luogo (opzionale)">
                <input
                  value={confirm.location}
                  onChange={(e) => updateConfirm('location', e.target.value)}
                  placeholder="—"
                  className={inputCls}
                />
              </Field>

              <Field label="Codice / riferimento (opzionale)">
                <input
                  value={confirm.reference}
                  onChange={(e) => updateConfirm('reference', e.target.value)}
                  placeholder="—"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={reset}
                className="flex-1 py-3.5 rounded-2xl border border-border/50
                           text-sm font-medium text-muted-foreground
                           hover:bg-muted/40 transition-colors"
              >
                Annulla
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground
                           font-semibold text-sm tracking-wide
                           shadow-lg shadow-primary/25"
              >
                Salva
              </motion.button>
            </div>
          </motion.div>
        )}

        {state === 'success' && parsedData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
              className="size-20 rounded-full bg-green-500/10 flex items-center justify-center"
            >
              <CheckCircle2 className="size-10 text-green-400" />
            </motion.div>

            <div className="text-center">
              <p className="font-display text-xl font-bold">{parsedData.title}</p>
              <p className="text-xs text-muted-foreground/60 mt-1 uppercase tracking-wider">
                Salvato · torno alla home...
              </p>
            </div>

            <div className="w-full bg-card border border-border/40 rounded-2xl p-4 flex flex-col gap-2">
              <Row label="Tipo" value={parsedData.type} />
              <Row label="Data" value={parsedData.datetime} />
              {parsedData.location && <Row label="Luogo" value={parsedData.location} />}
              {parsedData.reference && <Row label="Codice" value={parsedData.reference} />}
            </div>
          </motion.div>
        )}

        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 py-20"
          >
            <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="size-10 text-destructive" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Qualcosa è andato storto</p>
              <p className="text-xs text-muted-foreground/50 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="text-sm text-primary underline-offset-2 underline"
            >
              Riprova
            </button>
          </motion.div>
        )}

      </AnimatePresence>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className="text-xs font-medium font-mono">{value}</span>
    </div>
  )
}
