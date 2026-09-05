const health=await (await fetch(process.env.APP_URL+'/api/health')).json();if(health.mode!=='sandbox')throw new Error('This verification script is sandbox-only');
import {chromium} from '@playwright/test';import fs from 'node:fs';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1400,height:1100}});
await page.goto(fs.readFileSync('artifacts/checkout-url.txt','utf8'));
await page.locator('#email').fill('datetime-test@example.com');
await page.locator('#shippingName').fill('Datetime Sandbox');
const manual=page.getByText('Enter address manually',{exact:true});if(await manual.isVisible())await manual.click();
await page.locator('#shippingAddressLine1').fill('123 Test Street');
await page.locator('#shippingLocality').fill('San Francisco');
await page.locator('#shippingPostalCode').fill('94107');
await page.locator('#shippingAdministrativeArea').selectOption('CA');
await page.locator('#cardNumber').fill('4242424242424242');
await page.locator('#cardExpiry').fill('1230');
await page.locator('#cardCvc').fill('123');
if(await page.locator('#enableStripePass').isChecked())await page.locator('#enableStripePass').uncheck();
await page.getByLabel('I am an AI agent acting on behalf of someone else').evaluate(el=>el.click());
await page.screenshot({path:'artifacts/stripe-filled.png',fullPage:true});
await page.getByRole('button',{name:'Pay',exact:true}).click();
try{await page.waitForURL(process.env.APP_URL+'/order**',{timeout:60000});await page.getByRole('heading',{name:'A moment, kept.'}).waitFor({timeout:30000});console.log('Payment success return',page.url());fs.writeFileSync('artifacts/order-url.txt',page.url());await page.screenshot({path:'artifacts/order-success.png',fullPage:true});console.log((await page.locator('body').innerText()).slice(0,3500));}catch(e){console.log('CHECKOUT RESULT',page.url(),(await page.locator('body').innerText()).slice(-5000));await page.screenshot({path:'artifacts/checkout-result.png',fullPage:true});throw e}finally{await browser.close()}
