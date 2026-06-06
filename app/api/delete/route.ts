import { auth } from "@/auth"
import { NextResponse } from "next/server"

function isValidRecordId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.startsWith("rec")
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
  if (!isValidRecordId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid record id" }, { status: 400 })
  }

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_TABLE_NAME

  if (!apiKey || !baseId || !tableName) {
    return NextResponse.json(
      { ok: false, error: "Server misconfiguration" },
      { status: 500 }
    )
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${id}`

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Airtable responded with ${res.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Network error" }, { status: 502 })
  }
}
