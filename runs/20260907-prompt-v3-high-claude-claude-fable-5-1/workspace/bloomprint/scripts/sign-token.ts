// Usage: npx tsx --tsconfig tsconfig.scripts.json scripts/sign-token.ts '{"name":"Amelia",...}'
import { signDesign } from "../src/lib/signing";
import { parseDesign } from "../src/lib/design";
const raw = JSON.parse(process.argv[2] || '{"name":"Amelia","date":"1994-06-12","climate":"alpine","dedication":"","variant":1,"garment":"white"}');
const parsed = parseDesign(raw);
if (!parsed.design) throw new Error(parsed.error);
console.log(signDesign(parsed.design));
