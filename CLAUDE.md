# CLAUDE.md

Portfolio and booking website for Roman Budhathoki, violinist. The full specification is
[ROMAN_BUDHATHOKI_WEBSITE_PLAN.md](ROMAN_BUDHATHOKI_WEBSITE_PLAN.md). Read the relevant sections before
working on a phase. Owner decisions are in §0.4 and override defaults elsewhere.

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
- Audio: play through `useAudioPlayer()` (`playTrack`, `pause`…). Video players must call `pause()` before playing.

## Commands

| Command          | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | shared (watch) + API on :4000 + client on :5173 |
| `npm run check`  | Full quality gate                               |
| `npm run build`  | Build shared, server and client                 |
| `npm run format` | Prettier                                        |
