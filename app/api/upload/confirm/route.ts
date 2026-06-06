import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, type, datetime, location, reference } = await req.json()

  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_TABLE_NAME

  if (!apiKey || !baseId || !tableName) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const airtableRes = await fetch(
    `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        fields: {
          Title: title,
          Type: type,
          Datetime: datetime,
          Location: location ?? '',
          Reference: reference ?? '',
        },
      }),
    }
  )

  if (!airtableRes.ok) {
    const err = await airtableRes.text()
    console.error('Airtable error:', err)
    return NextResponse.json({ error: 'Airtable write failed' }, { status: 502 })
  }

  const record = await airtableRes.json()
  return NextResponse.json({ success: true, record })
}
