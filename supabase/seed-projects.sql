-- Seed file: existing portfolio projects
-- Safe to run multiple times — conflicts on slug are handled with upsert.

INSERT INTO projects (
  slug,
  title,
  category,
  short_description,
  full_description,
  image_url,
  live_url,
  github_url,
  tech_stack,
  bullets,
  status,
  sort_order
) VALUES
(
  'voyago',
  'Voyago',
  'frontend',
  'Vehicle booking platform',
  'A modern vehicle booking platform that makes renting and managing cars simple—users can explore, book, and track rides, while hosts control listings and availability through a clean dashboard.',
  '/voyago.webp',
  'https://voyago-2805d.web.app',
  'https://github.com/mahdi9162/Voyago-Client-Side.git',
  ARRAY['React', 'Tailwind CSS', 'Node.js', 'Express', 'MongoDB', 'Firebase'],
  NULL,
  'published',
  1
),
(
  'edubridge',
  'EduBridge',
  'frontend',
  'Tuition management system',
  'A trust-focused tuition management system designed to keep tutors and students aligned—handling learning flow, tracking progress, and daily class coordination without unnecessary complexity.',
  '/edubridge.webp',
  'https://edubridge-production.web.app',
  'https://github.com/mahdi9162/EduBridge-Client-Side.git',
  ARRAY['React', 'Tailwind CSS', 'Firebase', 'Node.js', 'MongoDB'],
  NULL,
  'published',
  2
),
(
  'appverse',
  'AppVerse',
  'frontend',
  'Productivity app explorer',
  'A sleek productivity app explorer where users can discover tools, view detailed insights, and manage installs instantly—built for smooth interaction, clarity, and speed.',
  '/appverse.webp',
  'https://appversee.netlify.app',
  'https://github.com/mahdi9162/AppVerse.git',
  ARRAY['React', 'Tailwind', 'JavaScript'],
  NULL,
  'published',
  3
),
(
  'skillora',
  'Skillora',
  'frontend',
  'Skill-sharing platform',
  'A local 1-on-1 skill-sharing platform that connects learners with nearby mentors—making it easy to discover skills, schedule sessions, and learn in a more personal, real-world way.',
  '/skillora.webp',
  'https://skillora-505c9.web.app',
  'https://github.com/mahdi9162/Skillora.git',
  ARRAY['React', 'Tailwind CSS', 'Firebase', 'MongoDB', 'Express'],
  NULL,
  'published',
  4
),
(
  'swashpeak-storefront-refresh',
  'SwashPeak — Storefront UI Refresh (Client)',
  'client',
  'E-commerce storefront redesign',
  'Frontend improvements shipped to a live storefront—navigation, responsive layout, and UI polish.',
  '/SwashPeak.webp',
  'https://swashpeak.com/',
  NULL,
  ARRAY['HTML', 'CSS', 'Responsive Layout', 'Theme Sections (Shopify)'],
  ARRAY[
    'Improved navigation + category structure so users can find products faster',
    'Made the storefront fully responsive across mobile/tablet/desktop',
    'Added modern sections + UI polish for a cleaner brand presentation'
  ],
  'published',
  5
)
ON CONFLICT (slug) DO UPDATE SET
  title            = EXCLUDED.title,
  category         = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  full_description = EXCLUDED.full_description,
  image_url        = EXCLUDED.image_url,
  live_url         = EXCLUDED.live_url,
  github_url       = EXCLUDED.github_url,
  tech_stack       = EXCLUDED.tech_stack,
  bullets          = EXCLUDED.bullets,
  status           = EXCLUDED.status,
  sort_order       = EXCLUDED.sort_order;
