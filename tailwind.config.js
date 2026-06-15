/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#050505',
          900: '#0b0b0d',
          850: '#121214',
          800: '#1a1a1d',
          700: '#2b2224',
        },
        accent: {
          500: '#ef232b',
          600: '#c91018',
        },
      },
      boxShadow: {
        glow: '0 18px 55px rgba(5, 5, 5, 0.52), 0 0 34px rgba(239, 35, 43, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
