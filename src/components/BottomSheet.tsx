'use client';

import { useEffect } from 'react';

interface Props {
  label: string;
  onClose: () => void;
  /** Tailwind max-height for the panel. Detail peeks; filters can go taller. */
  maxHeight?: string;
  children: React.ReactNode;
}

/**
 * A sheet raised from the bottom edge over a dimmed page. Used for filters and
 * for the row detail, both of which are a look at something rather than a move
 * to somewhere else — keeping the list dimly visible behind says so.
 *
 * Mobile only; the desktop equivalents are the sidebar and the side drawer.
 */
export function BottomSheet({ label, onClose, maxHeight = 'max-h-[76%]', children }: Props) {
  // A sheet that scrolls the page behind it feels broken, and on iOS the page
  // keeps its scroll position when the sheet closes only if we restore it.
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-ink/[0.28]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute inset-x-0 bottom-0 flex ${maxHeight} flex-col rounded-t-[20px] border-t border-line bg-surface shadow-[0_-14px_40px_rgba(60,45,30,0.16)]`}
      >
        {children}
      </div>
    </div>
  );
}
