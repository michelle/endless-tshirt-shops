import {readFile,writeFile} from 'node:fs/promises';
const html=await readFile('ui/index.html','utf8');
const app=await readFile('ui/app.js','utf8');
const server=await readFile('worker/server.js','utf8');
await writeFile('worker/index.js',`const PAGE = ${JSON.stringify(html)};\nconst APP = ${JSON.stringify(app)};\n${server}`);
