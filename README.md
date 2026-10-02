# Roman Budhathoki — Website

Portfolio, music player and booking site for Roman Budhathoki, violinist (Kathmandu, Nepal).

- **client/**: React 19 + Vite + TypeScript + Tailwind CSS v4 (public site and admin panel), deployed to Vercel
- **server/**: Express 5 + TypeScript REST API, deployed to Render
- **shared/**: API contracts shared by both (TypeScript, Zod)
- Data: MongoDB Atlas · Media: Cloudinary

The implementation plan and current phase status are in
[ROMAN_BUDHATHOKI_WEBSITE_PLAN.md](ROMAN_BUDHATHOKI_WEBSITE_PLAN.md).

## Requirements

- Node.js 22 LTS (`>= 22.12`, see `.nvmrc`)
- npm 10+

## Setup

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4000/api/health. The client reaches it through the Vite proxy at `/api`.

## Scripts (run from the repository root)

| Script                            | Description                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`                     | Builds `shared`, then runs shared (watch), API and client together            |
| `npm run build`                   | Production build of shared, server (`server/dist`) and client (`client/dist`) |
| `npm run typecheck`               | Strict TypeScript checks for every workspace                                  |
| `npm run lint`                    | ESLint (type-aware, `any` and type assertions forbidden)                      |
| `npm run format` / `format:check` | Prettier                                                                      |
| `npm test`                        | Vitest in shared, server and client                                           |
| `npm run check:no-js`             | Fails if any JavaScript file exists (TypeScript-only project)                 |
| `npm run check`                   | The full gate: no-js + typecheck + lint + tests                               |

## Notes

- `shared` is compiled to `shared/dist` and consumed as the `@roman/shared` workspace package. Root scripts build it
  first automatically.
- If tests fail on Windows with "Cannot find native binding" (an npm optional-dependency bug), delete `node_modules`
  and `package-lock.json`, then run `npm install` again.
- Source material (`images/`, the MP3 and the CV) is intentionally not committed. Media is uploaded to Cloudinary by
  the seed script (Phase 4).
