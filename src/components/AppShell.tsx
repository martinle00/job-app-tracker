'use client';

import { useState } from 'react';
import { FilterSheet } from './FilterSheet';
import { FilterSidebar, type PersonOption } from './FilterSidebar';
import { MobileChromeProvider } from './MobileChrome';
import { MobileTabBar } from './MobileTabBar';
import { NavLinks } from './NavLinks';

interface Props {
  people: PersonOption[];
  sources: string[];
  children: React.ReactNode;
}

/**
 * Two shells in one, split at `md` (768px).
 *
 * Desktop keeps the collapsible sidebar: filters at the side so the top of the
 * screen belongs to the data. Below `md` there is no room for a 268px rail, so
 * navigation moves to a bottom bar and filters to a sheet raised from the
 * header — the same controls and the same URL contract, different chrome.
 *
 * Collapse state stays local: it is a viewing preference, not part of the
 * shareable filter URL.
 */
export function AppShell({ people, sources, children }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <MobileChromeProvider>
      <div className="flex h-[100dvh] overflow-hidden">
        <aside
          className="hidden flex-none overflow-hidden border-r border-line bg-[#fdfaf5] transition-[width] duration-200 md:block"
          style={{ width: open ? 268 : 0 }}
        >
          <div className="flex h-full w-[268px] flex-col">
            <div className="flex items-start justify-between gap-2 px-5 pb-4 pt-5">
              <div className="flex flex-col gap-0.5">
                <span className="font-serif text-[19px] leading-6">Application Tracker</span>
                <span className="text-[11px] uppercase tracking-[0.06em] text-faint">
                  {people.length} {people.length === 1 ? 'person' : 'people'} ·{' '}
                  {people.reduce((total, person) => total + person.count, 0)} roles
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Hide filters"
                className="h-7 w-7 flex-none rounded-lg border border-line bg-surface text-[13px] leading-none text-muted hover:border-[#d8ccbc] hover:text-ink"
              >
                ‹
              </button>
            </div>

            <NavLinks />
            <FilterSidebar people={people} sources={sources} />
          </div>
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          {!open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute left-5 top-5 z-10 hidden rounded-[9px] border border-[#e5dcd0] bg-surface px-2.5 py-1.5 text-[13px] text-ink2 md:block"
            >
              Filters
            </button>
          )}

          {/* Capped so the phone layout also holds up in a narrow desktop window. */}
          <div className="mx-auto flex w-full max-w-[520px] min-w-0 flex-1 flex-col overflow-hidden md:max-w-none">
            {children}
          </div>

          <MobileTabBar />
        </div>

        <FilterSheet people={people} sources={sources} />
      </div>
    </MobileChromeProvider>
  );
}
