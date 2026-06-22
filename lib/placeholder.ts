export function isPlaceholder(v: unknown): boolean {
  if (v === "PLACEHOLDER" || v === null || v === undefined) return true;
  if (Array.isArray(v)) return v.length === 0 || v.every(isPlaceholder);
  return false;
}
export function hasRealValue(v: unknown): boolean { return !isPlaceholder(v); }
export function resolvePlaceholder<T>(v: T, fallback: string): T | string {
  return isPlaceholder(v) ? fallback : v;
}
