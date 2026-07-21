import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
        active: '#2563eb',
      },
    },
  },
  plugins: [],
} satisfies Config;
