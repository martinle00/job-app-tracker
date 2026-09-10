import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSheetSyncStatus, syncGoogleSheet } from '@/lib/sheet-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'no-store' };

async function runSync() {
  try {
    const result = await syncGoogleSheet();
    const status = !result.configured ? 503 : 'busy' in result && result.busy ? 409 : result.error ? 422 : 200;
    return NextResponse.json(result, { status, headers });
  } catch {
    return NextResponse.json({ error: 'Sync failed. Check the server environment and database connection. Your last successful data is retained.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.GOOGLE_SHEETS_WEBHOOK_SECRET;
  const received = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  }
  return runSync();
}

/** Browser polling reads database status only; it never calls Google Sheets. */
export async function GET() {
  try {
    return NextResponse.json(await getSheetSyncStatus(), { headers });
  } catch {
    return NextResponse.json({ error: 'Sync status unavailable. Check the server configuration.' }, { status: 503, headers });
  }
}
