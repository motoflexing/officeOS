/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070b14',
          900: '#0b1020',
          850: '#111827',
          800: '#172033',
          700: '#253149',
        },
        accent: {
          500: '#3b82f6',
          600: '#2563eb',
        },
      },
      boxShadow: {
        glow: '0 18px 55px rgba(15, 23, 42, 0.38)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
