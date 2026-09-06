import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, lstat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const hash = (bytes, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
export const git = (repo, args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
export function identifier(value) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value ?? '') || value.includes('..')) throw new Error('Invalid identifier');
  return value;
}
export async function json(file, fallback = null) { try { return JSON.parse(await readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } }
export async function save(file, value) { await mkdir(path.dirname(file), { recursive: true, mode: 0o700 }); await writeFile(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 }); }
export async function walk(root) {
  const result = [];
  async function visit(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', '.next', 'dist', 'reference', '.vercel'].includes(e.name) || e.isSymbolicLink()) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await visit(p); else if (e.isFile()) result.push(p);
    }
  }
  await visit(root); return result.sort();
}
export async function regular(file) { const s = await lstat(file); if (!s.isFile() || s.isSymbolicLink()) throw new Error('Expected regular file'); return s; }
export function deployment(value) {
  const found = String(value ?? '').match(/https:\/\/[a-zA-Z0-9.-]+\.vercel\.app\b/);
  return found ? new URL(found[0]).origin : null;
}
