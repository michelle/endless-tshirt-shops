export function unattendedOpenCodeConfig(content) {
  let config = {};
  try {
    const parsed = JSON.parse(content ?? '');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) config = parsed;
  } catch { /* an invalid ambient inline config is replaced by the run policy */ }
  const tools = config.tools && typeof config.tools === 'object' && !Array.isArray(config.tools) ? config.tools : {};
  return JSON.stringify({ ...config, tools: { ...tools, question: false } });
}
