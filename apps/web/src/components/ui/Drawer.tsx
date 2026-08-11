'use client';
import React from 'react';
import { useDismissable } from '@/lib/useDismissable';
import { XIcon } from './icons';

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const panelRef = useDismissable<HTMLDivElement>(open, onClose);

  return (
    // overflow-hidden: the closed panel is translated off-screen and would
    // otherwise widen the page and add a horizontal scrollbar.
    <div className={`fixed inset-0 z-40 overflow-hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onMouseDown={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label={title}
        tabIndex={-1}
        className={`absolute inset-y-0 ltr:right-0 rtl:left-0 flex h-full w-full max-w-md flex-col
          border-line bg-surface shadow-drawer outline-none
          ltr:border-l rtl:border-r
          transition-transform duration-300 ease-smooth
          ${open ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'}`}
      >
        {title && (
          <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <XIcon />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
