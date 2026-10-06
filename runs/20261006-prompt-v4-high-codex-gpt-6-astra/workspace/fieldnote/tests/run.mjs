import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
await build({entryPoints:['tests/order.test.ts'],bundle:true,platform:'node',format:'esm',outfile:'.tests/order.test.mjs',alias:{'cloudflare:workers':'./tests/env.ts'},external:['node:*']});
const r=spawnSync(process.execPath,['--test','.tests/order.test.mjs'],{stdio:'inherit'});process.exit(r.status||0);
