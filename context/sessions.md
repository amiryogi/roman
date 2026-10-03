# Session summary: Roman Budhathoki website

Last updated: 2026-10-03. Covers plan phases 1–8 of 12. The full specification is
[ROMAN_BUDHATHOKI_WEBSITE_PLAN.md](../ROMAN_BUDHATHOKI_WEBSITE_PLAN.md), and each phase's deviations are recorded in
its "Implementation notes (Phase N)" in §0.4. Working rules are in [CLAUDE.md](../CLAUDE.md).

## Where things stand

| Phase | Scope                                                           | State                                                  |
| ----- | --------------------------------------------------------------- | ------------------------------------------------------ |
| 1     | Monorepo, TypeScript-only tooling, CI                           | Done, committed                                        |
| 2     | Shared Zod contracts, Express foundation, all Mongoose models   | Done, committed                                        |
| 3     | Admin sign-in (JWT in memory, rotating httpOnly refresh cookie) | Done, committed                                        |
| 4     | Cloudinary media: signed uploads, verification, seed            | Done, committed                                        |
| 5     | Design system, public layout, Home, About                       | Done, committed. **Owner's visual review still open.** |
| 6     | Music: tracks, albums, persistent audio player, admin           | Done, committed                                        |
| 7     | Videos and gallery, lightbox, bulk photo upload                 | Done, committed                                        |
| 8     | Events (Performances) and contact/booking form                  | Done, **not committed yet**                            |
| 9     | Admin dashboard, full profile editor, inquiries inbox           | Next                                                   |
| 10    | SEO prerendering, structured data, a11y audit, bundle trimming  | To do                                                  |
| 11    | Playwright E2E, coverage, CI hardening                          | To do                                                  |
| 12    | Production deployment (Vercel, Render, Atlas, Cloudinary)       | To do                                                  |

Quality gate at the end of Phase 8: `npm run check` passes with **377 tests** (41 shared, 206 server, 130 client), plus
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
- **Contact:** booking form.
- **Also:** 404 page, route error page.

**Admin** (`/admin`, lazy-loaded): sign-in, account and password, and management pages for tracks, albums, videos, the
gallery (including bulk upload) and events. They share `ContentListPage`, `AdminTable` and `ConfirmDialog`, and save
with toasts. The Dashboard is still a placeholder, filled in Phase 9.

**API** (Express 5 + Mongoose):

- **Public:** `/api/health`, `profile`, `home`, `tracks`, `albums`, `albums/:slug`, `videos`, `gallery`, `events`,
  `inquiries` (plus `form-token`).
- **Admin:** `/api/admin/{uploads,tracks,albums,videos,gallery,events}`, all behind `requireAuth`. Every admin path is
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

- **Local DNS quirk:** on this machine, Node's DNS points at `127.0.0.1`, which refuses SRV lookups, so the Atlas
  `mongodb+srv://` URI fails and `npm run dev` can't reach the dev database. Workarounds: fix the machine's DNS (find the
  VPN, DNS filter or virtual adapter), or use Atlas's standard `mongodb://host1,host2,host3/...` connection string. For
  checks, the sessions used a throwaway in-memory MongoDB seeded from the real Cloudinary dev folder.
- **Environment:**
  - `server/.env` holds the Cloudinary credentials and a generated `JWT_ACCESS_SECRET`.
  - `client/.env` holds `VITE_CLOUDINARY_CLOUD_NAME`.
  - Production additionally needs `IP_HASH_SALT`, `CLOUDINARY_ROOT_FOLDER` and `CLIENT_ORIGINS`.
  - Never commit `.env` files. The credentials were once typed into `.env.example`; they were blanked before any commit,
    but rotating the Cloudinary secret is still advisable.
- **Bundle budget:** Home's initial JS is 156.8 KiB gzipped against a 160 KB budget. Zod is about 30 KB of it. Phase 10
  should trim it, for example by lazy-loading below-the-fold Home sections.
- **Captions:** video caption files (VTT) are a planned enhancement; no empty `<track>` is rendered.
- **Unchecked:** lock-screen controls on a real Android or iPhone (manual check from Phase 6).

### Bugs found and fixed

| Phase | Bug                                                           | Fix                                                          |
| ----- | ------------------------------------------------------------- | ------------------------------------------------------------ |
| 4     | Cloudinary SDK errors carried the API secret into server logs | SDK errors reduced to message and HTTP status before logging |
| 4     | Audio duration missing from the Admin API response            | Verification requests `media_metadata`                       |
| 5     | Header overflowed at 360 px                                   | Header "Book" button hidden via a wrapper on phones          |
| 5     | Footer shifted the layout while pages loaded                  | `<main>` given at least a full viewport of height            |
| 5     | StrictMode moved focus on first load                          | Route focus keyed on the previous pathname                   |
| 6     | Hydration warning when opening a lazy page directly           | Dark hydrate fallback for the public routes                  |
| 7     | Placeholder colour showed through transparent PNGs            | Placeholder cleared once the image loads                     |
| 7     | Technical alt-text validation message                         | Plain-language messages in the shared alt-text schema        |

## Phase 9 scope (next)

- **Dashboard:** counts from `GET /api/admin/stats`, the latest new inquiries, and shortcuts.
- **Profile editor:** `GET` and `PUT /api/admin/profile` for every §8 field (identity, biography, education, experience,
  achievements, philosophy, skills, contact including `showPhone`, socials, the four image slots, SEO).
- **Inquiries inbox:** `/api/admin/inquiries` with filters, a detail view, status, private notes, a `mailto:` reply,
  delete, and a "new" count badge.
- **Admin polish:** an unsaved-changes prompt, consistent empty states, and updating the 401 sweep for the new paths.
