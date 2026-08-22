/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: "#337ab7",
        accentLight: "#a4d5ff",
      },
      fontFamily: {
        chivo: ["Chivo", "sans-serif"],
      },
    },
  },
  plugins: [],
};
