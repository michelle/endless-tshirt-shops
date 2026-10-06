import http from 'node:http';
import {readFile} from 'node:fs/promises';
const port=8794;
http.createServer(async (req,res)=>{
 try{
  const src=await readFile('worker/index.js','utf8');
  const worker=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await worker.default.fetch(request,{PRODIGI_ENV:'sandbox'});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500);res.end('Preview error');console.error(e);}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
