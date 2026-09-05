'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface MobileChromeValue {
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
  /**
   * How many rows the current filters actually match. The filter sheet's
   * confirm button states the result rather than just saying "Done", so you can
   * tell you have filtered yourself down to nothing before closing the sheet.
   * Only the table view knows this, so it reports it up.
   */
  resultCount: number | null;
  setResultCount: (count: number | null) => void;
}

const MobileChromeContext = createContext<MobileChromeValue | null>(null);

/**
 * The filter button lives in the page header and the filter sheet lives in the
 * app shell, so the open state has to sit above both. Small enough that a
 * context beats threading props through every page.
 */
export function MobileChromeProvider({ children }: { children: React.ReactNode }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const value = useMemo(
    () => ({ filtersOpen, setFiltersOpen, resultCount, setResultCount }),
    [filtersOpen, resultCount],
  );

  return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
}

export function useMobileChrome(): MobileChromeValue {
  const value = useContext(MobileChromeContext);
  if (!value) throw new Error('useMobileChrome must be used inside MobileChromeProvider');
  return value;
}
