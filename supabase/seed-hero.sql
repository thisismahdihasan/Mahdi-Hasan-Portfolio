-- Hero content table (single-row settings style)
-- Always one row with id = 1, enforced by check constraint.
-- Dashboard upserts on id = 1; public page reads id = 1.

create table if not exists hero_content (
  id                  integer primary key default 1,
  name                text not null default 'MAHDI HASAN',
  role                text not null default 'Junior Full Stack Developer',
  description         text not null default '',
  primary_cta_label   text not null default 'Download Resume',
  primary_cta_url     text not null default '/Mahdi_Hasan''s_Resume.pdf',
  secondary_cta_label text not null default 'View Projects',
  updated_at          timestamp with time zone default now(),
  constraint hero_single_row check (id = 1)
);

-- Row-level security: allow anon read, require auth for write
alter table hero_content enable row level security;

create policy "Public can read hero content"
  on hero_content for select
  using (true);

create policy "Authenticated users can upsert hero content"
  on hero_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed the initial row (no-op if already exists)
insert into hero_content (
  id,
  name,
  role,
  description,
  primary_cta_label,
  primary_cta_url,
  secondary_cta_label
)
values (
  1,
  'MAHDI HASAN',
  'Junior Full Stack Developer',
  'Building scalable web applications with Node.js, Express.js, PostgreSQL, React, and Next.js. Focused on full-stack development with a strong backend foundation and clean, user-centric interfaces.',
  'Download Resume',
  '/Mahdi_Hasan''s_Resume.pdf',
  'View Projects'
)
on conflict (id) do nothing;
