import { auth } from "@/auth"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL
  const webhookSecret = process.env.MAKE_WEBHOOK_SECRET

  if (!webhookUrl || !webhookSecret) {
    return NextResponse.json(
      { ok: false, error: "Server misconfiguration" },
      { status: 500 }
    )
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: webhookSecret }),
    })

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Make returned ${res.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: "Network error" }, { status: 502 })
  }
}
