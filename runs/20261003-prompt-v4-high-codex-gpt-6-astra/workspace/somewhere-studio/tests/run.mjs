import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {mkdirSync} from 'node:fs';
mkdirSync('.sites-runtime',{recursive:true});
await build({entryPoints:['tests/payment-flow.ts'],bundle:true,platform:'node',format:'esm',outfile:'.sites-runtime/payment-test.mjs',alias:{'cloudflare:workers':'./tests/runtime.ts'},external:['node:sqlite','node:fs','node:assert/strict']});
await import(pathToFileURL(process.cwd()+'/.sites-runtime/payment-test.mjs').href);
