import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0b0d',
          900: '#131316',
          800: '#1c1c21',
          700: '#2a2a31',
        },
        seed: {
          500: '#7c5cff',
          400: '#9b82ff',
        },
      },
      fontFamily: {
        display: ['ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
