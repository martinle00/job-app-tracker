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

The importer expects the tracking sheet's own columns:

| Sheet column | Used as |
|---|---|
| Person | who applied |
| Company, Role Title | the application |
| Application Date | when it was sent; blank means not sent yet |
| Closing Date | when applications close |
| Response, Stage, Offer, Accepted | the four funnel columns |

The import is **idempotent** — rows are upserted on `(person, company, role)`, which is one row
per role, the same as the sheet. The applied date is deliberately *not* part of that key: a
shortlisted row gains one when it is finally sent, and re-importing must update that row rather
than fork it into a second copy.

Dates are read **day-first** (`29/8/2026` is 29 August), matching how the sheet is written.

`data/*.csv` is gitignored, because a real export is personal job-search data.

### When the import reports skipped rows

The importer never guesses. If it cannot map a row it reports it and exits non-zero:

```
Skipped 1 rows:
  row 12: Unmapped funnel values: Response=Coffee chat

Unmapped values — add these to RESPONSE_MAP / STAGE_MAP / YES_NO_MAP in scripts/column-map.ts:
  "Response=Coffee chat"
```

Everything that knows about the sheet's shape lives in [`scripts/column-map.ts`](scripts/column-map.ts):

- `COLUMN_ALIASES` — which sheet headers feed which field. Add your header text here if a column
  is reported missing.
- `RESPONSE_MAP`, `STAGE_MAP`, `YES_NO_MAP` — the dropdown values each funnel column accepts.
  **Add new dropdown options here as you add them to the sheet.**

`resolveStageAndOutcome` reads all four funnel columns together and takes the furthest evidence:
an `Offer` of Yes proves the Offer rung whatever `Stage` says, and `Accepted` settles the
outcome. `Response: Not yet applied` short-circuits everything — a shortlisted row is held at the
start of the funnel and later columns cannot promote it.

## How the funnel is derived

Each application stores one `furthestStage` and one `outcome`, derived from the sheet's four
funnel columns. `STAGES` in [`src/lib/stages.ts`](src/lib/stages.ts) is an **ordered ladder**
matching them:

```
Applied → Response → Interview → Offer
```

An application that reached a stage is taken to have passed through every stage before it. So
[`buildSankey`](src/lib/sankey.ts) gives each application exactly one path: up the ladder to its
furthest stage, then sideways into its outcome node (`Active`, `Rejected`, `Withdrew`,
`Declined offer`, `Accepted`). Inflow equals outflow at every stage node, so the ribbon widths
are real counts.

**Roles you have not applied to yet are held out of the funnel.** They are real rows — they have
a closing date to work towards and they show in the table — but nothing has flowed through the
funnel yet, so counting them as applications would overstate the top and drag every conversion
rate down. The funnel reports them as a separate "Not yet applied" figure.

That is what lets a flat spreadsheet drive a Sankey without a per-application event log. The
tradeoff: the chart cannot show a path that skipped a stage, or an application that went
backwards.

**Changing the ladder.** Appending a stage is a code change plus a migration. Inserting one in
the middle changes the meaning of already-stored rows — remap existing data in the same
migration. `src/lib/chart-colors.ts` carries one colour per rung and needs a matching step.

Every interview round currently collapses into the single `Interview` rung, so the funnel shows
how many people got to an interview but not how many rounds they survived. Splitting `1st
Face-to-face` / `2nd` / `Final` into their own rungs is an edit to `STAGES` plus `STAGE_MAP`.

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
