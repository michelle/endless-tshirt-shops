// One-off integration check: submit a real order to the Prodigi sandbox using
// the deployed artwork URL, then poll until Prodigi has fetched the asset.
// Run with: STORE_BASE_URL=https://<deployment> npx tsx scripts/test-fulfillment.ts
import { createProdigiOrder, getProdigiOrder, artworkUrlFor } from '../lib/prodigi';

const input = {
  stripeSessionId: `cs_test_manual_${Date.now()}`,
  word: 'aurora',
  paletteId: 'glacier',
  garmentColor: 'black',
  size: 'm',
  recipient: {
    name: 'Test McTestface',
    email: 'test@example.com',
    address: {
      line1: '14 Test Place',
      line2: null,
      postalOrZipCode: '10001',
      countryCode: 'US',
      townOrCity: 'New York',
      stateOrCounty: 'NY',
    },
  },
};

console.log('artwork url:', artworkUrlFor(input));

const result = await createProdigiOrder(input);
console.log('created Prodigi order:', result);

for (let i = 0; i < 10; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const body = (await getProdigiOrder(result.id)) as {
    order?: {
      status?: { stage?: string };
      items?: { status?: string; assets?: { status?: string }[] }[];
    };
  };
  const order = body.order;
  const item = order?.items?.[0];
  console.log(
    `poll ${i + 1}: stage=${order?.status?.stage} item=${item?.status} asset=${item?.assets?.[0]?.status}`,
  );
  if (item?.assets?.[0]?.status === 'complete') {
    console.log('SUCCESS: Prodigi downloaded the generated artwork.');
    process.exit(0);
  }
  if (item?.assets?.[0]?.status === 'error') {
    console.error('FAIL: Prodigi could not download the artwork.');
    process.exit(1);
  }
}
console.error('TIMEOUT waiting for asset download');
process.exit(1);
