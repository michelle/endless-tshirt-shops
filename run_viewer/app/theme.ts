export type Theme = "light" | "dark";
const storageKey = "benchmark-viewer-theme";
let fallback: Theme | null = null;

export function readTheme(): Theme {
  if (fallback) return fallback;
  try { return localStorage.getItem(storageKey) === "dark" ? "dark" : "light"; }
  catch { return "light"; }
}

export function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("viewer-theme", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("viewer-theme", onChange);
  };
}

export function changeTheme(theme: Theme) {
  try { localStorage.setItem(storageKey, theme); fallback = null; }
  catch { fallback = theme; } // Still works when browser storage is disabled.
  window.dispatchEvent(new Event("viewer-theme"));
}
