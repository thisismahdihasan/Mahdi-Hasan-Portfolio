-- Seed file: skill categories and skills
-- Safe to run multiple times — conflicts on title/slug are handled with upsert.

-- ─── 1. Skill Categories ────────────────────────────────────────────────────

INSERT INTO skill_categories (title, sort_order)
VALUES
  ('Frontend',        1),
  ('Backend',         2),
  ('Database & Auth', 3),
  ('Tools & Workflow',4)
ON CONFLICT (title) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;

-- ─── 2. Skills ──────────────────────────────────────────────────────────────
-- Each row links to skill_categories via a subquery on title so this file
-- stays self-contained and does not hard-code generated UUIDs.

INSERT INTO skills (name, category_id, sort_order)
VALUES
  -- Frontend (sort_order 1-6)
  ('React',       (SELECT id FROM skill_categories WHERE title = 'Frontend'), 1),
  ('Next.js',     (SELECT id FROM skill_categories WHERE title = 'Frontend'), 2),
  ('JavaScript',  (SELECT id FROM skill_categories WHERE title = 'Frontend'), 3),
  ('Tailwind CSS',(SELECT id FROM skill_categories WHERE title = 'Frontend'), 4),
  ('HTML5',       (SELECT id FROM skill_categories WHERE title = 'Frontend'), 5),
  ('CSS3',        (SELECT id FROM skill_categories WHERE title = 'Frontend'), 6),

  -- Backend (sort_order 1-3)
  ('Node.js',     (SELECT id FROM skill_categories WHERE title = 'Backend'),  1),
  ('Express.js',  (SELECT id FROM skill_categories WHERE title = 'Backend'),  2),
  ('REST APIs',   (SELECT id FROM skill_categories WHERE title = 'Backend'),  3),

  -- Database & Auth (sort_order 1-3)
  ('MongoDB',     (SELECT id FROM skill_categories WHERE title = 'Database & Auth'), 1),
  ('Firebase',    (SELECT id FROM skill_categories WHERE title = 'Database & Auth'), 2),
  ('JWT',         (SELECT id FROM skill_categories WHERE title = 'Database & Auth'), 3),

  -- Tools & Workflow (sort_order 1-6)
  ('Git',         (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 1),
  ('GitHub',      (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 2),
  ('VS Code',     (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 3),
  ('Postman',     (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 4),
  ('Netlify',     (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 5),
  ('Vercel',      (SELECT id FROM skill_categories WHERE title = 'Tools & Workflow'), 6)
ON CONFLICT (name, category_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;
