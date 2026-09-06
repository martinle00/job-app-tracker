# Job Application Tracker

Tracks job applications across several people, as a sortable table and as a
funnel showing where applications drop out. The data mirrors a Google Sheet,
which stays the source of truth. The app can sync directly from a private
Google Sheet, or import a CSV export manually.

Next.js 15 (App Router) · Prisma · Tailwind · Postgres (Supabase)

## Getting started

```bash
npm install
cp .env.example .env          # then fill in APP_DATABASE_URL and APP_DIRECT_URL
npx prisma migrate deploy     # apply migrations to your database
npm run db:seed               # load the anonymised sample fixture
npm run dev
```

Both connection strings are required. `APP_DATABASE_URL` is the transaction-mode
pooler (port 6543) the app uses at runtime and **must** carry `?pgbouncer=true`;
`APP_DIRECT_URL` is the session-mode pooler (port 5432) that migrations need. In
Supabase both are under **Connect → ORMs → Prisma**.

They carry the `APP_` prefix to stay clearly distinct from the dozen
`POSTGRES_*` and `SUPABASE_*` variables Vercel's Supabase integration injects,
none of which this app reads.

The username in both must be the tenant-qualified `postgres.[ref]`. A bare
`postgres` — which is what Supabase's *Direct connection* tab shows — cannot
authenticate against the pooler, and fails with "Authentication failed against
database server". On Vercel, avoid marking these **Sensitive**: sensitive values
cannot be read back, so a mistyped string can't be diagnosed afterwards.

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

### Automatic Google Sheets sync with Apps Script

An installable Apps Script trigger sends an authenticated HTTP notification to
the app on edits. The backend rereads the configured sheet and applies the
validated snapshot in one database transaction.

1. In Google Cloud, enable the **Google Sheets API**, create a service account,
   and create a JSON key for it. See Google's
   [service account setup](https://developers.google.com/identity/protocols/oauth2/service-account#creatinganaccount).
2. Share your spreadsheet with the key's `client_email` as a **Viewer**. The sheet
   can stay private. The app requests only the
   [Sheets read-only scope](https://developers.google.com/workspace/sheets/api/scopes).
3. Set these server environment variables in `.env` locally and in your hosting
   project's environment settings:

   | Variable | Value |
   |---|---|
   | `GOOGLE_SHEETS_ID` | The ID between `/d/` and `/edit` in the spreadsheet URL |
   | `GOOGLE_SHEETS_RANGE` | A tab and range including headers, e.g. `'Applications'!A:Z` |
   | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | The JSON key's `client_email` |
   | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | The JSON key's `private_key`; literal `\n` escapes are supported |
   | `GOOGLE_SHEETS_WEBHOOK_SECRET` | A strong random secret, also saved in Apps Script |

   Keep credentials out of source control. Restart the dev server or redeploy
   after setting the variables. No database migration is needed.

4. Deploy the app to a publicly reachable HTTPS URL. In your spreadsheet, open
   **Extensions > Apps Script** and paste [scripts/google-sheets-trigger.gs](scripts/google-sheets-trigger.gs).
5. Under **Project Settings > Script Properties**, add:

   | Property | Value |
   |---|---|
   | `TRACKER_WEBHOOK_URL` | `https://your-app.example/api/sheets/sync` (the final URL, without redirects) |
   | `TRACKER_WEBHOOK_SECRET` | The same value as `GOOGLE_SHEETS_WEBHOOK_SECRET` |

6. Run `installTrackerTriggers` once and authorize it. This installs edit,
   structural-change, and five-minute reconciliation triggers and performs the
   first sync. Have one owner install the triggers. Re-running setup replaces
   this integration's triggers for that owner only. No Apps Script web-app
   deployment is necessary.

Use an **installable** trigger: the simple `onEdit(e)` shown in many examples
cannot call services requiring authorization, including `UrlFetchApp`. See
[Google's trigger documentation](https://developers.google.com/apps-script/guides/triggers/installable).
The script sends a change signal, not cell values. The backend's service account
still needs Viewer access; webhook authorization and sheet-read authorization
are separate.

Edits and structural changes initiate a sync even when the app is closed.
Script/API edits do not fire these triggers, so the five-minute reconciliation
also catches those changes, formula recalculations, and failed deliveries.
The script retries transient failures three times and reports failures under
Apps Script **Executions**. A busy backend returns HTTP 409 so it is retried;
invalid sheet data returns 422 and leaves the previous snapshot intact.

An open browser checks database sync status every five seconds and refreshes
the application and funnel views after successful syncs. These checks do not
read Google Sheets. The status bar shows the last successful sync or an error.
Delivery depends on Google's trigger scheduling and request duration.

This is **one-way sync from Sheets to the app**. Make lasting application changes
in the sheet: app edits to managed rows are overwritten, and app-deleted rows
are restored on the next successful sync. Person aliases and colours set in
Settings are preserved. Rows match by person/company/role, so changing one of
those fields replaces the previous managed row. Deleting rows in the sheet
deletes only applications previously synced from that exact sheet and range;
unrelated app rows remain. Existing CSV imports with matching keys are adopted
on first sync. A sheet with valid headers and no data clears its managed rows;
a completely blank sheet is rejected. Duplicate keys and invalid rows reject
the whole snapshot. Keep the sheet's dates day-first, as described below.

Use a range covering the whole table, including future rows. Switching the sheet
ID or range starts separate tracking and retains rows belonging to the old
source. Clearing `GOOGLE_SHEETS_ID` disables syncing and retains the database.

To verify the connection, run `syncTracker` manually in Apps Script, then edit
a status cell and confirm that the app's sync timestamp and data update. Test
an added row and a removed row too. For local testing, Apps Script needs an
HTTPS tunnel to your dev server; it cannot reach `localhost` directly.

### Manual CSV import

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
| `src/app/actions.ts` | Server actions for app edits |
| `src/lib/google-sheet.ts` | Private Google Sheets reads and snapshot validation |
| `src/lib/sheet-sync.ts` | Transactional sync and source ownership tracking |
| `src/app/api/sheets/sync/route.ts` | Authenticated webhook and read-only browser status |
| `scripts/google-sheets-trigger.gs` | Installable edit/change triggers and reconciliation |
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

Deployed on Vercel. Set `APP_DATABASE_URL` and `APP_DIRECT_URL` in the project's
environment variables; `npm run build` already runs `prisma generate`. Schema
changes are applied by running `npx prisma migrate deploy` locally against the
production database, deliberately rather than during the build, so preview
deployments never mutate production schema.
