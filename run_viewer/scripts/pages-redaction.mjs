/**
 * Redact capabilities and contact details from public copies, never originals.
 *
 * The credential prefixes below are kept in step with `safeText` in
 * scripts/run-inspector/transcript.mjs. The two cannot share a module: the
 * pre-push gate publishes only run_viewer/, so this package must not import
 * from the repository root. Their behaviour differs on purpose -- this one
 * labels each kind of removal for someone reading the published copy and also
 * strips private links -- but the prefixes must not drift apart.
 */
const CREDENTIALS = [
  [/\b(?:sk|pk|rk|rkcs)_(?:test|live)_[A-Za-z0-9]+\b/g, "[redacted-key]"],
  [/\bwhsec_[A-Za-z0-9]+\b/g, "[redacted-key]"],
  [/\b(?:vercel|vcp)_[A-Za-z0-9_=-]+\b/g, "[redacted-key]"],
  [/\b(?:test|live)_[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\b/gi, "[redacted-key]"],
  [/\b(?:pi|cs|seti)_[A-Za-z0-9_]+_secret_[A-Za-z0-9]+\b/g, "[redacted-client-secret]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]"],
];

const PRIVATE_LINK = /onboard_sandbox|[?&](?:[^=&\s]*client_secret|sig(?:nature)?|token|key)=/i;

export function redactForPages(text) {
  const published = text.replace(/https?:\/\/[^\s<>"')]+/gi, (url) =>
    PRIVATE_LINK.test(url) ? "[redacted-private-link]" : url);
  return CREDENTIALS.reduce((result, [pattern, label]) => result.replace(pattern, label), published);
}

export function isPublishedArchivePath(path) {
  return path === "favicon.svg" ||
    /^suites\/[a-zA-Z0-9_-]+\/(?:summary\.md|prompt\.md|storefronts\.json)$/.test(path) ||
    /^suites\/[a-zA-Z0-9_-]+\/runs\/[a-zA-Z0-9_.-]+\/(?:final\.md|(?:design|paid-design|session-design|submitted)\.(?:png|jpe?g|webp|svg)|social-preview\.(?:png|jpe?g|webp|svg|gif|avif|ico)|storefront\.png|favicon\.(?:png|ico|svg|gif|webp))$/.test(path);
}
