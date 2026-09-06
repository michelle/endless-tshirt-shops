import Stripe from 'stripe';
import {readFile,writeFile} from 'node:fs/promises';
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
const report=JSON.parse(await readFile('verification.json','utf8'));
const id=report.checkoutSessionId;
try{
 const page=await stripe.rawRequest('GET','/v1/payment_pages/'+id);
 console.log('Payment page fetched:',page.id||id,'fields:',Object.keys(page).filter(k=>/ship|status|amount/.test(k)));
 await writeFile('/tmp/nightshift-payment-page.json',JSON.stringify(page));
 const pm=await stripe.paymentMethods.create({type:'card',card:{token:'tok_visa'},billing_details:{email:'test@example.com',name:'Night Shift Test',address:{line1:'123 Test Street',postal_code:'10001',city:'New York',state:'NY',country:'US'}}});
 const result=await stripe.rawRequest('POST','/v1/payment_pages/'+id+'/confirm',{payment_method:pm.id,expected_amount:10200,shipping:{name:'Night Shift Test',address:{line1:'123 Test Street',postal_code:'10001',city:'New York',state:'NY',country:'US'}}});
 console.log('Confirmation status:',result.status||result.payment_status||'response received');
 const s=await stripe.checkout.sessions.retrieve(id);console.log('Checkout status:',s.status,s.payment_status,'shipping present:',Boolean(s.collected_information?.shipping_details));
 await writeFile('/tmp/nightshift-completed-session.json',JSON.stringify(s));
}catch(e){console.error('Stripe test confirmation:',e.message);process.exitCode=1;}
