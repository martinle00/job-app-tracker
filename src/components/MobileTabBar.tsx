'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LINKS } from './NavLinks';

/**
 * The sidebar's nav, restated as a bottom bar for one thumb. Plain text labels
 * rather than invented icons: three destinations do not need a pictographic
 * language, and a wrong icon costs more than a word.
 *
 * Carries the filter query across exactly like the sidebar does, so switching
 * views on a phone never silently widens the set you are looking at.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <nav
      aria-label="Views"
      className="flex flex-none items-stretch gap-1 border-t border-line bg-surface px-3 pb-[env(safe-area-inset-bottom)] pt-2 md:hidden"
    >
      {LINKS.map((link) => {
        const active = pathname === link.href;
        const href = query && !link.dropQuery ? `${link.href}?${query}` : link.href;
        return (
          <Link
            key={link.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 items-center justify-center rounded-[10px] px-3 py-2.5 text-[14px] ${
              active ? 'bg-[#f0e6d8] font-medium text-ink' : 'text-[#7d7469]'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
