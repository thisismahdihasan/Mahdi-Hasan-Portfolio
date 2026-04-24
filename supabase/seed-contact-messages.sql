-- ============================================================
-- Contact Messages Table — Phase A Migration
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Create table
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

-- 2. Composite index for efficient filtered queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_submitted
  ON contact_messages (status, submitted_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS: anonymous users can INSERT only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages'
      AND policyname = 'anon_insert_contact_messages'
  ) THEN
    CREATE POLICY anon_insert_contact_messages
      ON contact_messages
      FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

-- 5. RLS: authenticated users can SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages'
      AND policyname = 'auth_select_contact_messages'
  ) THEN
    CREATE POLICY auth_select_contact_messages
      ON contact_messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- 6. RLS: authenticated users can UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages'
      AND policyname = 'auth_update_contact_messages'
  ) THEN
    CREATE POLICY auth_update_contact_messages
      ON contact_messages
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 7. RLS: authenticated users can DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contact_messages'
      AND policyname = 'auth_delete_contact_messages'
  ) THEN
    CREATE POLICY auth_delete_contact_messages
      ON contact_messages
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
