import { GoogleAuth } from 'google-auth-library';
import Papa from 'papaparse';
import { parseSheet } from '../../scripts/parse-sheet';

export function getSheetConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!spreadsheetId) return null;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const range = process.env.GOOGLE_SHEETS_RANGE?.trim();
  if (!email || !privateKey || !range) {
    throw new Error('Complete the Google Sheets environment variables to enable syncing.');
  }
  return { spreadsheetId, range, email, privateKey };
}

/** Validate the entire snapshot before permitting any database changes. */
export function parseSheetValues(values: string[][]) {
  if (!Array.isArray(values) || !values.length ||
      values.some((row) => !Array.isArray(row) || row.some((cell) => typeof cell !== 'string'))) {
    throw new Error('The sheet returned no header row or an invalid response.');
  }
  const headers = values[0];
  if (new Set(headers.map((header) => header.trim())).size !== headers.length) {
    throw new Error('The sheet has duplicate column headers.');
  }
  if (values.some((row) => row.length > headers.length)) {
    throw new Error('The sheet has data in columns without headers.');
  }
  const rectangular = values.map((row) => headers.map((_, i) => row[i] ?? ''));
  const result = parseSheet(Papa.unparse(rectangular));
  if (result.missingColumns.length) {
    throw new Error(`Missing sheet columns: ${result.missingColumns.join(', ')}.`);
  }
  if (result.errors.length) {
    throw new Error(`Fix invalid sheet rows before syncing: ${result.errors.slice(0, 10).map((e) => e.row).join(', ')}. Check dates and status values against the README.`);
  }
  const keys = result.records.map((r) => JSON.stringify([r.personName, r.company, r.role]));
  if (new Set(keys).size !== keys.length) {
    throw new Error('The sheet has duplicate person/company/role rows.');
  }
  return result.records;
}

export async function readGoogleSheet(config: NonNullable<ReturnType<typeof getSheetConfig>>) {
  const auth = new GoogleAuth({
    credentials: { client_email: config.email, private_key: config.privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  try {
    const client = await auth.getClient();
    const response = await client.request<{ values?: string[][] }>({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/${encodeURIComponent(config.range)}`,
      params: { valueRenderOption: 'FORMATTED_VALUE', majorDimension: 'ROWS' },
      timeout: 15000,
      retry: false,
    });
    return response.data.values ?? [];
  } catch {
    // Google errors can contain request headers and credentials; never expose them.
    throw new Error('Could not read Google Sheets. Check credentials, sheet sharing, ID, range, and that the Sheets API is enabled.');
  }
}
