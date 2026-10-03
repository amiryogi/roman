# Session summary: Roman Budhathoki website

Last updated: 2026-10-03. Covers plan phases 1–11 of 12. The full specification is
[ROMAN_BUDHATHOKI_WEBSITE_PLAN.md](../ROMAN_BUDHATHOKI_WEBSITE_PLAN.md), and each phase's deviations are recorded in
its "Implementation notes (Phase N)" in §0.4. Working rules are in [CLAUDE.md](../CLAUDE.md).

## Where things stand

| Phase | Scope                                                           | State                                                 |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------- |
| 1     | Monorepo, TypeScript-only tooling, CI                           | Done, committed                                       |
| 2     | Shared Zod contracts, Express foundation, all Mongoose models   | Done, committed                                       |
| 3     | Admin sign-in (JWT in memory, rotating httpOnly refresh cookie) | Done, committed                                       |
| 4     | Cloudinary media: signed uploads, verification, seed            | Done, committed                                       |
| 5     | Design system, public layout, Home, About                       | Done, committed. Visual direction approved 2026-10-03 |
| 6     | Music: tracks, albums, persistent audio player, admin           | Done, committed                                       |
| 7     | Videos and gallery, lightbox, bulk photo upload                 | Done, committed                                       |
| 8     | Events (Performances) and contact/booking form                  | Done, committed                                       |
| 9     | Admin dashboard, full profile editor, inquiries inbox           | Done; final changes **not committed**                 |
| 10    | SEO prerendering, structured data, a11y audit, bundle trimming  | Done, committed; LCP target open (see below)          |
| 11    | Playwright E2E, coverage, CI hardening                          | Done, **not committed**; CI runs pending              |
| 12    | Production deployment (Vercel, Render, Atlas, Cloudinary)       | Next                                                  |

Quality gate at the end of Phase 11: `npm run check` passes with **427 tests** (41 shared, 221 server, 165 client), plus
no-JS, lockfile, client-secrets, typecheck, lint and Prettier.

## What exists

**Public site** (React 19 + Vite + React Router + Tailwind v4, TanStack Query):

- **Home:** hero, featured tracks, biography teaser, featured videos, photo strip, upcoming events, booking band. Empty
  sections hide.
- **About:** CV-based biography, musical journey, teaching, skills.
- **Music:** albums and tracks with a persistent audio player that keeps playing across pages, plus lock-screen controls.
- **Videos:** YouTube embeds or uploaded files, each played in a modal.
- **Gallery:** masonry grid with a lazy-loaded lightbox.
- **Performances:** upcoming and past events, shown in the event's own time zone.
- **Contact:** booking form, public contact details and social links.
- **Also:** 404 page, route error page.

**Admin** (`/admin`, lazy-loaded): sign-in, account and password, a dashboard, the profile editor, the inquiries inbox,
and management pages for tracks, albums, videos, the gallery (including bulk upload) and events. They share
`ContentListPage`, `AdminTable` and `ConfirmDialog`, save with toasts, and ask before leaving unsaved changes.

**API** (Express 5 + Mongoose):

- **Public:** `/api/health`, `profile`, `home`, `tracks`, `albums`, `albums/:slug`, `videos`, `gallery`, `events`,
  `inquiries` (plus `form-token`).
- **Admin:** `/api/admin/{uploads,tracks,albums,videos,gallery,events,profile,inquiries,stats}`, all behind `requireAuth`. Every admin path is
  in the 401 sweep test.

**Media:**

- **Upload flow:** browser → Cloudinary signed upload → server verification. Every asset uses the **private** delivery
  type: originals need a signature, while transformed URLs are public.
- **Scripts:** `seed:content` (idempotent), `cleanup:media`, `test:cloudinary`.

## Owner decisions so far

- **Hosting:** Vercel (client) with `/api/*` rewritten to Render; MongoDB Atlas; Cloudinary.
- **Hero image:** `images/roman violin.jpg`, never cropped.
- **Runtime:** Node 22 LTS.
- **Media originals:** private, so the GPS metadata in photos is never public.
- **`violin.png`:** licensed for use.
- **Dev database:** Atlas, database `roman-budhathoki-dev`. Cloudinary root folder `roman-budhathoki/development`.
- **Left at plan defaults** (not yet decided by the owner): inquiries go to the admin inbox only (no email), no captcha
  (spam trap, rate limit and minimum fill time instead), and the phone number stays hidden (email only).

## Open items for the owner

1. **MP3:** its title, credits and publishing rights. It is seeded as the draft "Untitled (title pending)".
2. **Visual direction:** the Phase 5 review of Home and About on phone and desktop.
3. **Booking-band copy:** confirm it, and whether the journalism internship stays hidden on About.
4. **Photographer credits:** these can now be entered per photo.
5. **Before Phase 10:** the domain name and social links.
6. **Before Phase 12:** paid or free tiers on Render and Atlas, backups, and whether to use Sentry.
7. **Optionally, at any time:** email notifications for inquiries, Turnstile, showing the phone number.

## Notes for the next session

- **Local DNS quirk (fixed):** Windows resolves through 8.8.8.8/1.1.1.1, but Node's own resolver gets `127.0.0.1`,
  so the SRV lookup behind `mongodb+srv://` failed (`querySrv ECONNREFUSED`). `server/.env` now sets
  `DNS_SERVERS=8.8.8.8,1.1.1.1`, which `connectDb` applies before connecting (server and all scripts). Production
  doesn't need it.
- **Environment:**
  - `server/.env` holds the Cloudinary credentials and a generated `JWT_ACCESS_SECRET`.
  - `client/.env` holds `VITE_CLOUDINARY_CLOUD_NAME`.
  - Production additionally needs `IP_HASH_SALT`, `CLOUDINARY_ROOT_FOLDER` and `CLIENT_ORIGINS`.
  - Never commit `.env` files. The credentials were once typed into `.env.example`; they were blanked before any commit,
    but rotating the Cloudinary secret is still advisable.
- **JS budget:** every client build checks it (`scripts/check-bundle.ts`): 157.1–159.6 KiB of 160 KiB fetched up front,
  counting the preloaded validation chunk. Little headroom: trim before adding to public pages.
- **LCP:** 2.7–3.0 s in Lighthouse's mobile simulation against a 2.5 s target. Closing the gap needs build-time
  rendering of the page body with hydration (an owner decision; §17 chose head-only prerendering).
- **Captions:** video caption files (VTT) are a planned enhancement; no empty `<track>` is rendered.
- **In-memory MongoDB for checks:** a scratch script outside the server's Vitest config downloads its own 781 MB
  binary. Set `MONGOMS_DOWNLOAD_DIR=server/node_modules/.cache/mongodb-memory-server` to reuse the tests' copy.
- **SEO overrides:** the profile's `seo` fields apply to the home page; link previews pick them up on the next deploy
  (set `SEO_BUILD_API_URL` for the build). Experience entries in the "Other" category are stored but never shown.
- **Background servers in checks:** background tasks stop after 30 minutes by default; give the API, database and
  preview a longer limit, and free ports 4000/4173/27999 by PID afterwards (stopping the wrapper leaves the child).
- **Unchecked:** lock-screen controls on a real Android or iPhone (manual check from Phase 6).

### Bugs found and fixed

| Phase | Bug                                                           | Fix                                                           |
| ----- | ------------------------------------------------------------- | ------------------------------------------------------------- |
| 4     | Cloudinary SDK errors carried the API secret into server logs | SDK errors reduced to message and HTTP status before logging  |
| 4     | Audio duration missing from the Admin API response            | Verification requests `media_metadata`                        |
| 5     | Header overflowed at 360 px                                   | Header "Book" button hidden via a wrapper on phones           |
| 5     | Footer shifted the layout while pages loaded                  | `<main>` given at least a full viewport of height             |
| 5     | StrictMode moved focus on first load                          | Route focus keyed on the previous pathname                    |
| 6     | Hydration warning when opening a lazy page directly           | Dark hydrate fallback for the public routes                   |
| 7     | Placeholder colour showed through transparent PNGs            | Placeholder cleared once the image loads                      |
| 7     | Technical alt-text validation message                         | Plain-language messages in the shared alt-text schema         |
| 9     | Social links were stored but shown nowhere publicly           | Listed on the Contact page under "Elsewhere"                  |
| 9     | Selected inquiry status button rendered white on white        | Own class instead of overriding the secondary button style    |
| 9     | Saving an inquiry refetched the detail it had just updated    | Only the list queries and stats are invalidated               |
| 10    | Zod's eval probe reported as a CSP violation                  | `jitless` set from the entry via `globalThis`                 |
| 10    | Constants chunk pulled Zod into the entry                     | Rolldown groups with priority (`shared-lite` above `schemas`) |
| 10    | Video card headings skipped a level on the Videos page        | `headingLevel` prop (h2 there, h3 on Home)                    |
| 10    | Contact details pushed the form down while loading (CLS 0.09) | Placeholder of the details' size while the profile loads      |

## Phase 9 (done)

- Dashboard (`GET /api/admin/stats`): counts, the latest five new inquiries, shortcuts. The sidebar shows a "new"
  inquiries badge that refreshes every minute.
- Profile editor (`GET|PUT /api/admin/profile`): every §8 field, repeatable sections with move up/down, four image
  slots with alt text, contact with `showPhone`, socials, SEO. `PUT` creates the profile if it is missing.
- Inquiries inbox: URL filters, a detail page that marks new messages read, a `mailto:` reply, status buttons, private
  notes, and delete with confirmation.
- `useUnsavedChanges(isDirty)` on every admin edit form; navigate with `SAVED_STATE` after a save.

## Phase 10 (done)

- Prerendered heads per public page (title, description, canonical, Open Graph, JSON-LD, preloads), `spa.html` for
  other addresses, `sitemap.xml`, `robots.txt`, manifest and icons. Content from `SEO_BUILD_API_URL` at build time.
- Structured data from real data only: `Person`, `MusicEvent` (upcoming), `MusicRecording`/`MusicAlbum`, `VideoObject`.
- Zod and the schemas load with the first request instead of with the page; each page preloads its chunks, its first
  API request and the validation chunk. `client/vercel.json` holds the CSP, caching and routing; `vite preview` mirrors it.
- Lighthouse (mobile): performance 92–94 (Contact 86–90), accessibility, best practices and SEO 100; axe clean.
- Still open: LCP ≤ 2.5 s, the manual screen-reader pass, and the sharing/Rich Results validators (need the public URL).

## Phase 11 (done)

- Playwright suite in `e2e/`: 74 cases over desktop Chromium/WebKit, Pixel 7 and iPhone 14 (72 pass; 2 skipped on
  Windows only, where WebKit can't play media). Its own test API with seeded content; Cloudinary and YouTube stubbed.
- Server coverage enforced at 80% (95% lines today). CI runs coverage and a new E2E job.
- `npm run test:cloudinary` passed. Still to confirm: three consecutive green CI runs after pushing.

## UI refresh (after Phase 11, 2026-10-03)

- Concert-hall motion and detail, CSS only: animated wordmark (violin lifted in, name written in, sheen and sway on
  hover), nav "strings" (drawn on hover, plucked when chosen), scroll-progress string, hero settle and spotlight,
  section hairlines, stage lighting, button sheen/fill, arrow links, card hover, About timeline string, page fades,
  mobile menu cascade. All respect reduced motion. Conventions are in CLAUDE.md ("Design and motion").
- The player bar now loads on first play, which paid for the extra markup: every public page is 156.5–159.1 KiB.

## Phase 12 scope (next)

- Production Atlas, the Cloudinary production folder, Vercel (client) and Render (API); domain, HTTPS, secrets, CORS,
  the `/api` rewrite in `client/vercel.json`, uptime monitoring.
- `seed:admin` and `seed:content` in production; the owner publishes; release checklist (§25 Phase 12).
- Needs from the owner: the domain, host accounts, and the LCP decision.
