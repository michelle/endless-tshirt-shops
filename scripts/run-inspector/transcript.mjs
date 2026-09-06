import { createHash } from 'node:crypto';
// Never execute captured commands. Public events intentionally exclude raw inputs/results.
export const schemaVersion = 1;
export function records(text) {
  const result = []; let malformed = 0;
  text.split('\n').forEach((line, n) => {
    if (!line.trim()) return;
    try { const value = JSON.parse(line); result.push({ sequence: value.sequence ?? n + 1,
      receivedAt: value.receivedAt ?? null, event: value.captureVersion ? value.event : value, sourceLine: n + 1 }); }
    catch { malformed++; }
  });
  return { records: result, malformed };
}
export function safeText(value) {
  return String(value ?? '').replace(/(?:sk|pk|rkcs|rk)_(?:test|live)_[\w=-]+|whsec_[\w=-]+|(?:test|live)_[a-f\d-]{36}|(?:vercel|vcp)_[\w=-]+|(?:pi|cs)_[\w]+_secret_[\w]+/gi, '[REDACTED]')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/(?:bearer|authorization|api[_-]?key|token|secret|signature)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED]');
}
export function docUrl(value) {
  try {
    const u = new URL(value.replace(/[),.;]+$/, ''));
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const official = /^(?:docs\.stripe\.com|stripe\.com|www\.prodigi\.com|prodigi\.com|docs\.prodigi\.com|nextjs\.org|react\.dev|vite\.dev|vitejs\.dev|developers\.openai\.com|learn\.chatgpt\.com|code\.claude\.com)$/;
    const source = /^(?:github\.com|raw\.githubusercontent\.com)$/.test(u.hostname) && /^\/(?:stripe|vercel|facebook|vitejs|prodigi)\//.test(u.pathname);
    if (!official.test(u.hostname) && !source) return null;
    const decoded = decodeURIComponent(u.pathname);
    if (/secret|token|claim|\/pay\//i.test(decoded) || safeText(decoded) !== decoded) return null;
    return u.origin + u.pathname;
  } catch { return null; }
}
const urls = text => [...new Set((String(text).match(/https?:\/\/[^\s"'<>\\]+/g) ?? []).map(docUrl).filter(Boolean))];
const topics = text => ['stripe', 'prodigi', 'framework'].filter(topic => ({ stripe: /stripe/i, prodigi: /prodigi/i,
  framework: /nextjs|next\.js|next\/dist\/docs|react\.dev|react-dom|vite(?:js)?\.(?:dev|org)|\b(?:react|next|vite)\b/i })[topic].test(text));

export function normalize(text, provider) {
  const parsed = records(text); const events = []; const calls = new Map(); let terminal = null; let usage = null;
  const push = (r, data) => { const e = { schemaVersion, sequence: r.sequence, receivedAt: r.receivedAt, sourceLine: r.sourceLine, ...data }; events.push(e); return e; };
  for (const r of parsed.records) {
    const e = r.event;
    if (!e || typeof e !== 'object') continue;
    if (['turn.completed', 'turn.failed'].includes(e.type)) { terminal = e; usage = e.usage ?? usage; }
    if (e.type === 'result' || (typeof e.result === 'string' && e.usage && !e.item)) { terminal = e; usage = e.usage ?? usage; }
    if (provider === 'codex' && e.item) {
      const i = e.item;
      if (!['command_execution', 'web_search', 'mcp_tool_call'].includes(i.type)) continue;
      const key = i.id; let call = calls.get(key);
      if (!call) { call = push(r, { callId: key, tool: i.tool ?? i.type, kind: i.type, status: 'incomplete', _input: '', _output: '' }); calls.set(key, call); }
      call._input = i.type === 'command_execution' ? i.command ?? call._input : i.arguments || i.action ? JSON.stringify(i.arguments ?? i.action) : call._input;
      call._output = i.aggregated_output ?? (i.result ? JSON.stringify(i.result) : call._output);
      if (e.type === 'item.completed') { call.status = i.exit_code != null ? (i.exit_code === 0 ? 'succeeded' : 'failed') : i.error || i.status === 'failed' ? 'failed' : 'completed'; call.completedSequence = r.sequence; }
      if (i.type === 'web_search') { call.queries = i.action?.queries ?? (i.query ? [i.query] : call.queries ?? []); call._input += ' ' + (i.query ?? ''); call.webAction = i.action?.type ?? call.webAction ?? (i.query ? 'search' : 'unknown'); }
    }
    if (provider === 'claude') for (const block of Array.isArray(e.message?.content) ? e.message.content : []) {
      const scoped = id => `${e.parent_tool_use_id ?? 'root'}:${id}`;
      if (block.type === 'tool_use') {
        const key = scoped(block.id); if (calls.has(key)) continue;
        const call = push(r, { callId: key, tool: block.name, kind: /WebSearch|WebFetch/.test(block.name) ? 'web_search' : /Bash|Read|Grep|Glob/.test(block.name) ? 'command_execution' : 'mcp_tool_call', status: 'incomplete',
          _input: JSON.stringify(block.input ?? {}), _output: '', queries: /WebSearch/.test(block.name) && block.input?.query ? [block.input.query] : [], webAction: /WebSearch/.test(block.name) ? 'search' : /WebFetch/.test(block.name) ? 'open' : undefined }); calls.set(key, call);
      } else if (block.type === 'tool_result') {
        const call = calls.get(scoped(block.tool_use_id));
        if (call) { call.status = block.is_error ? 'failed' : 'completed'; call._output = typeof block.content === 'string' ? block.content : JSON.stringify(block.content ?? ''); call.completedSequence = r.sequence; }
      }
    }
  }
  for (const call of events) {
    const input = call._input; const output = call._output;
    call.topics = topics(input); call.documentUrls = urls(input); call.resultDocumentUrls = urls(output);
    // Full query text stays private: regex redaction cannot reliably remove arbitrary PII.
    call.queries = (call.queries ?? []).map(q => ({ topics: topics(q), documentUrls: urls(q), sha256: createHash('sha256').update(String(q)).digest('hex') }));
    const writing = /apply_patch|\*\*\* (?:Begin|Add|Update)|writeFile|cat\s*>|open\([^\n]*['"]w['"]/.test(input);
    call.operation = call.webAction === 'search' ? 'search' : call.kind === 'web_search' && call.documentUrls.length ? 'document_request'
      : !writing && /node_modules\/.+(?:docs|types|CHANGELOG)|AGENTS\.md/.test(input) && /\b(?:cat|sed|rg|head|Read|Grep)\b/.test(input + ' ' + call.tool) ? 'local_reference_read'
      : !writing && call.documentUrls.length && /curl|wget|fetch\(|urlopen|WebFetch|web\.run|web__run/.test(input + ' ' + call.tool) ? 'document_request'
      : !writing && /prodigi-reference|prodigi-page|docs[^\s]*\.(?:html|md)/i.test(input) && /\b(?:cat|sed|rg|head|Read|Grep)\b/.test(input + ' ' + call.tool) ? 'local_reference_read'
      : /api\.(?:sandbox\.)?prodigi\.com|api\.stripe\.com/.test(input) ? 'api_interaction' : 'other';
    call.evidence = call.status === 'failed' ? 'failed_attempt' : call.status === 'incomplete' ? 'incomplete_attempt' : output.length ? 'tool_result_available' : 'request_only';
    call.referencePaths = [...new Set(input.match(/node_modules\/(?:next|stripe|react|vite)\/[a-zA-Z0-9_./-]+\.(?:md|ts)/g) ?? [])];
    call.resultCharacters = output.length;
    delete call._input; delete call._output;
  }
  const coverage = { schemaVersion, provider, format: provider === 'claude' && !events.length ? 'result_only_or_no_tools' : 'event_stream', terminalEvent: Boolean(terminal), malformedLines: parsed.malformed,
    capturedRecords: parsed.records.length, toolCalls: events.length, limitations: ['A search or fetch does not prove comprehension or influence.', 'Shell classification is heuristic; mixed write/read commands and dynamic URLs may be missed.',
      ...(provider === 'codex' ? ['Exec web events may omit resolved URLs and result contents.'] : []), ...(!events.length ? ['No tool history available; zero observed calls is not evidence of no documentation use.'] : [])] };
  if (usage) { usage = Object.fromEntries(Object.entries(usage).filter(([,v]) => Number.isInteger(v))); if (usage.input_tokens != null) usage.new_input_tokens = provider === 'claude' ? usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) : Math.max(0, usage.input_tokens - (usage.cached_input_tokens ?? 0)); }
  return { events, coverage, usage, failed: Boolean(terminal?.is_error || terminal?.type === 'turn.failed'), final: typeof terminal?.result === 'string' ? terminal.result : null };
}
export function documentation(events, coverage) {
  return Object.fromEntries(['stripe', 'prodigi', 'framework'].map(topic => {
    const relevant = events.filter(e => e.topics.includes(topic));
    return [topic, { coverage: coverage.toolCalls ? 'observed_partial' : 'unknown', searchQueries: relevant.flatMap(e => e.queries.filter(q => q.topics.includes(topic))).length,
      documentRequests: relevant.filter(e => e.operation === 'document_request').length, localReferenceReads: relevant.filter(e => e.operation === 'local_reference_read').length,
      referenceResults: relevant.filter(e => ['document_request', 'local_reference_read'].includes(e.operation) && e.evidence === 'tool_result_available').length,
      apiInteractions: relevant.filter(e => e.operation === 'api_interaction').length, evidenceSequences: relevant.filter(e => e.operation !== 'other').map(e => e.sequence) }];
  }));
}
