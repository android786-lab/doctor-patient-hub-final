/** @type {import('tailwindcss').Config} */
/** Doctor Hub — single UI theme for frontend, admin, client */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#ccfbf1',
        },
        medical: {
          DEFAULT: '#0369a1',
          dark: '#075985',
          light: '#e0f2fe',
        },
        accent: '#f59e0b',
        surface: '#f8fafc',
        clinic: '#f0fdfa',
      },
      boxShadow: {
        card: '0 4px 24px -4px rgba(15, 118, 110, 0.12)',
        lift: '0 12px 40px -8px rgba(15, 23, 42, 0.15)',
      },
      gridTemplateColumns: {
        auto: 'repeat(auto-fill, minmax(260px, 1fr))',
        'auto-sm': 'repeat(auto-fill, minmax(200px, 1fr))',
      },
    },
  },
}
