import { auth } from "@/auth"
import { NextResponse } from "next/server"

function isValidRecordId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.startsWith("rec")
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

  if (!isValidRecordId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid record id" }, { status: 400 })
  }

  // Only patch fields that were actually provided so we never wipe values we
  // don't control. `reference` is set only when non-empty: the client doesn't
  // know the current code, so an empty string must not clear an existing one.
  const fields: Record<string, string> = {}
  const titleVal = asString(title)
  const typeVal = asString(type)
  const datetimeVal = asString(datetime)
  const locationVal = asString(location)
  const referenceVal = asString(reference)

  if (titleVal !== undefined) fields.Title = titleVal
  if (typeVal !== undefined) fields.Type = typeVal
  if (datetimeVal !== undefined) fields.Datetime = datetimeVal
  if (locationVal !== undefined) fields.Location = locationVal
  if (referenceVal !== undefined && referenceVal.length > 0) fields.Reference = referenceVal

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ ok: false, error: "No fields to update" }, { status: 400 })
  }

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_TABLE_NAME

  if (!apiKey || !baseId || !tableName) {
    return NextResponse.json({ ok: false, error: "Server misconfiguration" }, { status: 500 })
  }

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${id}`

  try {
    // PATCH performs a partial update: untouched Airtable fields are preserved.
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Airtable update error:", err)
      return NextResponse.json(
        { ok: false, error: `Airtable responded with ${res.status}` },
        { status: 502 }
      )
    }

    const record = await res.json()
    return NextResponse.json({ ok: true, record })
  } catch {
    return NextResponse.json({ ok: false, error: "Network error" }, { status: 502 })
  }
}
