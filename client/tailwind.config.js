/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        tv: {
          bg: '#0a0d14',
          card: '#121722',
          surface: '#1b2234',
          border: '#273147',
          focus: '#38bdf8',
          accent: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'tv-focus': 'tv-focus-pulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)' },
        },
        'tv-focus-pulse': {
          '0%, 100%': { transform: 'scale(1.02)', borderColor: '#38bdf8', boxShadow: '0 0 24px rgba(56, 189, 248, 0.6)' },
          '50%': { transform: 'scale(1.03)', borderColor: '#818cf8', boxShadow: '0 0 32px rgba(129, 140, 248, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}

