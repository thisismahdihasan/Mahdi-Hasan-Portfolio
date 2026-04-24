import { supabase } from '@/lib/supabase'

/**
 * Triggers on-demand ISR revalidation of the public homepage.
 *
 * - Sends the current user's access token to POST /api/revalidate
 * - The server validates the token and calls revalidatePath("/")
 * - Returns true on success, false on failure (caller shows warning toast)
 * - Never throws — DB saves must not be blocked by revalidation failures
 */
export async function revalidateHomepage(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return false

    const res = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    return res.ok
  } catch {
    return false
  }
}
