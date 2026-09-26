/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: {
          DEFAULT: '#090A0C',
          subtle: '#0D0F12',
        },
        surface: {
          DEFAULT: '#121418',
          hover: '#181B20',
          elevated: '#1D2026',
          border: '#242830',
          'border-subtle': '#1B1E24',
          'border-strong': '#343944',
        },
        text: {
          primary: '#F0F2F5',
          secondary: '#9CA3AF',
          tertiary: '#636B78',
          muted: '#404550',
        },
        accent: {
          DEFAULT: '#4F65F6',
          hover: '#6175F8',
          subtle: 'rgba(79, 101, 246, 0.12)',
          border: 'rgba(79, 101, 246, 0.28)',
        },
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        'panel': '0 4px 24px -2px rgba(0, 0, 0, 0.65)',
        'modal': '0 24px 48px -12px rgba(0, 0, 0, 0.85)',
      },
    },
  },
  plugins: [],
}
