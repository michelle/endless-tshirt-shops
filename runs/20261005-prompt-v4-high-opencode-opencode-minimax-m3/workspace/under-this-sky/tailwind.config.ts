import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a1830",
        inkDeep: "#040a18",
        midnight: "#101e3b",
        gold: "#d9b67a",
        goldDim: "#a4884f",
        parchment: "#f4ecd8",
        rose: "#c0436a",
        sage: "#3a5942",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.32em",
      },
      animation: {
        slowspin: "spin 60s linear infinite",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
