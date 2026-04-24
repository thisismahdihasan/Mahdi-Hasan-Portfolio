# Design Document — Contact Leads Inbox

## Overview

The Contact Leads Inbox adds persistent message storage to the portfolio's existing contact form and exposes a new dashboard section for reviewing and managing those messages. The feature is split into three layers:

1. **Database** — a `contact_messages` Supabase table with RLS policies
2. **API Route** — a server-side Next.js route that validates and inserts submissions
3. **Dashboard UI** — a new `InboxSection` component wired into the existing dashboard shell

The public contact form retains its current EmailJS notification flow and visual design. The only change visible to visitors is a hidden honeypot field added to the form markup.

---

## Architecture

```
Visitor Browser                  Next.js Server              Supabase
─────────────────────────────────────────────────────────────────────
ContactSection.tsx
  │
  ├─ emailjs.send()  ──────────────────────────────────────────────▶ EmailJS (unchanged)
  │
  └─ fetch POST /api/contact ──▶ src/app/api/contact/route.ts
                                   │  validate input
                                   │  honeypot check
                                   └─ supabaseServer.insert() ──▶ contact_messages table
                                        (service_role key)

Admin Browser                    Next.js Server              Supabase
─────────────────────────────────────────────────────────────────────
DashboardPage (page.tsx)
  │
  ├─ unread count query ──────────────────────────────────────────▶ contact_messages
  │   (supabase anon, authenticated)                                 (RLS: auth SELECT)
  │
  └─ InboxSection.tsx
       │
       ├─ TanStack Query ["dashboard-contact-messages"]
       │   └─ supabase.from('contact_messages').select() ─────────▶ contact_messages
       │
       ├─ markRead mutation ──────────────────────────────────────▶ contact_messages UPDATE
       ├─ archive/unarchive mutation ────────────────────────────▶ contact_messages UPDATE
       └─ delete mutation ───────────────────────────────────────▶ contact_messages DELETE
```

### Supabase Client Strategy

Two distinct clients are used — this is a deliberate security boundary:

| Client | Location | Key Used | Purpose |
|--------|----------|----------|---------|
| Browser anon client | `src/lib/supabase.ts` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard reads/mutations (authenticated session, RLS enforced) |
| Server service-role client | `src/app/api/contact/route.ts` (module-local) | `SUPABASE_SERVICE_ROLE_KEY` (env, never exposed) | API route INSERT — bypasses RLS to allow anon form submissions without exposing the key to the browser |

The service-role client is created inline inside the API route file and is never exported or imported elsewhere. It is not added to `src/lib/supabase.ts`.

---

## Components and Interfaces

### New Files

| File | Purpose |
|------|---------|
| `supabase/seed-contact-messages.sql` | Idempotent migration: table, index, RLS policies |
| `src/types/contact.ts` | `ContactMessage` interface, `ContactMessageStatus` union |
| `src/app/api/contact/route.ts` | POST handler — validate, honeypot, insert |
| `src/app/dashboard/components/InboxSection.tsx` | Full inbox UI: tabs, list, detail panel, mutations |

### Modified Files

| File | Change |
|------|--------|
| `src/components/contact/ContactSection.tsx` | Add honeypot field; fire-and-forget fetch to `/api/contact` |
| `src/app/dashboard/components/DashboardLayout.tsx` | Add `'inbox'` to `Section` type and `NAV`; accept `unreadCount` prop; render badge |
| `src/app/dashboard/page.tsx` | Add `'inbox'` to `Section` type; fetch unread count; render `InboxSection` |

### Component Hierarchy

```
DashboardPage (page.tsx)
├── DashboardLayout (unreadCount prop added)
│   ├── Sidebar NAV (inbox item + badge)
│   └── Mobile Bottom NAV (inbox item + badge)
└── InboxSection (new, rendered when section === 'inbox')
    ├── TabBar (All / Unread / Archived)
    ├── MessageList (desktop: table rows; mobile: cards)
    │   └── MessageRow / MessageCard
    └── DetailPanel (slides in on row click)
        ├── MessageHeader (name, email, phone, timestamp)
        ├── MessageBody (full message text)
        ├── MetaRow (source_page, user_agent — secondary)
        └── ActionBar (Reply mailto | Archive/Unarchive | Delete)
            └── ConfirmDialog (on delete)
```

---

## Data Models

### Database Table — `contact_messages`

```sql
CREATE TABLE IF NOT EXISTS contact_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text        NOT NULL,
  email        text        NOT NULL,
  phone        text,
  message      text        NOT NULL,
  status       text        NOT NULL DEFAULT 'unread'
                           CHECK (status IN ('unread', 'read', 'archived')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz,
  archived_at  timestamptz,
  source_page  text        DEFAULT '/',
  user_agent   text
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status_submitted
  ON contact_messages (status, submitted_at DESC);
```

### TypeScript Interface — `src/types/contact.ts`

```typescript
export type ContactMessageStatus = 'unread' | 'read' | 'archived'

export interface ContactMessage {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: ContactMessageStatus
  submittedAt: string          // ISO 8601 timestamptz
  readAt: string | null
  archivedAt: string | null
  sourcePage: string | null
  userAgent: string | null
}
```

The dashboard queries return snake_case from Supabase; a lightweight mapping step in the query function converts to camelCase before storing in TanStack Query cache.

### API Route Request Body

```typescript
interface ContactApiBody {
  name: string
  email: string
  message: string
  phone?: string
  honeypot?: string      // must be empty string or absent for real submissions
  source_page?: string   // window.location.pathname from the browser
}
```

### Validation Rules (API Route)

| Field | Rule |
|-------|------|
| `honeypot` | If non-empty → silent 200, no insert |
| `name` | Required, non-empty after trim, max 100 chars |
| `email` | Required, valid RFC-5322 format, max 254 chars |
| `message` | Required, non-empty after trim, max 2000 chars |
| `phone` | Optional; if provided, max 40 chars |
| `source_page` | Optional; defaults to `'/'` if absent or empty |
| `user_agent` | Read from `User-Agent` header; truncated to 500 chars; `null` if absent |

---

## State Management

### TanStack Query Structure

All inbox queries share the root key `["dashboard-contact-messages"]`. Tab-specific queries use a sub-key:

```typescript
// All messages (tab = 'all')
queryKey: ["dashboard-contact-messages", "all"]

// Unread messages (tab = 'unread')
queryKey: ["dashboard-contact-messages", "unread"]

// Archived messages (tab = 'archived')
queryKey: ["dashboard-contact-messages", "archived"]

// Unread count (lightweight, used by DashboardPage for badge)
queryKey: ["dashboard-contact-messages-count"]
```

### Invalidation Strategy

Every mutation (mark-read, archive, unarchive, delete) calls:

```typescript
queryClient.invalidateQueries({ queryKey: ["dashboard-contact-messages"] })
queryClient.invalidateQueries({ queryKey: ["dashboard-contact-messages-count"] })
```

Using the root key prefix ensures all tab sub-queries are invalidated together, keeping the tab counts and list in sync without needing to track which tab is active.

### Query Function (per tab)

```typescript
const fetchMessages = async (status: 'all' | 'unread' | 'archived') => {
  let query = supabase
    .from('contact_messages')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(50)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toContactMessage)  // snake_case → camelCase
}
```

### Unread Count Query (DashboardPage)

```typescript
const fetchUnreadCount = async () => {
  const { count, error } = await supabase
    .from('contact_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'unread')
  if (error) throw error
  return count ?? 0
}
```

This is a `HEAD` request (no rows returned), making it very lightweight. It runs as a separate query so the badge updates independently of the full message list.

---

## InboxSection Component Breakdown

### Tab State

Local `useState` tracks the active tab (`'all' | 'unread' | 'archived'`). Switching tabs changes the query key, triggering a new fetch (or cache hit).

### List View

- **Desktop (≥640px)**: Structured rows with columns — status dot, sender name, email preview, timestamp, status badge. Clicking a row opens the detail panel.
- **Mobile (<640px)**: Stacked cards showing name, truncated message preview, timestamp, and status badge.

Both layouts use the same data source and click handler.

### Detail Panel

Opens as a right-side panel on desktop (the list narrows) or a full-width overlay on mobile. Contains:

- Sender name, email (as mailto link), phone (if present)
- Formatted submission timestamp
- Full message body
- Secondary metadata row: source page, user agent (collapsed/dimmed)
- Action bar: Reply (mailto), Archive/Unarchive, Delete

**Auto-mark-read**: When the panel opens and `message.status === 'unread'`, a mutation fires immediately:

```typescript
await supabase
  .from('contact_messages')
  .update({ status: 'read', read_at: new Date().toISOString() })
  .eq('id', message.id)
```

This is fire-and-forget from the UI perspective — the list invalidation happens after the update resolves.

### Mutations Summary

| Action | Supabase Operation | Invalidates |
|--------|-------------------|-------------|
| Mark read (auto on open) | `UPDATE status='read', read_at=now()` | Both query keys |
| Archive | `UPDATE status='archived', archived_at=now()` | Both query keys |
| Unarchive | `UPDATE status='read', archived_at=null` | Both query keys |
| Delete | `DELETE WHERE id=?` | Both query keys |

### 50-Message Limit Notice

After the query resolves, if `data.length === 50`, a notice banner renders below the list:

```
ℹ Showing latest 50 messages. Older messages are stored but not displayed.
```

This is a simple conditional render — no additional count query needed.

---

## DashboardLayout Badge Threading

`DashboardLayout` receives a new optional prop `unreadCount?: number`. The `Section` type and `NAV` array are updated in the component file itself (not imported from `page.tsx`).

Badge rendering logic (applied to both sidebar and mobile nav):

```tsx
{item.id === 'inbox' && unreadCount > 0 && (
  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center px-1">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
)}
```

The badge caps at `99+` to prevent layout overflow on the sidebar.

`DashboardPage` passes `unreadCount` down:

```tsx
<DashboardLayout
  user={user}
  active={section}
  onNavigate={setSection}
  onSignOut={handleSignOut}
  unreadCount={unreadCount}   // new prop
>
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The property-based testing library for this project is **fast-check** (TypeScript-native, works with Jest/Vitest, no additional runtime dependencies beyond dev).

### Property 1: Honeypot silently accepts any non-empty string

*For any* non-empty string value supplied as the `honeypot` field in the request body, the API route SHALL return HTTP 200 with `{ success: true }` and SHALL NOT insert any row into `contact_messages`.

**Validates: Requirements 3.2**

### Property 2: Name validation rejects empty and whitespace-only inputs

*For any* string that is empty or composed entirely of whitespace characters (spaces, tabs, newlines), submitting it as `name` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.3**

### Property 3: Name length boundary

*For any* string whose length exceeds 100 characters, submitting it as `name` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.4**

### Property 4: Email validation rejects invalid formats

*For any* string that does not conform to a valid email format (missing `@`, missing domain, etc.), submitting it as `email` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.5**

### Property 5: Email length boundary

*For any* string whose length exceeds 254 characters (even if it would otherwise be a valid email format), submitting it as `email` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.6**

### Property 6: Message validation rejects empty and whitespace-only inputs

*For any* string that is empty or composed entirely of whitespace characters, submitting it as `message` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.7**

### Property 7: Message length boundary

*For any* string whose length exceeds 2000 characters, submitting it as `message` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.8**

### Property 8: Phone length boundary

*For any* string whose length exceeds 40 characters, submitting it as `phone` to the API route SHALL return HTTP 400.

**Validates: Requirements 3.9**

### Property 9: Valid submission inserts with status 'unread'

*For any* valid payload (name ≤ 100 chars and non-empty, valid email ≤ 254 chars, message ≤ 2000 chars and non-empty, optional phone ≤ 40 chars, empty honeypot), the API route SHALL return HTTP 200 with `{ success: true }` and the inserted row SHALL have `status = 'unread'`.

**Validates: Requirements 3.10**

### Property 10: Source page defaults to '/' when absent or empty

*For any* valid payload where `source_page` is absent, `null`, or an empty string, the inserted `contact_messages` row SHALL have `source_page = '/'`.

**Validates: Requirements 10.2**

### Property 11: User agent is stored truncated to 500 characters

*For any* `User-Agent` header string of any length, the stored `user_agent` value in `contact_messages` SHALL be at most 500 characters (the first 500 characters of the original string).

**Validates: Requirements 10.3**

### Property 12: Inbox list is always ordered newest-first

*For any* collection of `ContactMessage` objects with distinct `submittedAt` values, the list rendered by `InboxSection` SHALL display them in descending `submittedAt` order (newest first).

**Validates: Requirements 5.1**

### Property 13: Unread badge count matches actual unread messages

*For any* collection of `ContactMessage` objects with a mix of statuses, the unread count badge on the "Unread" tab SHALL equal the number of messages in the collection with `status = 'unread'`.

**Validates: Requirements 5.3**

### Property 14: Inbox nav badge appears if and only if unread count > 0

*For any* non-negative integer `unreadCount` passed to `DashboardLayout`, the Inbox nav item SHALL render a badge if and only if `unreadCount > 0`. The badge SHALL display the count (capped at `99+`).

**Validates: Requirements 8.2, 8.3**

---

## Error Handling

### API Route (`/api/contact`)

| Scenario | Response |
|----------|----------|
| Honeypot filled | `200 { success: true }` — silent discard |
| Validation failure | `400 { success: false, error: "<field>: <reason>" }` |
| Supabase insert error | `500 { success: false, error: "Failed to save message" }` |
| Method not POST | `405 Method Not Allowed` |
| Malformed JSON body | `400 { success: false, error: "Invalid request body" }` |

The API route never leaks Supabase error details to the client — internal errors are logged server-side and a generic message is returned.

### ContactSection (Browser)

The fetch to `/api/contact` is fire-and-forget wrapped in a `try/catch`. Failures are silently swallowed — they do not affect the EmailJS flow or the user-facing toast. This is intentional: the EmailJS notification is the primary user feedback mechanism; the database write is secondary.

```typescript
// Fire-and-forget — never blocks EmailJS or UI
fetch('/api/contact', { method: 'POST', ... }).catch(() => {})
```

### InboxSection (Dashboard)

| Scenario | Handling |
|----------|----------|
| Query loading | Spinner (consistent with dashboard style) |
| Query error | Error message with retry option |
| Mutation error (mark-read, archive, delete) | Toast notification; query is still invalidated to ensure consistency |
| Empty result set | Empty-state illustration with contextual message per tab |
| Network offline | TanStack Query's built-in retry (1 retry, configured in `DashboardQueryProvider`) |

---

## Testing Strategy

### Unit Tests (example-based)

Focus on specific behaviors and edge cases:

- API route: honeypot returns 200 without insert
- API route: each validation rule (missing field, too long, invalid email) returns 400
- API route: Supabase failure returns 500
- API route: valid payload returns 200 and calls insert with correct fields
- `ContactSection`: honeypot field is present and hidden (`aria-hidden`, off-screen positioning)
- `ContactSection`: both fetch and emailjs.send are called on submit
- `ContactSection`: fetch failure does not block emailjs.send
- `InboxSection`: renders loading spinner while query is pending
- `InboxSection`: renders empty state when no messages
- `InboxSection`: renders three tabs
- `InboxSection`: clicking a row opens detail panel
- `InboxSection`: ConfirmDialog appears on delete trigger
- `DashboardLayout`: badge renders when `unreadCount > 0`
- `DashboardLayout`: badge absent when `unreadCount === 0`

### Property-Based Tests (fast-check)

Each property test runs a minimum of **100 iterations**. Tag format: `Feature: contact-leads-inbox, Property N: <property_text>`

- **Property 1**: Generate arbitrary non-empty strings as honeypot → always 200, no insert
- **Properties 2–8**: Generate strings at and around each validation boundary → correct 400/200 responses
- **Property 9**: Generate valid payloads with arbitrary field values within bounds → always 200, inserted row has `status='unread'`
- **Property 10**: Generate valid payloads with absent/empty/null `source_page` → stored value is always `'/'`
- **Property 11**: Generate strings of arbitrary length as `User-Agent` → stored value is always ≤ 500 chars and equals the first 500 chars of the input
- **Property 12**: Generate arrays of `ContactMessage` objects with random `submittedAt` values → rendered list is always sorted descending
- **Property 13**: Generate arrays of `ContactMessage` objects with random status distributions → badge count always equals the count of `status='unread'` items
- **Property 14**: Generate arbitrary non-negative integers as `unreadCount` → badge present iff count > 0

### Integration Tests

- RLS: anon client can INSERT but cannot SELECT/UPDATE/DELETE
- RLS: authenticated client can SELECT, UPDATE, DELETE
- End-to-end: form submit → API route → row appears in dashboard inbox

### Smoke Tests / Build Verification

- `npm run build` completes without TypeScript or ESLint errors
- Migration file is idempotent (can be run twice without error)
- Service-role key is not present in any client-side bundle (verified via `next build` output analysis)
