'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

interface Props {
  title: string;
  scope: string;
  /** Right-hand action, e.g. the Add button. */
  action?: React.ReactNode;
  searchable?: boolean;
}

/**
 * The top of every view: what you are looking at, what set it describes, and
 * the two controls that belong to the data rather than to the filters. Search
 * writes `q` into the URL like every other filter, so it survives a view
 * switch and a shared link.
 */
export function PageHeader({ title, scope, action, searchable = true }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const urlQuery = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);

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

  return (
    <header className="flex flex-none items-center gap-4 border-b border-[#ece3d7] px-7 pb-4 pt-5">
      <div className="flex flex-none flex-col">
        <h1 className="font-serif text-[25px] leading-[30px] tracking-[-0.01em]">{title}</h1>
        <span className="text-xs text-faint">{scope}</span>
      </div>
      <div className="flex-1" />
      {searchable && (
        <div className="relative flex items-center">
          <span aria-hidden className="absolute left-3 text-[13px] text-[#b3a897]">
            ⌕
          </span>
          <input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Search company, role, notes…"
            aria-label="Search applications"
            className="w-[232px] rounded-[10px] border border-[#e5dcd0] bg-surface py-2 pl-7 pr-3 text-[13px] outline-none focus:border-[#cbbaa4]"
          />
        </div>
      )}
      {action}
    </header>
  );
}
