export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      {/* Soft brand wash — decorative only, sits behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-active/10 to-transparent"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-active text-lg font-bold text-white shadow-sm">
            M
          </span>
          <div className="space-y-1">
            <p className="text-base font-semibold tracking-tight text-ink">Medical Inventory</p>
            <p className="text-sm text-muted">Sign in to continue to your workspace</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
