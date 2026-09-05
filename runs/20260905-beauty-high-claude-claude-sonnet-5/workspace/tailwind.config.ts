import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
      colors: {
        dusk: {
          950: '#0b0620',
          900: '#150c33',
          800: '#241442',
          700: '#3a1f63',
        },
        candy: {
          pink: '#ff8fc7',
          peach: '#ffc59a',
          lavender: '#c6a9ff',
          mint: '#8ff5d0',
          gold: '#ffd166',
        },
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(255, 143, 199, 0.55)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
        'gradient-pan': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        twinkle: 'twinkle 2.4s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
