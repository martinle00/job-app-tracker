# Job Application Tracker

Tracks job applications across several people, as a sortable table and as a
funnel showing where applications drop out. The data mirrors a Google Sheet,
which stays the source of truth — the app reads a CSV export of it.

Next.js 15 (App Router) · Prisma · Tailwind · Postgres (Supabase)

## Getting started

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL and DIRECT_URL
npx prisma migrate deploy     # apply migrations to your database
npm run db:seed               # load the anonymised sample fixture
npm run dev
```

Both connection strings are required. `DATABASE_URL` is the transaction-mode
pooler (port 6543) the app uses at runtime and **must** carry `?pgbouncer=true`;
`DIRECT_URL` is the session-mode pooler (port 5432) that migrations need. In
Supabase both are under **Connect → ORMs → Prisma**.

Then open http://localhost:3000.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` then a production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest suite |
| `npm run import -- <path>` | Import a CSV export of the sheet |
| `npm run db:seed` | Import the sample fixture |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:reset` | Drop and recreate the database |

## Importing from the sheet

Export the sheet as CSV, then:

```bash
npm run import -- data/job_app.csv
```

The importer is idempotent. It keys rows on `(person, company, role)` and
deliberately excludes the applied date, so a shortlisted role that later gets
sent updates in place rather than forking into a duplicate. Re-running it after
the sheet grows a few rows adds only those rows.

It never guesses. A `Response`, `Stage`, `Offer` or `Accepted` value it does not
recognise is reported and the row is skipped, and the script exits non-zero so a
mapping gap can't pass unnoticed. When that happens, add the new value to
`RESPONSE_MAP`, `STAGE_MAP` or `YES_NO_MAP` in `scripts/column-map.ts`.

Real exports are gitignored (`data/*.csv`) — they contain personal data. The
fixture in `test/fixtures/sample.csv` is anonymised and committed deliberately.

## How it's put together

| Path | Role |
|---|---|
| `src/lib/stages.ts` | Single source of truth for the stage and outcome vocabulary |
| `src/lib/validation.ts` | Zod schemas every write path goes through |
| `src/lib/filters.ts` | Filter state, parsed from and written to the URL |
| `src/lib/queries.ts` | Read queries; serialises dates at the client boundary |
| `src/app/actions.ts` | Server actions — the only writers |
| `scripts/column-map.ts` | Everything that knows the shape of the exported sheet |

Two conventions worth knowing before changing things:

- **Filter state lives in the URL**, so the table and the funnel always agree and
  a filtered view is a shareable link. `FilterSidebar` is the only component that
  writes it.
- **Stage and outcome are plain strings**, not database enums. Their permitted
  values are enforced by Zod rather than the database, so validation belongs in
  `src/lib/validation.ts` and the sheet's vocabulary can grow without a
  migration.

## Dates

The sheet is written day-first (`29/8/2026` is 29 August). The parser reads it
that way, and dates are stored at UTC midnight and formatted in UTC, so a bare
`08/04/2025` is 8 April and never drifts by a day across timezones.

## Deployment

There is no authentication. Anyone who can reach the app can read, edit and
delete every row — worth knowing before putting it anywhere public.

Deployed on Vercel. Set `DATABASE_URL` and `DIRECT_URL` in the project's
environment variables; `npm run build` already runs `prisma generate`. Schema
changes are applied by running `npx prisma migrate deploy` locally against the
production database, deliberately rather than during the build, so preview
deployments never mutate production schema.
