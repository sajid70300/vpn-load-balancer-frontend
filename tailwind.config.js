/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#0f1117',
          hover: '#1a1d27',
          active: '#1e2235',
          border: '#1e2235',
          text: '#8b92a5',
          activeText: '#ffffff',
        },
        brand: {
          purple: '#6366f1',
          purpleHover: '#4f52d9',
          purpleLight: '#818cf8',
        },
        surface: {
          bg: '#f4f6fb',
          card: '#ffffff',
          border: '#e8ecf4',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        cardHover: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        sidebar: '1px 0 0 #1e2235',
      }
    },
  },
  plugins: [],
}
