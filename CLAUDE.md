# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Portfolio and booking website for Roman Budhathoki, violinist. The full specification is
[ROMAN_BUDHATHOKI_WEBSITE_PLAN.md](ROMAN_BUDHATHOKI_WEBSITE_PLAN.md). Read the relevant sections before
working on a phase. Owner decisions are in §0.4 and override defaults elsewhere. A running summary of completed
phases, decisions and open items is in [context/sessions.md](context/sessions.md).

## Non-negotiables (plan §26)

1. **TypeScript only.** No `.js`/`.jsx`/`.cjs`/`.mjs` files, configs included (`npm run check:no-js`).
2. **No `any`, no type assertions** (`as const` is fine). Parse unknown data with Zod or type guards.
3. Stack is fixed: React + Vite + React Router + Tailwind v4 / Express 5 / MongoDB + Mongoose / Cloudinary.
   No Next.js, SSR frameworks, Redux/Zustand, Axios, Firebase or SQL. New runtime dependencies need a stated reason.
4. `shared/` holds API contracts only (Zod schemas, types, enums, pure functions). No React, Express or Mongoose imports.
5. Auth: access token in memory only, refresh token in an httpOnly cookie only. Never use `localStorage` for tokens.
6. Media: browser → Cloudinary signed upload → server verification. Never proxy media bytes through Express.
   Never expose Cloudinary or JWT secrets, and never prefix a secret with `VITE_`.
7. **Never invent facts about Roman.** No biography, awards, performances, albums, clients, reviews or prices beyond
   plan §0.3 or what the admin enters.
8. `images/`, `music for the website.mp3` and the CV `.docx` are read-only source material and are gitignored.

## Workflow

- Work one phase at a time (plan §25). Finish each phase with `npm run check` (no-js, typecheck, lint, tests),
  then report results and stop for review.
- Production: Vercel serves `client/` and rewrites `/api/*` to the Render service. In development, Vite proxies `/api`
  to `localhost:4000`, so client code always calls relative `/api` URLs.

## Architecture

- npm workspaces: `shared` (`@roman/shared`), `server`, `client`. `shared` is compiled to `shared/dist` and imported
  from there, so **after editing `shared/` rebuild it** (`npm run build -w @roman/shared`, or keep `npm run dev`
  running) before typechecking or testing the other workspaces. Root scripts build it first automatically.
- Server: `server/src/modules/<resource>/` holds `model.ts` (Mongoose), `service.ts` (queries and media handling),
  `mapper.ts` (`toXDto`), `routes.ts` (public router and `createAdmin<X>Router`) and its tests. All routers are
  wired in `app.ts`. Cross-cutting helpers live in `lib/`, Cloudinary and the fake driver in `services/media/`,
  CLI scripts (seeding, index sync, media cleanup) in `src/scripts/`.
- Client: `src/app/router.tsx` defines lazy routes for the public site (`PublicLayout`) and the admin
  (`AdminLayout`, behind `RequireAuth`). Pages live in `src/features/<area>/`, admin building blocks in
  `src/features/admin/components/`, API calls in `src/lib/api/` (`public.ts`, `admin.ts`).

## Server conventions

- Route handlers parse input with the shared Zod schemas directly (`schema.parse(req.body)`). Express 5 forwards the
  thrown `ZodError` to the error handler, which answers 422. Never cast `req.body`.
- Respond with `sendData()` / `sendNoContent()` from `lib/respond.ts`, passing mapper output (`toXDto`). Never send
  documents directly.
- `sanitizeFilter` is on. Query operators written in code must be wrapped, e.g.
  `{ startsAt: mongoose.trusted({ $gte: now }) }`. Unwrapped operators are neutralised and the query fails.
- Mongoose drops empty subdocuments on save, so optional nested objects may be absent in lean documents.
- Tests use `useTestDb()` (in-memory MongoDB with real indexes) and the factories in `server/test/`.
- Media: turn a client `mediaRef` into a stored asset with `verifyUpload(media, kind, ref, logger)`
  (`services/media/verify.ts`). After the DB write succeeds, delete replaced or removed assets with `destroyQuietly`.
  Add any new media field to `services/media/references.ts`, or `cleanup:media` treats its assets as orphans
  (a test enforces this). Tests use `createTestMedia()` (fake driver) and `media.simulateUpload(kind)`.
- Image slots (cover, poster…) and required media use `resolveImageSlot` / `resolveMediaRef` in
  `services/media/slots.ts`, then `destroyAll(obsolete)` after saving. Content routes use `idParam(req.params)`
  (bad id → 404), `titleSearch(q)` and `reorder(Model, ids)` from `lib/query.ts`. Tests sign in with
  `adminAccessToken(app)` from `test/auth.ts`.
- Admin routers mount under the `/api/admin` router in `app.ts`, which already applies `requireAuth`. Use
  `currentAdmin(req)` in handlers. Add new admin paths to the 401 sweep test in `modules/auth/auth.test.ts`.

## Dependencies

- After any `npm install <pkg>` or `npm uninstall <pkg>`, run `npm run check:lockfile`. If it fails (npm/cli#4828),
  delete `node_modules` and `package-lock.json`, then run `npm install`.

## Client conventions

- Call the API through `apiRequest(path, sharedDtoSchema, options)` / `apiRequestNoContent` in `client/src/lib/api/`.
  Responses are validated against the shared schema. Use `{ auth: true }` for admin endpoints; expired tokens are
  refreshed and retried automatically.
- Show errors with `getErrorMessage(error)`. Forms use React Hook Form with `zodResolver(sharedSchema)`; pass
  `useForm<z.input, unknown, z.output>` explicitly and map server 422s with `applyFieldErrors`.
- Admin: TanStack Query keys from `adminKeys` (start with `"admin"`, never cached). Content lists use `ContentListPage` with a
  config (filters in the URL, publish/feature toggles, reorder, confirmed delete); confirm saves with `sonner` toasts. Public pages
  use `queryKeys` from `lib/api/public.ts`; invalidate them after admin changes.
- Admin edit forms call `useUnsavedChanges(isDirty)` (renders the leave-without-saving dialog) and navigate away after
  a successful save with `{ state: SAVED_STATE }`. Media `setValue` calls pass `shouldDirty: true`.
- Public pages keep Zod out of their initial JavaScript (lint-enforced): import values only from `@roman/shared/lite`
  (types from `@roman/shared` are fine), and pass a schema picker to the API client, `apiRequest(path, (s) => s.xDtoSchema)`.
  A new public response schema goes in the `schemas` object of `lib/api/validation.ts`. Admin code passes schemas directly.
- Public request paths live in `lib/api/publicPaths.ts`, page titles/descriptions in `components/seo/pages.ts`. The build
  (`client/scripts/postbuild-seo.ts`) uses both to prerender each page's head and preload its first request
  (`FIRST_REQUESTS`); update it when a page's first request changes.
- Modules imported by `client/scripts/` run in Node: no `@/` imports, no `import.meta.env` (`lib/mediaUrls.ts`,
  `components/seo/{site,pages,structuredData}.ts`, `components/media/{hero,imageAttributes}.ts`,
  `features/gallery/galleryLayout.ts`, `lib/api/publicPaths.ts`).
- The client build fails when a public page fetches more than 160 KiB of gzipped JS up front (`scripts/check-bundle.ts`);
  the margin is small, so check the numbers when public pages grow.
- Audio: play through `useAudioPlayer()` (`playTrack`, `pause`…). Video players must call `pause()` before playing.
  The `PlayerBar` UI is lazy-loaded on first play; its height constant lives in `features/audio/playerLayout.ts`.

## Design and motion (public site)

The look is a concert hall: dark "stage" sections and ivory "paper" sections alternating, varnish-orange accents,
Cormorant Garamond for display text (28 px and up only) and Inter for everything else. Everything below lives in
`client/src/styles/index.css`.

- **Tokens and surfaces:** colours are `@theme` tokens (`ebony`, `ivory`, `varnish`, `varnish-deep`, `ink`, `mist`…).
  Wrap content in `surface-dark` / `surface-dark-raised` / `surface-light`; they set `--accent`, `--muted`,
  `--on-accent` and `--focus-ring`, so use those variables instead of fixed colours. `src/styles/tokens.test.ts` fails
  if a text colour pair drops below WCAG contrast.
- **Building blocks:** `Section` (tone, Roman-numeral "movement" eyebrow with a drawn hairline, reveal on scroll),
  `ButtonLink` (`solid` with a light sheen, `outline` that fills like a bow stroke), `ArrowLink` for "more" links,
  `Wordmark` (`withViolin` in the header and footer), `StringsDivider`, `SocialLinks` (icon buttons or icon plus
  name; opens in a new tab so site music keeps playing). The footer and Contact page read contact details and
  socials from the profile (`GET /api/profile`); never hard-code them.
- **CSS utilities:** `nav-string` (header links: string drawn on hover, plucked when current), `btn-sheen`,
  `btn-fill`, `timeline-string` (About timelines), `sheen-text` (wordmark highlight), `stage-light` (warm glow on dark
  sections), `scroll-string` (scroll progress under the header, CSS scroll-driven), `label-caps`, `string-range`.
  Icons: `icon` plus `icon-youtube` / `icon-facebook` / `icon-instagram` / `icon-link` / `icon-mail` / `icon-phone`
  (SVG masks in the current text colour, no icon library). Always `aria-hidden`, beside text or an `aria-label`.
- **Motion vocabulary:** `animate-rise`, `swing-in`, `rock`, `write`, `sheen`, `draw`, `kenburns`, `page`, `pluck`,
  plus `sway`/`breathe` on the admin sign-in. Rules:
  - Every animation is `motion-safe:` or inside `@media (prefers-reduced-motion: no-preference)`; the E2E axe scans
    run with reduced motion, so content must be complete without it.
  - Animate `transform`, `opacity`, `rotate`, `scale`, `clip-path` or `background-position`, never layout
    properties (letter-spacing, width…): they cause layout shift.
  - An element with a Tailwind `rotate-*`/`scale-*` class uses the individual CSS properties, so keyframes for it
    animate `rotate`/`scale`, not `transform`. Put a load animation and a hover animation on nested elements; on one
    element, leaving hover replays the load animation.
  - No fade on the first page load (it would delay the largest paint): `PublicLayout` fades pages in only on
    navigation. The hero photo's settle (`kenburns`) ends at its natural size, and its bottom fade stays clear of the
    baked-in wordmark (owner decision §0.4).
- **Budget:** class strings are shipped inside the JavaScript. For anything longer than a few classes that repeats,
  add a utility to `index.css` rather than a long string in a public component (CSS isn't in the 160 KiB JS budget).

## Commands

| Command                 | Purpose                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`           | shared (watch) + API on :4000 + client on :5173                                  |
| `npm run check`         | Full gate: no-js, lockfile, client-secrets, typecheck, lint, format:check, tests |
| `npm run build`         | Build shared, server and client                                                  |
| `npm run format`        | Prettier                                                                         |
| `npm run lighthouse`    | Lighthouse budgets against `vite preview` on :4173 (needs the API with content)  |
| `npm run test:e2e`      | Playwright end-to-end suite (starts its own API and client)                      |
| `npm run test:coverage` | Server tests with the 80% coverage threshold                                     |

Run a single test file or test from inside the workspace (build `shared` first if it changed):

```bash
cd server && npx vitest run src/modules/profile            # a folder or file
cd client && npx vitest run src/features/admin -t "event editor"   # filter by test name
```

E2E (`npm run test:e2e`, Playwright) starts its own test API on :4100 (`e2e/server/api.ts`: in-memory MongoDB, fake
media, content from `e2e/server/seed.ts`) and a production build on :4300; `e2e/fixtures.ts` stubs Cloudinary and
YouTube. Run one spec or browser with `npx playwright test e2e/admin.spec.ts --project=chromium`. Add seeded content to
`SEEDED` in `e2e/config.ts`, and name anything a test creates with `unique()`. Server coverage (`npm run test:coverage`)
must stay at 80% or more of lines in `server/src/modules`.

Server tests start an in-memory MongoDB and use `MEDIA_DRIVER=fake`. `npm run test:cloudinary` is the opt-in smoke
test against the real Cloudinary development folder. On Windows, "Cannot find native binding" means the npm
optional-dependency bug: delete `node_modules` and `package-lock.json`, then `npm install`.
