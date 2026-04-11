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
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
        },
        success: '#16a34a',
        karcha: {
          bg: '#f0fdf4',
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
          '0%':   { backgroundColor: '#bbf7d0' },
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
