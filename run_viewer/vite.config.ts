import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VIEWER_BASE_PATH || "/endless-tshirt-shops/",
  plugins: [react()],
  // The publication script copies only approved, redacted archive files.
  publicDir: false,
  build: { outDir: "out", sourcemap: false },
});
