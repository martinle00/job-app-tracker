/**
 * Imports a CSV export of the job-application spreadsheet into the database.
 *
 *   npx tsx scripts/import-sheet.ts [path-to.csv]
 *
 * Defaults to data/applications.csv. Idempotent: rows are upserted on
 * (person, company, role, appliedDate), so re-running an export that has grown
 * a few rows adds only those rows.
 *
 * Exits non-zero if any row was skipped, so a mapping gap is impossible to miss.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { parseSheet } from './parse-sheet';

const DEFAULT_PATH = 'data/applications.csv';

async function main() {
  const path = resolve(process.cwd(), process.argv[2] ?? DEFAULT_PATH);

  let csvText: string;
  try {
    csvText = readFileSync(path, 'utf8');
  } catch {
    console.error(`Could not read ${path}`);
    console.error(
      'Export the Google Sheet as CSV and save it there, or pass a path: ' +
        'npx tsx scripts/import-sheet.ts path/to/export.csv',
    );
    process.exitCode = 1;
    return;
  }

  const result = parseSheet(csvText);

  if (result.missingColumns.length > 0) {
    console.error(`Cannot import ${path}: no column found for ${result.missingColumns.join(', ')}.`);
    console.error('Add the sheet\'s header names to COLUMN_ALIASES in scripts/column-map.ts.');
    process.exitCode = 1;
    return;
  }

  console.log(`Parsed ${path}`);
  console.log('Columns used:');
  for (const [field, header] of Object.entries(result.columns)) {
    console.log(`  ${field.padEnd(13)} <- "${header}"`);
  }

  const prisma = new PrismaClient();
  let created = 0;
  let updated = 0;

  try {
    for (const record of result.records) {
      const person = await prisma.person.upsert({
        where: { name: record.personName },
        update: { displayName: record.personDisplayName },
        create: { name: record.personName, displayName: record.personDisplayName },
      });

      // Keyed without the applied date on purpose: a shortlisted row gains one
      // when it is finally sent, and that has to update the row rather than
      // fork it into a second copy.
      const importKey = {
        personId: person.id,
        company: record.company,
        role: record.role,
      };

      const existing = await prisma.application.findUnique({ where: { importKey } });

      const data = {
        source: record.source ?? null,
        location: record.location ?? null,
        workType: record.workType ?? null,
        jobUrl: record.jobUrl ?? null,
        appliedDate: record.appliedDate ?? null,
        closingDate: record.closingDate ?? null,
        lastActivity: record.lastActivity ?? null,
        furthestStage: record.furthestStage,
        outcome: record.outcome,
        notes: record.notes ?? null,
      };

      if (existing) {
        await prisma.application.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.application.create({ data: { ...importKey, ...data } });
        created += 1;
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  const shortlisted = result.records.filter((r) => r.outcome === 'NOT_APPLIED').length;
  console.log(`\nImported ${result.records.length} rows (${created} created, ${updated} updated).`);
  if (shortlisted > 0) {
    console.log(`${shortlisted} of them are shortlisted roles not applied to yet.`);
  }

  if (result.errors.length > 0) {
    console.warn(`\nSkipped ${result.errors.length} rows:`);
    for (const error of result.errors.slice(0, 25)) {
      console.warn(`  row ${error.row}: ${error.reason}`);
    }
    if (result.errors.length > 25) {
      console.warn(`  ...and ${result.errors.length - 25} more`);
    }
  }

  if (result.unmappedStatuses.length > 0) {
    console.warn(
      '\nUnmapped values — add these to RESPONSE_MAP / STAGE_MAP / YES_NO_MAP in scripts/column-map.ts:',
    );
    for (const status of result.unmappedStatuses) console.warn(`  "${status}"`);
  }

  if (result.errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
