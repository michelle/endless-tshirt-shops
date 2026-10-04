import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['tests/store.test.ts'],outfile:'.sites-runtime/store.test.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'test-worker-bindings',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'bindings',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env = new Proxy({}, {get:(_,key)=>globalThis.__testEnv?.[key]});'}));}}]});
await import('../.sites-runtime/store.test.mjs');
