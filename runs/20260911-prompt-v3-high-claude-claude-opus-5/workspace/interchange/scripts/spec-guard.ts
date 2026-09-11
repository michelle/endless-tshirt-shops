import { sanitizeSpec, specProblem } from "../lib/spec";
import { renderFront } from "../lib/render";

const cases: [string, any][] = [
  ["empty object", {}],
  ["null", null],
  ["blank labels", { title: "X", lines: [{ name: "A", stations: [{ label: "" }, { label: "  " }] }] }],
  ["one stop", { title: "X", lines: [{ name: "A", stations: [{ label: "Only" }] }] }],
  ["oversized", { title: "T".repeat(400), subtitle: "S".repeat(400), lines: Array.from({ length: 30 }, (_, i) => ({
      name: "L" + i, color: "javascript:alert(1)", stations: Array.from({ length: 40 }, (_, j) => ({ label: "Stop " + j, note: "y".repeat(50) })),
    })) }],
  ["svg injection", { title: '"><script>alert(1)</script>', lines: [{ name: '</svg><script>x</script>', color: '#fff" onload="x',
      stations: [{ label: "<img src=x onerror=1>" }, { label: "b" }] }] }],
];

let failures = 0;
for (const [name, input] of cases) {
  const spec = sanitizeSpec(input);
  const problem = specProblem(spec);
  let svg = "";
  try { svg = renderFront(spec); } catch (e: any) {
    console.log(`FAIL ${name}: render threw ${e.message}`); failures++; continue;
  }
  const leaked = /<script|onerror|onload|javascript:/i.test(svg);
  if (leaked) { console.log(`FAIL ${name}: unsanitised content reached the SVG`); failures++; continue; }
  console.log(
    `ok   ${name.padEnd(15)} lines=${spec.lines.length} ` +
    `stops=${spec.lines.reduce((n, l) => n + l.stations.length, 0)} ` +
    `problem=${problem ? JSON.stringify(problem) : "none"} svg=${(svg.length / 1024).toFixed(0)}kb`,
  );
}
process.exit(failures ? 1 : 0);
