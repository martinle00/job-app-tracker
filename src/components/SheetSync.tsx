'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function SheetSync() {
  const router = useRouter();
  const lastSync = useRef<string | null>(null);
  const [status, setStatus] = useState('Connecting to Google Sheets…');

  useEffect(() => {
    let stopped = false;
    let running = false;
    const controller = new AbortController();
    async function check() {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const response = await fetch('/api/sheets/sync', { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (stopped) return;
        if (!response.ok || result.error) {
          setStatus(result.error || 'Google Sheets sync failed; check Apps Script executions.');
        } else if (!result.configured) {
          setStatus('Google Sheets is not configured.');
        } else {
          setStatus(result.syncedAt ? `Google Sheets · Last synced ${new Date(result.syncedAt).toLocaleTimeString()} · Edit applications in the sheet` : 'Google Sheets · Waiting for the first Apps Script sync…');
          if (result.syncedAt && result.syncedAt !== lastSync.current) {
            lastSync.current = result.syncedAt;
            router.refresh();
          }
        }
      } catch {
        if (!stopped) setStatus('Google Sheets unavailable; retrying automatically.');
      } finally {
        running = false;
      }
    }
    void check();
    const timer = setInterval(() => void check(), 5_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      stopped = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [router]);

  return <div role="status" className="border-b border-line bg-surface px-4 py-2 text-xs text-muted">{status}</div>;
}
