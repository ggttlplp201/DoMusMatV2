import { isPlaceholder } from "./placeholder";
import type { Commercial } from "./types";

export interface Tier { min_qty: number; discount_pct: number; }
export interface OrderResult {
  available: boolean; unitPrice: number | null; activeTier: Tier | null; nextTier: Tier | null;
  unitsToNextTier: number | null; discountedUnitPrice: number | null; subtotal: number | null;
  total: number | null; leadTimeDays: number | null; minOrderQty: number;
}
export interface OrderInput { ref: string; quantity: number; commercial: Commercial; }

export function calculateOrder({ ref, quantity, commercial }: OrderInput): OrderResult {
  const moqRaw = commercial.minimum_order_quantity;
  const minOrderQty = isPlaceholder(moqRaw) ? 1 : Number(moqRaw);
  const price = commercial.unit_prices?.[ref];
  const tiers = commercial.volume_discount_tiers;
  const leadTiers = commercial.lead_time_tiers;

  const unavailable = isPlaceholder(commercial.currency) || isPlaceholder(price);
  if (unavailable) {
    return { available: false, unitPrice: null, activeTier: null, nextTier: null, unitsToNextTier: null,
      discountedUnitPrice: null, subtotal: null, total: null, leadTimeDays: null, minOrderQty };
  }
  const unitPrice = Number(price);
  const subtotal = unitPrice * quantity;

  let activeTier: Tier | null = null, nextTier: Tier | null = null;
  if (!isPlaceholder(tiers)) {
    const sorted = [...(tiers as unknown as Tier[])].sort((a, b) => a.min_qty - b.min_qty);
    for (const tr of sorted) if (quantity >= tr.min_qty) activeTier = tr;
    nextTier = sorted.find(tr => tr.min_qty > quantity) ?? null;
  }
  const discountPct = activeTier?.discount_pct ?? 0;
  const discountedUnitPrice = +(unitPrice * (1 - discountPct / 100)).toFixed(2);
  const total = +(discountedUnitPrice * quantity).toFixed(2);
  const unitsToNextTier = nextTier ? nextTier.min_qty - quantity : null;

  let leadTimeDays: number | null = null;
  if (!isPlaceholder(leadTiers)) {
    const sorted = [...(leadTiers as unknown as { min_qty: number; business_days: number }[])].sort((a, b) => a.min_qty - b.min_qty);
    for (const lt of sorted) if (quantity >= lt.min_qty) leadTimeDays = lt.business_days;
  }
  return { available: true, unitPrice, activeTier, nextTier, unitsToNextTier, discountedUnitPrice, subtotal, total, leadTimeDays, minOrderQty };
}
