import { auth } from "@/auth"
import { NextResponse, after } from "next/server"
import { deleteTicketById, syncTripPlans } from "@/lib/supabase"
import { autoEnrichNewTrips } from "@/lib/trip-enrich"

// La risincronizzazione viaggi in background può includere web-search.
export const maxDuration = 300

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const id = (body as { id?: unknown })?.id
  if (!isValidId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid record id" }, { status: 400 })
  }

  try {
    await deleteTicketById(id)

    // Un biglietto in meno può cambiare (o cancellare) un viaggio:
    // risincronizza gli incastri e rigenera i piani invecchiati, in background.
    after(async () => {
      try {
        await syncTripPlans()
        await autoEnrichNewTrips()
      } catch (e) {
        console.error("sync viaggi dopo delete fallita:", e)
      }
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Supabase delete error:", err)
    return NextResponse.json({ ok: false, error: "Delete failed" }, { status: 502 })
  }
}
