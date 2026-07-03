# Implementation Plan - Phase 1 Optimization & Cleanup

## Goal
Improve performance, security, and cleanup without changing the public visual design, dashboard behavior, layout, colors, spacing, typography, animations, or UX.

## Files allowed to modify in Phase 1
- src/app/layout.tsx
- src/components/CustomCursor.tsx
- src/components/SmartLoader.tsx
- src/components/contact/ContactSection.tsx
- src/components/Footer.tsx
- src/components/ProjectsSection.tsx
- package.json
- package-lock.json

## Phase 1 Tasks

### ~~1. Font and Icon Cleanup~~ — ALREADY DONE
- Space_Grotesk and Epilogue were not present in layout.tsx.
- Material Symbols link tag was already scoped to dashboard/layout.tsx only.
- No action needed.

### ~~2. CustomCursor Performance~~ — ALREADY DONE
- useMotionValue already used for mouse position (no React state on mousemove).
- document.elementFromPoint already removed.
- Event delegation (mouseover) already in place.
- No action needed.

### ~~3. SmartLoader Optimization~~ — ALREADY DONE
- Returning-visitor path already resolves in exactly 700ms (500ms + 200ms fade).
- No action needed.

### ~~4. Honeypot Spam Fix~~ — ALREADY DONE
- Honeypot input already bound to formData.honeypot via onChange.
- Submit already sends formData.honeypot (not a hardcoded empty string).
- No action needed.

### 5. External Link Security ✅
- Add rel="noopener noreferrer" to the 3 target="_blank" links in ProjectsSection.tsx.
  - Client work card: Live Website link (was rel="noreferrer")
  - Projects layout: Live Demo link (was rel="noreferrer")
  - Projects layout: Source Code link (was rel="noreferrer")
- Footer.tsx already correct — no changes needed there.

### 6. Remove Dead Dependency ✅
- Remove gsap from package.json dependencies.
- Remove gsap from optimizePackageImports in next.config.js.
- Run npm install to update package-lock.json.

## Verification
Run after implementation:
- npm install
- npm run lint
- npm run build

## Rules
- Do not touch dashboard code.
- Do not change visual design.
- Do not implement SEO, sitemap, robots, metadata, JSON-LD, or headers yet.
- One phase only.

---

# Implementation Plan - Phase 2: SEO Foundation

## Goal
Add complete, production-ready SEO infrastructure to the public portfolio using Next.js App Router conventions. Zero visual changes. Zero dashboard changes. Build must pass.

## Identity & Target Domain
- **Name:** Mahdi Hasan
- **Title:** Junior Frontend Developer
- **Stack:** React, Next.js, Tailwind CSS, MERN
- **Domain:** https://thisismahdihasan.com

---

## Files to Modify

### 1. `src/app/layout.tsx`
**What changes:**
- Replace the minimal `metadata` export with a full expanded object:
  - `metadataBase: new URL('https://thisismahdihasan.com')`
  - `alternates.canonical: '/'`
  - `applicationName: 'Mahdi Hasan Portfolio'`
  - `title` with `default` and `template` (e.g. `%s | Mahdi Hasan`)
  - `description` (expanded, keyword-rich)
  - `keywords` array
  - `authors`, `creator`, `publisher`
  - `category: 'technology'`
  - `robots` with `index`, `follow`, `googleBot` directives
  - `openGraph` — type `website`, title, description, url, siteName, locale, images array pointing to `/opengraph-image`
  - `twitter` — card `summary_large_image`, title, description, images, creator handle placeholder
  - `icons` — updated to reference renamed conventional filenames (`/icon.png`, `/apple-icon.png`, `/icon.svg`)
- Add `export const viewport: Viewport` (separate from metadata per Next.js 14+ requirement):
  - `themeColor: '#D4AF37'` (brand gold)
  - `width: 'device-width'`, `initialScale: 1`
- Import and render the `<PersonJsonLd />` component from `src/lib/seo.tsx` inside `<body>`

**What does NOT change:**
- Font imports (Syne, Manrope) — untouched
- All layout JSX (body, providers, cursor, toaster) — untouched
- No visual output change

---

## Files to Create

### 2. `src/lib/seo.tsx`
**Purpose:** Reusable JSON-LD structured data component. Keeps `layout.tsx` clean.

**Contents:**
- Export `siteConfig` const — single source of truth for name, url, description, social links, title, keywords. Used by metadata and JSON-LD alike.
- Export `<PersonJsonLd />` server component that renders:
  ```html
  <script type="application/ld+json">...</script>
  ```
  Schema: `Person` + `WebSite` combined, including:
  - `@type: 'Person'`
  - `name`, `url`, `jobTitle`
  - `description`
  - `knowsAbout` array (React, Next.js, Tailwind CSS, MongoDB, Express, Node.js, JavaScript, TypeScript)
  - `sameAs` array (LinkedIn URL, GitHub URL)
  - `WebSite` sub-schema with `SearchAction` placeholder

### 3. `src/app/opengraph-image.tsx`
**Purpose:** Dynamic OG image generated at build time via Next.js `ImageResponse`. No external image file needed.

**Design:**
- 1200×630px canvas
- Background: `#000000` (matches site)
- Left accent bar: `#D4AF37` (brand gold, 6px wide, full height)
- Large name text: "Mahdi Hasan" — white, bold
- Role text: "Junior Frontend Developer" — gold (`#D4AF37`)
- Stack line: "React · Next.js · Tailwind CSS · MERN" — muted white
- Bottom-right: domain `thisismahdihasan.com` — small, muted
- Uses only inline styles and system fonts (no external font fetch required at generation time, or optionally fetches Syne from Google Fonts)
- Exports `export const size` and `export const contentType` per App Router convention

### 4. `src/app/twitter-image.tsx`
**Purpose:** Separate Twitter/X card image. Same design as OG image — can re-export or duplicate with identical layout. Twitter requires its own file per App Router convention.

**Contents:** Same `ImageResponse` setup as `opengraph-image.tsx`. Exports `size` (1200×630) and `contentType`.

### 5. `src/app/robots.ts`
**Purpose:** Tell crawlers what to index.

**Rules:**
- `Allow: /` — public portfolio is fully crawlable
- `Disallow: /dashboard` — admin area, must not be indexed
- `Disallow: /api/` — API routes, must not be indexed
- `Sitemap: https://thisismahdihasan.com/sitemap.xml`

### 6. `src/app/sitemap.ts`
**Purpose:** Give Google a map of indexable pages.

**Entries:**
- `https://thisismahdihasan.com/` — `priority: 1.0`, `changeFrequency: 'monthly'`
- Dashboard excluded entirely

### 7. `src/app/manifest.ts`
**Purpose:** Web app manifest for PWA installability and mobile browser chrome.

**Contents:**
- `name: 'Mahdi Hasan Portfolio'`
- `short_name: 'MH'`
- `description`: same as site description
- `start_url: '/'`
- `display: 'standalone'`
- `background_color: '#000000'`
- `theme_color: '#D4AF37'`
- `icons`: pointing to `/icon.png` (192px) and `/apple-icon.png` (180px)

---

## Favicon Asset Rename Plan

**Current filenames → Next.js conventions:**

| Current | New | Location | Safe? |
|---------|-----|----------|-------|
| `public/mh(4x).png` | `public/icon.png` | `public/` | ✅ — copy/rename, update metadata reference |
| `public/mh_1x.png` | `public/apple-icon.png` | `public/` | ✅ — copy/rename, update metadata reference |
| `public/mh.svg` | `public/icon.svg` | `public/` | ✅ — copy/rename, add to metadata icons |

**Note:** The App Router also supports placing `icon.png` and `apple-icon.png` directly inside `src/app/` as special files (auto-detected, no metadata needed). We will place them in `public/` and reference them explicitly in metadata — this is the safer, more explicit approach that avoids confusion with the dynamic image files.

**Old files:** The original files (`mh(4x).png`, `mh_1x.png`, `mh.svg`) will be kept as-is in `public/` so no existing reference breaks. The metadata will be updated to point to the new names.

---

## Execution Order

1. Rename/copy favicon assets in `public/`
2. Create `src/lib/seo.tsx` — `siteConfig` + `<PersonJsonLd />`
3. Create `src/app/opengraph-image.tsx`
4. Create `src/app/twitter-image.tsx`
5. Create `src/app/robots.ts`
6. Create `src/app/sitemap.ts`
7. Create `src/app/manifest.ts`
8. Update `src/app/layout.tsx` — metadata, viewport, import PersonJsonLd
9. Run `npm run build` — verify zero errors
10. Verify OG and Twitter images render at `/_next/...` or `/opengraph-image`

---

## Files Modified in Phase 2

| File | Action |
|------|--------|
| `src/app/layout.tsx` | Modify — expand metadata, add viewport export, render PersonJsonLd |
| `src/lib/seo.tsx` | Create — siteConfig + PersonJsonLd component |
| `src/app/opengraph-image.tsx` | Create — dynamic OG image via ImageResponse |
| `src/app/twitter-image.tsx` | Create — dynamic Twitter card image via ImageResponse |
| `src/app/robots.ts` | Create — crawler rules |
| `src/app/sitemap.ts` | Create — URL map |
| `src/app/manifest.ts` | Create — PWA manifest |
| `public/icon.png` | Create — copy of mh(4x).png, conventional name |
| `public/apple-icon.png` | Create — copy of mh_1x.png, conventional name |
| `public/icon.svg` | Create — copy of mh.svg, conventional name |

**Total: 1 modified, 9 created. Zero dashboard files. Zero component files. Zero CSS files.**

---

## Rules
- Do not touch dashboard code.
- Do not change any visual component, layout, color, spacing, animation, or UX.
- Do not modify globals.css.
- Do not modify any component under src/components/.
- Build must pass with zero TypeScript errors before Phase 2 is considered complete.
- Old favicon files in public/ are kept — they are not deleted.
