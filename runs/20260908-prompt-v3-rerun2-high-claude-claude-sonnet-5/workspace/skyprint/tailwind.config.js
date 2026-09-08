/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#050914',
          900: '#0a1128',
          800: '#101a3a',
          700: '#182552',
        },
        champagne: {
          200: '#f3e6c8',
          300: '#e8d4a0',
          400: '#d9bc78',
          500: '#c9a875',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        stars:
          'radial-gradient(1px 1px at 20px 30px, white, transparent), radial-gradient(1px 1px at 90px 80px, white, transparent), radial-gradient(1.5px 1.5px at 150px 40px, white, transparent), radial-gradient(1px 1px at 200px 120px, white, transparent)',
      },
    },
  },
  plugins: [],
};
