import express from 'express';import {createServer} from 'vite';import api from './api/index.js';
const app=express();app.use(api);const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);const port=Number(process.env.PORT||43177);app.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
