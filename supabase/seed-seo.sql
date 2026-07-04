-- SEO settings table (single-row settings style, id = 1 always)
-- Idempotent — safe to run multiple times.

CREATE TABLE IF NOT EXISTS seo_settings (
  id              integer PRIMARY KEY DEFAULT 1,
  seo_title       text,
  seo_description text,
  og_image_url    text,
  updated_at      timestamptz DEFAULT now(),
  CONSTRAINT seo_single_row CHECK (id = 1)
);

-- Row-level security
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seo_settings' AND policyname = 'Public can read seo settings'
  ) THEN
    CREATE POLICY "Public can read seo settings"
      ON seo_settings FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'seo_settings' AND policyname = 'Authenticated users can upsert seo settings'
  ) THEN
    CREATE POLICY "Authenticated users can upsert seo settings"
      ON seo_settings FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Seed initial empty row (no-op if already exists)
INSERT INTO seo_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Storage bucket: seo-images
-- Create manually in Supabase dashboard:
--   Storage → New bucket → seo-images → Public
-- Then apply these RLS policies:

-- Allow anyone to read (public OG image)
-- CREATE POLICY "Public can read seo images"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'seo-images');

-- Allow authenticated users to upload/replace/delete
-- CREATE POLICY "Authenticated users can manage seo images"
--   ON storage.objects FOR ALL
--   USING  (bucket_id = 'seo-images' AND auth.role() = 'authenticated')
--   WITH CHECK (bucket_id = 'seo-images' AND auth.role() = 'authenticated');
