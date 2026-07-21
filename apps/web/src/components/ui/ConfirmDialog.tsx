import React from 'react';
import { Modal } from './Modal';

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: { open: boolean; title: string; description?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 text-sm text-gray-600">{description}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded border px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={onConfirm} className="rounded bg-danger px-3 py-1.5 text-sm text-white">Confirm</button>
      </div>
    </Modal>
  );
}
