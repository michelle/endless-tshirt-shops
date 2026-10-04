import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#e8edf5',
          200: '#c8d3e3',
          300: '#9aa8c2',
          400: '#6c7d9f',
          500: '#4d5e80',
          600: '#374764',
          700: '#29364e',
          800: '#1d2638',
          900: '#141a26',
          950: '#0c101a',
        },
        gold: {
          400: '#e5c683',
          500: '#d4a857',
          600: '#b5893c',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
