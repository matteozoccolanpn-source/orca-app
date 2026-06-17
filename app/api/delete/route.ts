import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { deleteTicketById } from "@/lib/supabase"

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
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Supabase delete error:", err)
    return NextResponse.json({ ok: false, error: "Delete failed" }, { status: 502 })
  }
}
