import React from 'react';

/** Shared chrome for the login / forgot-password / reset-password forms. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in rounded-xl border border-line bg-surface p-8 shadow-card">
      <div className="mb-6 space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      {children}
      {footer && <div className="mt-6 border-t border-line pt-4 text-center text-sm">{footer}</div>}
    </div>
  );
}
