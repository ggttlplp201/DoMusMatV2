import { repo } from "./repository";
import { formatPrice } from "./format";
import { hasRealValue } from "./placeholder";

export interface BomItem { ref: string; quantity: number; }
export interface BomLine {
  ref: string; name: string; quantity: number; specs: string;
  complianceStatus: string; unitPrice: string; lineTotal: string;
}

export function buildBomLines(items: BomItem[]): BomLine[] {
  const commercial = repo.getCommercial();
  return items.map(({ ref, quantity }) => {
    const found = repo.findByRef(ref);            // { product, variant } | undefined
    const product = found?.product;
    const variant = found?.variant;
    const price = commercial.unit_prices?.[ref];
    const unitPrice = formatPrice(price, commercial.currency);
    const lineTotal = hasRealValue(price) && hasRealValue(commercial.currency)
      ? formatPrice(Number(price) * quantity, commercial.currency) : "Price on request";
    // generic spec string from the variant attrs (heterogeneous across products)
    const attrs = variant?.attrs ?? {};
    const specs = Object.entries(attrs)
      .map(([k, v]) => `${v}${k.endsWith("_mm") ? "mm" : k === "power_w" ? "W" : ""}`)
      .join(" · ");
    const ce = product?.compliance?.ce;
    const complianceStatus = ce && hasRealValue(ce.value) ? ce.value : "—";
    return { ref, name: product?.name ?? ref, quantity, specs, complianceStatus, unitPrice, lineTotal };
  });
}

const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(lines: BomLine[]): string {
  const header = ["Reference", "Product", "Qty", "Specs", "Compliance", "Unit price", "Line total"];
  const rows = lines.map(l => [l.ref, l.name, l.quantity, l.specs, l.complianceStatus, l.unitPrice, l.lineTotal].map(esc).join(","));
  return [header.map(esc).join(","), ...rows].join("\n");
}
