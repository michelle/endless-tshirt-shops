#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ignored = new Set(['.git', '.next', '.vercel', '.netlify', 'node_modules', 'dist', 'build', 'coverage', 'reference']);
const frameworkNames = new Set(['next', 'vite', 'astro', '@sveltejs/kit', 'nuxt', 'react-scripts', 'vinext']);
const conventionalAppNames = new Set(['app', 'frontend', 'site', 'shop', 'store', 'web']);

function directories(root, maxDepth = 6) {
  const found = [];
  function visit(directory, depth) {
    found.push(directory);
    if (depth >= maxDepth) return;
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory() || ignored.has(entry.name)) continue;
      visit(path.join(directory, entry.name), depth + 1);
    }
  }
  visit(root, 0);
  return found;
}

function manifest(directory) {
  const filename = path.join(directory, 'package.json');
  if (!existsSync(filename)) return null;
  try { return JSON.parse(readFileSync(filename, 'utf8')); } catch { return {}; }
}

function candidateScore(root, directory) {
  const pkg = manifest(directory);
  const hasPackage = pkg !== null;
  const hasVercel = existsSync(path.join(directory, 'vercel.json'));
  const hasIndex = existsSync(path.join(directory, 'index.html'));
  if (!hasPackage && !hasVercel && !hasIndex) return null;
  const dependencies = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
  const scripts = pkg?.scripts ?? {};
  // A package.json alone is weak evidence: benchmark workspaces sometimes
  // contain repository tooling beside the actual static site. Runnable/build
  // signals deliberately outweigh a generic root manifest.
  let score = hasPackage ? 25 : 0;
  if (hasVercel) score += 45;
  if (hasIndex) score += 55;
  if (typeof scripts.build === 'string') score += 40;
  if (typeof scripts.start === 'string' || typeof scripts.dev === 'string') score += 10;
  if ([...frameworkNames].some(name => Object.hasOwn(dependencies, name))) score += 50;
  for (const marker of ['app', 'pages', 'src', 'api', 'public']) if (existsSync(path.join(directory, marker))) score += 4;
  if (conventionalAppNames.has(path.basename(directory).toLowerCase())) score += 8;
  const depth = path.relative(root, directory).split(path.sep).filter(Boolean).length;
  return score + Math.min(depth, 4);
}

export function selectDeploymentRoot(workspace) {
  const root = path.resolve(workspace);
  if (!existsSync(root) || !statSync(root).isDirectory()) return null;
  return directories(root)
    .map(directory => ({ directory, score: candidateScore(root, directory) }))
    .filter(candidate => candidate.score !== null)
    .sort((a, b) => b.score - a.score || a.directory.localeCompare(b.directory))[0]?.directory ?? null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const selected = selectDeploymentRoot(process.argv[2] ?? '');
  if (!selected) process.exitCode = 2;
  else process.stdout.write(`${selected}\n`);
}
