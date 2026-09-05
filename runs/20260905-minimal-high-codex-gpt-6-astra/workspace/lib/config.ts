export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
export function appUrl() {
  return required("APP_URL").replace(/\/$/, "");
}
export function sandbox() {
  const env = required("PRODIGI_ENVIRONMENT");
  if (!["sandbox", "live"].includes(env))
    throw new Error("Invalid Prodigi environment");
  return env === "sandbox";
}
export function assertModes(live: boolean) {
  if (live === sandbox())
    throw new Error("Payment and fulfillment environments do not match");
}
