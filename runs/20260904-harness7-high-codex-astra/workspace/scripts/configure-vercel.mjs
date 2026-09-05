import {spawnSync} from 'node:child_process';
for(const key of ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','PRODIGI_API_KEY','SHOP_MODE','APP_URL']){
 if(!process.env[key])throw new Error(`Missing ${key}`);
 const result=spawnSync('vercel',['env','add',key,'production'],{input:process.env[key],encoding:'utf8'});
 if(result.status!==0)throw new Error(`Failed to configure ${key}: ${result.stderr}`);
 console.log(`Configured ${key}`);
}
