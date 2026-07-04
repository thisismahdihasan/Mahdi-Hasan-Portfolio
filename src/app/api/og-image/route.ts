import { NextResponse } from 'next/server'

/**
 * /api/og-image — same-origin OG image proxy.
 *
 * WHY THIS EXISTS:
 * WhatsApp and some other crawlers reject cross-origin image URLs in og:image
 * even when the image is valid and publicly accessible. Proxying through the
 * site's own domain makes the URL same-origin and stable for all crawlers.
 *
 * BEHAVIOUR:
 * 1. Fetch seo_settings row from Supabase to get og_image_url.
 * 2. If og_image_url is set: fetch the upstream image bytes and stream them
 *    back with the correct Content-Type. The crawler receives the image from
 *    thisismahdihasan.com — no cross-origin jump.
 * 3. If og_image_url is empty or any fetch fails: redirect to /api/og which
 *    serves the generated branded fallback image.
 *
 * METADATA:
 * layout.tsx always uses /api/og-image for both openGraph.images and
 * twitter.images — the proxy itself decides which image to serve.
 *
 * CACHING:
 * Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400
 * CDN serves stale while revalidating, crawlers never get an error response.
 */

const CACHE_HEADERS = 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'

export async function GET(): Promise<Response> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // ── Step 1: fetch og_image_url from seo_settings ──────────────────────
    let ogImageUrl: string | null = null

    if (supabaseUrl && supabaseKey) {
      try {
        const settingsRes = await fetch(
          `${supabaseUrl}/rest/v1/seo_settings?id=eq.1&select=og_image_url&limit=1`,
          {
            headers: {
              apikey:         supabaseKey,
              Authorization:  `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            // Do not cache this fetch — we need the latest value on every request
            // so that a newly uploaded image is served immediately.
            cache: 'no-store',
          }
        )

        if (settingsRes.ok) {
          const rows: { og_image_url: string | null }[] = await settingsRes.json()
          const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
          ogImageUrl = row?.og_image_url || null
        }
      } catch {
        // Supabase unreachable — fall through to generated fallback
      }
    }

    // ── Step 2a: proxy the upstream image ─────────────────────────────────
    if (ogImageUrl) {
      try {
        // Strip cache-busting query param before fetching — the ?v= param
        // is for browser cache busting in the dashboard preview, not needed here
        const cleanUrl = ogImageUrl.split('?')[0]

        const imageRes = await fetch(cleanUrl, {
          // Short cache — we want the proxy to refresh when a new image is uploaded
          next: { revalidate: 300 },
        })

        if (imageRes.ok) {
          const imageBytes = await imageRes.arrayBuffer()

          // Preserve upstream Content-Type; fall back to image/jpeg for Supabase Storage
          const upstreamType = imageRes.headers.get('content-type')
          const contentType =
            upstreamType && upstreamType.startsWith('image/')
              ? upstreamType
              : 'image/jpeg'

          return new Response(imageBytes, {
            status: 200,
            headers: {
              'Content-Type':  contentType,
              'Cache-Control': CACHE_HEADERS,
            },
          })
        }
        // Upstream fetch failed — fall through to generated fallback
      } catch {
        // Network error fetching upstream image — fall through to generated fallback
      }
    }

    // ── Step 2b: redirect to /api/og (generated branded image fallback) ───
    // Use a 302 temporary redirect so crawlers follow to the generated image.
    // This keeps /api/og-image as the stable og:image URL in metadata.
    return NextResponse.redirect(
      new URL('/api/og', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thisismahdihasan.com'),
      {
        status: 302,
        headers: {
          'Cache-Control': CACHE_HEADERS,
        },
      }
    )
  } catch {
    // Last-resort fallback — should never reach here
    return NextResponse.redirect(
      new URL('/api/og', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thisismahdihasan.com'),
      { status: 302 }
    )
  }
}
