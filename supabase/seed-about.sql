-- About section content table (single-row settings style)
-- Always one row with id = 1, enforced by check constraint.

create table if not exists about_content (
  id                     integer primary key default 1,
  section_subtitle       text not null default '',
  intro_before_emphasis  text not null default '',
  intro_emphasis         text not null default '',
  intro_after_emphasis   text not null default '',
  highlight_quote        text not null default '',
  current_paragraph      text not null default '',
  core_expertise         text[] not null default '{}',
  beyond_code_title      text not null default 'Beyond Code',
  beyond_code_paragraph  text not null default '',
  beyond_code_tags       text[] not null default '{}',
  education_label        text not null default 'Academic Background',
  education_school       text not null default '',
  education_subtitle     text not null default '',
  about_image_url        text,
  updated_at             timestamptz default now(),
  constraint about_single_row check (id = 1)
);

-- Row-level security
alter table about_content enable row level security;

create policy "Public can read about content"
  on about_content for select
  using (true);

create policy "Authenticated users can upsert about content"
  on about_content for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed the initial row (no-op if already exists)
insert into about_content (
  id,
  section_subtitle,
  intro_before_emphasis,
  intro_emphasis,
  intro_after_emphasis,
  highlight_quote,
  current_paragraph,
  core_expertise,
  beyond_code_title,
  beyond_code_paragraph,
  beyond_code_tags,
  education_label,
  education_school,
  education_subtitle
) values (
  1,
  'A quick story about where I started and what I build now.',
  'I come from a non-traditional background',
  '—my academic path was in History—',
  'but I was always drawn to logic, structure, and building things. The turning point came when I realized I was preparing for a future I didn''t want. I chose to pivot, got the support I needed, and began my development journey through Programming Hero—then kept growing through real projects and consistent practice.',
  'From history to full-stack — I build scalable, product-ready web applications.',
  'Today, I work across the full stack with a backend-first mindset: designing REST APIs, managing databases with PostgreSQL and Prisma, building real-time features with Socket.IO, and crafting clean React and Next.js interfaces. I care about clarity—both in code and in the user experience—and I''m always iterating toward scalable, production-ready systems.',
  ARRAY[
    'Node.js + Express.js (REST APIs)',
    'PostgreSQL + Prisma (ORM)',
    'Socket.IO (Real-time)',
    'React + Next.js (Frontend)',
    'TypeScript',
    'Deployment (Vercel/Railway/Supabase)'
  ],
  'Beyond Code',
  'When I''m not coding, I''m usually at the gym. Training keeps me consistent and focused—and that same discipline shows up in how I work: I stay calm under pressure, iterate through feedback, and keep improving until the details feel right.',
  ARRAY['Discipline', 'Resilience'],
  'Academic Background',
  'Govt. Titumir College',
  'History Major turned Developer'
)
on conflict (id) do nothing;
