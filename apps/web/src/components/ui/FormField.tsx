'use client';
import React, { useId } from 'react';

/**
 * Wires label/error to the control via ids so screen readers announce both.
 * The child input receives id, aria-invalid and aria-describedby by cloning —
 * callers keep writing plain `<input {...register(...)} />`.
 */
export function FormField({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children, {
    id: children.props.id ?? id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    className: `${children.props.className ?? 'field'}${error ? ' field-invalid' : ''}`,
  });

  return (
    <div className="space-y-1.5">
      <label htmlFor={children.props.id ?? id} className="block text-sm font-medium text-ink">
        {label}
        {required && <span className="ltr:ml-0.5 rtl:mr-0.5 text-danger">*</span>}
      </label>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
