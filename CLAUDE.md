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

## Commands

| Command          | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `npm run dev`    | shared (watch) + API on :4000 + client on :5173 |
| `npm run check`  | Full quality gate                               |
| `npm run build`  | Build shared, server and client                 |
| `npm run format` | Prettier                                        |
