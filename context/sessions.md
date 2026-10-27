# Session summary: Roman Budhathoki website

Last updated: 2026-10-03. Covers plan phases 1–12 of 12. The full specification is
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
| 11    | Playwright E2E, coverage, CI hardening                          | Done, committed; CI green (check + E2E)               |
| 12    | Production deployment (Vercel, Render, Atlas, Cloudinary)       | Live 2026-10-03; open items below                     |

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

## Phase 12 (live, 2026-10-03)

- Website: https://romanviolin.vercel.app (Vercel, root `client`). API: https://roman-budhathoki-api.onrender.com
  (Render free plan, Singapore, `render.yaml`). Database `roman-budhathoki-prod`; media folder
  `roman-budhathoki/production`. Guide: `docs/DEPLOYMENT.md`.
- Production admin: `romanviolinktm@gmail.com` (password given to the owner, stored nowhere in the repo).
- `server/.env.production` (git-ignored) runs seeds and index sync against production from this machine.
- Release checks passed (see the plan's Phase 12 notes). Open: LCP about 3.7 s on photo pages, securityheaders.com
  check, a backup/restore test, custom domain, `TRUST_PROXY` confirmation, CI green runs 2 and 3.

## Cold starts (2026-10-09)

- Problem: on Render's free plan the API sleeps after 15 idle minutes. Pages gave up after ~30 s (15 s timeout,
  one retry) and showed "Try again" while the API was still waking.
- Server: `render.yaml` ran the index sync in the start command, so every wake booted Node twice, connected to Atlas
  twice and made the index round-trips before the port opened. The sync now runs at the end of the build (once per
  deploy) and the start command is `node server/dist/server.js`.
- Client: reads that time out or get a 502–504 are retried for up to 100 s (`lib/api/wake.ts`); a request still
  unanswered after 3.5 s shows a "Tuning up…" notice with the new `ViolinLoader` (violin bowed, notes rising). Both
  load on demand: public pages are 157.4–159.9 KiB of the 160 KiB budget. Admin `PageSpinner` uses the violin too.
- Open: whether to keep the API warm (paid instance, or an uptime ping; see `docs/DEPLOYMENT.md`, 750 free hours).

## Live site fix (2026-10-11)

- The Vercel builds for `2d13be2` and `dc6834d` failed the JS budget on Linux (/music 160.0, /gallery 160.1 KiB;
  Linux builds come out ~0.2 KiB larger than Windows ones), so the live site still ran the old client, which showed
  "Something went wrong on our side" for the sleeping API's 502.
- Budget: React, React Router and TanStack Query now share one `core` chunk (`CORE` group in `vite.config.ts`;
  several small chunks compressed worse), and the modulepreload polyfill is off (Safari < 17 just skips the hints).
  Public pages: 156.9–159.1 KiB locally.
- Found while testing: Render never wakes for requests forwarded by Vercel (instant 502, `X-Render-Routing:
no-deploy`, for minutes); one direct request woke it and Vercel answered 20 s later. `wake.ts` now knocks on
  Render directly (no-cors GET of `/api/health`, every 20 s while waiting). The URL comes from vercel.json's `/api`
  rewrite at build time; its origin is in the CSP's `connect-src`.
- `npm audit` (CI) failed on `shell-quote` via `concurrently`; upgraded to `concurrently` 10.0.6 (commit `dc6834d`).
- Open: keeping the API warm is still the owner's choice (paid instance or an uptime ping on the Render URL).

## Revamp to the reference design (started 2026-10-27)

Plan: `C:/Users/User/.claude/plans/create-a-comprehensive-implementation-vivid-curry.md` (phases R1-R6).
Decisions: whole public site gets the reference look (near-black, crimson, Playfair Display + DM Sans,
full-bleed stage photo `roman4.JPG` as hero, superseding the §0.4 hero decision); new sections Stats,
"What I do", "Songs I've played on", Sheet music; copy and numbers admin-entered only; neon logo (file
still to come from the owner).

- R1 done (contracts and backend):
  - Profile `heroHeadline`, `heroIntro`, `stats[]` and `services[]`. Absent in a PUT keeps the stored
    value, so an older admin page can't wipe them; null or '' clears.
  - Video `showcase` flag (admin filter; legacy videos without the field count as false).
  - `HomeDto.showcaseVideos` and `sheetMusicCount`.
  - New sheet-music module: `/api/sheet-music`, `/api/admin/sheet-music`, Cloudinary folder `scores`,
    upload kind `sheet-music`, media reference `preview`.
  - Enquiry type `sheet-music`.
  - E2E seed has neutral home content and scores.
  - No public UI yet.
- R2 done (admin editors):
  - Profile editor has new "Home page" (headline, intro), "Stats" and "What I do" sections. Cards have
    details and an optional contact-form button with an enquiry type. The hero image hints now describe
    the full-bleed crop.
  - Video editor has the "List under Songs I've played on" toggle, also shown in the list.
  - New Sheet music admin: list (`ContentListPage`) and edit page, at `/admin/sheet-music`.
  - Neon logo saved from the reference page as `client/public/images/logo-roman.png` (1506×462,
    40 KB), at the owner's request; it goes into the header in R3.
  - Public pages are now 157.4-159.5 KiB (labels ship with them). R3 makes Home lazy to free room.
- R3 done (design foundation, every public page):
  - Home is a lazy route (`/` in `PUBLIC_PAGES`); its below-the-fold lists (tracks, videos, events) load
    lazily. Budget after R3: / 156.6, /about 156.1, /music 158.4, /videos 157.9, /gallery 153.5,
    /events 156.1, /contact 151.3 KiB.
  - Fonts: Playfair Display + DM Sans (variable fontsource packages; `CRITICAL_FONTS` preloads updated).
  - Palette tokens `night`, `night-raised`, `snow`, `fog`, `crimson` (#ff2d55, accent text and
    decoration), `crimson-deep` (#d6194a, behind white text, via `--accent-fill`), `glow-blue`,
    `danger`. Old class names renamed across the public site. `surface-light` is now a dark alias.
    White on `crimson` fails 4.5:1, which the token test asserts, so filled buttons use `--accent-fill`.
  - New utilities `eyebrow` and `header-glass` (transparent at the top, solid once scrolled, CSS
    scroll-driven). `stage-light` is now crimson and blue corner glows.
  - Header: logo (`logo-roman.webp` 1×/2×, trimmed from the PNG), nav from 1280 px, "Book me" pill,
    hamburger menu (still named "Menu"/"Site menu"). Footer: name, tagline, socials, "Explore",
    "Get in touch", © line. `Section` lost the Roman-numeral numbers; `ButtonLink` and `ArrowLink`
    are pills.
  - Contact form restyled dark (inputs `bg-night`, card `night-raised`, pill submit).
  - Left for R5: the About timeline's boxed look, the `bg-crimson text-night` buttons in
    `RouteErrorPage` and `VideoGallery` (they pass contrast but don't match). Home is still the old
    layout until R4.
- R4 done (home page):
  - Full-bleed hero under the transparent header (`-mt-16 sm:-mt-20`): tagline with a crimson rule,
    h1 `heroHeadline ?? displayName`, intro `heroIntro ?? shortBio`, "Book me →". The photo is
    cropped by Cloudinary around the subject (`hero.ts`: 16:9 from 768 px, 1:2 below, from the
    mobile image if set, else the same photo); the build preload uses the same crops. Motion: photo
    settles (`kenburns` 1.06→1), rule draws, text rises; `hero-shade` keeps text legible.
  - Then: stats row ("At a glance", hidden when empty), About teaser (portrait, "About me",
    "Read my story"), "What I do" carousel (lazy `ServicesCarousel`: region "Services", autoplay
    7 s that stops on hover/focus/pause and never runs under reduced motion; stave and equaliser
    decoration), "Songs I've played on" (lazy `Showcase`: muted autoplay once half in view, except
    under reduced motion, Save-Data or while site music plays; choosing a song plays it with sound
    and pauses the music), recent videos (+ "See all my work", Instagram if in socials), music,
    upcoming performances, gallery, sheet-music teaser (when `sheetMusicCount > 0`; links to
    `/sheet-music`, which R5 builds), "Let's make music" band (WhatsApp only for a public phone in
    +country form). Sections alternate `dark-raised` / `dark`.
  - New CSS utilities: `hero-shade`, `glass-card`, `service-stage`, `showcase-frame`, `eq-bar`,
    `note-twinkle`. New hook `useMediaQuery`; `buttonClass()` styles external links as buttons.
  - Budget: / 157.4, /about 156.2, /music 158.5, /videos 158.1, /gallery 153.5, /events 156.2,
    /contact 151.4 KiB. E2E (Chromium) 22 passed; Playwright's Chromium had to be reinstalled
    (`npx playwright install chromium`) after the R3 lockfile regeneration.
