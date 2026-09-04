# Redesign patch for job-app-tracker

The UI redesign from the design session, written as real source for this app:
Next.js App Router + Tailwind + Prisma, following the conventions already in the
repo (URL-driven filters, server actions, `src/lib/stages.ts` as the single
source of truth for the vocabulary).

Paths mirror the repo, so applying it is a copy over the top:

```bash
cp -R codebase-patch/src        job-app-tracker/
cp -R codebase-patch/prisma     job-app-tracker/
cp    codebase-patch/tailwind.config.ts job-app-tracker/
cd job-app-tracker
npx prisma migrate dev          # picks up the new migration
npm run typecheck && npm run test && npm run dev
```

Nothing new to install — it uses the deps already in `package.json`
(`@nivo/sankey`, `@tanstack/react-table`, `zod`).

## What changed

| File | Change |
|---|---|
| `tailwind.config.ts` | Warm palette + type scale as named theme tokens. |
| `src/app/globals.css` | Font faces, `--accent` variable, Sankey label halo. |
| `src/app/layout.tsx` | Two-pane shell; reads the stored accent into `--accent`. |
| `src/components/AppShell.tsx` | **New.** Collapsible sidebar that holds nav + filters. |
| `src/components/FilterSidebar.tsx` | **Replaces `FilterBar.tsx`** — same URL contract, sidebar layout. Delete `FilterBar.tsx`. |
| `src/components/NavLinks.tsx` | Table / Funnel / Settings. Settings drops the filter query. |
| `src/components/PageHeader.tsx` | **New.** Title, scope, URL-backed search (debounced), action slot. |
| `src/components/ApplicationTable.tsx` | Five columns + closing-date urgency chip, progress track, quick-advance; row click opens the drawer. |
| `src/components/ApplicationDrawer.tsx` | **New.** The dropped columns, activity list, advance/edit. |
| `src/components/ApplicationsView.tsx` | Owns drawer + dialog + header action. |
| `src/components/ApplicationForm.tsx` | Light dialog: six fields, the rest behind a disclosure. |
| `src/components/SankeyChart.tsx` | Warm ramp, node click drills into the table, conversion in the tooltip. |
| `src/components/StatusBadge.tsx` | Warm status tones. |
| `src/components/SettingsView.tsx` | **New.** Alias, dot colour, accent. |
| `src/app/settings/page.tsx` | **New.** |
| `src/app/applications/page.tsx` | Triage tiles (live / no reply in 14 days / closing this week / offers). |
| `src/app/sankey/page.tsx` | Re-toned tiles, legend and copy. |
| `src/lib/urgency.ts` | **New.** Closing-date urgency + UTC-safe day formatting. |
| `src/lib/settings.ts` | **New.** Accent get/set, validated against the offered list. |
| `src/lib/chart-colors.ts` | Clay ordinal ramp; person + accent choice lists. |
| `src/lib/queries.ts` | Person `color` on every row and filter option. |
| `src/app/actions.ts` | `advanceStage`, `updatePerson`, `updateAccent`. |
| `prisma/schema.prisma` + migration | `Person.color`, `Setting` key/value table. |

## Decisions worth knowing

- **`advanceStage` never touches the outcome.** Reaching a rung is not an
  ending; endings stay an explicit choice in the form. It stamps
  `lastActivity`, which is what makes a row stop reading as stale.
- **Renaming a person only writes `displayName`.** The normalised `name` is the
  identity and part of the import key, so a rename cannot fork rows or break a
  re-import.
- **The activity list does not invent dates.** The schema stores one
  `furthestStage`, not an event log, so passed rungs are listed as "reached"
  and only `appliedDate` / `lastActivity` / `closingDate` carry dates. If you
  want a dated timeline, that needs an `ApplicationEvent` table — say so and
  it's a small follow-up.
- **The accent is a shared setting, not per-user**, matching the app's "no
  accounts, everyone sees everything" model. "Which person am I" is the one
  genuinely local preference, so it lives in `localStorage`.
- **Files to delete after applying:** `src/components/FilterBar.tsx`.
- **Tests:** `test/filters.test.ts`, `sankey.test.ts` and `parse-sheet.test.ts`
  are untouched and should still pass — none of the lib contracts changed.
