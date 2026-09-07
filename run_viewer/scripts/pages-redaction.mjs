/** Redact capabilities and contact details from public copies, never originals. */
export function redactForPages(text) {
  return text
    .replace(/https?:\/\/[^\s<>"')]+/gi, (url) =>
      /onboard_sandbox|[?&](?:[^=&\s]*client_secret|sig(?:nature)?|token|key)=/i.test(url)
        ? "[redacted-private-link]" : url)
    .replace(/\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9]+\b/g, "[redacted-key]")
    .replace(/\bwhsec_[A-Za-z0-9]+\b/g, "[redacted-key]")
    .replace(/\b(?:pi|seti|cs)_[A-Za-z0-9_]+_secret_[A-Za-z0-9]+\b/g, "[redacted-client-secret]")
    .replace(/\b(?:test|live)_[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\b/gi, "[redacted-key]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]");
}

export function isPublishedArchivePath(path) {
  return path === "favicon.svg" ||
    /^suites\/[a-zA-Z0-9_-]+\/(?:summary\.md|prompt\.md|storefronts\.json)$/.test(path) ||
    /^suites\/[a-zA-Z0-9_-]+\/runs\/[a-zA-Z0-9_.-]+\/(?:final\.md|(?:design|paid-design|session-design|submitted)\.(?:png|jpe?g|webp|svg)|social-preview\.(?:png|jpe?g|webp|svg|gif|avif|ico)|storefront\.png|favicon\.(?:png|ico|svg|gif|webp))$/.test(path);
}
