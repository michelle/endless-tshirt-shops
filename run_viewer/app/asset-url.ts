/// <reference types="vite/client" />

/** Keep archived paths portable between localhost and a Pages project subpath. */
export function assetUrl(path: string) {
  const base = import.meta.env?.BASE_URL ?? "/";
  return path.startsWith("/") && !path.startsWith("//")
    ? `${base.replace(/\/$/, "")}${path}`
    : path;
}
