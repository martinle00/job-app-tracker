import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AppShell } from '@/components/AppShell';
import { getAccent } from '@/lib/settings';
import { getFilterOptions } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Job Application Tracker',
  description: 'Track job applications across people, as a table or a funnel.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The accent is a stored setting rather than a class, so one CSS variable
  // repaints every button, link and active nav item.
  const [accent, options] = await Promise.all([getAccent(), getFilterOptions()]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=DM+Sans:wght@400;500;700&family=DM+Mono:wght@400;500&display=swap"
        />
      </head>
      <body
        className="min-h-screen bg-paper font-sans text-ink antialiased"
        style={{ '--accent': accent } as React.CSSProperties}
      >
        <Suspense fallback={null}>
          <AppShell people={options.people} sources={options.sources}>
            {children}
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}
