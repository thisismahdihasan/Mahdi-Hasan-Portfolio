# Requirements Document

## Introduction

The Contact Leads Inbox is a Phase A feature for the Next.js portfolio site. It captures contact form submissions into a Supabase `contact_messages` table and exposes a dashboard inbox where the authenticated admin can view, manage, and reply to leads. The public-facing contact form retains its existing EmailJS notification flow and visual design. The dashboard gains a new "Inbox" section with message listing, status management (read/unread/archived), and delete with confirmation.

## Glossary

- **Contact_Form**: The existing public `ContactSection.tsx` component that visitors use to send messages.
- **API_Route**: The Next.js server-side route at `POST /api/contact` that validates and persists submissions.
- **Contact_Message**: A single row in the `contact_messages` Supabase table representing one visitor submission.
- **Inbox_Section**: The `InboxSection.tsx` dashboard component that lists and manages Contact_Messages.
- **Dashboard_Layout**: The `DashboardLayout.tsx` component that renders the sidebar, mobile bottom nav, and top bar.
- **Honeypot_Field**: A hidden form field used to detect and silently discard bot submissions.
- **TanStack_Query**: The React Query library already used in the dashboard for server-state management.
- **ConfirmDialog**: The existing reusable modal component used to confirm destructive actions.
- **Supabase_Client**: The browser-safe Supabase client exported from `src/lib/supabase.ts`.
- **RLS**: Row Level Security policies on the Supabase `contact_messages` table.
- **Source_Metadata**: Optional contextual fields (`source_page`, `user_agent`) captured server-side at submission time for future analytics and spam debugging.

---

## Requirements

### Requirement 1: Database Table and Access Control

**User Story:** As the portfolio owner, I want contact form submissions stored securely in Supabase, so that I can access them from the dashboard without exposing them to the public.

#### Acceptance Criteria

1. THE `contact_messages` table SHALL have columns: `id` (uuid, primary key, default `gen_random_uuid()`), `name` (text, not null), `email` (text, not null), `phone` (text, nullable), `message` (text, not null), `status` (text, not null, default `'unread'`, check constraint limiting values to `'unread'`, `'read'`, `'archived'`), `submitted_at` (timestamptz, default `now()`), `read_at` (timestamptz, nullable), `archived_at` (timestamptz, nullable), `source_page` (text, nullable, default `'/'`), `user_agent` (text, nullable).
2. THE `contact_messages` table SHALL have a composite index on `(status, submitted_at DESC)` to support efficient filtered queries.
3. WHEN an anonymous (unauthenticated) user calls the Supabase API, THE RLS policy SHALL permit `INSERT` operations only on `contact_messages`.
4. WHEN an anonymous user attempts `SELECT`, `UPDATE`, or `DELETE` on `contact_messages`, THE RLS policy SHALL deny the operation.
5. WHEN an authenticated user calls the Supabase API, THE RLS policy SHALL permit `SELECT`, `UPDATE`, and `DELETE` operations on `contact_messages`.
6. THE migration file SHALL be located at `supabase/seed-contact-messages.sql` and SHALL be idempotent (using `CREATE TABLE IF NOT EXISTS` and `CREATE POLICY IF NOT EXISTS` or equivalent guards).

---

### Requirement 2: Contact Type Definitions

**User Story:** As a developer, I want a shared TypeScript type for contact messages, so that all components and API routes use consistent, type-safe data structures.

#### Acceptance Criteria

1. THE file `src/types/contact.ts` SHALL export a `ContactMessage` interface with fields matching the `contact_messages` table columns, using TypeScript-appropriate types (`string`, `string | null`, `'unread' | 'read' | 'archived'`).
2. THE file `src/types/contact.ts` SHALL export a `ContactMessageStatus` type alias for the union `'unread' | 'read' | 'archived'`.
3. THE `ContactMessage` interface SHALL use `camelCase` field names that map to the snake_case database columns (e.g., `submittedAt` for `submitted_at`).

---

### Requirement 3: Server-Side Contact API Route

**User Story:** As a visitor, I want my contact form submission validated and stored on the server, so that invalid or bot-generated data is never persisted.

#### Acceptance Criteria

1. THE `API_Route` SHALL accept `POST` requests at `/api/contact` with a JSON body containing `name`, `email`, `message`, `phone` (optional), and `honeypot` (optional).
2. WHEN the `honeypot` field in the request body is a non-empty string, THE `API_Route` SHALL return a `200 OK` response with `{ success: true }` without inserting any data.
3. WHEN `name` is missing or empty, THE `API_Route` SHALL return a `400` response with a descriptive error message.
4. WHEN `name` exceeds 100 characters, THE `API_Route` SHALL return a `400` response with a descriptive error message.
5. WHEN `email` is missing, empty, or not a valid email format, THE `API_Route` SHALL return a `400` response with a descriptive error message.
6. WHEN `email` exceeds 254 characters, THE `API_Route` SHALL return a `400` response with a descriptive error message.
7. WHEN `message` is missing or empty, THE `API_Route` SHALL return a `400` response with a descriptive error message.
8. WHEN `message` exceeds 2000 characters, THE `API_Route` SHALL return a `400` response with a descriptive error message.
9. WHEN `phone` is provided and exceeds 40 characters, THE `API_Route` SHALL return a `400` response with a descriptive error message.
10. WHEN all validation passes, THE `API_Route` SHALL insert a row into `contact_messages` with `status` set to `'unread'` and return a `200` response with `{ success: true }`.
11. WHEN the Supabase insert fails, THE `API_Route` SHALL return a `500` response with `{ success: false, error: "Failed to save message" }`.
12. THE `API_Route` SHALL use a server-side Supabase client (not the browser client) to perform the insert, ensuring the operation is not subject to browser-side RLS bypass attempts.
13. THE `API_Route` SHALL capture and store `source_page` from the request body (defaulting to `'/'` if absent or empty) and `user_agent` from the `User-Agent` request header (stored as-is, truncated to 500 characters if longer). Raw IP addresses SHALL NOT be stored in Phase A.

---

### Requirement 4: Contact Form Integration

**User Story:** As a visitor, I want my message submitted to both the database and the email notification system, so that the portfolio owner is notified immediately and the message is also stored for later review.

#### Acceptance Criteria

1. WHEN a visitor submits the `Contact_Form`, THE `Contact_Form` SHALL send the form data to `POST /api/contact` in addition to the existing EmailJS send.
2. WHEN the `API_Route` returns an error, THE `Contact_Form` SHALL not block the EmailJS notification — the existing success/error toast UI SHALL reflect the EmailJS result.
3. THE `Contact_Form` SHALL include a hidden `honeypot` input field that is not visible to human users (positioned off-screen or with `aria-hidden`).
4. THE `Contact_Form` SHALL NOT change any visible layout, styling, or animation of the existing contact section.
5. WHEN the `Contact_Form` is submitted, THE `Contact_Form` SHALL send `name`, `email`, `phone`, and `message` values to the `API_Route`, along with `source_page` set to `window.location.pathname`.

---

### Requirement 5: Dashboard Inbox Section — Message List

**User Story:** As the portfolio owner, I want to see all contact messages in the dashboard, so that I can review and manage incoming leads.

#### Acceptance Criteria

1. THE `Inbox_Section` SHALL display Contact_Messages ordered by `submitted_at` descending (newest first).
2. THE `Inbox_Section` SHALL provide three tabs: "All", "Unread", and "Archived", filtering the displayed messages accordingly.
3. THE `Inbox_Section` SHALL display an unread count badge on the "Unread" tab showing the number of messages with `status = 'unread'`.
4. WHEN the screen width is 640px or wider, THE `Inbox_Section` SHALL render messages in a table or structured list layout.
5. WHEN the screen width is below 640px, THE `Inbox_Section` SHALL render messages as stacked cards.
6. THE `Inbox_Section` SHALL use TanStack_Query with query key `["dashboard-contact-messages"]` to fetch and cache messages from Supabase.
7. WHILE messages are loading, THE `Inbox_Section` SHALL display a loading spinner consistent with the dashboard's existing loading style.
8. WHEN no messages exist for the active tab, THE `Inbox_Section` SHALL display an empty-state message.

---

### Requirement 6: Dashboard Inbox Section — Message Detail

**User Story:** As the portfolio owner, I want to open a message and read its full content, so that I can understand the lead's request before responding.

#### Acceptance Criteria

1. WHEN a message row or card is clicked, THE `Inbox_Section` SHALL display a detail panel showing the sender's name, email, phone (if present), submission timestamp, and full message body.
2. WHEN a message with `status = 'unread'` is opened, THE `Inbox_Section` SHALL update the message's `status` to `'read'` and set `read_at` to the current timestamp in Supabase.
3. WHEN a message is marked read, THE `Inbox_Section` SHALL invalidate the `["dashboard-contact-messages"]` TanStack_Query cache so the list reflects the updated status.
4. THE detail panel SHALL include a "Reply" button that opens the user's default email client via `mailto:{email}?subject=Re: Portfolio Inquiry`.
5. THE detail panel SHALL include an "Archive" action that sets the message `status` to `'archived'` and sets `archived_at` to the current timestamp.
6. WHEN a message has `status = 'archived'`, THE detail panel SHALL show an "Unarchive" action that sets the message `status` back to `'read'`.
7. WHEN an archive or unarchive action completes, THE `Inbox_Section` SHALL invalidate the `["dashboard-contact-messages"]` TanStack_Query cache.

---

### Requirement 7: Dashboard Inbox Section — Delete

**User Story:** As the portfolio owner, I want to permanently delete a contact message, so that I can remove spam or irrelevant entries.

#### Acceptance Criteria

1. WHEN the delete action is triggered for a message, THE `Inbox_Section` SHALL display the existing `ConfirmDialog` component with an appropriate title and description.
2. WHEN the user confirms deletion in the `ConfirmDialog`, THE `Inbox_Section` SHALL delete the message row from Supabase and close the detail panel.
3. WHEN deletion completes, THE `Inbox_Section` SHALL invalidate the `["dashboard-contact-messages"]` TanStack_Query cache.
4. WHEN the user cancels the `ConfirmDialog`, THE `Inbox_Section` SHALL take no action and close the dialog.
5. WHILE a delete operation is in progress, THE `ConfirmDialog` SHALL display a loading state using its `loading` prop.

---

### Requirement 8: Dashboard Navigation — Inbox Entry

**User Story:** As the portfolio owner, I want an Inbox item in the dashboard navigation, so that I can quickly access my messages from any section.

#### Acceptance Criteria

1. THE `Dashboard_Layout` NAV array SHALL include an entry with `id: 'inbox'`, `label: 'Inbox'`, and `icon: 'inbox'`.
2. THE `Dashboard_Layout` SHALL accept and render an unread count badge on the Inbox nav item WHEN the unread message count is greater than zero.
3. WHEN the unread count is zero, THE `Dashboard_Layout` SHALL not render a badge on the Inbox nav item.
4. THE `Section` type in `src/app/dashboard/page.tsx` SHALL include `'inbox'` as a valid value.
5. WHEN the active section is `'inbox'`, THE `Dashboard_Layout` SHALL render the `Inbox_Section` component.
6. THE unread badge SHALL be visible on both the desktop sidebar nav item and the mobile bottom nav item.

---

### Requirement 9: Inbox Fetch Performance

**User Story:** As the portfolio owner, I want the inbox to stay fast even as leads accumulate over time, so that the dashboard never becomes slow to load.

#### Acceptance Criteria

1. THE `Inbox_Section` initial fetch SHALL be limited to the 50 most recent messages ordered by `submitted_at` descending.
2. THE fetch limit SHALL apply per active tab — i.e., the 50 most recent messages matching the current status filter.
3. WHEN the total message count for the active tab exceeds 50, THE `Inbox_Section` SHALL display a notice indicating that only the latest 50 messages are shown (e.g., "Showing latest 50 messages").
4. THE Supabase query SHALL use `.limit(50)` and `.order('submitted_at', { ascending: false })` to enforce this at the database level, not in the client.

---

### Requirement 10: Source Metadata on Contact Messages

**User Story:** As the portfolio owner, I want to know which page a message was sent from and what browser the sender used, so that I can later use this data for analytics or spam debugging.

#### Acceptance Criteria

1. THE `ContactMessage` interface in `src/types/contact.ts` SHALL include `sourcePage` (`string | null`) and `userAgent` (`string | null`) fields.
2. WHEN a message is inserted, THE `API_Route` SHALL set `source_page` to the value provided in the request body, defaulting to `'/'` if the field is absent or empty.
3. WHEN a message is inserted, THE `API_Route` SHALL set `user_agent` to the value of the `User-Agent` HTTP request header, truncated to 500 characters. If the header is absent, `user_agent` SHALL be stored as `null`.
4. Raw IP addresses SHALL NOT be stored in Phase A.
5. THE `source_page` and `user_agent` fields SHALL be visible in the message detail panel in the dashboard (displayed as secondary metadata, not prominently).

---

### Requirement 11: Build Integrity

**User Story:** As a developer, I want the project to build without errors after all changes, so that the feature is deployable.

#### Acceptance Criteria

1. WHEN `npm run build` is executed, THE build process SHALL complete without TypeScript errors.
2. WHEN `npm run build` is executed, THE build process SHALL complete without ESLint errors that would cause a build failure.
3. THE `Contact_Form` SHALL remain fully functional with its existing EmailJS flow after the integration changes.
