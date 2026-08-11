import React from 'react';

// Inline 24px stroke icons — avoids pulling an icon library for the handful we need.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

type P = { className?: string };
const cls = (c?: string) => c ?? 'h-5 w-5';

export const SunIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export const BellIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const LogOutIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  </svg>
);

export const PlusIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const InboxIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" />
  </svg>
);

export const AlertIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v5M12 16h.01" />
  </svg>
);

export const XIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const GlobeIcon = ({ className }: P) => (
  <svg {...base} className={cls(className)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" />
  </svg>
);
