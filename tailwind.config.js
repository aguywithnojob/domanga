/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
        },
        accent: {
          400: 'rgb(var(--color-accent-400) / <alpha-value>)',
          500: 'rgb(var(--color-accent-500) / <alpha-value>)',
          600: 'rgb(var(--color-accent-600) / <alpha-value>)',
        },
        success: '#16a34a',
        karcha: {
          bg: 'rgb(var(--color-primary-50) / <alpha-value>)',
          card: '#ffffff',
          text: '#1f2937',
          muted: '#6b7280',
          border: '#e5e7eb',
        }
      },
      boxShadow: {
        card: '0 1px 8px 0 rgba(0,0,0,0.07)',
        nav:  '0 -1px 12px 0 rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl:   '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-green': {
          '0%':   { backgroundColor: 'var(--color-flash-from)' },
          '100%': { backgroundColor: '#ffffff' },
        },
      },
      animation: {
        'fade-in':     'fade-in 0.2s ease-out',
        'flash-green': 'flash-green 2s ease-out forwards',
      },
    },
  },
  plugins: [],
}
