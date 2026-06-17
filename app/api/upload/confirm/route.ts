import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createTicket } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, type, datetime, location, reference } = await req.json()

  if (!title || !type || !datetime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const { id } = await createTicket({ title, type, datetime, location, reference })
    return NextResponse.json({ success: true, record: { id } })
  } catch (err) {
    console.error('Supabase create error:', err)
    return NextResponse.json({ error: 'Write failed' }, { status: 502 })
  }
}
