'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useFilters } from './FilterSidebar';
import { useMobileChrome } from './MobileChrome';

interface Props {
  title: string;
  scope: string;
  /** Right-hand action, e.g. the Add button. */
  action?: React.ReactNode;
  searchable?: boolean;
  /** Filters do not apply to Settings, so its header omits the control. */
  filterable?: boolean;
}

/**
 * The top of every view: what you are looking at, what set it describes, and
 * the controls that belong to the data rather than to the filters. Search
 * writes `q` into the URL like every other filter, so it survives a view
 * switch and a shared link.
 *
 * On a phone the search field would eat the row, so it collapses behind its
 * icon and expands over the title when tapped.
 */
export function PageHeader({ title, scope, action, searchable = true, filterable = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setFiltersOpen } = useMobileChrome();
  const { activeCount } = useFilters();

  // Keep the field in step when the URL changes from elsewhere (back button,
  // a clear-all, a link into the view).
  useEffect(() => setValue(urlQuery), [urlQuery]);

  // Typing should not push a history entry per keystroke.
  useEffect(() => {
    if (value === urlQuery) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      startTransition(() => router.replace(`?${next.toString()}`, { scroll: false }));
    }, 250);
    return () => clearTimeout(timer);
  }, [value, urlQuery, router, searchParams]);

  // A search box you have to tap twice is worse than no search box.
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const field = (
    <div className="relative flex flex-1 items-center md:flex-none">
      <span aria-hidden className="absolute left-3 text-[13px] text-[#b3a897]">
        ⌕
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (!value) setSearchOpen(false);
        }}
        placeholder="Search company, role, notes…"
        aria-label="Search applications"
        className="w-full rounded-[10px] border border-[#e5dcd0] bg-surface py-2 pl-7 pr-3 text-[14px] outline-none focus:border-[#cbbaa4] md:w-[232px] md:text-[13px]"
      />
    </div>
  );

  return (
    <header className="flex flex-none items-center gap-2 border-b border-[#ece3d7] px-4 pb-3.5 pt-4 md:gap-4 md:px-7 md:pb-4 md:pt-5">
      {/* Expanded mobile search takes the whole row rather than squeezing beside the title. */}
      {searchable && searchOpen ? (
        <div className="flex flex-1 items-center gap-2 md:hidden">
          {field}
          <button
            type="button"
            onClick={() => {
              setValue('');
              setSearchOpen(false);
            }}
            className="flex-none px-1 text-[13px] text-muted"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-none flex-col">
            <h1 className="truncate font-serif text-[22px] leading-[27px] tracking-[-0.01em] md:text-[25px] md:leading-[30px]">
              {title}
            </h1>
            <span className="truncate text-xs text-faint">{scope}</span>
          </div>

          <div className="flex-1" />

          {searchable && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-[#e5dcd0] bg-surface text-[15px] text-muted md:hidden"
              >
                ⌕
              </button>
              <div className="hidden md:flex">{field}</div>
            </>
          )}

          {filterable && (
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
              className="relative flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border border-[#e5dcd0] bg-surface text-[15px] text-muted md:hidden"
            >
              ≡
              {activeCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] text-surface"
                  style={{ background: 'var(--accent)' }}
                >
                  {activeCount}
                </span>
              )}
            </button>
          )}

          {action}
        </>
      )}
    </header>
  );
}
