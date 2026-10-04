#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/check-concept-commitment.mjs WORKSPACE_OR_JSON');
const file = target.endsWith('.json') ? path.resolve(target) : path.resolve(target, 'concept-commitment.json');
const text = await readFile(file, 'utf8');
const value = JSON.parse(text);
const required = ['brand', 'productConcept', 'customerCustomization', 'reason'];
if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join('\0') !== [...required].sort().join('\0')) {
  throw new Error('Concept commitment must contain exactly the four required fields');
}
for (const key of required) {
  if (typeof value[key] !== 'string' || !value[key].trim()) throw new Error(`Concept commitment field ${key} must be a non-empty string`);
}
console.log(JSON.stringify({
  valid: true,
  file,
  sha256: createHash('sha256').update(text).digest('hex'),
  commitment: value,
}, null, 2));
