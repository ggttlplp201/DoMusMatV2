import { describe, it, expect } from "vitest";
import { calculateOrder } from "./pricing";
import type { Commercial } from "./types";

const placeholderCommercial = {
  currency: "PLACEHOLDER", unit_prices: { "R1": "PLACEHOLDER" },
  volume_discount_tiers: "PLACEHOLDER", lead_time_tiers: "PLACEHOLDER", minimum_order_quantity: "PLACEHOLDER",
} as unknown as Commercial;

const liveCommercial = {
  currency: "EUR",
  unit_prices: { "R1": 100 },
  volume_discount_tiers: [ { min_qty: 1, discount_pct: 0 }, { min_qty: 10, discount_pct: 5 }, { min_qty: 50, discount_pct: 10 } ],
  lead_time_tiers: [ { min_qty: 1, business_days: 5 }, { min_qty: 50, business_days: 20 } ],
  minimum_order_quantity: 5,
} as unknown as Commercial;

describe("calculateOrder", () => {
  it("degrades gracefully when commercial is placeholder", () => {
    const r = calculateOrder({ ref: "R1", quantity: 10, commercial: placeholderCommercial });
    expect(r.available).toBe(false);
    expect(r.total).toBeNull();
    expect(r.leadTimeDays).toBeNull();
    expect(r.minOrderQty).toBe(1); // safe default when MOQ placeholder
  });
  it("computes price, active+next tier, and lead time with live data", () => {
    const r = calculateOrder({ ref: "R1", quantity: 10, commercial: liveCommercial });
    expect(r.available).toBe(true);
    expect(r.unitPrice).toBe(100);
    expect(r.activeTier?.discount_pct).toBe(5);
    expect(r.discountedUnitPrice).toBe(95);
    expect(r.subtotal).toBe(1000);
    expect(r.total).toBe(950);
    expect(r.nextTier?.discount_pct).toBe(10);
    expect(r.unitsToNextTier).toBe(40);
    expect(r.leadTimeDays).toBe(5);
    expect(r.minOrderQty).toBe(5);
  });
  it("applies the top tier and reports no next tier", () => {
    const r = calculateOrder({ ref: "R1", quantity: 60, commercial: liveCommercial });
    expect(r.activeTier?.discount_pct).toBe(10);
    expect(r.nextTier).toBeNull();
    expect(r.unitsToNextTier).toBeNull();
    expect(r.leadTimeDays).toBe(20);
  });
});
