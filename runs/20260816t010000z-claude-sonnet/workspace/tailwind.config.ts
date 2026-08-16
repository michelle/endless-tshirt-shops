import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        accent: "#337ab7",
        pill: "#a4d5ff",
      },
      fontFamily: {
        display: ["Chivo", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
