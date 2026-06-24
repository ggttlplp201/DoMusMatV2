import type { BomItem } from "./bom";
import type { Locale } from "./i18n";
import { repo } from "./repository";

export interface OrderItemPayload {
  product_ref: string;
  product_id: string;
  product_name_snapshot: string;
  category: string;
  quantity: number;
}

export interface OrderPayload {
  source: "cart" | "bom";
  note: string;
  locale: Locale;
  total_quantity: number;
  items: OrderItemPayload[];
}

export function buildOrderPayload(
  items: BomItem[],
  ctx: { source: "cart" | "bom"; locale: Locale; note?: string },
): OrderPayload {
  const built: OrderItemPayload[] = items
    .filter((i) => i.quantity > 0)
    .map(({ ref, quantity }) => {
      const product = repo.findByRef(ref)?.product;
      return {
        product_ref: ref,
        product_id: product?.id ?? "",
        product_name_snapshot: product?.name ?? ref,
        category: product?.category ?? "",
        quantity,
      };
    });
  return {
    source: ctx.source,
    note: ctx.note ?? "",
    locale: ctx.locale,
    total_quantity: built.reduce((n, it) => n + it.quantity, 0),
    items: built,
  };
}
