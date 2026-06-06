"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type UploadState = 'idle' | 'preview' | 'uploading' | 'parsing' | 'success' | 'error'

interface ParsedData {
  title: string
  type: string
  datetime: string
  location: string
  reference: string
}

export default function AddPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const handleSubmit = async () => {
    if (!file) return
    setState('uploading')

    const formData = new FormData()
    formData.append('image', file)

    try {
      setState('parsing')
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Errore sconosciuto')
      }

      setParsedData(data.parsed)
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

  const reset = () => {
    setFile(null)
    setPreview(null)
    setState('idle')
    setErrorMsg('')
    setParsedData(null)
  }

  return (
    <div className="min-h-screen px-4 pt-8 pb-32">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">Aggiungi evento</h1>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Carica uno screenshot, email o messaggio
        </p>
      </div>

      <AnimatePresence mode="wait">

        {state === 'idle' && (
          <motion.div
            key="idle"
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
              <img
                src={preview}
                alt="Preview"
                className="w-full object-cover max-h-72"
              />
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
              onClick={handleSubmit}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground
                         font-semibold text-sm tracking-wide
                         shadow-lg shadow-primary/25"
            >
              Analizza e salva
            </motion.button>
          </motion.div>
        )}

        {(state === 'uploading' || state === 'parsing') && (
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
                {state === 'uploading' ? 'Caricamento...' : 'Claude sta leggendo il biglietto...'}
              </p>
              <p className="text-xs text-muted-foreground/50 mt-1">
                Ci vogliono pochi secondi
              </p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">{label}</span>
      <span className="text-xs font-medium font-mono">{value}</span>
    </div>
  )
}
