import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

// ── Server-only Supabase admin client ────────────────────────────────────────
// The service role key is NEVER sent to the browser — it only exists here on
// the server. NEXT_PUBLIC_ vars are intentionally not used for this client.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase server env vars')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Extract the user's access token from the Authorization header ──
    // Dashboard client sends: Authorization: Bearer <supabase_access_token>
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Validate the token server-side — never trust the client ────────
    const admin = getAdminClient()
    const { data: { user }, error: authError } = await admin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 3. Revalidate the public homepage ─────────────────────────────────
    revalidatePath('/')

    return NextResponse.json({ revalidated: true, at: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
