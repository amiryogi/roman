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

| Script                            | Description                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`                     | Builds `shared`, then runs shared (watch), API and client together                      |
| `npm run build`                   | Production build of shared, server (`server/dist`) and client (`client/dist`)           |
| `npm run typecheck`               | Strict TypeScript checks for every workspace                                            |
| `npm run lint`                    | ESLint (type-aware, `any` and type assertions forbidden)                                |
| `npm run format` / `format:check` | Prettier                                                                                |
| `npm test`                        | Vitest in shared, server and client                                                     |
| `npm run check:no-js`             | Fails if any JavaScript file exists (TypeScript-only project)                           |
| `npm run check`                   | The full gate: no-js + lockfile + client-secrets + typecheck + lint + format + tests    |
| `npm run seed:admin -- --email …` | Creates the single admin (password from `ADMIN_SEED_PASSWORD` or a prompt)              |
| `npm run seed:content`            | Uploads the source photos and MP3 to Cloudinary and creates the initial (draft) content |
| `npm run cleanup:media`           | Lists Cloudinary assets no content uses (`-- --apply` deletes them)                     |
| `npm run test:cloudinary`         | Opt-in smoke test against the real Cloudinary account (development folder only)         |

## Notes

- `shared` is compiled to `shared/dist` and consumed as the `@roman/shared` workspace package. Root scripts build it
  first automatically.
- If tests fail on Windows with "Cannot find native binding" (an npm optional-dependency bug), delete `node_modules`
  and `package-lock.json`, then run `npm install` again.
- Admin sign-in is at `/admin/login`. Create the account first:
  `npm run seed:admin -- --email you@example.com --name "Your Name"`. Add `--reset` to set a new password.
- Source material (`images/`, the MP3 and the CV) is intentionally not committed. `npm run seed:content` uploads it to
  Cloudinary (removing Exif/GPS data from JPEGs first) and creates the profile from the CV, gallery images as drafts and
  a draft track. It is safe to re-run and never overwrites an edited profile.

## Media (Cloudinary)

- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `server/.env`, and
  `VITE_CLOUDINARY_CLOUD_NAME` in `client/.env`. The key and secret stay on the server: never give them a `VITE_` prefix.
- Each environment uses its own root folder (`CLOUDINARY_ROOT_FOLDER`, e.g. `roman-budhathoki/development`).
- Uploads go from the browser straight to Cloudinary with a short-lived signature from
  `POST /api/admin/uploads/signature`; the server then verifies each upload before storing it.
- Tests use `MEDIA_DRIVER=fake` and never contact Cloudinary. Run `npm run test:cloudinary` before a release.
- `/admin/media-test` is a temporary page for trying uploads until the content editors exist (Phases 6–7).
