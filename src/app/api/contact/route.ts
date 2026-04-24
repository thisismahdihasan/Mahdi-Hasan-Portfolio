import { NextRequest, NextResponse } from 'next/server'

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { name, email, message, phone, honeypot, source_page } = body as {
    name?: string
    email?: string
    message?: string
    phone?: string
    honeypot?: string
    source_page?: string
  }

  // ── Honeypot — silent 200, no insert ────────────────────────────────────
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return NextResponse.json({ success: true })
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const trimmedName = (name ?? '').trim()
  if (!trimmedName) {
    return NextResponse.json({ success: false, error: 'name: Name is required' }, { status: 400 })
  }
  if (trimmedName.length > 100) {
    return NextResponse.json({ success: false, error: 'name: Name must be 100 characters or fewer' }, { status: 400 })
  }

  const trimmedEmail = (email ?? '').trim()
  if (!trimmedEmail) {
    return NextResponse.json({ success: false, error: 'email: Email is required' }, { status: 400 })
  }
  if (trimmedEmail.length > 254) {
    return NextResponse.json({ success: false, error: 'email: Email must be 254 characters or fewer' }, { status: 400 })
  }
  if (!EMAIL_RE.test(trimmedEmail)) {
    return NextResponse.json({ success: false, error: 'email: Invalid email format' }, { status: 400 })
  }

  const trimmedMessage = (message ?? '').trim()
  if (!trimmedMessage) {
    return NextResponse.json({ success: false, error: 'message: Message is required' }, { status: 400 })
  }
  if (trimmedMessage.length > 2000) {
    return NextResponse.json({ success: false, error: 'message: Message must be 2000 characters or fewer' }, { status: 400 })
  }

  const trimmedPhone = phone ? String(phone).trim() : ''
  if (trimmedPhone && trimmedPhone.length > 40) {
    return NextResponse.json({ success: false, error: 'phone: Phone must be 40 characters or fewer' }, { status: 400 })
  }

  // ── Metadata ─────────────────────────────────────────────────────────────
  const sourcePage =
    typeof source_page === 'string' && source_page.trim().length > 0
      ? source_page.trim()
      : '/'

  const rawUA = req.headers.get('user-agent')
  const userAgent = rawUA ? rawUA.slice(0, 500) : null

  // ── Env vars ──────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[/api/contact] Missing env vars — URL present:', !!supabaseUrl, '| KEY present:', !!serviceKey)
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
  }

  console.log('[/api/contact] Key prefix:', serviceKey.slice(0, 15), '| inserting for:', trimmedEmail)

  // ── Raw REST insert — bypasses supabase-js client entirely ───────────────
  // Using the PostgREST REST API directly so no library code can interfere
  // with the Authorization or apikey headers.
  const payload = {
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone || null,
    message: trimmedMessage,
    status: 'unread',
    source_page: sourcePage,
    user_agent: userAgent,
  }

  try {
    const restUrl = `${supabaseUrl}/rest/v1/contact_messages`

    const response = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'apikey':         serviceKey,
        'Authorization':  `Bearer ${serviceKey}`,
        'Content-Type':   'application/json',
        'Prefer':         'return=minimal',
        'User-Agent':     'next-server/contact-api',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const responseText = await response.text()
      console.error(
        '[/api/contact] REST insert failed — status:', response.status,
        '| body:', responseText
      )
      return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })
    }

    console.log('[/api/contact] Inserted successfully for:', trimmedEmail)
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/contact] Network error during insert:', err)
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })
  }
}
