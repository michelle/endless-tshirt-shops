import { renderDesignPng, renderDesignPreview } from '../lib/render-design';

const base = { name: 'Timing Test', word: 'Measure', shirt: 'black' } as const;

async function time(label: string, fn: () => Promise<unknown>) {
  const t = Date.now();
  const out = await fn();
  const ms = Date.now() - t;
  const size = Buffer.isBuffer(out) ? `${(out.length / 1024).toFixed(0)}KB` : '';
  console.log(`${label}: ${ms}ms ${size}`);
}

async function main() {
  await time('topo full', () => renderDesignPng({ ...base, palette: 'aurora', style: 'topo' } as never));
  await time('rays full', () => renderDesignPng({ ...base, palette: 'solar', style: 'rays' } as never));
  await time('orbit full', () => renderDesignPng({ ...base, palette: 'orchid', style: 'orbit' } as never));
  await time('topo preview400', () => renderDesignPreview({ ...base, palette: 'aurora', style: 'topo' } as never, 400));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
