/** Public URL contract: preserve these query names, short run IDs and fragments. */
export function viewerLink(suiteId: string, runId?: string, hash = "") {
  const query = new URLSearchParams({ suite: suiteId });
  if (runId) query.set("run", runId);
  return `?${query}${hash ? `#${hash}` : ""}`;
}
