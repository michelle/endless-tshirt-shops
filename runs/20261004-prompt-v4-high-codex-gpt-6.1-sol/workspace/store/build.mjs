import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});await mkdir('dist/client',{recursive:true});
await build({entryPoints:['worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',loader:{'.html':'text','.css':'text'},minify:true});
await build({entryPoints:['client.mjs'],outfile:'dist/client/client.js',bundle:true,format:'esm',minify:true});
await copyFile('style.css','dist/client/style.css');
const config=JSON.parse(await readFile('wrangler.json','utf8'));config.main='index.js';config.assets.directory='../client';await writeFile('dist/server/wrangler.json',JSON.stringify(config,null,2));
