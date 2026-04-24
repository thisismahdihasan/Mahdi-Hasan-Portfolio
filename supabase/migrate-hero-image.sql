-- Add profile image URL column to hero_content
-- Safe to run multiple times (IF NOT EXISTS guard)

alter table hero_content
  add column if not exists profile_image_url text;

-- Storage bucket: hero-images
-- Create manually in Supabase dashboard (Storage → New bucket → hero-images → Public)
-- Then apply these RLS policies:

-- Allow anyone to read (public portfolio)
create policy "Public can read hero images"
  on storage.objects for select
  using (bucket_id = 'hero-images');

-- Allow authenticated users to upload/replace/delete
create policy "Authenticated users can manage hero images"
  on storage.objects for all
  using (bucket_id = 'hero-images' and auth.role() = 'authenticated')
  with check (bucket_id = 'hero-images' and auth.role() = 'authenticated');
