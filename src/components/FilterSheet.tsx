'use client';

import { BottomSheet } from './BottomSheet';
import { FilterControls, useFilters, type PersonOption } from './FilterSidebar';
import { useMobileChrome } from './MobileChrome';

interface Props {
  people: PersonOption[];
  sources: string[];
}

/**
 * The 268px sidebar, restated as a sheet. Filters still write straight to the
 * URL as you tap, so the sheet has nothing to "apply" — the confirm button just
 * dismisses it, and says what you are going back to so an over-narrowed filter
 * is obvious before you close it.
 */
export function FilterSheet({ people, sources }: Props) {
  const { filtersOpen, setFiltersOpen, resultCount } = useMobileChrome();
  const { activeCount, clearAll } = useFilters();

  if (!filtersOpen) return null;

  const close = () => setFiltersOpen(false);

  const confirmLabel =
    resultCount === null
      ? 'Done'
      : activeCount === 0
        ? `Show all ${resultCount}`
        : `Show ${resultCount} ${resultCount === 1 ? 'role' : 'roles'}`;

  return (
    <BottomSheet label="Filters" onClose={close} maxHeight="max-h-[88%]">
      <div className="flex flex-none items-center justify-between gap-3 border-b border-line2 px-5 pb-3.5 pt-4">
        <h2 className="font-serif text-[21px]">Filters</h2>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="text-[13px] text-[color:var(--accent)]">
            Clear {activeCount}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pb-5 pt-4">
        <FilterControls people={people} sources={sources} size="roomy" />
      </div>

      <div className="flex-none border-t border-line2 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={close}
          className="w-full rounded-[12px] px-4 py-3.5 text-[15px] font-medium text-surface"
          style={{ background: 'var(--accent)' }}
        >
          {confirmLabel}
        </button>
      </div>
    </BottomSheet>
  );
}
