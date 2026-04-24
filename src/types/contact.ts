export type ContactMessageStatus = 'unread' | 'read' | 'archived'

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: ContactMessageStatus
  submittedAt: string       // ISO 8601 timestamptz
  readAt: string | null
  archivedAt: string | null
  sourcePage: string | null
  userAgent: string | null
}

/** Maps a raw Supabase snake_case row to the camelCase ContactMessage interface */
export function toContactMessage(row: Record<string, unknown>): ContactMessage {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    message: row.message as string,
    status: row.status as ContactMessageStatus,
    submittedAt: row.submitted_at as string,
    readAt: (row.read_at as string | null) ?? null,
    archivedAt: (row.archived_at as string | null) ?? null,
    sourcePage: (row.source_page as string | null) ?? null,
    userAgent: (row.user_agent as string | null) ?? null,
  }
}
