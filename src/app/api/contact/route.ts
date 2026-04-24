import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── IP extraction — never stores raw IP ──────────────────────────────────────
function extractIpHash(req: NextRequest): string | null {
  // x-forwarded-for may be a comma-separated list; take the first (client) IP
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp    = req.headers.get('x-real-ip')

  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : realIp
      ? realIp.trim()
      : null

  if (!raw || raw === 'unknown') return null

  // Hash with SHA-256 — raw IP is never stored or logged
  return createHash('sha256').update(raw).digest('hex')
}

// ── Rate limit check via PostgREST ────────────────────────────────────────────
// Returns true if the ip_hash has >= 3 successful inserts in the last hour.
async function isRateLimited(
  ipHash: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  // HEAD request with count=exact — returns count in Content-Range header, no rows
  const url =
    `${supabaseUrl}/rest/v1/contact_messages` +
    `?ip_hash=eq.${encodeURIComponent(ipHash)}` +
    `&submitted_at=gte.${encodeURIComponent(oneHourAgo)}` +
    `&select=id`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer':        'count=exact',
      'User-Agent':    'next-server/contact-api',
    },
  })

  if (!res.ok) {
    // If the count check fails, fail open (allow the request) to avoid
    // blocking legitimate users due to a transient DB error.
    console.warn('[/api/contact] Rate-limit check failed, failing open — status:', res.status)
    return false
  }

  // PostgREST returns Content-Range: 0-N/TOTAL
  const contentRange = res.headers.get('content-range') ?? ''
  const total = parseInt(contentRange.split('/')[1] ?? '0', 10)

  return total >= 3
}

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

  // ── Honeypot — silent 200, does NOT count toward rate limit ─────────────
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

  // ── Env vars ──────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('[/api/contact] Missing env vars — URL present:', !!supabaseUrl, '| KEY present:', !!serviceKey)
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
  }

  // ── IP hash — raw IP never stored or logged ───────────────────────────────
  const ipHash = extractIpHash(req)

  // ── Rate limit check (only when ip_hash is available) ────────────────────
  if (ipHash) {
    try {
      const limited = await isRateLimited(ipHash, supabaseUrl, serviceKey)
      if (limited) {
        console.warn('[/api/contact] Rate limit exceeded for ip_hash prefix:', ipHash.slice(0, 8))
        return NextResponse.json(
          { success: false, error: 'Too many messages. Please try again later.' },
          { status: 429 }
        )
      }
    } catch (err) {
      // Fail open — don't block the user if the rate-limit check itself errors
      console.warn('[/api/contact] Rate-limit check threw, failing open:', err)
    }
  }

  // ── Metadata ─────────────────────────────────────────────────────────────
  const sourcePage =
    typeof source_page === 'string' && source_page.trim().length > 0
      ? source_page.trim()
      : '/'

  const rawUA = req.headers.get('user-agent')
  const userAgent = rawUA ? rawUA.slice(0, 500) : null

  console.log('[/api/contact] Key prefix:', serviceKey.slice(0, 15), '| inserting for:', trimmedEmail)

  // ── Raw REST insert ───────────────────────────────────────────────────────
  const payload = {
    name: trimmedName,
    email: trimmedEmail,
    phone: trimmedPhone || null,
    message: trimmedMessage,
    status: 'unread',
    source_page: sourcePage,
    user_agent: userAgent,
    ip_hash: ipHash,
  }

  try {
    const restUrl = `${supabaseUrl}/rest/v1/contact_messages`

    const response = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
        'User-Agent':    'next-server/contact-api',
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
