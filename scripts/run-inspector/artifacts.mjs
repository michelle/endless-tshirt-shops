import { execFileSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { git, identifier, walk, deployment } from './common.mjs';

export async function extractSuite(repo, ref, suite, directory) {
  identifier(suite);
  // Resolve ref once: a concurrent result push cannot change this inspection's input.
  const commit = git(repo, ['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  const candidates = git(repo, ['ls-tree', '--name-only', `${commit}:runs`]).trim().split('\n').filter(id => id.startsWith(suite + '-'));
  const runs = [], skipped = [];
  for (const id of candidates) {
    identifier(id);
    const metadata = JSON.parse(git(repo, ['show', `${commit}:runs/${id}/metadata.json`]));
    if (metadata.suite_id !== suite) continue;
    if (metadata.run_id !== id) throw new Error('Run ID does not match artifact directory');
    const listing = git(repo, ['ls-tree', '-rz', commit, '--', `runs/${id}`]).split('\0').filter(Boolean);
    const files = [];
    for (const entry of listing) {
      const [header, name] = entry.split('\t');
      if (!name?.startsWith(`runs/${id}/`) || name.split('/').some(p => p === '..' || p === '.') || name.includes('\\')) throw new Error('Unsafe artifact path');
      if (!/^100(?:644|755) blob /.test(header)) { skipped.push({ runId: id, path: name, reason: 'Symlink or non-regular Git entry excluded' }); continue; }
      files.push(name);
    }
    if (!files.length) throw new Error('No regular run artifacts to extract');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    // Only validated regular blobs; no symlink members or arbitrary checkout hooks.
    const archive = execFileSync('git', ['-C', repo, 'archive', commit, '--', ...files], { maxBuffer: 400 * 1024 * 1024 });
    execFileSync('tar', ['-xf', '-', '-C', directory], { input: archive });
    runs.push({ ...metadata, deployment: deployment(metadata.deployment_url), artifactCommit: git(repo, ['log', '-1', '--format=%H', commit, '--', `runs/${id}`]).trim() });
  }
  if (!runs.length) throw new Error('No matching suite artifacts found');
  return { commit, runs: runs.sort((a,b) => a.started_at.localeCompare(b.started_at)), skipped };
}

export async function inspectSource(directory, runs) {
  const results = {}, crossReferences = [];
  for (const run of runs) {
    const root = path.join(directory, 'runs', run.run_id, 'workspace');
    let files = []; try { files = await walk(root); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const packages = []; const findings = [];
    let runtimeFiles = 0, runtimeLines = 0, verificationFiles = 0, verificationLines = 0;
    for (const file of files) {
      const relative = path.relative(root, file);
      if (path.basename(file) === 'package.json') {
        try { const p = JSON.parse(await readFile(file, 'utf8')); packages.push({ path: relative,
          dependencies: Object.fromEntries(Object.entries(p.dependencies ?? {}).filter(([k]) => /^(?:next|react|react-dom|vite|stripe|sharp|@stripe\/|@resvg\/)/.test(k))) }); } catch { findings.push({ path: relative, kind: 'invalid-package-json' }); }
      }
      if (!/\.(?:[cm]?jsx?|tsx?|css)$/.test(file) || file.endsWith('.d.ts')) continue;
      const code = await readFile(file, 'utf8'); const lines = code.trimEnd().split('\n');
      if (/(?:^|\/)(?:test[s]?|scripts)(?:\/|\.)|\.(?:test|spec)\./.test(relative)) { verificationFiles++; verificationLines += lines.length; }
      else { runtimeFiles++; runtimeLines += lines.length; }
      lines.forEach((line, n) => {
        // These are review cues, not automatic integration pass/fail decisions.
        for (const [kind, pattern] of [['legacy-shipping-read', /\bsession\.shipping_details/], ['scalable-press-reference', /scalablepress/i], ['idempotency-header', /Idempotency-Key/], ['idempotency-body-field', /idempotencyKey/]]) {
          if (pattern.test(line)) findings.push({ path: relative, line: n + 1, kind });
        }
        for (const other of runs) if (other.run_id !== run.run_id && (line.includes(other.run_id) || (other.deployment && line.includes(other.deployment)))) crossReferences.push({ runId: run.run_id, otherRunId: other.run_id, path: relative, line: n + 1 });
      });
    }
    results[run.run_id] = { packages, runtimeFiles, runtimeLines, verificationFiles, verificationLines, reviewCues: findings };
  }
  return { results, crossReferences };
}
