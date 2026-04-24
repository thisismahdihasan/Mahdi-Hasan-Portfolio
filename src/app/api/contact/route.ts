import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Resend } from 'resend'

// ── Email validation ──────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── IP extraction — never stores raw IP ──────────────────────────────────────
function extractIpHash(req: NextRequest): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp    = req.headers.get('x-real-ip')

  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : realIp
      ? realIp.trim()
      : null

  if (!raw || raw === 'unknown') return null

  return createHash('sha256').update(raw).digest('hex')
}

// ── Rate limit check via PostgREST ────────────────────────────────────────────
async function isRateLimited(
  ipHash: string,
  supabaseUrl: string,
  serviceKey: string
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

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
    console.warn('[/api/contact] Rate-limit check failed, failing open — status:', res.status)
    return false
  }

  const contentRange = res.headers.get('content-range') ?? ''
  const total = parseInt(contentRange.split('/')[1] ?? '0', 10)

  return total >= 3
}

// ── Resend notification — fire-and-forget after successful DB insert ──────────
async function sendLeadNotification(params: {
  name: string
  email: string
  phone: string | null
  message: string
  sourcePage: string
  submittedAt: string
}): Promise<void> {
  const apiKey  = process.env.RESEND_API_KEY
  const from    = process.env.RESEND_FROM
  const to      = process.env.RESEND_TO

  if (!apiKey || !from || !to) {
    console.warn('[/api/contact] Resend env vars missing — skipping notification',
      { hasKey: !!apiKey, hasFrom: !!from, hasTo: !!to })
    return
  }

  const resend = new Resend(apiKey)

  const gmailUrl =
    `https://mail.google.com/mail/?view=cm&fs=1` +
    `&to=${encodeURIComponent(params.email)}` +
    `&su=${encodeURIComponent('Re: Portfolio Inquiry')}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e5e5e5; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden; }
    .header { background: #1a1a1a; border-bottom: 2px solid #D4AF37; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 600; color: #D4AF37; letter-spacing: 0.02em; }
    .header p { margin: 4px 0 0; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; }
    .body { padding: 28px 32px; }
    .field { margin-bottom: 18px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #888; margin-bottom: 4px; }
    .value { font-size: 14px; color: #e5e5e5; line-height: 1.5; }
    .value a { color: #D4AF37; text-decoration: none; }
    .message-box { background: #111; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin-top: 4px; }
    .message-box p { margin: 0; font-size: 14px; color: #ccc; line-height: 1.7; white-space: pre-wrap; }
    .divider { border: none; border-top: 1px solid #2a2a2a; margin: 24px 0; }
    .meta { font-size: 11px; color: #555; }
    .footer { padding: 16px 32px 24px; }
    .reply-btn { display: inline-block; background: #D4AF37; color: #000; font-size: 13px; font-weight: 700; text-decoration: none; padding: 10px 22px; border-radius: 8px; letter-spacing: 0.08em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>New Portfolio Lead</h1>
      <p>Portfolio Contact Form</p>
    </div>
    <div class="body">
      <div class="field">
        <div class="label">From</div>
        <div class="value">${params.name}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${params.email}">${params.email}</a></div>
      </div>
      ${params.phone ? `
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${params.phone}</div>
      </div>` : ''}
      <div class="field">
        <div class="label">Message</div>
        <div class="message-box"><p>${params.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>
      </div>
      <hr class="divider" />
      <div class="meta">
        Submitted: ${params.submittedAt} &nbsp;·&nbsp; Page: ${params.sourcePage}
      </div>
    </div>
    <div class="footer">
      <a href="${gmailUrl}" class="reply-btn">Reply in Gmail</a>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: params.email,
    subject: `New Portfolio Lead — ${params.name}`,
    html,
  })

  if (error) {
    console.error('[/api/contact] Resend notification failed:', error)
  } else {
    console.log('[/api/contact] Resend notification sent to:', to)
  }
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

  // ── Honeypot — silent 200, no DB insert, no email ────────────────────────
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
    console.error('[/api/contact] Missing Supabase env vars')
    return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 })
  }

  // ── IP hash ───────────────────────────────────────────────────────────────
  const ipHash = extractIpHash(req)

  // ── Rate limit — returns 429, no email sent ───────────────────────────────
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
  const submittedAt = new Date().toISOString()

  // ── DB insert ─────────────────────────────────────────────────────────────
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
      console.error('[/api/contact] DB insert failed — status:', response.status, '| body:', responseText)
      return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })
    }

    console.log('[/api/contact] DB insert ok for:', trimmedEmail)

    // ── Resend notification — fire-and-forget, never blocks the 200 ──────
    // DB is the source of truth. A Resend failure is logged but does not
    // cause the visitor to see an error or retry (which would create duplicates).
    sendLeadNotification({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone || null,
      message: trimmedMessage,
      sourcePage,
      submittedAt,
    }).catch(err => {
      console.error('[/api/contact] sendLeadNotification threw unexpectedly:', err)
    })

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/contact] Network error during DB insert:', err)
    return NextResponse.json({ success: false, error: 'Failed to save message' }, { status: 500 })
  }
}
