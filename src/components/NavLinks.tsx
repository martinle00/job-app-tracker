'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const LINKS = [
  { href: '/applications', label: 'Table' },
  { href: '/sankey', label: 'Funnel' },
  // Settings is not a view of the data, so it deliberately drops the filters.
  { href: '/settings', label: 'Settings', dropQuery: true },
];

/**
 * Switching between the data views carries the current filters across, so the
 * table and the chart always describe the same set of applications.
 */
export function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav className="flex flex-col gap-0.5 px-3 pb-4">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const href = query && !link.dropQuery ? `${link.href}?${query}` : link.href;
        return (
          <Link
            key={link.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-[10px] bg-[#f0e6d8] px-3 py-2.5 text-sm font-medium text-ink'
                : 'rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#7d7469] hover:bg-[#f6efe5]'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
