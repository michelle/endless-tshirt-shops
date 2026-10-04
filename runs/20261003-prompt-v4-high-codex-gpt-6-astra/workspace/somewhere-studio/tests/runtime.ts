import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_free_harrier.sql','utf8'));
const db={prepare(sql:string){let args: any[]=[];const q={bind(...v:any[]){args=v;return q},async first(){return sqlite.prepare(sql).get(...args)??null},async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}};return q}};
export const env:any={DB:db,STORE_MODE:'sandbox',PRODIGI_MODE:'sandbox',SITE_URL:'https://example.test',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',PRODIGI_API_KEY:'fixture',BUCKET:{async put(){}}};
