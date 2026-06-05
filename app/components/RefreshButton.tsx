"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

type State = "idle" | "loading" | "error"

export default function RefreshButton() {
  const router = useRouter()
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleRefresh() {
    setState("loading")
    try {
      const res = await fetch("/api/refresh", { method: "POST" })
      const data: { ok: boolean; error?: string } = await res.json()
      if (!data.ok) {
        throw new Error(data.error ?? "Errore sconosciuto")
      }
      await new Promise((resolve) => setTimeout(resolve, 6000))
      router.refresh()
      setState("idle")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Errore")
      setState("error")
      setTimeout(() => setState("idle"), 3000)
    }
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-400/70">{errorMsg}</span>
    )
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={state === "loading"}
      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:cursor-not-allowed"
    >
      {state === "loading" ? (
        <>
          <SpinnerIcon />
          Aggiornamento...
        </>
      ) : (
        <>
          <RefreshIcon />
          Aggiorna
        </>
      )}
    </button>
  )
}

function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
