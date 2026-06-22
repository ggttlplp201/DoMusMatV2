import { isPlaceholder } from "./placeholder";
import { fallbacks } from "./strings";

const SYMBOLS: Record<string, string> = { EUR: "€", USD: "$", GBP: "£" };

export function formatPrice(value: unknown, currency: unknown, fallback?: string): string {
  if (isPlaceholder(value) || isPlaceholder(currency)) return fallback ?? fallbacks.price;
  const sym = SYMBOLS[String(currency)] ?? `${currency} `;
  return `${sym}${Number(value).toFixed(2)}`;
}

export function formatDimensions(l: number, w: number, h: number): string {
  return `${l} × ${w} × ${h} mm`;
}

export function formatLeadTime(days: unknown, fallback?: string): string {
  return isPlaceholder(days) ? (fallback ?? fallbacks.leadTime) : fallbacks.leadTimeDays(days as number | string);
}
