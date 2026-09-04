'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const LINKS = [
  { href: '/applications', label: 'Table' },
  { href: '/sankey', label: 'Funnel' },
];

/**
 * Switching views carries the current filters across, so the table and the
 * chart always describe the same set of applications.
 */
export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={query ? `${link.href}?${query}` : link.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
