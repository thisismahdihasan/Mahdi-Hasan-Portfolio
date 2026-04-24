# Implementation Plan: Contact Leads Inbox

## Overview

Implement persistent contact form storage and a dashboard inbox. The work proceeds in eight ordered steps: database migration → TypeScript types → API route → contact form integration → inbox UI → dashboard layout update → dashboard page wiring → build verification.

## Tasks

- [x] 1. Create database migration for contact_messages table
  - Create `supabase/seed-contact-messages.sql` as an idempotent migration
  - Define the `contact_messages` table with all required columns: `id` (uuid PK, `gen_random_uuid()`), `name` (text NOT NULL), `email` (text NOT NULL), `phone` (text nullable), `message` (text NOT NULL), `status` (text NOT NULL DEFAULT `'unread'`, CHECK IN `('unread','read','archived')`), `submitted_at` (timestamptz DEFAULT `now()`), `read_at` (timestamptz nullable), `archived_at` (timestamptz nullable), `source_page` (text DEFAULT `'/'`), `user_agent` (text nullable)
  - Add composite index `idx_contact_messages_status_submitted` on `(status, submitted_at DESC)` using `CREATE INDEX IF NOT EXISTS`
  - Add RLS policy allowing anonymous `INSERT` only (no SELECT/UPDATE/DELETE for anon)
  - Add RLS policy allowing authenticated users `SELECT`, `UPDATE`, and `DELETE`
  - Use `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY IF NOT EXISTS` (or `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$`) so the file is safe to run multiple times
  - Enable RLS on the table with `ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Create TypeScript type definitions
  - Create `src/types/contact.ts`
  - Export `ContactMessageStatus` as `type ContactMessageStatus = 'unread' | 'read' | 'archived'`
  - Export `ContactMessage` interface with camelCase fields mapping to all snake_case DB columns: `id`, `name`, `email`, `phone: string | null`, `message`, `status: ContactMessageStatus`, `submittedAt`, `readAt: string | null`, `archivedAt: string | null`, `sourcePage: string | null`, `userAgent: string | null`
  - _Requirements: 2.1, 2.2, 2.3, 10.1_

- [x] 3. Create the POST /api/contact API route
  - Create `src/app/api/contact/route.ts`
  - Create a module-local Supabase service-role client using `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)` — this client MUST NOT be exported and MUST NOT be added to `src/lib/supabase.ts`
  - Export only a `POST` handler function (return 405 for other methods)
  - Parse the JSON body; return `400 { success: false, error: "Invalid request body" }` on parse failure
  - Implement honeypot check: if `honeypot` field is a non-empty string, return `200 { success: true }` immediately without inserting
  - Implement validation in order: `name` (required, non-empty after trim, max 100 chars), `email` (required, valid email format, max 254 chars), `message` (required, non-empty after trim, max 2000 chars), `phone` (optional; if provided, max 40 chars) — return `400 { success: false, error: "<field>: <reason>" }` on any failure
  - Capture `source_page` from request body, defaulting to `'/'` if absent or empty
  - Capture `user_agent` from the `User-Agent` request header, truncated to 500 characters; store `null` if header is absent
  - Do NOT store raw IP addresses
  - Insert the validated row with `status: 'unread'`; on Supabase error return `500 { success: false, error: "Failed to save message" }`; on success return `200 { success: true }`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 10.2, 10.3, 10.4_

  - [ ]* 3.1 Write property test for honeypot silent-accept (Property 1)
    - **Property 1: Honeypot silently accepts any non-empty string**
    - Use fast-check to generate arbitrary non-empty strings as `honeypot`; assert response is always 200 with `{ success: true }` and no DB insert occurs
    - **Validates: Requirements 3.2**

  - [ ]* 3.2 Write property tests for name validation boundaries (Properties 2 & 3)
    - **Property 2: Name validation rejects empty and whitespace-only inputs**
    - **Property 3: Name length boundary**
    - Generate whitespace-only strings and strings longer than 100 chars; assert 400 response
    - **Validates: Requirements 3.3, 3.4**

  - [ ]* 3.3 Write property tests for email validation boundaries (Properties 4 & 5)
    - **Property 4: Email validation rejects invalid formats**
    - **Property 5: Email length boundary**
    - Generate invalid email strings and emails longer than 254 chars; assert 400 response
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 3.4 Write property tests for message and phone validation boundaries (Properties 6, 7 & 8)
    - **Property 6: Message validation rejects empty and whitespace-only inputs**
    - **Property 7: Message length boundary**
    - **Property 8: Phone length boundary**
    - Generate whitespace-only messages, messages > 2000 chars, and phone strings > 40 chars; assert 400 response
    - **Validates: Requirements 3.7, 3.8, 3.9**

  - [ ]* 3.5 Write property test for valid submission inserts with status 'unread' (Property 9)
    - **Property 9: Valid submission inserts with status 'unread'**
    - Generate valid payloads within all field bounds; assert 200 response and inserted row has `status = 'unread'`
    - **Validates: Requirements 3.10**

  - [ ]* 3.6 Write property tests for source_page default and user_agent truncation (Properties 10 & 11)
    - **Property 10: Source page defaults to '/' when absent or empty**
    - **Property 11: User agent is stored truncated to 500 characters**
    - Generate valid payloads with absent/empty `source_page` and arbitrary-length `User-Agent` headers; assert stored values match expected defaults/truncation
    - **Validates: Requirements 10.2, 10.3**

- [x] 4. Checkpoint — API route complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update ContactSection to integrate with the API route
  - Open `src/components/contact/ContactSection.tsx` and read the existing form submission logic
  - Add a hidden honeypot `<input>` field to the form markup — position it off-screen (e.g., `position: absolute; left: -9999px`) and add `aria-hidden="true"` and `tabIndex={-1}`; it must never be visible to human users
  - In the form submit handler, after (or alongside) the existing EmailJS send, add a fire-and-forget `fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, message, honeypot: '', source_page: window.location.pathname }) }).catch(() => {})` — wrap in try/catch so errors are silently swallowed
  - The fetch MUST NOT block the EmailJS flow; EmailJS remains the primary notification path and the existing success/error toast UI must be unchanged
  - Make zero visual changes to the contact section layout, styling, or animations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Create InboxSection dashboard component
  - Create `src/app/dashboard/components/InboxSection.tsx`
  - Read existing dashboard components (`ConfirmDialog.tsx`, `DashboardQueryProvider.tsx`, `OverviewSection.tsx`) to match patterns for TanStack Query usage, loading spinners, and toast notifications
  - Import `ContactMessage`, `ContactMessageStatus` from `src/types/contact.ts`
  - Import the browser Supabase client from `src/lib/supabase.ts` (NOT the service-role client)
  - Implement a `toContactMessage` mapper that converts snake_case Supabase rows to the `ContactMessage` camelCase interface
  - Implement `fetchMessages(status: 'all' | 'unread' | 'archived')` using `.select('*').order('submitted_at', { ascending: false }).limit(50)` with an optional `.eq('status', status)` filter when status is not `'all'`
  - Use `useQuery` with key `["dashboard-contact-messages", tab]` for the message list
  - Implement tab state (`useState`) for `'all' | 'unread' | 'archived'`; render three tab buttons: "All", "Unread" (with unread count badge), "Archived"
  - Desktop layout (≥640px): render messages as structured rows with status dot, sender name, email, timestamp, status badge
  - Mobile layout (<640px): render messages as stacked cards with name, truncated message preview, timestamp, status badge
  - Show a loading spinner while the query is pending (consistent with dashboard style)
  - Show an empty-state message when no messages exist for the active tab
  - When `data.length === 50`, render a notice banner: "ℹ Showing latest 50 messages. Older messages are stored but not displayed."
  - Implement detail panel: clicking a row/card sets `selectedMessage` state; panel shows name, email (as mailto link), phone (if present), formatted `submittedAt`, full message body, and secondary metadata row with `sourcePage` and `userAgent` (dimmed/collapsed)
  - Auto-mark-read: when detail panel opens and `message.status === 'unread'`, immediately fire a `useMutation` that calls `supabase.from('contact_messages').update({ status: 'read', read_at: new Date().toISOString() }).eq('id', message.id)`, then invalidates BOTH `["dashboard-contact-messages"]` and `["dashboard-contact-messages-count"]`
  - Archive action: `useMutation` that updates `status='archived'`, `archived_at=now()`; invalidates both query keys
  - Unarchive action: `useMutation` that updates `status='read'`, `archived_at=null`; invalidates both query keys
  - Delete action: show `ConfirmDialog` with appropriate title/description; on confirm, `useMutation` that deletes the row, closes the detail panel, and invalidates both query keys; use `ConfirmDialog`'s `loading` prop while the mutation is in progress; on cancel, close dialog with no action
  - Detail panel action bar: "Reply" button opens `mailto:{email}?subject=Re: Portfolio Inquiry`; "Archive"/"Unarchive" button; "Delete" button
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 9.3, 9.4, 10.5_

  - [ ]* 6.1 Write property test for inbox list ordering (Property 12)
    - **Property 12: Inbox list is always ordered newest-first**
    - Generate arrays of `ContactMessage` objects with random `submittedAt` values; assert the rendered list always displays them in descending `submittedAt` order
    - **Validates: Requirements 5.1**

  - [ ]* 6.2 Write property test for unread badge count (Property 13)
    - **Property 13: Unread badge count matches actual unread messages**
    - Generate arrays of `ContactMessage` objects with random status distributions; assert the "Unread" tab badge always equals the count of items with `status = 'unread'`
    - **Validates: Requirements 5.3**

- [x] 7. Checkpoint — InboxSection complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update DashboardLayout to add inbox navigation entry
  - Open `src/app/dashboard/components/DashboardLayout.tsx` and read the existing `Section` type, `NAV` array, and nav rendering logic
  - Add `'inbox'` to the `Section` type union in `DashboardLayout.tsx`
  - Add an entry to the `NAV` array: `{ id: 'inbox', label: 'Inbox', icon: 'inbox' }` — use the same icon component pattern as existing nav items
  - Add `unreadCount?: number` to the component's props interface
  - In both the desktop sidebar nav and the mobile bottom nav, render the gold badge when `item.id === 'inbox' && unreadCount > 0`:
    ```tsx
    {item.id === 'inbox' && unreadCount > 0 && (
      <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center px-1">
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    )}
    ```
  - When `unreadCount` is 0 or undefined, no badge is rendered on the inbox nav item
  - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [ ]* 8.1 Write property test for inbox nav badge visibility (Property 14)
    - **Property 14: Inbox nav badge appears if and only if unread count > 0**
    - Generate arbitrary non-negative integers as `unreadCount`; assert badge renders iff count > 0 and displays the count capped at `99+`
    - **Validates: Requirements 8.2, 8.3**

- [x] 9. Update dashboard page to wire inbox section
  - Open `src/app/dashboard/page.tsx` and read the existing `Section` type, section rendering logic, and TanStack Query usage
  - Add `'inbox'` to the `Section` type union in `page.tsx`
  - Add a lightweight unread count query using `useQuery` with key `["dashboard-contact-messages-count"]`:
    - Call `supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread')` (HEAD request — no rows returned)
    - Derive `unreadCount` from the result (`count ?? 0`)
  - Pass `unreadCount` as a prop to `<DashboardLayout>`
  - Add a conditional render: when `section === 'inbox'`, render `<InboxSection />`
  - _Requirements: 8.4, 8.5_

- [x] 10. Final checkpoint — Run build and verify
  - Run `npm run build` and confirm it completes with zero TypeScript errors and zero ESLint errors that would cause a build failure
  - Verify the service-role key is not present in any client-side bundle (check build output)
  - Confirm `ContactSection` still compiles and the EmailJS flow is intact
  - Fix any type errors, missing imports, or lint violations before marking this task complete
  - _Requirements: 11.1, 11.2, 11.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The service-role Supabase client lives ONLY in `src/app/api/contact/route.ts` — never in `src/lib/supabase.ts` or any other file
- All inbox mutations must invalidate BOTH `["dashboard-contact-messages"]` and `["dashboard-contact-messages-count"]` query keys
- The `.limit(50)` is enforced at the Supabase query level, not in the client
- The unread badge caps at `99+` to prevent sidebar layout overflow
- Raw IP addresses are never stored — `source_page` and `user_agent` are the only metadata fields
- Property tests use fast-check with a minimum of 100 iterations per property
