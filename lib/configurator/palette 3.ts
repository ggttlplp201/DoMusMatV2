import type { ProductMeta } from "./types";
import { CONFIGURABLE_PRODUCTS } from "./products";

/**
 * Map cart refs (variant SKUs, e.g. "DMSL-OL12W004") to configurable ProductMeta.
 * - resolveProductId maps a cart ref → its product id (undefined if unknown)
 * - Products are de-duplicated: if multiple cart refs map to the same product id,
 *   only the first occurrence is kept (order-preserving)
 * - Refs that resolve to no product id, or to a product id not in CONFIGURABLE_PRODUCTS,
 *   are silently dropped
 */
export function paletteFromCartRefs(
  refs: string[],
  resolveProductId: (ref: string) => string | undefined,
): ProductMeta[] {
  const seen = new Set<string>();
  const result: ProductMeta[] = [];
  for (const ref of refs) {
    const productId = resolveProductId(ref);
    if (!productId) continue;
    if (seen.has(productId)) continue;
    seen.add(productId);
    const meta = CONFIGURABLE_PRODUCTS[productId];
    if (!meta) continue;
    result.push(meta);
  }
  return result;
}
