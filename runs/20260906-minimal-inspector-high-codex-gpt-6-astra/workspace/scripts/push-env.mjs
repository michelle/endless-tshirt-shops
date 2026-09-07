import { spawnSync } from 'node:child_process';
process.loadEnvFile('.env.local');
for (const name of [
  'APP_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'PRODIGI_API_KEY',
  'PRODIGI_ENVIRONMENT',
  'ARTWORK_SIGNING_SECRET',
]) {
  const r = spawnSync('vercel', ['env', 'add', name, 'production', '--force'], {
    input: process.env[name],
    encoding: 'utf8',
  });
  console.log(name, r.status === 0 ? 'configured' : 'FAILED');
  if (r.status !== 0) process.exit(1);
}
