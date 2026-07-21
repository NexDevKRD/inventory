import React from 'react';

export function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute inset-y-0 rtl:left-0 ltr:right-0 h-full w-full max-w-md bg-white p-6 shadow-xl transition-transform dark:bg-gray-900 ${open ? 'translate-x-0' : 'rtl:-translate-x-full ltr:translate-x-full'}`}>
        {children}
      </div>
    </div>
  );
}
