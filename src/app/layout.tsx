import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import './globals.css';
import { NavLinks } from '@/components/NavLinks';

export const metadata: Metadata = {
  title: 'Job Application Tracker',
  description: 'Track job applications across people, as a table or a funnel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
            <Link href="/applications" className="text-base font-semibold tracking-tight">
              Job Application Tracker
            </Link>
            <Suspense fallback={null}>
              <NavLinks />
            </Suspense>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
