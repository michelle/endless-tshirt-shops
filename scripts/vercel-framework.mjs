#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

export function vercelFramework(directory) {
  try {
    const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    const dependencies = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (Object.hasOwn(dependencies, 'next') && !Object.hasOwn(dependencies, 'vinext')) return 'nextjs';
    if (Object.hasOwn(dependencies, 'vite')) return 'vite';
    if (Object.hasOwn(dependencies, 'astro')) return 'astro';
    if (Object.hasOwn(dependencies, 'nuxt')) return 'nuxtjs';
    if (Object.hasOwn(dependencies, '@sveltejs/kit')) return 'sveltekit';
  } catch { /* malformed or absent manifests use Vercel's generic handling */ }
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const framework = vercelFramework(process.argv[2] ?? process.cwd());
  if (framework) process.stdout.write(`${framework}\n`);
}
