import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('./', import.meta.url).pathname } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { watch: { usePolling: true } },
});
