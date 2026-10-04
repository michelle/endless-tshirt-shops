#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const roots = process.argv.slice(2).length
  ? process.argv.slice(2)
  // Suite runs execute from dedicated Git worktrees, so their ignored private
  // transcripts live under the worktree rather than this checkout's top-level
  // transcript directory. Include both locations by default.
  : ['.benchmark-secrets/transcripts', '.benchmark-secrets/recoveries', '.benchmark-secrets/worktrees'];

const secret = /(?:test_[a-f\d-]{36}|(?:sk|rk|rkcs|pk|whsec)_(?:test|live)_[A-Za-z\d_]+)/gi;
const sha = value => createHash('sha256').update(value).digest('hex').slice(0, 16);

async function filesUnder(root) {
  const found = [];
  async function visit(entry) {
    let info;
    try { info = await stat(entry); } catch { return; }
    if (info.isDirectory()) {
      for (const child of await readdir(entry)) await visit(path.join(entry, child));
    } else if (['transcript.jsonl', 'agent.raw.log'].includes(path.basename(entry))) found.push(entry);
  }
  await visit(root);
  return found;
}

function commandStrings(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (typeof value.command === 'string') found.push(value.command);
  if (typeof value.path === 'string' && /(?:run_viewer|benchmark-results|runs\/20|endless-tshirt-shops)/i.test(value.path)) found.push(`READ_PATH ${value.path}`);
  if (typeof value.arguments === 'string' && value.arguments.trim().startsWith('{')) {
    try { commandStrings(JSON.parse(value.arguments), found); } catch { /* not structured tool input */ }
  }
  for (const [key, child] of Object.entries(value)) {
    if (['command', 'path', 'arguments', 'output', 'content', 'summary', 'description', 'rawInput'].includes(key)) continue;
    if (typeof child === 'object') commandStrings(child, found);
  }
  return found;
}

function classify(command, currentRun) {
  const text = command.replace(secret, '[REDACTED]');
  const prodigiOrders = /(?:api\.sandbox\.prodigi\.com)?\/v4(?:\.0)?\/orders(?=$|[?'"\s])/i.test(text);
  const explicitPost = /(?:curl\b[^\n]*\s-X\s*POST|method\s*:\s*['"]POST)/i.test(text);
  const referencedRuns = [...text.matchAll(/runs\/(20\d{6}[a-z\d._-]*)/gi)].map(match => match[1]);
  return {
    hostCheckout: /(?:\/Users\/[^\s'"]+\/workspace\/endless-tshirt-shops|\bendless-tshirt-shops\b)/i.test(text),
    priorArtifacts: /(?:benchmark-results|runs\/20\d{6}|\.git\/(?:refs|logs))/i.test(text),
    // run_viewer is shared harness tooling, not another agent's result.
    foreignRunArtifacts: /benchmark-results/i.test(text) || referencedRuns.some(run => run !== currentRun),
    gitHistory: /\bgit\s+(?:show|log|ls-tree|rev-list|for-each-ref|grep)\b/i.test(text),
    prodigiOrderEnumeration: prodigiOrders && !explicitPost,
  };
}

const files = (await Promise.all(roots.map(filesUnder))).flat().sort();
const reports = [];
for (const file of files) {
  const currentRun = path.basename(path.dirname(file));
  const text = await readFile(file, 'utf8');
  const commands = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { commandStrings(JSON.parse(line), commands); } catch { /* diagnostic text */ }
  }
  const unique = [...new Set(commands)];
  const hits = unique.map(command => ({ commandHash: sha(command.replace(secret, '[REDACTED]')), ...classify(command, currentRun) }))
    .filter(hit => Object.entries(hit).some(([key, value]) => key !== 'commandHash' && value));
  if (hits.length) reports.push({ file, uniqueToolInputs: unique.length, hits });
}

console.log(JSON.stringify({
  schemaVersion: 1,
  scope: 'Preserved private raw transcripts only. A hit proves an access opportunity or request, not that it influenced the concept.',
  scannedFiles: files.length,
  matchingFiles: reports.length,
  reports,
}, null, 2));
