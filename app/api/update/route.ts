import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { updateTicketById } from "@/lib/supabase"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidId(id: unknown): id is string {
  return typeof id === "string" && UUID_RE.test(id)
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
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

  const { id, title, type, datetime, location, reference } = (body ?? {}) as {
    id?: unknown
    title?: unknown
    type?: unknown
    datetime?: unknown
    location?: unknown
    reference?: unknown
  }

  if (!isValidId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid record id" }, { status: 400 })
  }

  try {
    await updateTicketById(id, {
      title:     asString(title),
      type:      asString(type),
      datetime:  asString(datetime),
      location:  asString(location),
      reference: asString(reference),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed"
    if (msg === "No fields to update") {
      return NextResponse.json({ ok: false, error: msg }, { status: 400 })
    }
    console.error("Supabase update error:", err)
    return NextResponse.json({ ok: false, error: "Update failed" }, { status: 502 })
  }
}
