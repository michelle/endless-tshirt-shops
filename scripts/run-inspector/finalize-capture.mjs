import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { normalize } from './transcript.mjs';

const [provider, capture, output] = process.argv.slice(2);
const source = path.join(capture, 'transcript.jsonl');
const result = normalize(existsSync(source) ? readFileSync(source, 'utf8') : '', provider);
const write = (name, text) => writeFileSync(path.join(output, name), text);

// The single writer of a run's public artifacts, run after the agent exits so a
// timed-out or killed CLI still produces them. events.jsonl is the only public
// event log: tool names, lifecycle status and allowlisted documentation URLs,
// never raw arguments or results. The complete stream stays private.
write('capture.json', JSON.stringify(result.coverage, null, 2) + '\n');
write('events.jsonl', result.events.map(event => JSON.stringify(event) + '\n').join(''));
if (result.usage) write('usage.json', JSON.stringify(result.usage, null, 2) + '\n');
// Claude, Kimi and OpenCode deliver their final answer inside the event
// stream, so the normalized last text becomes final.md here.
if (['claude', 'kimi', 'opencode'].includes(provider) && result.final !== null) {
  write('final.md', result.final + (result.final.endsWith('\n') ? '' : '\n'));
}
