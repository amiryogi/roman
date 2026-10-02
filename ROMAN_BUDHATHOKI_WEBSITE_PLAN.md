# Roman Budhathoki — Website Implementation Plan

**Project:** Personal portfolio and booking website for Roman Budhathoki, violinist (Kathmandu, Nepal)
**Stack:** MongoDB · Express · React · Node.js · TypeScript (only) · Cloudinary
**Status:** Phases 1–5 complete on 2026-10-02, pending the owner's review of the visual direction (Phase 5 checkpoint). Next: Phase 6 (music and audio system).
**Plan date:** 2026-10-02

---

## 0. Context and Repository Inspection

### 0.1 Why this project exists
Roman Budhathoki works as a performing violinist (orchestra, studio, film, weddings, concerts) and as a music educator. He needs a professional portfolio website that:
- presents his artistry
- plays his music
- shows photos and videos
- lists performances
- turns visitors into booking inquiries

He also needs to update the content himself, without a developer.

### 0.2 What already exists in `D:\Roman`
The folder is **not a git repository** and contains **no code, no `package.json`, and no configuration**. There are no existing conventions to preserve. It contains only source material:

| File | Observations | Planned use |
|---|---|---|
| `CV of Roman Budhathoki.docx` | The only source of factual biography (see §0.3). It includes a private phone number and email. | Seed data for the About page and profile. **Do not commit it to a public repository.** |
| `images/roman violin.jpg` (1541×2048 portrait) | Outdoor field shot with an electric violin. **The "ROMAN VIOLIN" wordmark is baked into the image.** | Brand/hero candidate. Baked-in text cannot be re-cropped responsively (see Questions). |
| `images/roman2.PNG` (2048×1215, 1.6 MB PNG) | Black-and-white photo in a suit with an acoustic violin. **The "ROMAN" wordmark is baked in.** | Strong desktop hero candidate if a version without text is available. |
| `images/roman3.jpg` (3480×1952) | Seated street portrait with an acoustic violin. No text. | About page and portrait. |
| `images/roman4.JPG` (3840×2160 per metadata; renders portrait) | Stage performance with warm amber lighting. No text. | Mobile hero, performance gallery. |
| `images/violin.png` (1024×1536) | Studio photo of a violin on black with an amber glow. **It looks like a stock or third-party image.** | Decorative or music-section imagery, **only if the licence is confirmed**. |
| `music for the website.mp3` (≈1.4 MB, LAME/ffmpeg) | **No ID3 title, artist or album metadata.** It looks like it was extracted from a video (ffmpeg `isom` tags). | First track on the Music page. Its title, credits and rights must come from the owner. |

**Preservation rule:** Claude must not move, rename, edit or delete these source files. Seed scripts read them in place.

### 0.3 Verified facts from the CV (the *only* biographical source)
- **Identity:** Roman Budhathoki, music educator, instructor and performer, based in Kathmandu, Nepal.
- **Profile:** professional violinist and music educator with **more than 15 years** of experience in performance and music education. He has taught primary and secondary students in international schools and is trained in the IPC and IMYC music curricula. He performs in orchestras, studio recordings, films and live events, including weddings and concerts.
- **Education and training:**
  - 2013: ABRSM 4th Grade (Violin)
  - 2013: Colourstrings Teacher Training Course (Colourstrings Association, Finland)
  - 2010: Advanced Violin Studies with Rajkumar Shrestha (Narayan Gopal Music Trust)
  - 2008–2009: Violin Studies with Surendra Maharjan (Sol Fa Academy, Naradevi)
- **Teaching:**
  - 2023–present: IPC Music Teacher (Primary), GEMS School, Kathmandu
  - 2019–2023: Violin Instructor, Sanskrity International School, Swayambhu
  - 2019: Lincoln School, Minbhawan
  - 2013: Trikaal Art Academy, Maharajgunj
  - 2013: Blood and Thunder Music Academy, Kumaripati
  - 2012: Sadhana Kala Kendra, Putalisadak
- **Performance:**
  - 2012–present: First Violinist, Annapurna Orchestra
  - 2011–present: concerts, collaborations and studio recordings, including film soundtracks, Nepali artists, weddings, events and session work
  - 2010: International Music Day concert, Nepal Music Center
  - 2009: member of the Kathmandu Youth Orchestra
  - 2008: Fête de la Musique, Alliance Française Kathmandu
- **Other:**
  - 2012: Intern Journalist, Shram Magazine
  - Red Cross Level 1 First Aid
  - Affiliations: Narayan Gopal Music Trust & Sol Fa Academy (2010–present)
- **Skills:** violin performance (solo, orchestra, ensemble); music education and curriculum development; IPC/IMYC teaching; studio and session work; arrangement and composition; live event and wedding performance.

The CV does **not** contain awards, albums, named recordings, named clients, reviews, a musical-philosophy statement, social media links, or upcoming events. **These remain empty placeholders** that the admin can fill. Seed data, UI copy and structured data must never fabricate them.

### 0.4 Decisions log (owner decisions; these override defaults elsewhere in this plan)

| Date | Decision | Consequences |
|---|---|---|
| 2026-10-02 | **Hosting:** Vercel (frontend), Render (backend), MongoDB Atlas (database), Cloudinary (media). | §24 applies to these providers. |
| 2026-10-02 | **API routing:** the Vercel project **rewrites `/api/:path*` to the Render service** (`https://<service>.onrender.com/api/:path*`). The browser only ever talks to the site's own origin. | The refresh cookie is first-party, with no `api.` subdomain needed (satisfies §11). `VITE_API_BASE_URL=/api` in production. In development, the Vite dev server proxies `/api` to `localhost:4000`. CORS stays as defence in depth. `TRUST_PROXY` must count both the Vercel and Render proxy hops; verify the client IP in Phase 12. |
| 2026-10-02 | **Hero image:** use `images/roman violin.jpg`. | Its baked-in "ROMAN VIOLIN" wordmark means it is delivered with `c_limit` (never cropped), and positioned so the wordmark stays visible on all breakpoints. The HTML `<h1>` stays for SEO and accessibility, and is visually de-emphasised next to the image wordmark rather than duplicating it. |
| 2026-10-02 | **Runtime:** Node.js 22 LTS (matches the local toolchain, v22.19; supported by Render). | Replaces "Node 24" in §3 and §24. `engines.node >= 22.12`. |
| 2026-10-02 | **Media originals are private:** every asset is uploaded with Cloudinary delivery type `private` (`MEDIA_DELIVERY_TYPE` in `shared`). | Originals, which can carry camera and GPS metadata, need a signed URL (401 otherwise). Transformed versions, the only URLs the site builds, stay public and have metadata stripped. Delivery URLs use `/<resource>/private/<transformation>/…`. Verification rejects assets of any other type. |

**Implementation notes (Phase 2):**
- §10.5's "typed route helper" was dropped as unnecessary. Handlers call `sharedSchema.parse(...)` directly, and Express 5 forwards the error, which gives the same typing with less code.
- Mongoose 9 with `sanitizeFilter` requires `mongoose.trusted()` around intentional query operators.
- Malformed JSON returns 400 `BAD_REQUEST`, a code added to the §10.1 list.

**Implementation notes (Phase 3):**
- The refresh cookie is read without `cookie-parser`, to avoid one dependency and its `any`-typed `req.cookies`.
- A rotated refresh token replayed within 15 s is refused without revoking anything, because it is treated as a race between browser tabs. Later replays revoke every session, as §11.2 describes.
- After a password change, the server rejects older access tokens with `TOKEN_EXPIRED`, and the client silently refreshes using the surviving session.
- Env uses `ACCESS_TOKEN_TTL_SECONDS` (default 900) instead of `ACCESS_TOKEN_TTL=15m`.
- `npm run check:lockfile` guards against npm/cli#4828, where `npm install <pkg>` drops the native Rolldown and Tailwind bindings from the lockfile and breaks builds on Linux CI and Windows.

**Implementation notes (Phase 4):**
- Cloudinary details confirmed against the docs and SDK 2.11: folder mode comes from `GET /config?settings=true` (`settings.folder_mode`). Dynamic accounts get `asset_folder` + `use_asset_folder_as_public_id_prefix`, fixed ones get `folder`. Audio streams as `/video/upload/ac_mp3,br_160k/v<ver>/<id>.mp3`. Signatures are SHA-1, signature v2.
- Public IDs are random (no `use_filename`), which deviates from §9.1. File names often contain spaces, non-ASCII or private details (e.g. client names), and they would leak into public URLs. The original name is stored as `originalFilename` when Cloudinary reports it.
- The video eager rendition and the client's default video URL share one transformation (`c_limit,w_1280,q_auto,vc_auto` + `.mp4`, constants in `shared`), so the eager derivative is actually used. `f_auto:video` from §9.4 would never match an eager derivative.
- Added `POST /api/admin/uploads/verify`. The uploader verifies straight after uploading, so problems show before the form is saved. Entity saves (Phases 6+) verify again.
- Verification destroys an invalid asset only if it sits in the folder for its kind. Assets elsewhere are rejected but never deleted, because they may belong to other content.
- Each profile image slot gets its own asset, even when the same photo is used twice, so replacing one slot can't delete another slot's image.
- Cloudinary SDK errors include the request's basic-auth credentials. They are reduced to message + HTTP status before they can reach a log.
- Chunked uploads (> 100 MB) are not implemented. The default caps are ≤ 100 MB, which Cloudinary accepts in one request.
- `seed:content` also strips Exif (including GPS) from JPEGs before uploading, as defence in depth: `roman3.jpg` contains GPS coordinates. Uploaded originals are private anyway (see §0.4).
- The Admin API returns `duration` and `original_filename` only with `media_metadata: true`, so verification requests it (found by `npm run test:cloudinary`).
- §0.2's dimensions are partly swapped: `roman violin.jpg` is 2048×1215 (landscape), `roman2.PNG` is 3840×2160 and `roman4.JPG` is 1541×2048 (portrait).
- `npm run check:client-secrets` fails if client code or the client build mentions server secrets (§21.1). It is part of `npm run check` and runs again in CI after the build.

**Implementation notes (Phase 5):**
- Tokens follow §7.2, plus `ink-muted` (`#5E554B`, 6.5:1 on ivory) for secondary text on paper and `ebony-raised` (`#1A1714`) for the footer. `src/styles/tokens.test.ts` reads the colours from `index.css` and fails if any text pair drops below 4.5:1 or a focus/large-text pair below 3:1.
- Surfaces (`surface-dark`, `surface-dark-raised`, `surface-light`) set CSS variables (`--accent`, `--on-accent`, `--muted`, `--focus-ring`). Buttons, labels and focus rings take their colours from the surface, so a section can switch between stage and paper without breaking contrast.
- The hero places the HTML `<h1>` below the photograph, so the baked-in wordmark is never covered or cropped. Tall screens letterbox the image (`object-contain`, max 85svh).
- About shows Biography, Musical journey (training and performance, oldest first), Teaching, Achievements, Musical philosophy, and Skills and affiliations. Empty sections are left out and the movement numbers follow the visible order. Experience in the `other` category is not shown (ASM-6).
- The full desktop navigation appears from 1280 px. Seven links plus Book don't fit at 1024 px, so below that the full-screen menu (a native modal `<dialog>`) is used.
- Music, Videos, Gallery, Performances and Contact are `noindex` placeholder pages until Phases 6–8, so the navigation can be reviewed. `GET /api/home` returns empty featured lists until those phases.
- `index.html` carries head tags marked `data-prerender`, which `main.tsx` removes before React renders each page's own tags. Phase 10's `postbuild-seo.ts` must mark its injected tags the same way.
- Error responses are always `Cache-Control: no-store`, including on public routes.
- `VITE_CLOUDINARY_CLOUD_NAME` is required in production builds: the app refuses to start without it.
- Font preloading is deferred to Phase 10, because it needs the hashed font file names from the build.
- Preliminary Lighthouse (mobile, production build via `vite preview`): Home 91 performance / 100 accessibility / 100 best practices / 100 SEO, About 95/100/100/100, CLS 0. Initial JS is 147 KB gzipped (budget 160 KB), mostly React, React Router and Zod. Home LCP is 3.3 s; Phase 10's hero preload targets it.

**Render free-tier note:** free web services sleep when idle, and the first request after sleeping can take tens of seconds. Use a paid instance for production, or accept the cold starts. This is to be decided by Phase 12.

---

## 1. Project Overview

A two-application monorepo:
- a **React + Vite SPA** for the public site and the admin panel, styled with Tailwind CSS
- an **Express REST API** backed by MongoDB, with media stored in and delivered by Cloudinary

The public site is editorial, dark/ivory and photography-led, with a **persistent audio player**. The admin panel is a deliberately plain, practical CRUD interface behind JWT authentication.

## 2. Goals and Non-Goals

### Goals
1. Present Roman as a professional violinist and educator, with a distinctive, elegant visual identity.
2. Make music playback first-class: one persistent player that keeps playing across page navigation.
3. Show photos and videos fast on mobile networks, using Cloudinary-optimised delivery.
4. Collect booking and contact inquiries reliably, with spam resistance.
5. Let the owner manage all content (profile, music, videos, gallery, events, inquiries) without touching code.
6. Meet production quality: type-safe end to end, accessible (WCAG 2.2 AA target), SEO-ready and secure.

### Non-Goals (v1)
- E-commerce, ticket sales, payments or music downloads for sale
- Multiple admin users and role hierarchies, user accounts for visitors, comments
- A blog or news section, a newsletter, and multi-language content (see Questions)
- A rich-text/WYSIWYG editor (plain text with paragraphs is enough, and it removes the XSS surface)
- Server-side rendering or Next.js. Adaptive (HLS) video streaming. A native mobile app.

## 3. Technology Stack

Use the current stable major version of each tool and confirm it during Phase 1. Expected versions are shown.

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript only** (`strict`) | No `.js`, `.jsx`, `.cjs` or `.mjs` source or config files, enforced in CI (§20). |
| Runtime | Node.js 22 LTS (see §0.4) | `.nvmrc` pins it. |
| Frontend | React 19, Vite, React Router v7 (library/data mode), Tailwind CSS v4 (`@tailwindcss/vite`) | React 19 renders `<title>` and `<meta>` natively, so no Helmet dependency. Tailwind v4 needs no JS config file. |
| Server state | TanStack Query | See §12.4 for the justification. |
| Forms | React Hook Form + `@hookform/resolvers` + Zod | Zod schemas are shared with the server. |
| Backend | Express 5 | Native async error propagation. |
| Validation | Zod (in `shared/`) | One source of truth for API contracts. |
| Database | MongoDB (Atlas) + Mongoose | |
| Media | Cloudinary (Node SDK on the server only; client-side URL builder is hand-written and typed) | |
| Auth | `jsonwebtoken` (access token), opaque refresh token, `argon2` (argon2id) | |
| Security | `helmet`, `cors`, `express-rate-limit`, `cookie-parser` | |
| Logging | `pino` + `pino-http` | Sensitive fields redacted. |
| Testing | Vitest, Supertest, `mongodb-memory-server`, React Testing Library, Playwright | |
| Quality | ESLint (flat config in TS, needs `jiti`), `typescript-eslint` (type-checked), Prettier | |
| Small UI deps | `sonner` (toasts), `yet-another-react-lightbox` (gallery), `@fontsource-variable/*` (self-hosted fonts) | Each is justified in §12. |

**Explicitly excluded:**
- Next.js, PHP, SQL and Firebase
- Redux, Zustand and MobX
- Axios (native `fetch` is enough)
- `react-helmet`, `framer-motion` and other animation libraries
- `express-mongo-sanitize` (incompatible with Express 5's read-only `req.query`, and redundant given §16)
- the Cloudinary SDK in the browser

## 4. Architecture

```text
┌──────────────────────────────────────────────┐
│  client/  React + Vite + TS (static SPA)     │  Static host / CDN
│  public site + lazily-loaded /admin          │  https://<domain>
└───────────────┬──────────────────────┬───────┘
                │ REST (JSON, fetch)   │ direct signed upload (admin only)
                ▼                      ▼
┌──────────────────────────────┐   ┌───────────────────────────┐
│ server/ Express 5 + TS       │──►│ Cloudinary                │
│ auth, validation, CRUD,      │   │ storage, transforms, CDN  │
│ upload signing & verification│◄──│ (images, video, audio)    │
└───────────────┬──────────────┘   └───────────────────────────┘
                │ Mongoose                      ▲
                ▼                               │ media URLs built from publicId
┌──────────────────────────────┐                │ (browser loads media directly
│ MongoDB Atlas                │                │  from res.cloudinary.com)
│ content + metadata, no media │                │
└──────────────────────────────┘ ───────────────┘
```

**Responsibility of each layer:**
- **Client.** Owns rendering, routing, the audio player, form UX, responsive image selection and SEO tags. It holds **no secrets**. It talks only to the API and to Cloudinary's public delivery CDN. Admin uploads go to Cloudinary's upload API with a short-lived signature issued by the server.
- **Server.** Owns:
  - authentication and authorisation
  - validation (shared Zod schemas)
  - business rules: slugs, publication status, upcoming vs past
  - persistence
  - Cloudinary signing, verification and deletion
  - rate limiting
  - error normalisation

  It never streams large media through itself.
- **MongoDB.** Stores structured content and **media metadata references** (public ID, version, dimensions, duration), never binary media.
- **Cloudinary.** Stores originals and derives optimised variants on demand (format, quality, size, crop, posters, audio transcodes). Delivery goes through its CDN.

**Key architectural decision:** media bytes never pass through Express. Admin uploads go straight from the browser to Cloudinary with a signed request. The server then verifies the asset with the Cloudinary Admin API before it stores the reference. This avoids host request-size and timeout limits on large video and audio uploads.

## 5. Folder Structure

### 5.1 Is `shared/` necessary? **Yes, and it stays deliberately small.**
Client and server must agree on:
- request/response DTOs
- the API envelope and error codes
- enums (event types, gallery categories, statuses)
- validation rules: the contact form and admin forms validate with the *same* Zod schemas the server enforces

Duplicating these would drift. `shared/` contains **only** Zod schemas, inferred types, constants and pure functions. It has **no** React, Express or Mongoose imports, and Zod is its only dependency.

### 5.2 Layout (root = `D:\Roman`, package name `roman-budhathoki`)

```text
roman-budhathoki/
├── client/
│   ├── index.html
│   ├── public/                      # robots.txt, favicon.svg, manifest.webmanifest
│   ├── scripts/postbuild-seo.ts     # per-route HTML meta + sitemap (Phase 10)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/                     # router.tsx, providers.tsx, queryClient.ts
│   │   ├── layouts/                 # PublicLayout.tsx, AdminLayout.tsx
│   │   ├── components/
│   │   │   ├── ui/                  # Button, Container, Section, Heading, Field, Spinner,
│   │   │   │                        # EmptyState, ErrorState, Dialog, Pagination, VisuallyHidden
│   │   │   ├── layout/              # SiteHeader, MobileNav, SiteFooter, SkipLink
│   │   │   ├── media/               # ResponsiveImage, VideoPlayer, YouTubeFacade
│   │   │   └── seo/                 # Seo.tsx, JsonLd.tsx
│   │   ├── features/
│   │   │   ├── audio/               # AudioPlayerProvider, audioStore, PlayerBar, useAudioPlayer
│   │   │   ├── home/  about/  music/  videos/  gallery/  events/  contact/
│   │   │   └── admin/
│   │   │       ├── auth/            # AuthProvider, LoginPage, RequireAuth
│   │   │       ├── components/      # AdminTable, MediaUploader, ConfirmDialog, StatusBadge, FormActions
│   │   │       └── dashboard/ profile/ tracks/ albums/ videos/ gallery/ events/ inquiries/
│   │   ├── lib/
│   │   │   ├── api/                 # client.ts (typed fetch), endpoints/*.ts, queryKeys.ts
│   │   │   ├── cloudinary.ts        # typed URL builders (image, video, poster, audio)
│   │   │   ├── env.ts               # validated import.meta.env
│   │   │   └── format.ts            # dates (Asia/Kathmandu), durations
│   │   ├── styles/index.css         # Tailwind v4 @theme tokens
│   │   └── test/setup.ts
│   ├── vite.config.ts  vitest.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json
│   └── package.json
├── server/
│   ├── src/
│   │   ├── app.ts                   # createApp(deps) — no listen(); used by Supertest
│   │   ├── server.ts                # env → db → listen → graceful shutdown
│   │   ├── config/                  # env.ts (Zod-validated), db.ts, logger.ts, cloudinary.ts
│   │   ├── middleware/              # requireAuth, validate, errorHandler, notFound, rateLimiters, cacheControl
│   │   ├── lib/                     # AppError, respond.ts, slug.ts, pagination.ts, tokens.ts, password.ts
│   │   ├── modules/
│   │   │   ├── health/ auth/ profile/ home/ tracks/ albums/ videos/ gallery/ events/ inquiries/ uploads/ stats/
│   │   │   │   └── (each) model.ts · service.ts · routes.ts · mapper.ts · *.test.ts
│   │   ├── services/media/          # MediaService.ts (interface), cloudinaryMediaService.ts, fakeMediaService.ts
│   │   └── scripts/                 # seed-admin.ts, seed-content.ts, cleanup-orphan-media.ts
│   ├── test/                        # setup.ts (memory Mongo), factories.ts, authHelper.ts
│   ├── vitest.config.ts  tsconfig.json  tsconfig.build.json
│   └── package.json
├── shared/
│   ├── src/
│   │   ├── index.ts
│   │   ├── api.ts                   # ApiSuccess<T>, ApiError, ErrorCode, PaginationMeta
│   │   ├── media.ts                 # MediaAsset schema/type
│   │   ├── enums.ts                 # statuses, categories, event types
│   │   └── schemas/                 # profile, track, album, video, gallery, event, inquiry, auth
│   ├── tsconfig.json
│   └── package.json
├── e2e/                             # Playwright specs, fixtures, playwright.config.ts
├── scripts/check-no-js.ts           # CI guard: fail on any tracked JS file
├── images/  "music for the website.mp3"  "CV of Roman Budhathoki.docx"   # existing source material (untouched)
├── package.json                     # npm workspaces: client, server, shared
├── tsconfig.base.json  eslint.config.ts  .prettierrc  .editorconfig  .gitignore  .nvmrc
├── CLAUDE.md                        # condensed non-negotiable rules + pointer to this plan
├── README.md
└── ROMAN_BUDHATHOKI_WEBSITE_PLAN.md
```

**Workspace mechanics:**
- `shared` is built with `tsc -b` to `shared/dist`, with declarations. `client` and `server` depend on `"@roman/shared": "*"` and use TypeScript project references.
- Server ESM (`"type": "module"`, `module: NodeNext`) requires `.js` extensions in relative TS import specifiers. This is TypeScript convention, not JS files.
- Dev runs with `tsx watch`. Production runs `tsc -b` and then `node server/dist/server.js`.
- Root scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`, `test:e2e`, `check:no-js`, `seed:admin`, `seed:content`.

**Server module pattern:**
- `model.ts`: the Mongoose schema and its TS interface.
- `service.ts`: DB and business logic.
- `routes.ts`: thin typed handlers.
- `mapper.ts`: converts a document to a DTO. ObjectId becomes a string, Date becomes an ISO string, and internal fields are stripped.

There is no separate controller or repository layer, because that would be premature abstraction. The one deliberate abstraction is `MediaService`, so tests can run without Cloudinary.

## 6. Page / Site Map

| Route | Page | Content / behaviour |
|---|---|---|
| `/` | Home | Hero (name, "Violinist" identity line, CTA "Listen" and "Book Roman"), featured track(s) with play buttons into the global player, short bio and link to About, featured gallery strip, featured videos, upcoming events teaser (hidden when empty), booking CTA band. |
| `/about` | About | Biography (admin text, seeded from the CV profile), Musical Journey timeline (education and performance milestones from the CV), Teaching and Education section, Experience, Skills. Achievements and Musical Philosophy sections **render only when the admin has filled them**. No placeholder text is shown publicly. |
| `/music` | Music | Albums (if any) and track list. Each track shows cover, title, duration, credits and a play button. Featured tracks come first. Plays through the global player. |
| `/videos` | Videos | Grid of cards (poster, title, category, duration). Category filter chips (sets `?category=`). Plays in an accessible modal: Cloudinary `<video>` or YouTube click-to-load facade. **No detail route in v1** (see ADR-9). |
| `/gallery` | Gallery | Category filter (Performance, Portraits, Events, Behind the Scenes), masonry/justified grid, "Load more" pagination, lightbox. |
| `/events` | Performances | Tabs "Upcoming" and "Past". Concert-programme styled list: date, time (Asia/Kathmandu), venue, city, description, ticket/info link. Friendly empty state when there are no upcoming events. |
| `/contact` | Contact & Booking | Booking/contact form, public contact details (per owner decision), response expectations, privacy note. |
| `/admin/login` | Admin login | `noindex`. |
| `/admin/*` | Admin panel | Dashboard, Profile, Tracks, Albums, Videos, Gallery, Events, Inquiries, Account (change password). Lazily loaded, `noindex`. |
| `*` | 404 | Branded not-found page with links home and to Music. |

**Navigation:** Home · About · Music · Videos · Gallery · Performances · Contact. "Book" is a persistent CTA in the header.

## 7. UI/UX Strategy

### 7.1 Concept: "The Concert Programme"
The site should read like a beautifully printed concert programme brought onto the screen. It is not a SaaS template. The existing brand images already set the tone:
- widely letter-spaced serif capitals ("R O M A N", "V I O L I N")
- dramatic black-and-white portraiture
- warm amber stage light, matching the violin varnish

The design system formalises that.

- **Editorial layout:**
  - asymmetric 12-column grid
  - large photography bleeding to the edge
  - narrow text measure (60–70 characters)
  - generous vertical rhythm
- **Section numbering like movements:** small caps labels such as `I. — Biography` and `II. — Repertoire`. It is a quiet musical reference with no kitsch.
- **Dark and ivory alternation:**
  - Dark "stage" sections: hero, music, videos, performances.
  - Ivory "paper/score" sections: about, contact, event details.

  This creates a narrative rhythm as the visitor scrolls.
- **Restrained violin motifs, all inline SVG and decorative (`aria-hidden`):**
  - four thin parallel hairlines (the strings) as dividers
  - an f-hole curve used once as a section ornament
  - the progress bar of the audio player styled as a single string

### 7.2 Design tokens (Tailwind v4 `@theme`)

| Token | Value (starting point) | Rationale |
|---|---|---|
| `--color-ebony` | `#0F0D0B` | Fingerboard ebony, a warm near-black. Softer than pure black for long reading on dark sections. |
| `--color-ivory` | `#F6F1E7` | Aged score paper. Warm, so photography doesn't look clinical. |
| `--color-rosin` | `#E9DFCC` | Secondary light surface for cards and dividers. |
| `--color-varnish` | `#C07A35` | Amber violin varnish and stage light, taken from `violin.png` and `roman4.JPG`. Used **sparingly** for accents, focus rings on dark surfaces and the active progress bar. |
| `--color-varnish-deep` | `#8A4B1C` | Accent text and links on ivory. Meets ≥ 4.5:1 contrast on `#F6F1E7` (verify in Phase 5). |
| `--color-ink` | `#1E1A16` | Body text on ivory. |
| `--color-mist` | `#B9B0A3` | Secondary text on ebony. Verify ≥ 4.5:1. |

All text and background pairs must be verified with a contrast checker in Phase 5. Amber on ivory is used for **large text and decoration only**, never body text.

**Typography:**
- **Display:** *Cormorant Garamond* (variable, self-hosted via Fontsource). It is a high-contrast Garamond, at home in classical-music printing, and it matches the serif lockup already in Roman's photos. It is used only at ≥ 28px, because its thin strokes suffer at small sizes. Letter-spaced uppercase is used for the name and wordmark.
- **Text/UI:** *Inter* (variable). It is neutral, highly legible at small sizes on screens, has tabular numerals for durations and dates, and is a calm counterpoint to the expressive display face.
- Only two families, with variable woff2 subsets (Latin, plus Devanagari later if Nepali is added). `font-display: swap`, and the two critical files are preloaded.

**Other tokens:**
- **Spacing and shape:** an 8px base scale, large section padding (`py-24` to `py-40` on desktop), and near-square corners (2px). Programme aesthetics, not bubbly cards.
- **Motion:**
  - CSS-only fade/translate (≤ 12px, 400–600 ms, ease-out) on section enter, via a tiny `useInView` hook built on IntersectionObserver
  - hover states on cards
  - a subtle equaliser/"vibrating string" indicator on the track that is currently playing

  All of it is disabled under `prefers-reduced-motion`. No parallax, no scroll-jacking, no autoplaying background video.

### 7.3 Photography art direction
- Use `<picture>` with different crops per breakpoint:
  - **portrait** crops (`roman4`, `roman violin`) for mobile heroes
  - **landscape** crops (`roman2`, `roman3`) for desktop
- Cloudinary `g_auto` (subject-aware cropping) is the default. The admin can override with a focal point (`focalX`, `focalY`) later if needed (future enhancement).
- Images with baked-in text **must not be cropped**. They use `c_limit` (no crop), or are replaced with clean originals (see Questions).
- **Hero copy is real HTML text**, never baked into images, for SEO, accessibility and responsive layout.

### 7.4 Mobile-first specifics
- Bottom-anchored mini player that never covers the form submit button. The page gets bottom padding equal to the player height.
- Thumb-reachable controls, with touch targets ≥ 44×44px.
- Full-screen menu sheet with focus trap.
- Images sized by `sizes` so phones never download desktop widths.

## 8. Database Schema (MongoDB + Mongoose)

### 8.1 Principles
- **8 collections:** `admins`, `sessions`, `profiles` (singleton), `albums`, `tracks`, `videos`, `galleryimages`, `events`, `inquiries`. That is 9 including `sessions`, which is justified in §11.
- **No `homepage` collection.** Featuring is a `featured: boolean` plus `sortOrder: number` on each content type. This is simpler and has no dangling references.
- **Media is an embedded subdocument (`MediaAsset`), not a collection.** A media item belongs to exactly one content item.
- Every collection has `timestamps: true`.
- Content types have:
  - `status: 'draft' | 'published'`. Public endpoints return only `published`.
  - `sortOrder: number` (ascending; default `Date.now()` so new items go last)
  - `featured: boolean`
- `toJSON` is never relied on. **Explicit mappers** produce DTOs, so `passwordHash` and other internal fields can never leak.
- Typing: a TS interface (for example `TrackDoc`) plus `new Schema<TrackDoc>({...})`, `model<TrackDoc>()`, and `lean<TrackDoc>()` reads. DTO types come from `shared` (`z.infer`).
- Global settings:
  - `mongoose.set('strictQuery', true)`
  - `mongoose.set('sanitizeFilter', true)`
  - `autoIndex` is off in production; indexes are synced by a script during deploy.

### 8.2 Shared embedded type: `MediaAsset`
```ts
// shared/src/media.ts (Zod schema; type inferred)
interface MediaAsset {
  publicId: string;              // e.g. "roman-budhathoki/prod/gallery/abc123"
  resourceType: 'image' | 'video';   // NB: audio is stored by Cloudinary as resource_type "video"
  version: number;               // cache-busting segment v<version> in URLs
  format: string;                // original format, e.g. "jpg", "mp4", "mp3"
  bytes: number;
  width?: number;                // images/videos (required for images → layout without CLS)
  height?: number;
  duration?: number;             // seconds, video/audio
  dominantColor?: string;        // "#3a2b1f" from Cloudinary colors analysis → placeholder bg
  originalFilename?: string;     // admin convenience only
}
```
**Stored:** the above. **Not stored:** full delivery URLs. These are derived on demand from `cloudName + resourceType + transformation + v{version} + publicId`, so transformations can change without migrating data. `secure_url` is not needed.

### 8.3 Models

**Admin** (`admins`)

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, lowercase, trimmed, unique index |
| `passwordHash` | string | required, argon2id, never mapped to DTO |
| `name` | string | required, 1–80 |
| `lastLoginAt` | Date | optional |
| `passwordChangedAt` | Date | optional; tokens issued earlier are rejected |

- No `role` field. There is one administrator, and role-based access control isn't justified (ADR-6).
- Created only by `npm run seed:admin`. **No public registration endpoint.**

**Session** (`sessions`): refresh-token store

| Field | Type | Rules |
|---|---|---|
| `adminId` | ObjectId → Admin | required, indexed |
| `tokenHash` | string | SHA-256 of the opaque refresh token, unique index |
| `expiresAt` | Date | required, **TTL index** (`expireAfterSeconds: 0`) |
| `userAgent` | string | optional, truncated to 200 |
| `rotatedAt` | Date | set when rotated (used for reuse detection) |

**Profile** (`profiles`): singleton (`key: 'main'`, unique)

| Field | Type | Rules |
|---|---|---|
| `displayName` | string | required (seed: "Roman Budhathoki") |
| `tagline` | string | required, ≤ 120 (seed: "Violinist · Music Educator · Kathmandu", derived from the CV title) |
| `shortBio` | string | required, ≤ 600 (seed: CV "Professional Profile" verbatim) |
| `biography` | `{ heading?: string; body: string }[]` | plain text paragraphs; seed from CV only |
| `education` | `{ year: string; title: string; institution?: string; location?: string }[]` | seed from CV |
| `experience` | `{ period: string; role: string; organization: string; location?: string; category: 'teaching' \| 'performance' \| 'other'; highlights: string[] }[]` | seed from CV |
| `achievements` | `{ year?: string; title: string; description?: string }[]` | **empty by default**; section hidden when empty |
| `philosophy` | string | optional, **empty by default** |
| `skills` | string[] | seed from CV |
| `affiliations` | `{ name: string; since?: string }[]` | seed from CV |
| `contact` | `{ publicEmail?: string; phone?: string; showPhone: boolean; location?: string }` | `showPhone` defaults to false (pending a decision) |
| `socials` | `{ platform: 'youtube' \| 'instagram' \| 'facebook' \| 'tiktok' \| 'spotify' \| 'other'; url: string; label?: string }[]` | URLs validated as https |
| `portrait`, `heroDesktop`, `heroMobile`, `ogImage` | MediaAsset (+ `alt: string`) | `alt` is required when an image is present |
| `seo` | `{ metaTitle?: string; metaDescription?: string }` | optional overrides |

**Album** (`albums`)

| Field | Type | Rules |
|---|---|---|
| `title` | string | required, 1–150 |
| `slug` | string | unique index, generated (§8.4) |
| `description` | string | optional, ≤ 2000 |
| `releaseDate` | Date | optional |
| `cover` | MediaAsset + `alt` | optional |
| `externalLinks` | `{ label: string; url: string }[]` | optional (Spotify, Apple Music, YouTube Music, …) |
| `status`, `featured`, `sortOrder` | | standard |

- Indexes: `{ status: 1, sortOrder: 1 }`.
- Deleting an album with tracks fails with 409 (`ALBUM_NOT_EMPTY`), unless `?detachTracks=true` is passed. That unsets `album` on its tracks.

**Track** (`tracks`)

| Field | Type | Rules |
|---|---|---|
| `title` | string | required, 1–150 |
| `slug` | string | unique |
| `album` | ObjectId → Album | optional, indexed |
| `trackNumber` | number | optional, int ≥ 1 |
| `artistCredit` | string | required, default "Roman Budhathoki" |
| `credits` | string | optional, free text (composer, arranger, collaborators), ≤ 500 |
| `description` | string | optional, ≤ 2000 |
| `audio` | MediaAsset | **required**; `resourceType: 'video'`, `duration` required |
| `cover` | MediaAsset + `alt` | optional; falls back to album cover, then a default artwork |
| `year` | number | optional |
| `tags` | string[] | optional, lowercase, ≤ 10 |
| `status`, `featured`, `sortOrder` | | standard |

- Indexes: `{ status: 1, featured: -1, sortOrder: 1 }` and `{ album: 1, trackNumber: 1 }`.

**Video** (`videos`): discriminated by `source`

| Field | Type | Rules |
|---|---|---|
| `title`, `slug`, `description` | | as above |
| `source` | `'cloudinary' \| 'youtube'` | required |
| `media` | MediaAsset | **required iff** `source = 'cloudinary'` |
| `youtubeId` | string | **required iff** `source = 'youtube'`; regex `^[A-Za-z0-9_-]{11}$`. The admin pastes a URL and the server extracts the ID. |
| `poster` | MediaAsset + `alt` | optional. Default: Cloudinary `so_auto` frame or the YouTube `hqdefault`/`maxresdefault` thumbnail. |
| `duration` | number | optional (auto from Cloudinary) |
| `category` | `'performance' \| 'orchestra' \| 'studio' \| 'wedding-event' \| 'teaching' \| 'other'` | required. The categories describe activity types listed in the CV, not claims. |
| `recordedAt` | Date | optional |
| `venue` | string | optional |
| `status`, `featured`, `sortOrder` | | standard |

- Indexes: `{ status: 1, category: 1, sortOrder: 1 }`.
- In TS this is a discriminated union `VideoDto = CloudinaryVideoDto | YouTubeVideoDto`. The Zod `discriminatedUnion('source', …)` mirrors it.

**GalleryImage** (`galleryimages`)

| Field | Type | Rules |
|---|---|---|
| `image` | MediaAsset | required; `width`/`height` required |
| `alt` | string | **required**, 5–250 (the admin form explains how to write good alt text) |
| `caption` | string | optional, ≤ 300 |
| `category` | `'performance' \| 'portrait' \| 'event' \| 'behind-the-scenes'` | required |
| `event` | ObjectId → Event | optional |
| `takenAt` | Date | optional |
| `photographerCredit` | string | optional. Shown in the lightbox. Important for photographer attribution. |
| `status`, `featured`, `sortOrder` | | standard |

- Indexes: `{ status: 1, category: 1, sortOrder: 1 }`.
- No slug, because gallery images have no detail page.

**Event** (`events`)

| Field | Type | Rules |
|---|---|---|
| `title`, `slug`, `description` | | `description` ≤ 3000 |
| `startsAt` | Date (UTC) | required |
| `endsAt` | Date | optional, must be > `startsAt` |
| `timezone` | string (IANA) | default `Asia/Kathmandu` |
| `venue` | `{ name: string; address?: string; city: string; country: string }` | `name` and `city` required; `country` defaults to "Nepal" |
| `eventStatus` | `'scheduled' \| 'postponed' \| 'cancelled'` | default `scheduled` (maps to schema.org) |
| `ticketUrl`, `infoUrl` | string (https) | optional |
| `image` | MediaAsset + `alt` | optional |
| `status`, `featured` | | standard (sorting is by date) |

- **"Upcoming" vs "past" is computed** (`startsAt >= now` or `endsAt >= now`), never stored. This avoids stale flags.
- Indexes: `{ status: 1, startsAt: 1 }`.

**Inquiry** (`inquiries`)

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, 2–100 |
| `email` | string | required, valid email, ≤ 254 |
| `phone` | string | optional, ≤ 30, permissive international pattern |
| `inquiryType` | `'booking' \| 'lessons' \| 'collaboration' \| 'general'` | required |
| `eventType` | `'wedding' \| 'concert' \| 'corporate' \| 'private-event' \| 'studio-recording' \| 'other'` | required when `inquiryType = 'booking'` |
| `preferredDate` | Date | optional, must not be in the past (validated on create only) |
| `eventLocation` | string | optional, ≤ 200 |
| `message` | string | required, 10–5000 |
| `status` | `'new' \| 'read' \| 'replied' \| 'archived'` | default `new` |
| `adminNotes` | string | optional, admin only |
| `meta` | `{ ipHash: string; userAgent?: string }` | `ipHash` is a salted SHA-256, not the raw IP (privacy) |

- Indexes: `{ status: 1, createdAt: -1 }`.
- The honeypot field (`website`) is validated but **not stored**.

### 8.4 Slug strategy
- `shared/src/slug.ts` holds a pure `slugify()`: NFKD normalisation, ASCII, lowercase, hyphens, ≤ 80 characters. No dependency.
- Generated from `title` on create. On collision the server appends `-2`, `-3`, and so on (using the unique index plus a retry).
- The slug **does not change automatically** when the title changes, so URLs stay stable. The admin can edit it explicitly. Validation: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Slugs exist on Album, Track, Video and Event for stable URLs and anchors (`/events#slug`) and for future detail pages.

## 9. Cloudinary Strategy

### 9.1 Folder structure
```text
roman-budhathoki/
├── production/                      # CLOUDINARY_ROOT_FOLDER per environment
│   ├── profile/                     # portraits, hero images, OG image
│   ├── gallery/
│   ├── music/
│   │   ├── audio/                   # resource_type: video
│   │   └── covers/
│   ├── videos/
│   │   ├── media/
│   │   └── posters/                 # custom posters (optional)
│   └── events/
└── development/                     # same tree; keeps dev/test uploads out of production
```

**Why this differs from the suggested structure:**
1. An **environment prefix** stops dev and test uploads from polluting production and makes orphan cleanup safe.
2. **Audio and covers are separated**, because they are different resource types.
3. **Video posters are separated**, so custom posters are distinguishable from the videos themselves.

Public IDs use Cloudinary's random suffix (`use_filename: true`, `unique_filename: true`), which avoids collisions and enumeration.

**Folder mode:** check the account's folder mode in Phase 4.
- **Dynamic folders** (most accounts created after 2023): send `asset_folder` plus `public_id_prefix`.
- **Fixed folders:** send `folder`.

Encapsulate this inside `cloudinaryMediaService.ts` only.

### 9.2 Upload flow (all media types)
1. The admin picks a file. The client pre-validates MIME type, extension and size, and shows a preview. Images get client-side dimensions.
2. `POST /api/admin/uploads/signature` with `{ kind: 'gallery' | 'profile' | 'track-audio' | 'track-cover' | 'album-cover' | 'video' | 'video-poster' | 'event' }`. The server maps `kind` to a fixed set of parameters, and **the client cannot choose them**:
   - resource type
   - folder
   - `allowed_formats`
   - eager transformations
   - `colors: true` (images)
   - `timestamp`

   The server signs them with `cloudinary.utils.api_sign_request` and returns `{ cloudName, apiKey, timestamp, signature, params }`. The signature is valid for about 1 hour by Cloudinary's rules. The API secret never leaves the server.
3. The browser POSTs the file directly to `https://api.cloudinary.com/v1_1/<cloud>/<resourceType>/upload`, using `XMLHttpRequest` so it can show **upload progress**. Videos above 100 MB use chunked upload (`X-Unique-Upload-Id` and `Content-Range`) if plan limits allow it.
4. The client submits the entity create/update with `{ mediaRef: { publicId, resourceType } }`.
5. The server **verifies** by calling `cloudinary.api.resource(publicId, { resource_type })`:
   - the asset exists
   - it sits under the expected folder for that `kind`
   - its format is allowed
   - it's within the size and duration caps

   The server then builds the `MediaAsset` from **Cloudinary's authoritative metadata**, never from client-supplied numbers, and persists it. If verification fails, the server destroys the asset and returns `422 MEDIA_INVALID`.
6. **Replace or delete:** after the DB write succeeds, the server calls `destroy` on the old public ID. Failures are logged, not fatal. `npm run cleanup:media` lists assets under the root folder that no document references (dry-run by default, `--apply` to delete). This covers abandoned uploads.

**Size and format caps.** These are enforced client-side, then verified server-side. Adjust them to the Cloudinary plan.

| Kind | Formats | Max size |
|---|---|---|
| images | jpg, jpeg, png, webp, heic | 20 MB |
| audio | mp3, wav, m4a, aac, flac, ogg | 100 MB |
| video | mp4, mov, webm | 100 MB on Free; configurable via `MEDIA_MAX_VIDEO_MB` |

### 9.3 Images
- **Delivery:** `f_auto,q_auto` always. AVIF and WebP are negotiated by Cloudinary per browser.
- **Responsive:**
  - `ResponsiveImage` generates `srcset` widths `[320, 480, 640, 768, 1024, 1280, 1600, 1920, 2400]`, capped at the original width, with a caller-supplied `sizes`.
  - Crop modes are `c_fill,g_auto` (for a fixed aspect) or `c_limit` (for a natural aspect or baked-in text).
  - `dpr` is handled by `srcset`.
- **Thumbnails:** admin tables use `c_fill,g_auto,w_160,h_160`. Gallery grid tiles use `c_limit,w_<from srcset>`.
- **Placeholders:**
  - The `dominantColor` background renders immediately.
  - Optionally, a 32px blurred LQIP (`w_32,e_blur:1000,q_1,f_auto`, about 300 bytes) fades into the full image.
  - `width` and `height` attributes are always set, so CLS stays at 0.
- **Hero:** eager, `fetchpriority="high"`, and preloaded (§16). Everything else gets `loading="lazy"` and `decoding="async"`.
- **OG images:** `c_fill,g_auto,w_1200,h_630,f_jpg,q_auto`. JPG is used because social scrapers don't reliably accept AVIF.

### 9.4 Videos
- **Upload:** resource type `video`, plus an **eager async** transformation for the standard rendition (`c_limit,w_1280,q_auto,vc_auto,f_mp4`) so the first viewer doesn't wait for an on-the-fly transcode.
- **Delivery (v1):** progressive MP4/WebM via `f_auto:video,q_auto,c_limit,w_1280`. A `<source>` for 720p is used on mobile, chosen through `media` queries and `sizes` logic in the component.
- **Posters:** a custom poster if one is uploaded. Otherwise `so_auto` (Cloudinary picks a representative frame), or `so_2` if `so_auto` isn't available on the plan, delivered as a `.jpg` image through `f_auto,q_auto,w_<n>`.
- `<video preload="none" poster=… controls playsinline>`. Nothing loads until the visitor presses play.
- **Streaming:** for portfolio-length clips, progressive MP4 with byte-range requests from the Cloudinary CDN is adequate. Adaptive HLS (`sp_auto`) would need `hls.js` for non-Safari browsers and more transformation quota, so it is a **future enhancement**. **Long-form performances are better hosted on YouTube** (free bandwidth, discovery), which the `youtube` source supports.
- **YouTube:**
  - a click-to-load facade (poster plus play button) that injects the `youtube-nocookie.com` iframe only on click
  - zero third-party JavaScript on page load
  - better privacy and performance

### 9.5 Audio
- Stored as Cloudinary resource type **`video`**. This is Cloudinary's model for audio. The original master (for example WAV) is kept.
- **Delivery:**
  - The streaming URL is `/video/upload/<audio transform>/v<ver>/<publicId>.mp3`.
  - The transform targets MP3 at about 160 kbps (bit rate `br_160k`; Phase 4 must confirm the exact audio parameters against current Cloudinary documentation).
  - An `.m4a` (AAC) alternative is optional.
  - The browser streams it with HTTP range requests.
- **Metadata:**
  - `duration` is taken from Cloudinary's response, so the UI shows durations before playback.
  - Title, credits and album come from the admin form. Mongo is the source of truth, not ID3 tags (the existing MP3 has none).
- **Optional:** Cloudinary's `fl_waveform` generates a waveform PNG for a visual progress track (future enhancement).
- **Protection:** public delivery, by design for a portfolio. Downloads are not *offered*, but audio can't be technically protected from determined users. Signed or authenticated delivery is unnecessary for v1.

### 9.6 Client URL builder (`client/src/lib/cloudinary.ts`)
These are typed, pure functions:
- `imageUrl(asset, opts)`
- `imageSrcSet(asset, widths, opts)`
- `videoUrl(asset, opts)`
- `videoPosterUrl(asset, opts)`
- `audioUrl(asset)`
- `youtubeThumb(id)`

They build URLs from `VITE_CLOUDINARY_CLOUD_NAME` (public information). There is no SDK in the bundle. Transformation options are a typed union (`crop: 'fill' | 'limit'`, `gravity: 'auto' | 'face'`…), so invalid transforms are compile errors. The functions are unit tested.

## 10. REST API Specification

### 10.1 Conventions
- Base path `/api`. JSON only.
- `Content-Type: application/json` is required on bodies. Anything else gets 415.
- **Success envelope:**
  ```ts
  type ApiSuccess<T> = { success: true; data: T; meta?: PaginationMeta };
  type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
  ```
- **Error envelope:**
  ```ts
  type ApiErrorBody = {
    success: false;
    error: {
      code: ErrorCode;                  // stable machine code
      message: string;                  // safe, human-readable
      details?: { path: string; message: string }[]; // validation issues only
      requestId: string;                // correlates with server logs
    };
  };
  type ErrorCode =
    | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'TOKEN_EXPIRED' | 'FORBIDDEN'
    | 'NOT_FOUND' | 'CONFLICT' | 'ALBUM_NOT_EMPTY' | 'MEDIA_INVALID' | 'MEDIA_PROVIDER_ERROR'
    | 'RATE_LIMITED' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'INTERNAL_ERROR';
  ```
- **Status codes:**

  | Status | Meaning |
  |---|---|
  | 200 | read or update |
  | 201 | create, with the resource returned |
  | 204 | delete |
  | 400/422 | malformed / validation (422 for semantic validation, 400 for malformed JSON) |
  | 401 | not authenticated |
  | 403 | forbidden |
  | 404 | not found |
  | 409 | conflict |
  | 413 | payload too large |
  | 429 | rate limited |
  | 500 | internal error |
  | 502 | Cloudinary failure |

- **Pagination:** `?page=1&limit=12`. `limit` defaults vary by resource and are capped at 50. The query is validated by Zod (coerced ints).
- **IDs:** admin routes use `:id` (a validated ObjectId; invalid gets 404, not 500). Public routes use slugs or lists.
- **Public GET caching:** `Cache-Control: public, max-age=60, stale-while-revalidate=300` plus a weak ETag. Admin routes and auth routes get `Cache-Control: no-store`.
- **Partial updates:** `PATCH` with a partial body validated by `schema.partial().strict()`. Unknown keys get 422. `PUT` is used only for the singleton profile.
- **Auth header:** `Authorization: Bearer <accessToken>` on `/api/admin/*` and on `/api/auth/me` and `/api/auth/password`.

### 10.2 Public endpoints

| Method | Endpoint | Purpose | Query / Body | Response `data` |
|---|---|---|---|---|
| GET | `/api/health` | Liveness and readiness | — | `{ status: 'ok' \| 'degraded', db: 'up' \| 'down', uptime, version }` (503 if the DB is down) |
| GET | `/api/home` | **One aggregated call** for the home page | — | `{ profile: ProfileSummaryDto, featuredTracks: TrackDto[≤4], featuredVideos: VideoDto[≤3], featuredImages: GalleryImageDto[≤8], upcomingEvents: EventDto[≤3] }` |
| GET | `/api/profile` | Full public profile (About and Contact) | — | `ProfileDto` (contact phone omitted when `showPhone=false`) |
| GET | `/api/albums` | Published albums | — | `AlbumDto[]` (with `trackCount`) |
| GET | `/api/albums/:slug` | Album with its tracks | — | `AlbumDto & { tracks: TrackDto[] }` (404 if missing or draft) |
| GET | `/api/tracks` | Published tracks | `featured?`, `album?` (slug), `page`, `limit` (default 20) | `TrackDto[]` + meta |
| GET | `/api/videos` | Published videos | `category?`, `page`, `limit` (default 12) | `VideoDto[]` + meta |
| GET | `/api/gallery` | Published images | `category?`, `page`, `limit` (default 24) | `GalleryImageDto[]` + meta |
| GET | `/api/events` | Published events | `when=upcoming\|past` (required), `page`, `limit` (default 10). Upcoming sorts by `startsAt` ascending, past sorts descending. | `EventDto[]` + meta |
| POST | `/api/inquiries` | Contact or booking submission | `InquiryCreateInput` (+ honeypot `website`, + `turnstileToken` if enabled) | `{ id, receivedAt }`, 201. Rate limited: 5/hour/IP. If the honeypot is filled, it returns 201 **without storing** (silent drop). |

No `GET /api/tracks/:slug` or `GET /api/videos/:slug` in v1, because no page needs them (YAGNI, see ADR-9).

### 10.3 Auth endpoints

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` | `{ accessToken, expiresIn, admin: AdminDto }`. Sets the refresh cookie. 401 `UNAUTHENTICATED` with a generic message. Rate limit: 5 per 15 min per IP+email, 20 per hour per IP. |
| POST | `/api/auth/refresh` | refresh cookie + `X-Requested-With: fetch` | — | `{ accessToken, expiresIn, admin }`. **Rotates** the refresh cookie. Reuse of a rotated token revokes all sessions. |
| POST | `/api/auth/logout` | refresh cookie | — | 204. Deletes the session and clears the cookie. |
| GET | `/api/auth/me` | Bearer | — | `AdminDto` |
| PUT | `/api/auth/password` | Bearer | `{ currentPassword, newPassword }` (min 12 characters) | 204. Revokes all other sessions and sets `passwordChangedAt`. |

### 10.4 Admin endpoints (all require Bearer; all `no-store`)
The same pattern applies to `tracks`, `albums`, `videos`, `gallery`, `events`:

| Method | Endpoint | Purpose | Body / Query | Response |
|---|---|---|---|---|
| GET | `/api/admin/<resource>` | List **all** statuses | `status?`, `q?` (title search, regex-escaped), `page`, `limit`, plus resource filters (`category`, `album`, `when`) | `Dto[]` + meta |
| GET | `/api/admin/<resource>/:id` | One item for editing | — | `Dto` |
| POST | `/api/admin/<resource>` | Create | `<Resource>CreateInput` (media as `mediaRef: { publicId, resourceType }`) | `Dto`, 201 |
| PATCH | `/api/admin/<resource>/:id` | Partial update (including `status`, `featured`, replacing media) | `<Resource>UpdateInput` | `Dto` |
| DELETE | `/api/admin/<resource>/:id` | Delete document, then destroy media | (albums: `?detachTracks=true`) | 204 |
| PATCH | `/api/admin/<resource>/order` | Bulk reorder (not for events) | `{ ids: string[] }` (sets `sortOrder` by index; max 200) | 204 |

Resource-specific endpoints:

| Method | Endpoint | Purpose | Body | Response |
|---|---|---|---|---|
| GET | `/api/admin/profile` | Profile for editing (including hidden phone) | — | `ProfileAdminDto` |
| PUT | `/api/admin/profile` | Replace profile | `ProfileUpdateInput` (full object; media via `mediaRef`) | `ProfileAdminDto` |
| GET | `/api/admin/inquiries` | Inbox | `status?`, `inquiryType?`, `page`, `limit` | `InquiryDto[]` + meta |
| GET | `/api/admin/inquiries/:id` | Read one | — | `InquiryDto` |
| PATCH | `/api/admin/inquiries/:id` | Update | `{ status?, adminNotes? }` | `InquiryDto` |
| DELETE | `/api/admin/inquiries/:id` | Delete (privacy request) | — | 204 |
| POST | `/api/admin/uploads/signature` | Signed upload params | `{ kind: UploadKind }` | `{ cloudName, apiKey, timestamp, signature, uploadUrl, params }` |
| GET | `/api/admin/stats` | Dashboard counts | — | `{ inquiriesNew, tracks, videos, images, upcomingEvents, drafts }` |

### 10.5 Validation and error handling (server)
- `validate({ body?, query?, params? })` middleware parses with the shared Zod schemas. The typed handler helper `route(schemas, handler)` hands **already-parsed, typed** values to the handler, so `req.body` is never cast.
- **Error mapping** in `errorHandler`:

  | Error | Result |
  |---|---|
  | `ZodError` | 422 with `details` |
  | Mongoose `CastError` | 404 |
  | Duplicate key `11000` | 409 `CONFLICT` with the field name |
  | Mongoose `ValidationError` | 422 |
  | `jsonwebtoken` `TokenExpiredError` | 401 `TOKEN_EXPIRED` |
  | other JWT errors | 401 |
  | `express.json` `entity.too.large` | 413 |
  | `SyntaxError` from the body parser | 400 |
  | Cloudinary errors (wrapped as `MediaProviderError`) | 502 |
  | anything else | 500 `INTERNAL_ERROR` |

  Stack traces are logged, never returned.
- `notFound` handler for unknown `/api/*` routes returns 404 `NOT_FOUND`.

## 11. Authentication Strategy

### 11.1 Trade-offs considered

| Option | Pros | Cons |
|---|---|---|
| A. Long-lived JWT in `localStorage` | Simplest | Any XSS steals a long-lived credential. No revocation. **Rejected.** |
| B. Server sessions (cookie and session store) only | Revocable, simple | Needs cookie/CORS care. The user explicitly asked for JWT. |
| C. **Short-lived JWT access token in memory + opaque, rotating refresh token in an httpOnly cookie, stored hashed in Mongo** | XSS can't read the refresh token. The access token expires in 15 min. Logout and password change actually revoke. Reuse detection. | Slightly more code. Cookie needs same-site deployment (see below). **Chosen.** |

**Why the refresh token is opaque rather than a JWT:** it is only ever checked against the DB. Signing it adds nothing, and a random 256-bit value hashed with SHA-256 is simpler and revocable.

### 11.2 Final design
- **Password hashing:** argon2id (`argon2` package, default parameters of at least 19 MiB memory, 2 iterations). Minimum 12 characters. A login attempt for a non-existent email still verifies against a dummy hash, which gives constant-ish timing.
- **Access token:**
  - JWT HS256, `JWT_ACCESS_SECRET` ≥ 32 random bytes
  - claims `{ sub: adminId, iat, exp }`, TTL 15 min
  - issuer and audience claims set and verified
  - **kept in memory only** (React state in `AuthProvider`), never in `localStorage`
- **Refresh token:**
  - `crypto.randomBytes(32)`, base64url
  - cookie `rb_refresh`: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=7d`
  - stored as `sha256(token)` in `sessions` with a TTL index
- **Rotation:** every refresh issues a new token and marks the old one `rotatedAt`. Presenting an already-rotated token revokes **all** of that admin's sessions, since it signals theft.
- **Silent session restore:** on admin app load, call `/api/auth/refresh` once. The API client retries a request **once** after a 401 `TOKEN_EXPIRED` by refreshing. A single in-flight promise prevents a refresh stampede.
- **CSRF:** cookie-authenticated endpoints (`refresh`, `logout`) are protected three ways:
  - `SameSite=Strict`
  - a strict CORS origin allowlist
  - a required custom header `X-Requested-With: fetch`, which forces a CORS preflight that foreign origins fail

  All other admin endpoints use the Bearer header, which is not CSRF-able.
- **`passwordChangedAt`:** access tokens issued before it are rejected.
- **Authorisation:** `requireAuth` verifies the JWT and loads the admin (cached per request). All `/api/admin/*` routes mount behind it. There is **no RBAC**, because there is a single owner account (ADR-6). A `role` field can be added later without breaking tokens.
- **Admin bootstrap:** `npm run seed:admin -- --email … ` prompts for the password (or reads `ADMIN_SEED_PASSWORD` once). It refuses to create a second admin unless `--force` is passed.
- **Deployment requirement (important):** the refresh cookie must be **first-party**. Host the API on a subdomain of the site's domain (`api.<domain>`), or reverse-proxy `/api` on the same origin. **Do not** serve the API from a different registrable domain (for example `*.onrender.com` while the site is on `<domain>`), because browsers increasingly block such cookies and admin sessions would break.

## 12. Frontend Architecture

### 12.1 Routing (React Router v7, `createBrowserRouter`)
```text
/                     PublicLayout (SiteHeader, <Outlet/>, SiteFooter, PlayerBar)
  index               HomePage
  about               AboutPage
  music               MusicPage
  videos              VideosPage
  gallery             GalleryPage
  events              EventsPage
  contact             ContactPage
  *                   NotFoundPage
/admin/login          LoginPage                       (lazy)
/admin                RequireAuth → AdminLayout      (lazy chunk; whole admin tree)
  index               DashboardPage
  profile             ProfileEditPage
  tracks | albums | videos | gallery | events   → ListPage, new, :id (edit)
  inquiries           InquiriesPage, :id
  account             AccountPage (change password)
```
- Public pages are `lazy()` route modules too. The Home page is in the main chunk for LCP.
- `ScrollRestoration` is used, with focus management on navigation: focus moves to `<h1>` and the new page title is announced through a polite live region.
- The `AudioPlayerProvider` wraps **PublicLayout**, so it survives route changes. Admin routes don't render the PlayerBar.

### 12.2 API layer
- `lib/api/client.ts` is a typed `fetch` wrapper:
  - `request<T>(path, { method, body, schema? })` returns `Promise<T>`
  - it throws `ApiClientError` (`{ status, code: ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT', message, details? }`)
  - it uses `AbortController` with a timeout
  - it parses the envelope and narrows with a type guard, **no `as`**
  - in development, it optionally validates response `data` with the shared Zod schema
- `lib/api/endpoints/*.ts` holds one typed function per endpoint, for example `getTracks(params): Promise<Paginated<TrackDto>>`.
- `queryKeys.ts` is a typed key factory.

### 12.3 State management (no Redux, decision recorded)

| State | Where | Why |
|---|---|---|
| Server data (content lists, profile, inquiries) | **TanStack Query** | Caching, deduplication, background refresh, pagination, mutation plus invalidation for admin. Writing this by hand would be more code and buggier. It is a server-cache tool, not a global store. |
| Audio playback | `AudioPlayerProvider` (Context + `useReducer`) plus a tiny external store for `currentTime` read via `useSyncExternalStore` | Global by nature. Splitting the high-frequency time updates avoids re-rendering the app 4×/second. |
| Admin auth | `AuthProvider` (Context) | One small value: access token and admin. |
| UI state (menus, filters, dialogs) | Local `useState` and URL search params (`?category=`, `?page=`) | Filters in the URL are shareable and back-button friendly. |

**Redux, Zustand and similar libraries are not needed.** There is no complex cross-cutting client state beyond the audio player and auth.

**Public query defaults:** `staleTime` 5 min, `gcTime` 30 min, `retry` 1, `refetchOnWindowFocus: false`. This minimises requests on a mostly static site. Admin queries use `staleTime: 0`.

### 12.4 Forms and validation
- React Hook Form + `zodResolver(sharedSchema)`. Form value types are `z.input<typeof schema>`, and payloads are `z.output<…>`, with no manual types.
- Server 422 `details` map back onto fields via `setError(path, …)`.
- Inline errors are associated with `aria-describedby`. An error summary appears at the top on submit failure, focus moves to the first invalid field, and submit buttons are disabled while pending.

### 12.5 Loading, empty, error and toasts
- **Loading:**
  - Skeletons shaped like the final content (fixed aspect boxes, so there is no layout shift).
  - Spinners only for button actions.
  - Page-level `Suspense` fallback for lazy routes.
- **Empty:** `EmptyState` with an editorial tone. Examples: "New performances will be announced soon.", plus a CTA to Contact. On Home, sections with no content are **hidden entirely**.
- **Error:**
  - `ErrorState` with a retry button that calls the query's `refetch`.
  - The router `errorElement` catches render errors per route.
  - A top-level boundary shows a branded fallback.
- **Toasts (`sonner`):**
  - Admin mutations: "Track saved" or an error message.
  - Contact submission success: shown inline and also as a toast.
  - Audio errors.
  - `sonner` is accessible (live region), small, and typed. **Toasts are never the only carrier of an error**, because form errors are always inline.

### 12.6 Key components
- **`ResponsiveImage`:** props `asset`, `alt`, `sizes`, `aspect?`, `crop?`, `priority?`. It handles srcset, dimensions, placeholder and lazy loading.
- **`VideoPlayer`:** native `<video controls>` (accessible by default). It calls `audio.pause()` on play, so two sources never play at once.
- **`YouTubeFacade`:** a `<button>` with the poster and an "Play video: {title}" label that swaps in the iframe on click.
- **`GalleryGrid` + Lightbox:** `yet-another-react-lightbox` is chosen because it provides keyboard, swipe, focus trap, zoom and `srcset` support with TS types. Rebuilding that accessibly would take days. It loads lazily on first open.
- **`TrackList` / `TrackRow`:** the play button reflects the global player state (`aria-pressed`, "Pause {title}").
- **`EventCard`:** uses a semantic `<article>` and `<time datetime>`, and shows dates in Asia/Kathmandu via `Intl.DateTimeFormat`.
- **`ContactForm`:** includes the honeypot field (visually hidden, `tabIndex=-1`, `autocomplete="off"`, `aria-hidden`).

## 13. Admin Architecture

- **Principle:** practical, consistent and boring. Tailwind with a neutral light theme. No design ambition, maximum clarity.
- **`AdminLayout`:** sidebar navigation (collapsing to a top menu on mobile), page header with primary action, and main content.
- **Generic building blocks (only these):**
  - `AdminTable<T>` (typed columns, thumbnail, status badge, featured toggle, edit/delete actions, pagination)
  - `MediaUploader` (kind-based: drag-and-drop, progress, preview, replace, client validation)
  - `ConfirmDialog` (native `<dialog>`)
  - `StatusBadge`
  - `FormActions`
- **One edit page per resource** with a hand-written form. This is clearer than a schema-driven form generator, which would be premature abstraction.
- **Reordering:** move up/down buttons, which are keyboard accessible. Drag-and-drop is a future enhancement.
- **Profile editor:** sections for Identity, Biography paragraphs (add/remove/reorder), Education, Experience, Achievements, Philosophy, Skills, Contact, Socials, Images, SEO.
- **Inquiries inbox:**
  - "new" count badge in the sidebar
  - filter by status/type
  - detail view with `mailto:` reply (prefilled subject), status changes and private notes
- **Dashboard:** counts from `/api/admin/stats`, latest 5 new inquiries, and shortcuts ("Add track", "Add event", "Upload photos").
- **Bulk photo upload:** multi-file select. Each file uploads to Cloudinary in parallel (max 3 concurrent), and each successful upload opens a row where alt text and category are **required before publishing**. Items are saved as `draft` until alt text is added.
- **Draft/publish workflow:** every content item saves as `draft` by default, with a Publish toggle. Drafts never appear publicly.
- **Preview:** "View on site" links for published items.

## 14. TypeScript Strategy

- **`tsconfig.base.json`:**
  - `strict: true`
  - `noUncheckedIndexedAccess: true`
  - `noImplicitOverride: true`
  - `noFallthroughCasesInSwitch: true`
  - `useUnknownInCatchVariables: true` (implied by strict)
  - `verbatimModuleSyntax: true`
  - `isolatedModules: true`
  - `forceConsistentCasingInFileNames: true`
  - `skipLibCheck: true`

  `exactOptionalPropertyTypes` is **off**, because it fights Mongoose and React Hook Form typings. That trade-off is recorded deliberately.
- **ESLint rules (errors):**
  - `@typescript-eslint/no-explicit-any`
  - `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `no-unsafe-argument`
  - `consistent-type-assertions: { assertionStyle: 'never' }` (const assertions remain allowed)
  - `no-non-null-assertion`
  - `switch-exhaustiveness-check`
  - `no-floating-promises`
  - `consistent-type-imports`

  `// @ts-ignore` is banned. `@ts-expect-error` is allowed only with a description.
- **Contracts:** all DTOs, inputs, enums and the envelope live in `shared` as Zod schemas, and types are `z.infer`'d. The client and server import the same types. No hand-written duplicate interfaces.
- **Mongoose:** explicit document interfaces (`TrackDoc`) with `Schema<TrackDoc>`, `lean<TrackDoc>()` and `HydratedDocument<TrackDoc>`. Mappers `toTrackDto(doc: TrackDoc & { _id: Types.ObjectId }): TrackDto` are tested so that `mapper output` satisfies the shared schema.
- **Express:**
  - The typed route helper infers handler parameter types from the Zod schemas.
  - `res.locals` is typed via declaration merging, with `admin` on authenticated requests.
  - Unknown errors are narrowed with type guards (`isMongoServerError`, `isZodError`).
- **Environment:** `config/env.ts` parses `process.env` with Zod at startup and exports a frozen, typed `env`. A missing variable makes the process exit with a clear message. The client has `lib/env.ts` parsing `import.meta.env`, plus an `env.d.ts` `ImportMetaEnv` declaration.
- **Weakly typed libraries:**
  - Cloudinary SDK responses are parsed through a local Zod schema (`CloudinaryResourceSchema`) before use, rather than trusted or cast.
  - `jsonwebtoken` `verify` output is parsed with a Zod `AccessTokenClaims` schema.
- **No JS files anywhere:**
  - All configs are TS: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.ts`.
  - Prettier config is JSON (`.prettierrc`), which isn't a JS file.
  - `scripts/check-no-js.ts` runs in CI and fails if any tracked `*.{js,jsx,cjs,mjs}` exists outside `node_modules` and `dist`.

## 15. Security Strategy

| Area | Measure |
|---|---|
| Input validation | Zod `.strict()` schemas on every body, query and params. Lengths capped. Enums enforced. URLs must be `https:`. Emails normalised. |
| Sanitisation | Content is **plain text rendered by React** (auto-escaped). `dangerouslySetInnerHTML` is banned by lint. No HTML or Markdown storage in v1, so there is no HTML sanitiser dependency. Admin text search regex-escapes input. JSON-LD is serialised with `<` escaped. |
| NoSQL injection | Zod guarantees primitive types (an object can't arrive where a string is expected). `mongoose.set('sanitizeFilter', true)` and `strictQuery`. Queries never spread raw request objects. |
| Authentication | §11: argon2id, short JWT, rotating httpOnly refresh, revocation, generic login errors, timing equalisation. |
| Authorisation | All `/api/admin/*` routes sit behind `requireAuth`, enforced at router-mount level and covered by tests that hit every admin route without a token and expect 401. Public queries hard-filter `status: 'published'`. |
| JWT | HS256 with an explicit `algorithms: ['HS256']` on verify, plus issuer/audience checks. Secret ≥ 32 bytes. 15-minute expiry. No sensitive claims. |
| CORS | Allowlist from `CLIENT_ORIGINS` (exact origins). `credentials: true`. Methods and headers restricted. No wildcard in production. |
| Rate limiting | Global 300 req/15 min/IP on `/api`. Login: 5/15 min per IP+email and 20/hour per IP. Inquiries: 5/hour/IP. Upload signature: 60/hour/admin. `app.set('trust proxy', env.TRUST_PROXY)` so IPs are correct behind the host's proxy. |
| Security headers | `helmet()` on the API. **The frontend host sets the CSP and headers** for the SPA (§21): `default-src 'self'`; `img-src 'self' res.cloudinary.com i.ytimg.com data:`; `media-src res.cloudinary.com`; `connect-src <api> api.cloudinary.com`; `frame-src www.youtube-nocookie.com` (+ `challenges.cloudflare.com` if Turnstile); `font-src 'self'`; `frame-ancestors 'none'`. Also HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy`. |
| Request size | `express.json({ limit: '100kb' })`, `urlencoded` disabled. Media never goes through the API. |
| Uploads | Signed, server-chosen parameters (folder, formats, resource type). Client and server-side verification of format, size and duration. Assets that fail verification are destroyed. The signature endpoint is admin-only. The API secret is server-only. Unsigned upload presets are **disabled**. |
| Spam | Honeypot, rate limit, optional Cloudflare Turnstile (decision), minimum form-fill time (rejects submissions made under 3 seconds after render, using a signed timestamp field). |
| Secrets | Only in server env vars and the host's secret manager. `.env` is gitignored, with `.env.example` committed. **Nothing secret uses the `VITE_` prefix** (Vite exposes all `VITE_*` variables to the browser). |
| Error leakage | Production errors return a generic message plus `requestId`. Stack traces and Mongo/Cloudinary internals are logged only. `x-powered-by` is disabled. |
| Logging | pino with `redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.passwordHash']`. Inquiry message bodies are not logged. |
| Privacy | Inquiries hold personal data. IPs are stored only as salted hashes. The admin can delete inquiries. A retention recommendation is documented: auto-delete archived inquiries after 12 months (optional TTL; see Questions). |
| Dependencies | `npm audit` in CI. Lockfile committed. Minimal dependency set (§3). |

## 16. Performance Strategy

**Budgets.** Measured with Lighthouse mobile and checked in CI with `@lhci/cli` against the preview build.

| Metric | Target |
|---|---|
| LCP | ≤ 2.5 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Public initial JS | ≤ 160 KB gzipped |
| Hero image (mobile) | ≤ 150 KB |

**How the architecture keeps heavy media from slowing the site:**
1. **Media bytes never come from our server.** They come from Cloudinary's CDN, already transcoded to the smallest suitable format and size (`f_auto,q_auto`, `w_` from `srcset`/`sizes`).
2. **Nothing heavy loads until it's needed:**
   - images are `loading="lazy"`
   - videos are `preload="none"` with poster images
   - audio is `preload="none"` and fetched only when the visitor presses play, then streamed with range requests
   - YouTube loads only on click
   - the lightbox code loads on first open
   - the admin bundle is a separate lazy chunk that public visitors never download
3. **Known dimensions** (`width`/`height` stored in Mongo) and dominant-colour placeholders give zero layout shift.
4. **Pagination everywhere:** gallery 24/page with "Load more", videos 12, events 10. API `limit` is capped at 50, and queries use `lean()` with projections.
5. **One request for the home page** (`/api/home`) instead of five.
6. **Hero LCP:**
   - the post-build script injects `<link rel="preload" as="image" imagesrcset=… imagesizes=… fetchpriority="high">` for the current hero
   - the script fetches the profile at build time, and the runtime falls back gracefully if the hero changed since the build
   - critical fonts are preloaded
   - `<link rel="preconnect" href="https://res.cloudinary.com">`
7. **Caching:**
   - Cloudinary URLs are immutable thanks to the `v<version>` segment, so the CDN and browser cache them long-term.
   - Vite assets are content-hashed (`Cache-Control: immutable, max-age=31536000`), and `index.html` uses `no-cache`.
   - API GETs use short `max-age` plus SWR and ETag.
   - TanStack Query `staleTime` avoids refetching on navigation.
8. **Database:** compound indexes matching each public query's filter and sort (§8). Index usage is verified with `explain()` in Phase 2 tests for the list queries.
9. **Vite:**
   - route-level code splitting
   - `build.target: 'es2022'`
   - `manualChunks` only if the bundle analysis (`rollup-plugin-visualizer`, dev-only) shows a need
   - fonts self-hosted, subset, woff2
   - Tailwind v4 emits only the classes that are used
10. **Server:** `compression` is applied only if the host/CDN doesn't already compress. Cache-friendly responses.

## 17. SEO Strategy

- **The SPA-crawler problem:** Google renders JavaScript, but **social scrapers (WhatsApp, Facebook, X, LinkedIn) do not**. Booking leads often arrive through shared links, so per-page metadata must be present in the HTML.
- **Solution (no SSR framework):** `client/scripts/postbuild-seo.ts` runs after `vite build`. For each public static route (`/`, `/about`, `/music`, `/videos`, `/gallery`, `/events`, `/contact`), it writes `dist/<route>/index.html` from the built `index.html`, replacing:
  - `<title>`
  - `meta description`
  - canonical
  - OG/Twitter tags
  - JSON-LD
  - the hero preload

  It fetches profile data from the production API at build time. Static hosts serve `/about/index.html` for `/about`, and the SPA hydrates normally. There is no hydration-mismatch risk, because only `<head>` differs.
- A **deploy hook** (optional) triggers a frontend rebuild when the admin edits the profile or SEO fields. Otherwise the next deploy refreshes the metadata.
- **Runtime metadata:** a `<Seo title description canonical image />` component uses React 19's native `<title>`/`<meta>`/`<link>` hoisting, so tags stay correct during client navigation. Title pattern: `"{Page} — Roman Budhathoki, Violinist"`. Home is `"Roman Budhathoki — Violinist, Kathmandu"`.
- **Meta descriptions:** written from CV facts only, and editable via `profile.seo`.
- **Open Graph and Twitter:**
  - `og:type` `profile` for Home/About and `website` elsewhere
  - `og:image` 1200×630 from Cloudinary (`profile.ogImage`, falling back to a hero crop)
  - `twitter:card=summary_large_image`
- **Canonical URLs:** absolute, built from `VITE_SITE_URL`, without trailing slashes, and with query parameters removed (filters aren't indexed).
- **Semantic HTML:** one `<h1>` per page, a logical heading order, landmarks (`header`, `nav`, `main`, `footer`), `<article>` for events and tracks, and `<time>`.
- **Structured data (JSON-LD), facts only:**
  - **Home/About:** `Person` with:
    - `name`
    - `jobTitle: "Violinist"` and `"Music Educator"`
    - `address` locality Kathmandu, country NP
    - `sameAs` (only the social URLs the admin enters)
    - `image`
    - `url`
    - `alumniOf`/`affiliation` only from entered data
    - `memberOf` the Annapurna Orchestra, per the CV (role "First Violinist")
  - Optionally a `MusicGroup`-free `Person` with `knowsAbout: ["Violin", "Music education"]`.
  - **Events:** `MusicEvent` per published **upcoming** event, with `startDate` (with offset), `eventStatus`, `location` (`Place` + `PostalAddress`), `performer` (Person), and `offers.url` **only if** `ticketUrl` exists. Prices are never invented.
  - **Music:** `MusicRecording` (`name`, `duration` ISO 8601, `byArtist`), and `MusicAlbum` when albums exist.
  - **Videos:** `VideoObject` (`name`, `description`, `thumbnailUrl`, `uploadDate` = `recordedAt` or `createdAt`, `contentUrl`/`embedUrl`).
  - Absent fields are omitted, never filled with defaults. Output is validated with the Rich Results Test in Phase 10.
- **Sitemap:** `postbuild-seo.ts` emits `dist/sitemap.xml` with the static routes and `lastmod` from the API's most recent update per section. `/admin` is excluded.
- **`robots.txt`:** `Allow: /`, `Disallow: /admin`, and the sitemap URL. Admin pages also send `<meta name="robots" content="noindex,nofollow">`.
- **Other:** `lang="en"`, `theme-color`, favicon and Apple touch icon, web manifest, and descriptive image file alt text.

## 18. Accessibility Strategy (target WCAG 2.2 AA)

- **Semantics and navigation:**
  - landmarks and a "Skip to main content" link as the first focusable element
  - `nav` with `aria-label`, and `aria-current="page"` on the active link
  - the mobile menu is a disclosure/dialog with a focus trap, `Esc` to close, and focus returned to the toggle
- **Keyboard:** everything is operable by keyboard. Custom controls are real `<button>`s and `<input type="range">`. No global hotkeys that hijack `Space`.
- **Focus:** a highly visible `:focus-visible` ring with tokens per surface (varnish amber on ebony, deep varnish on ivory) and ≥ 3:1 contrast. Never `outline: none` without a replacement.
- **Images:**
  - `alt` is required in the schema for content images
  - decorative SVGs get `aria-hidden="true"` and an empty `alt`
  - photographer credits are shown as text
- **Forms:**
  - visible `<label>`s, never placeholder-only labels
  - `autocomplete` attributes (`name`, `email`, `tel`)
  - `aria-invalid` and `aria-describedby` for errors
  - required fields marked in text
  - an error summary with links to fields
  - success announced via `role="status"`
- **Audio player:**
  - Labelled buttons ("Play {track}" / "Pause {track}").
  - The seek slider has `aria-label="Seek"` and `aria-valuetext="1 minute 23 seconds of 3 minutes 45 seconds"`. Arrow keys move ±5 s, and `Home`/`End` are supported.
  - Volume is a labelled slider.
  - Track changes are announced through a polite live region.
  - The player is a `region` landmark labelled "Audio player".
- **Video:**
  - native controls
  - a `<track kind="captions">` field supported in the model as a future enhancement (an uploaded VTT)
  - YouTube captions are available in its player
  - nothing autoplays
- **Lightbox:** focus trap, labelled buttons, `Esc` closes, arrow keys navigate, and the caption and alt text are announced.
- **Colour and motion:**
  - all colour pairs are verified (§7.2)
  - information is never conveyed by colour alone (status badges carry text)
  - `prefers-reduced-motion` is respected
  - text resizes to 200% without loss
  - targets are ≥ 24×24 CSS px (WCAG 2.2), and 44px on touch
- **Testing:**
  - `@axe-core/playwright` on every public page in E2E
  - manual keyboard pass and a screen-reader smoke test (NVDA + Firefox, VoiceOver + Safari iOS) in Phase 10

## 19. Testing Strategy

| Layer | Tools | What is tested |
|---|---|---|
| Shared | Vitest | Zod schemas (valid and invalid cases, including the inquiry booking rule and the video discriminated union), `slugify`. |
| Server unit | Vitest | Mappers (output satisfies the shared DTO schema, and no `passwordHash`), token utilities, slug collision logic, Cloudinary verification rules (using `FakeMediaService`). |
| Server API/integration | Vitest + Supertest + `mongodb-memory-server` | **Auth:** login success and failure, rate limit, refresh rotation, reuse detection revoking all sessions, logout, password change revoking sessions, expired token gives `TOKEN_EXPIRED`. **Authorisation sweep:** every `/api/admin/*` route returns 401 without a token. **CRUD:** for each resource, create, read, update, delete and reorder. Drafts are hidden from public endpoints. 404 on a bad ObjectId. 409 on a duplicate slug. **Validation:** 422 shapes with `details`. Unknown keys are rejected. Operator-injection payloads (`{"email":{"$gt":""}}`) are rejected. **Inquiries:** honeypot silent drop and rate limit. **Health:** 200/503. |
| Client unit/component | Vitest + React Testing Library + `user-event` (jsdom) | `cloudinary.ts` URL builders. API client envelope parsing and error mapping. `ContactForm` validation and server-error mapping. Audio reducer state transitions (play, pause, next, error, end of queue). `PlayerBar` accessibility (labels, `aria-valuetext`). `RequireAuth` redirect. `ResponsiveImage` `srcset`/`sizes`. Only where the test adds value. No snapshot tests. |
| E2E | Playwright (Chromium, WebKit, mobile viewport Pixel 7 and iPhone 14) against a seeded test DB and the API with `MEDIA_DRIVER=fake` | **Visitor:** browse all pages, navigate while music keeps playing (assert the `audio` element isn't paused after route change), open a video modal and play it, open the gallery lightbox and use keyboard navigation, filter by category, submit a booking inquiry (success and validation errors), 404 page. **Admin:** log in and out, session survives a reload (refresh flow), create, edit, publish and delete a track/event/gallery image, upload media (Cloudinary upload intercepted with `page.route('https://api.cloudinary.com/**')` returning a fixture response that the fake media service recognises), inquiry status change. **Accessibility:** axe scan on each public page with no serious or critical violations. |
| Real Cloudinary smoke | Opt-in script `npm run test:cloudinary` | Uploads a tiny image and audio file into `development/`, verifies, and destroys them. Run manually before release, not in CI. |
| Performance | Lighthouse CI on the preview build | Budgets from §16, as a warning or failing threshold. |

CI (any provider; GitHub Actions assumed) runs:
1. `npm ci`
2. `check:no-js`
3. `typecheck`
4. `lint`
5. `test` (shared, server, client)
6. `build`
7. Playwright E2E
8. `npm audit --audit-level=high`

## 20. Code Quality

- **ESLint flat config (`eslint.config.ts`):**
  - `typescript-eslint` `strictTypeChecked` and `stylisticTypeChecked`
  - `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-plugin-jsx-a11y`
  - an import-order rule via `eslint-plugin-import-x` (or Prettier's sort plugin; choose one)
  - Prettier compatibility via `eslint-config-prettier`
- **Prettier:** `.prettierrc` with `singleQuote`, `trailingComma: all`, `printWidth: 100`, and `prettier-plugin-tailwindcss` for class ordering.
- **Naming:**

  | Thing | Convention |
  |---|---|
  | Components and files | `PascalCase.tsx` |
  | Hooks | `useX.ts` |
  | Other modules | `camelCase.ts` |
  | Constants | `SCREAMING_SNAKE` |
  | Types | `PascalCase` |
  | Zod schemas | `xxxSchema` |
  | DTO types | `XxxDto` |
  | Inputs | `XxxCreateInput` / `XxxUpdateInput` |
  | Mongo document types | `XxxDoc` |

- **Imports:** `@/` alias for `client/src`, and `@roman/shared` for shared. No deep relative chains (`../../../`). Type-only imports use `import type`.
- **Principles:**
  - Separation of concerns: routes stay thin, services hold the logic, mappers are pure, components stay presentational where practical.
  - Avoid premature abstraction: duplicate twice, abstract on the third occurrence.
  - Meaningful errors: `AppError(code, message)` with user-safe messages.
- **Git:**
  - Initialise the repository in Phase 1.
  - Conventional Commits.
  - Gitignore `.env*` (except `.env.example`), `dist`, `node_modules`, `coverage`, `playwright-report`, `*.docx`, and the raw source media (`images/`, `*.mp3`). Source media lives in Cloudinary. See ASM-7.

## 21. Environment Variables

### 21.1 Frontend (`client/.env`, all public by definition)

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `https://api.<domain>/api` | API origin |
| `VITE_SITE_URL` | `https://<domain>` | Canonical, OG and sitemap URLs |
| `VITE_CLOUDINARY_CLOUD_NAME` | `romanbudhathoki` | Building delivery URLs (public: it appears in every media URL) |
| `VITE_TURNSTILE_SITE_KEY` | `0x4AAA…` | Optional. Turnstile site key (public by design). |
| `SEO_BUILD_API_URL` | `https://api.<domain>/api` | Read by `postbuild-seo.ts` at build time only. Not `VITE_`-prefixed, so it is never shipped to the browser. |

**Rule:** a variable gets the `VITE_` prefix **only if it is safe to be public**. The Cloudinary API key and secret, JWT secrets and DB URIs must never be `VITE_*`. A CI grep check fails the build if `client/` references `CLOUDINARY_API_SECRET`, `JWT_` or `MONGODB_`.

### 21.2 Backend (`server/.env`; secrets in the host's secret manager)

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | ✓ | `development` \| `test` \| `production` |
| `PORT` | ✓ | e.g. `4000` |
| `MONGODB_URI` | ✓ (secret) | Atlas SRV string with a least-privilege DB user |
| `CLIENT_ORIGINS` | ✓ | Comma-separated exact origins for CORS, e.g. `https://<domain>,https://www.<domain>` |
| `JWT_ACCESS_SECRET` | ✓ (secret) | ≥ 32 random bytes (base64) |
| `JWT_ISSUER` / `JWT_AUDIENCE` | ✓ | e.g. `api.<domain>` / `admin.<domain>` |
| `ACCESS_TOKEN_TTL` | — | default `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | — | default `7` |
| `COOKIE_DOMAIN` | — | Unset normally (host-only cookie on the API host) |
| `IP_HASH_SALT` | ✓ (secret) | For inquiry IP hashing |
| `CLOUDINARY_CLOUD_NAME` | ✓ | |
| `CLOUDINARY_API_KEY` | ✓ (secret-ish) | Returned to the **authenticated admin** in signature responses (required by Cloudinary signed uploads). Never in the public bundle. |
| `CLOUDINARY_API_SECRET` | ✓ (secret) | Server only, never returned |
| `CLOUDINARY_ROOT_FOLDER` | ✓ | `roman-budhathoki/production` or `roman-budhathoki/development` |
| `MEDIA_DRIVER` | — | `cloudinary` (default) \| `fake` (tests/E2E) |
| `MEDIA_MAX_IMAGE_MB` / `MEDIA_MAX_AUDIO_MB` / `MEDIA_MAX_VIDEO_MB` | — | Defaults 20 / 100 / 100 |
| `TRUST_PROXY` | — | Hop count, e.g. `1` behind a PaaS proxy |
| `LOG_LEVEL` | — | `info` |
| `TURNSTILE_SECRET_KEY` | — (secret) | If Turnstile is enabled |
| `MAIL_*` (provider-specific, e.g. `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`MAIL_FROM`/`MAIL_TO`) | — (secret) | If inquiry email notifications are enabled (see Questions) |
| `SENTRY_DSN` | — | If error monitoring is chosen |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | seed only | Used once by `seed:admin`. **Remove from the environment afterwards.** |

`.env.example` files with dummy values are committed for both apps. `config/env.ts` fails fast on startup if anything is missing or malformed.

## 22. Error Handling and Validation (both sides)

| Situation | Server | Client UX |
|---|---|---|
| Validation | 422 `VALIDATION_ERROR` + `details[]` | Field-level messages and an error summary. Focus moves to the first invalid field. |
| Malformed JSON / too large | 400 / 413 | "Something went wrong with the request." (rare; logged) |
| Unauthenticated / expired | 401 `UNAUTHENTICATED` / `TOKEN_EXPIRED` | Silent refresh and one retry. On failure, redirect to `/admin/login?next=…` with "Your session expired." |
| Not found | 404 `NOT_FOUND` | Public: the 404 page or "This item is no longer available." Admin: toast and return to the list. |
| Conflict | 409 (`CONFLICT`, `ALBUM_NOT_EMPTY`) | Specific message, e.g. "That slug is already used." / "Move or detach this album's tracks first." |
| Rate limited | 429 + `Retry-After` | "Too many attempts. Please try again in N minutes." |
| Cloudinary upload failure (browser → Cloudinary) | n/a | The uploader shows Cloudinary's error, mapped (file too large, format not allowed, network), with retry. The form can't be submitted without a completed upload. |
| Cloudinary verification/API failure | 422 `MEDIA_INVALID` / 502 `MEDIA_PROVIDER_ERROR` | "The upload couldn't be verified. Please re-upload." / "Media service unavailable, try again shortly." |
| MongoDB errors | Duplicate key gives 409. Cast gives 404. Connection loss gives 503 from health and 500 `INTERNAL_ERROR` on requests (logged with `requestId`). | Generic retryable error state. |
| Network / timeout | n/a | `ApiClientError('NETWORK_ERROR' \| 'TIMEOUT')` gives "You appear to be offline." with retry. TanStack Query retries once for GETs. Mutations never auto-retry. |
| Audio / media playback | n/a | Player error state: "This track couldn't be played." with retry/skip. Video `onError` shows the poster with a message. |
| Unknown route | `notFound` handler | Router `*` gives the branded 404. Unknown `/admin/*` is handled inside the admin layout. |
| Render crash | n/a | Route `errorElement` with a branded fallback and a "Reload" button. Logged to monitoring if configured. |

The error type `ApiClientError` is a discriminated union over `code`. UI message mapping lives in one function, `getErrorMessage(error: unknown): string`, which narrows with type guards.

## 23. Audio UX (detailed)

- **Architecture:**
  - One `HTMLAudioElement` owned by `AudioPlayerProvider` (created once, kept in a `useRef`), mounted above `<Outlet/>` in `PublicLayout`, so **music continues across page navigation**. Because this is a SPA, there are no page reloads.
  - **State** (`useReducer`): `{ queue: TrackDto[]; index: number; status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'; volume: number; muted: boolean; error?: string }`.
  - **Time:** `currentTime`, `duration` and `buffered` live in a small external store updated on `timeupdate` and `progress` events, read via `useSyncExternalStore`, so only the progress UI re-renders.
- **API:** `useAudioPlayer()` exposes:
  - `playTrack(track, queue?)`
  - `toggle()`
  - `next()`, `prev()` (`prev` restarts if past 3 s)
  - `seek(seconds)`
  - `setVolume(v)`
  - `toggleMute()`
  - `pause()` (also used by video players)
- **No autoplay:**
  - Playback starts only on a user gesture (browser autoplay policies would block it anyway, and unexpected sound is a poor experience on a portfolio).
  - `audio.play()` returns a promise. A rejection (`NotAllowedError`) sets the state back to `paused` without an error toast.
  - `preload="none"`, so the source is set only when the visitor presses play.
- **PlayerBar (desktop):**
  - Hidden until first play, then fixed at the bottom with a slide-up animation (reduced-motion: instant).
  - Contents:
    - cover thumbnail
    - title, artist and album
    - prev/play-pause/next
    - "string" progress slider with elapsed and total time (tabular numbers)
    - buffered indicator
    - volume slider and mute
    - close (stops and hides)
- **PlayerBar (mobile):**
  - A compact bar with cover, title, play/pause, and a thin progress line along the top edge.
  - Tapping it expands a bottom sheet with full controls and a large seek slider.
  - **The volume slider is hidden on iOS**, where `audio.volume` is read-only and hardware buttons control volume (feature-detected).
- **Loading state:** a spinner inside the play button while `waiting`/`loadstart` fires before `canplay`. The button stays a pause toggle.
- **Error state:**
  - `error` event gives status `error`, an inline message in the bar with "Retry" and "Skip", and a toast.
  - Auto-skip is not used, to avoid an error cascade.
- **End of track:** advance to the next track in the queue. Stop at the end of the queue (no repeat in v1).
- **Media Session API:**
  - `navigator.mediaSession.metadata` (title, artist, album, artwork from Cloudinary in 96/256/512 squares)
  - action handlers for play, pause, previous track, next track and seek to
  - lock-screen and notification controls on mobile, headphone buttons on desktop
- **Coordination:**
  - Playing a video pauses the audio.
  - Starting audio does not affect paused videos.
  - Only one audio source plays at a time.
- **Persistence:**
  - The current track ID, position and volume are saved to `sessionStorage` (wrapped in try/catch).
  - After a full reload, the bar restores in a **paused** state ("Resume where you left off"). It never auto-resumes.
- **Admin:** the player is not rendered. Admin track previews use a plain native `<audio controls>`.

## 24. Deployment Strategy (provider-agnostic)

| Component | Requirement | Build / run |
|---|---|---|
| Frontend | Any static host/CDN with SPA fallback rewrites, custom headers, HTTPS and a build hook | Build: `npm ci && npm run build -w shared && npm run build -w client` (runs `vite build`, then `tsx scripts/postbuild-seo.ts`). Output: `client/dist`. Rewrite: unknown paths to `/index.html` (200), with prerendered route folders served first. Headers: CSP and security headers (§15), `immutable` caching for `/assets/*`, `no-cache` for HTML. |
| Backend | Any Node 24 host running a long-lived process (PaaS, container platform or VPS) with HTTPS, env secrets, health checks and logs | Build: `npm ci && npm run build -w shared && npm run build -w server`. Start: `node server/dist/server.js`. Optional `server/Dockerfile` (multi-stage, non-root, `node:24-alpine`). Health check: `GET /api/health`. Graceful shutdown on `SIGTERM`: stop accepting requests, close the Mongo connection, exit within 10 s. |
| Database | MongoDB Atlas (or equivalent) | A **dedicated cluster per environment** (or a separate DB name). A least-privilege user (`readWrite` on one DB). IP access list or private networking. **Backups:** Atlas free (M0) clusters have no automated backups, so use a tier with backups or schedule `mongodump` (see Questions). Run the index sync script during deploy. |
| Media | Cloudinary | Separate root folders per environment. Unsigned upload presets disabled. Optionally restrict delivery to referrers later. Monitor the usage dashboard (credits and bandwidth). |

**Domains and HTTPS:**
- `<domain>` (and `www` redirecting to the apex, or the reverse) for the frontend.
- `api.<domain>` for the backend. **This is required for first-party refresh cookies** (§11).
- TLS on both (managed certificates). HSTS once stable.
- Update the CORS `CLIENT_ORIGINS`, `VITE_API_BASE_URL` and `VITE_SITE_URL` to match.

**Logging and monitoring:**
- pino JSON logs to stdout, collected by the host. Each request log carries `requestId` (also returned in the `X-Request-Id` header).
- Uptime monitor on `/api/health` and the home page.
- Optional Sentry, or an equivalent, on both client and server, with PII scrubbing (see Questions).
- Alert on 5xx rate and on health failures.

**Release process:**
1. CI passes.
2. Deploy the backend.
3. Run the index sync.
4. Deploy the frontend.
5. Run the smoke checklist (home loads, a track plays, the contact form submits, admin login works).

Roll back by redeploying the previous build. Schema changes are additive only in v1.

## 25. Development Phases (Claude Code execution plan)

**Rules for every phase:**
- Implement **one phase at a time**.
- Close every phase with the gate: `npm run check:no-js && npm run typecheck && npm run lint && npm test`, plus the phase-specific acceptance criteria.
- **Stop and report** to the user after each phase, before continuing.
- Never start a phase whose dependencies aren't green.
- Update `README.md` when commands or environment variables change.

**Deviation from the suggested order:** admin CRUD UI for each content type is built **inside that content type's phase** (a vertical slice: model, API, admin form, public UI, tests), rather than all at once in Phase 9. Reasons:
- Each feature becomes testable end to end immediately.
- It avoids building public pages against data that can't be entered.
- It prevents a giant, risky admin phase.

Phase 9 becomes the dashboard, profile editor, inquiries inbox and admin polish.

### Phase 1: Project setup and architecture
- **Objectives:**
  - `git init`
  - npm workspaces (`client`, `server`, `shared`)
  - strict TS configs and project references
  - ESLint/Prettier
  - Vite React app skeleton with Tailwind v4
  - Express skeleton
  - the `check-no-js` script
  - `.gitignore`, `.nvmrc`, `.editorconfig`, `.env.example` files
  - `README.md`
  - **`CLAUDE.md`** containing §26's non-negotiables
  - a CI workflow
- **Files:** root `package.json`, `tsconfig.base.json`, `eslint.config.ts`, `.prettierrc`, `scripts/check-no-js.ts`, `client/{index.html,vite.config.ts,src/main.tsx,src/styles/index.css}`, `server/src/{app.ts,server.ts}`, `shared/src/index.ts`, `.github/workflows/ci.yml` (or equivalent).
- **Dependencies:** none.
- **APIs:** none (a placeholder `GET /api/health` returning `{status:'ok'}`).
- **Acceptance:**
  - `npm run dev` starts the client on :5173 and the server on :4000.
  - The client renders a placeholder page.
  - `curl :4000/api/health` returns 200.
  - The gate passes.
  - Adding a `.js` file makes `check:no-js` fail, and adding `any` makes lint fail (verify, then revert).
  - The existing source files are untouched.

### Phase 2: Shared contracts and backend foundation
- **Objectives:**
  - `shared` envelope, error codes, `MediaAsset`, enums, `slugify`, and all Zod input/DTO schemas
  - server `config/env.ts`, `db.ts` (Mongoose connect, global settings), `logger.ts`, `AppError`, `respond.ts`, the `validate` and typed route helper, `errorHandler`, `notFound`, helmet/cors/json limit/rate limit base, `cacheControl`
  - all Mongoose models (§8) with indexes and mappers
  - full health check
  - the test harness (memory Mongo, factories)
- **Files:** `shared/src/**`, `server/src/{config,lib,middleware}/**`, `server/src/modules/*/model.ts|mapper.ts`, `server/test/**`.
- **Dependencies:** Phase 1.
- **APIs:** `GET /api/health`.
- **Acceptance:**
  - Unit tests for schemas, slugify and mappers pass.
  - The server refuses to start with a missing environment variable and prints a clear message.
  - Error handler tests produce the exact envelope for 404, 422, 409, 413 and 500.
  - Health returns 503 when the DB is stopped.
  - Index `explain()` tests confirm index use on list queries.

### Phase 3: Authentication and admin foundation
- **Objectives:**
  - argon2 password utilities, JWT access tokens, opaque refresh sessions
  - auth routes and `requireAuth`
  - `seed:admin`
  - client `AuthProvider`, API client with refresh-and-retry, `LoginPage`, `RequireAuth`, `AdminLayout` shell (empty sections), `AccountPage` (change password)
- **Files:** `server/src/modules/auth/**`, `server/src/lib/{tokens,password}.ts`, `server/src/middleware/requireAuth.ts`, `server/src/scripts/seed-admin.ts`, `client/src/lib/api/client.ts`, `client/src/features/admin/auth/**`, `client/src/layouts/AdminLayout.tsx`.
- **Dependencies:** Phase 2.
- **APIs:** `/api/auth/{login,refresh,logout,me,password}`.
- **Acceptance:**
  - All auth tests in §19 pass, including rotation reuse detection and the 401 sweep on a dummy admin route.
  - Manual check: log in, reload and stay signed in, log out and get redirected.
  - The refresh cookie has the `HttpOnly; Secure; SameSite=Strict` flags (Secure is relaxed only in development on localhost).
  - No token appears in `localStorage`.

### Phase 4: Cloudinary media infrastructure
- **Objectives:**
  - `MediaService` interface with `cloudinaryMediaService` and `fakeMediaService` (selected by `MEDIA_DRIVER`)
  - folder-mode detection
  - the signature endpoint with per-kind parameter maps
  - verification (`resource()` parsed via Zod) and destroy
  - `cleanup-orphan-media` script
  - client `cloudinary.ts` URL builders, `ResponsiveImage`, and the admin `MediaUploader` (XHR progress)
  - `seed-content.ts`:
    - uploads the 5 existing images and the MP3 into `CLOUDINARY_ROOT_FOLDER`
    - creates the Profile from CV facts (§0.3)
    - creates one **draft** Track "Untitled (title pending)" for the MP3, so nothing unverified goes public
    - creates gallery images as **drafts**, with alt text drafted from the visible content, for owner review
  - confirms the exact audio delivery transformation parameters against current Cloudinary docs
- **Files:** `server/src/services/media/**`, `server/src/modules/uploads/**`, `server/src/scripts/{seed-content,cleanup-orphan-media}.ts`, `client/src/lib/cloudinary.ts`, `client/src/components/media/ResponsiveImage.tsx`, `client/src/features/admin/components/MediaUploader.tsx`.
- **Dependencies:** Phase 3 (signature is admin-only).
- **APIs:** `POST /api/admin/uploads/signature`.
- **Acceptance:**
  - URL builder unit tests pass.
  - Manual: upload an image through a temporary admin test page, see it in the correct Cloudinary folder, and see verification pass. A tampered folder or format fails and the asset is destroyed.
  - `seed:content` is idempotent (re-running doesn't duplicate).
  - `npm run test:cloudinary` passes against `development/`.
  - Nothing in the client bundle contains the API secret (grep `dist`).

### Phase 5: Design system and public website shell
- **Objectives:**
  - Tailwind `@theme` tokens (§7.2) with verified contrast, self-hosted fonts
  - UI primitives, `SiteHeader`/`MobileNav`/`SiteFooter`/`SkipLink`, `PublicLayout`
  - router with lazy routes, `Seo` component, 404 page
  - `GET /api/profile` and `GET /api/home` (profile parts; featured sections return empty arrays until their phases land)
  - **Home** (hero with art-directed `<picture>`, bio teaser, CTA band) and **About** (biography, journey timeline, education, experience, skills; empty sections hidden)
- **Files:** `client/src/components/{ui,layout,seo}/**`, `client/src/layouts/PublicLayout.tsx`, `client/src/app/router.tsx`, `client/src/features/{home,about}/**`, `server/src/modules/{profile,home}/**`.
- **Dependencies:** Phase 4 (images come from Cloudinary).
- **APIs:** `GET /api/profile`, `GET /api/home`.
- **Acceptance:**
  - Responsive at 360, 768, 1024 and 1440 px with no horizontal scroll.
  - Keyboard-only navigation works, the skip link works, and the mobile menu traps focus.
  - The About page shows **only** CV-derived content, and achievements and philosophy are hidden while empty.
  - Lighthouse mobile on Home gives a11y ≥ 95 and performance ≥ 85 (preliminary).
  - The owner reviews the visual direction (**checkpoint**).

### Phase 6: Music and audio system
- **Objectives:**
  - Album and Track public and admin APIs, with reorder
  - admin list and edit pages for tracks and albums (audio upload, cover, credits, publish)
  - `AudioPlayerProvider`, audio store, `PlayerBar` (desktop and mobile sheet), Media Session
  - Music page (`TrackList`, albums)
  - featured tracks on Home
- **Files:** `server/src/modules/{tracks,albums}/**`, `client/src/features/audio/**`, `client/src/features/music/**`, `client/src/features/admin/{tracks,albums}/**`.
- **Dependencies:** Phases 4 and 5.
- **APIs:** `GET /api/tracks`, `GET /api/albums`, `GET /api/albums/:slug`, `/api/admin/tracks/*`, `/api/admin/albums/*`.
- **Acceptance:**
  - Track CRUD tests pass, and drafts are hidden publicly.
  - Playback continues while navigating between all public pages (an E2E test).
  - No autoplay anywhere.
  - Seek, volume, next/prev and error states work.
  - Lock-screen controls work on Android Chrome and iOS Safari (manual).
  - The slider announces `aria-valuetext`.
  - Audio requests start only after the visitor presses play (Network panel).

### Phase 7: Video and gallery system
- **Objectives:**
  - Video (Cloudinary and YouTube) and GalleryImage APIs with admin pages (including bulk photo upload with required alt text)
  - `VideoPlayer`, `YouTubeFacade`, video modal with pause-audio coordination
  - Gallery grid with categories, "Load more" and lazy lightbox
  - featured videos and images on Home
- **Files:** `server/src/modules/{videos,gallery}/**`, `client/src/components/media/{VideoPlayer,YouTubeFacade}.tsx`, `client/src/features/{videos,gallery}/**`, `client/src/features/admin/{videos,gallery}/**`.
- **Dependencies:** Phase 6 (audio coordination).
- **APIs:** `GET /api/videos`, `GET /api/gallery`, `/api/admin/videos/*`, `/api/admin/gallery/*`.
- **Acceptance:**
  - A YouTube iframe and its JavaScript are absent until the play click.
  - Videos don't download before play.
  - Gallery CLS is ≈ 0.
  - The lightbox works by keyboard and swipe.
  - Filters are reflected in the URL.
  - Gallery images can't be published without alt text.
  - CRUD and validation tests pass (including the `source` discriminated union).

### Phase 8: Events and contact/booking
- **Objectives:**
  - Event API (upcoming/past computed) with admin pages
  - Events page in concert-programme style, with time zone formatting
  - upcoming events on Home
  - Inquiry API (honeypot, rate limit, minimum fill time, optional Turnstile, optional email notification **per decision**)
  - Contact page and `ContactForm`
- **Files:** `server/src/modules/{events,inquiries}/**`, `client/src/features/{events,contact}/**`, `client/src/features/admin/events/**`.
- **Dependencies:** Phase 5 (layout). Independent of Phases 6 and 7, so it can run in parallel if desired.
- **APIs:** `GET /api/events`, `POST /api/inquiries`, `/api/admin/events/*`.
- **Acceptance:**
  - An event moves from Upcoming to Past automatically when its time passes (test with a mocked clock).
  - Dates show in Asia/Kathmandu with the time zone label.
  - Form validation is identical on client and server (shared schema).
  - The booking type requires an event type.
  - Spam controls are tested.
  - The success message is announced to screen readers.
  - The submission appears in the DB with an IP hash and no raw IP.

### Phase 9: Admin dashboard, profile editor, inquiries
- **Objectives:**
  - Dashboard with stats
  - Profile editor (all §8 profile fields, image slots, socials, SEO overrides)
  - Inquiries inbox (filters, detail, status, notes, `mailto:` reply, delete) with a new-count badge
  - admin UX polish: consistent toasts, confirm dialogs, unsaved-changes prompt on edit forms, empty states
- **Files:** `server/src/modules/stats/**`, `client/src/features/admin/{dashboard,profile,inquiries}/**`.
- **Dependencies:** Phases 6, 7 and 8.
- **APIs:** `GET /api/admin/stats`, `GET|PUT /api/admin/profile`, `/api/admin/inquiries/*`.
- **Acceptance:**
  - The owner can change every piece of public content without code.
  - The profile editor round-trips all fields.
  - Inquiry workflow E2E passes.
  - Every admin route returns 401 without a token (the sweep test is updated).

### Phase 10: SEO, accessibility and performance hardening
- **Objectives:**
  - `postbuild-seo.ts` (per-route head, sitemap, hero preload)
  - JSON-LD (`Person`, `MusicEvent`, `MusicRecording`, `VideoObject`) from real data only
  - `robots.txt`, manifest and icons
  - a full a11y audit (axe and manual screen reader), with fixes
  - bundle analysis, LQIP polish, caching headers
  - Lighthouse CI budgets
- **Files:** `client/scripts/postbuild-seo.ts`, `client/src/components/seo/JsonLd.tsx`, `client/public/{robots.txt,manifest.webmanifest}`, `lighthouserc.json`.
- **Dependencies:** Phases 5–9.
- **Acceptance:**
  - `view-source:` of `/about` in the build shows the correct title, description, OG and canonical.
  - The Facebook Sharing Debugger and the X card validator (or equivalents) show the right preview.
  - The Rich Results Test validates `MusicEvent` and `Person` with no fabricated fields.
  - Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices ≥ 95, SEO 100 on Home, Music and Gallery.
  - Axe reports no serious or critical violations.
  - The manual screen-reader checklist passes.

### Phase 11: Testing completion
- **Objectives:**
  - Fill coverage gaps: server ≥ 80% lines on modules, all critical flows in E2E (§19).
  - Playwright projects for desktop Chromium, WebKit and mobile.
  - CI running everything.
  - Fix any flaky tests.
- **Files:** `e2e/**`, `playwright.config.ts`, CI workflow updates.
- **Dependencies:** Phase 10.
- **Acceptance:**
  - CI is green across 3 consecutive runs.
  - The E2E suite covers every scenario listed in §19.
  - The `test:cloudinary` smoke test passes manually.

### Phase 12: Production deployment
- **Objectives:**
  - Provision Atlas (production), the Cloudinary production folder and hosts.
  - Configure DNS (`<domain>`, `api.<domain>`), TLS, environment secrets, CORS, CSP headers on the static host, build hooks, uptime monitoring, logs and optional Sentry.
  - Run `seed:admin` and `seed:content` against production.
  - The owner reviews drafts and publishes.
  - Run the release checklist.
- **Files:** `server/Dockerfile` (if a container host is used), host config files (e.g. a `_headers`/redirects file in TS-free formats such as TOML, JSON or plain text), `docs/DEPLOYMENT.md`.
- **Dependencies:** Phase 11 and the owner's decisions (domain, hosts, email).
- **Acceptance:**
  - HTTPS works on both domains, with HSTS.
  - Health is green.
  - Login works in production. The refresh cookie persists across reloads, which proves it is first-party.
  - A test inquiry reaches the inbox (and email, if enabled).
  - securityheaders.com grade ≥ A.
  - Lighthouse budgets hold in production.
  - A backup/restore of the DB has been tested once.

### Phase dependency graph
```text
1 → 2 → 3 → 4 → 5 ─┬─→ 6 → 7 ─┐
                   └─→ 8 ─────┴─→ 9 → 10 → 11 → 12
```

## 26. Claude Code Guardrails

**Implement first:** Phases 1 → 2 → 3, strictly in order. Don't build any UI page before Phase 5's design tokens exist.

**Must NOT change** without the user's explicit approval:
1. The stack (§3) and the ban on JS files. No Next.js, no SSR framework, no Redux/Zustand, no Axios, no Firebase, no SQL.
2. The API envelope and error codes (§10.1), once Phase 2 lands. Extend them, don't break them.
3. The auth model (§11): access token only in memory, refresh token only in an httpOnly cookie, no `localStorage` tokens.
4. Media flow: browser → Cloudinary signed upload, then server verification. Never proxy media bytes through Express, and never expose the API secret.
5. `shared/` stays framework-free (Zod only).
6. Data integrity: **never write biographical facts, awards, performances, albums, clients, reviews, prices or testimonials that aren't in §0.3 or entered by the admin.** Placeholder content must be visibly marked in admin, and hidden or neutral on the public site.
7. The existing source files (`images/*`, the CV, the MP3): read-only.
8. No new runtime dependency beyond §3 without stating the reason in the phase report.

**After each phase, report:**
- what was built
- gate results (the commands and their output summary)
- deviations and new assumptions
- anything blocked on a user decision

**Never claim a phase is complete while tests fail.**

## 27. Acceptance Criteria (project-level Definition of Done)

1. **Every public page works:**
   - Home, About, Music, Videos, Gallery, Performances, Contact and 404 render with real data from the API.
   - Every public page is responsive from 360px to 2560px.
   - There are no console errors.
2. Music plays only on a user gesture, continues across navigation, and has accessible controls and lock-screen integration.
3. All content types can be created, edited, published, reordered and deleted from the admin panel, including media uploads with progress and validation.
4. Booking inquiries are validated on both sides, protected from spam, stored, and visible and manageable in the admin inbox.
5. **Security:**
   - Admin routes are protected (verified by the sweep test).
   - No secrets in the client bundle.
   - Security headers present.
   - Rate limits active.
6. Zero `any` and zero `.js` files. `strict` TypeScript passes. Lint is clean. All tests pass in CI.
7. **Quality budgets:** Lighthouse mobile ≥ 90 performance, 100 accessibility, 100 SEO on key pages. Axe shows no serious violations.
8. Per-route social previews are correct, and the sitemap and robots files are present. Structured data validates and contains only true data.
9. **Owner sign-off:** no fabricated biographical content anywhere on the site, in seed data or in metadata.
10. **Operations and docs:**
    - Production is deployed with HTTPS, health checks, logging, backups and documented rollback.
    - The README covers setup, environment variables, scripts, seeding and deployment.

## 28. Future Enhancements (not in v1)

- **Content:**
  - Nepali-language content (i18n) with a Devanagari font subset
  - a blog or news section
  - press kit/EPK page with downloadable high-resolution photos and CV PDF
  - testimonials (only real, consented ones)
  - a lessons/teaching page with a separate inquiry flow
- **Media:**
  - adaptive HLS video (`sp_auto` + `hls.js`)
  - captions (VTT upload) for videos
  - audio waveform visuals (`fl_waveform`)
  - custom focal points for crops
  - drag-and-drop reordering
- **Ticketing and calendar:** calendar export (`.ics`) for events, and Google Calendar integration for booking availability.
- **Marketing:** newsletter signup (external provider), analytics (privacy-friendly, cookieless), an inquiry auto-reply email.
- **Admin:**
  - multiple admin accounts with roles (for example, a manager), audit log, two-factor authentication (TOTP)
  - content scheduling (publish at a set date)
  - automated frontend rebuild on content change
- **Rendering:** full prerendering or SSR of dynamic detail pages (event and video pages) if SEO data shows the need.

## 29. Architectural Decisions and Rationale (ADR summary)

| # | Decision | Rationale |
|---|---|---|
| ADR-1 | npm-workspaces monorepo with `client`, `server` and a minimal `shared` | Clear separation of the two apps, plus a single source of truth for API contracts and validation. No Nx/Turborepo (unnecessary at this size). |
| ADR-2 | Zod schemas in `shared` as the contract | Runtime validation on the server and type inference on both sides, with no drift between client and server. |
| ADR-3 | Direct signed browser→Cloudinary uploads with server verification | Avoids API body limits and timeouts for large media, keeps secrets server-side, and verification prevents trusting client metadata. |
| ADR-4 | Store `publicId` + `version` + metadata, not URLs | Transformations can evolve without data migration. URLs are deterministic and immutably cacheable. |
| ADR-5 | JWT access token in memory + rotating opaque refresh token in an httpOnly SameSite=Strict cookie, stored hashed with a TTL | Balances XSS resistance, revocability and simplicity. Requires the API on a same-site subdomain. |
| ADR-6 | Single admin, no RBAC | There is one owner. Roles would add code and tests with no benefit. The model can be extended later. |
| ADR-7 | TanStack Query for server state, Context for audio and auth, no Redux | The app's global client state is tiny. Server caching is the real need. |
| ADR-8 | React Router v7 in library (SPA) mode, not framework/SSR mode | Matches the "React + Vite SPA, separate Express API" requirement and keeps deployment of static files simple. SEO needs are met by post-build head prerendering. |
| ADR-9 | No detail routes for tracks and videos in v1. Events use anchors. | Lists with modal playback cover the experience. Fewer routes, endpoints and SEO surfaces to maintain. Slugs exist, so detail pages can be added later without migration. |
| ADR-10 | `featured` + `sortOrder` flags instead of a homepage collection | Simpler admin UX, no dangling references. |
| ADR-11 | Plain-text content (no rich text) | Removes XSS and sanitiser complexity. Bios are paragraphs, which is enough. |
| ADR-12 | Progressive MP4 + YouTube facade, not HLS, in v1 | Adequate for portfolio clips with no extra player dependency. Long performances belong on YouTube for reach and bandwidth. |
| ADR-13 | Vertical-slice phases (admin UI per feature) | Each feature is shippable and testable end to end. Lowers integration risk. |
| ADR-14 | `MediaService` interface with a fake driver | The only intentional abstraction, so CI and E2E run without a Cloudinary account or network. |

## 30. Assumptions (recorded, not facts)

- **ASM-1:** The site is in English only for v1.
- **ASM-2:** The site's identity line is "Violinist · Music Educator · Kathmandu", derived from the CV title. The site primarily promotes performance, with teaching as a secondary offering (inquiry type "lessons").
- **ASM-3:** Event times use the Asia/Kathmandu time zone by default.
- **ASM-4:** There is a single administrator (Roman, or someone acting for him).
- **ASM-5:** The public contact email is `romanviolinktm@gmail.com` (from the CV). **The phone number is hidden by default** until the owner confirms (`showPhone=false`).
- **ASM-6:** These CV items are kept in the profile data but **not shown publicly** by default because they don't support the musician brand: Intern Journalist (2012) and Red Cross first aid. ABRSM Grade 4 is shown exactly as written in the CV unless the owner decides otherwise.
- **ASM-7:** The raw source files (CV, images, MP3) stay out of git. Cloudinary becomes the media source of truth after seeding. The CV contains personal contact details.
- **ASM-8:** The provided MP3's title, credits and rights are unknown. It is seeded as a **draft** track until the owner supplies them.
- **ASM-9:** The 5 provided photos are assumed to be owned by Roman or licensed for web use. The owner confirmed on 2026-10-02 that `violin.png` is licensed. Photographer credits are blank until supplied.
- **ASM-10:** The images with baked-in wordmarks (`roman violin.jpg`, `roman2.PNG`) are used uncropped (`c_limit`) or replaced by clean originals if available. The live wordmark is rendered as HTML text.
- **ASM-11:** Cloudinary starts on the Free plan, so the default caps are a 100 MB video and a 10–20 MB image. Larger files should go to YouTube.
- **ASM-12:** ~~Hosting providers are not chosen yet.~~ Resolved in §0.4: Vercel + Render + Atlas + Cloudinary, with the API proxied through a Vercel rewrite.

---

## 31. Questions / Decisions Required Before Implementation

These need the owner's input. Everything else has a default recorded above.

1. **Domain name.** What domain will the site use (for example `romanbudhathoki.com`)? It is needed for canonical URLs, CORS, cookies and the `api.` subdomain. *Needed by Phase 10–12. Development can proceed without it.*
2. **Hosting.** Do you have preferred or existing hosting accounts for the static frontend and the Node API, and a budget? A free MongoDB Atlas tier has **no automated backups**. Accept `mongodump`-based backups, or use a paid tier? *Needed by Phase 12.*
3. **Inquiry notifications.** Should new booking inquiries also be **emailed** to Roman? If yes, which sender: an existing Gmail via SMTP app password, or a transactional email provider? Which address should receive them? *Needed by Phase 8. Default: admin inbox only.*
4. **Spam protection.** Is adding **Cloudflare Turnstile** (a free, privacy-friendly captcha) to the contact form acceptable, or should it rely on honeypot plus rate limiting only? *Phase 8. Default: honeypot plus rate limit.*
5. **Public contact details.** May the phone number from the CV be shown publicly (and as a WhatsApp link, which is common for Nepal bookings), or only the email? *Phase 5. Default: email only.*
6. **Photos.**
   - Can you provide **versions of `roman violin.jpg` and `roman2.PNG` without the baked-in "ROMAN" text**, so they can be cropped responsively for the hero?
   - ~~Is **`violin.png`** your own photo or licensed for use?~~ Resolved 2026-10-02: licensed.
   - Who are the **photographers** to credit?
7. **The MP3.** What is the track's **title**, composer/arranger, and any collaborators? Are you cleared to publish it (for example, if it's a cover or film/session recording owned by someone else)?
8. **Social and streaming links.** Provide the URLs for YouTube, Instagram, Facebook, TikTok, Spotify or other profiles to display. Is there existing YouTube performance footage to feature?
9. **CV content choices.**
   - Should the **ABRSM Grade 4 (2013)** entry appear publicly?
   - Should the **teaching career** be a prominent section (and "Lessons" an inquiry type)?
   - Should "Intern Journalist" and "First Aid" stay hidden as assumed?
   - Any upcoming events, achievements or a musical-philosophy statement to add?
10. **Languages.** English only for v1, or is Nepali content required at launch? *This affects fonts, routing and the content model. Decide before Phase 5.*
11. **Error monitoring.** Is a third-party error tracker (for example Sentry, free tier) acceptable, or should it rely on host logs only? *Phase 12.*
