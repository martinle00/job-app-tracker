# Job Application Tracker

Track job applications across several people and read them two ways:

- **Table** (`/applications`) — every application, sortable, searchable, editable.
- **Funnel** (`/sankey`) — a Sankey diagram of the whole pipeline, collated across everyone or
  filtered down to specific people.

Both views read the same filters out of the URL, so they always describe the same set of
applications and a filtered view is a shareable link.

Next.js (App Router) + Prisma + SQLite. No accounts: the person who applied is a field on each
application, and everyone sees everything.

## Getting started

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npx prisma migrate dev        # create the database
npm run db:seed               # optional: load the sample fixture
npm run dev                   # http://localhost:3000
```

## Importing the spreadsheet

Export the Google Sheet as CSV, save it to `data/applications.csv`, then:

```bash
npm run import                        # or: npx tsx scripts/import-sheet.ts path/to/export.csv
```

The import is **idempotent** — rows are upserted on `(person, company, role, applied date)`, so
re-running a grown export only adds what is new.

`data/*.csv` is gitignored, because a real export is personal job-search data.

### When the import reports skipped rows

The importer never guesses. If it cannot map a row it reports it and exits non-zero:

```
Skipped 3 rows:
  row 12: Unmapped status: "Coffee chat"

Unmapped status values — add these to STATUS_MAP in scripts/column-map.ts:
  "Coffee chat"
```

Everything that knows about the sheet's shape lives in [`scripts/column-map.ts`](scripts/column-map.ts):

- `COLUMN_ALIASES` — which sheet headers feed which field. Add your header text here if a column
  is reported missing.
- `STATUS_MAP` — how free-text status wording becomes a (stage, outcome) pair. Add wording here
  if a status is reported unmapped.

The importer handles either a single free-text status column, or separate stage and outcome
columns if the sheet has them.

## How the funnel is derived

Each application stores one `furthestStage` and one `outcome`. `STAGES` in
[`src/lib/stages.ts`](src/lib/stages.ts) is an **ordered ladder**:

```
Applied → Recruiter screen → Interview → Final round → Offer
```

An application that reached a stage is taken to have passed through every stage before it. So
[`buildSankey`](src/lib/sankey.ts) gives each application exactly one path: up the ladder to its
furthest stage, then sideways into its outcome node (`Active`, `Rejected`, `No response`,
`Withdrew`, `Declined offer`, `Accepted`). Inflow equals outflow at every stage node, so the
ribbon widths are real counts.

That is what lets a flat spreadsheet drive a Sankey without a per-application event log. The
tradeoff: the chart cannot show a path that skipped a stage, or an application that went
backwards.

**Changing the ladder.** Appending a stage is a code change plus a migration. Inserting one in
the middle changes the meaning of already-stored rows — remap existing data in the same
migration. `src/lib/chart-colors.ts` carries one colour per rung and needs a matching step.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run test` | Vitest — funnel derivation, sheet parsing, filters |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run import` | Import `data/applications.csv` |
| `npm run db:seed` | Import the sample fixture |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:reset` | Drop and rebuild the database |

## Layout

```
prisma/schema.prisma          Person, Application
src/lib/stages.ts             the stage ladder and outcome vocabulary
src/lib/sankey.ts             pure buildSankey(apps) -> { nodes, links }
src/lib/filters.ts            URL search params <-> Prisma where clause
src/lib/validation.ts         Zod schemas shared by the form and the importer
src/lib/chart-colors.ts       funnel palette, with the reasoning behind it
src/app/applications/page.tsx table view
src/app/sankey/page.tsx       funnel view
src/app/actions.ts            create / update / delete
scripts/column-map.ts         sheet-specific column and status mapping
scripts/parse-sheet.ts        pure CSV -> records
scripts/import-sheet.ts       records -> database
```

`src/lib/stages.ts` is the single source of truth for the vocabulary; every write path validates
against it through `src/lib/validation.ts`, so an unknown stage or outcome cannot reach the
database.
