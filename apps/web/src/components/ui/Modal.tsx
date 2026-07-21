import React from 'react';

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="max-w-lg rounded-lg bg-white p-6 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
