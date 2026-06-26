import { describe, it, expect } from "vitest";
import { catalogue } from "@/lib/types";
import { catalogueToRows, rowsToCatalogue } from "./transform";

const statics = { manufacturer: catalogue.manufacturer, commercial: catalogue.commercial };

describe("catalogue <-> rows transform", () => {
  it("round-trips: rowsToCatalogue(catalogueToRows(x)) deep-equals x", () => {
    const rows = catalogueToRows(catalogue);
    const rebuilt = rowsToCatalogue(rows, statics);
    expect(rebuilt).toEqual(catalogue);
  });

  it("catalogueToRows flattens into the expected row counts", () => {
    const rows = catalogueToRows(catalogue);
    const variantCount = catalogue.products.reduce((n, p) => n + p.variants.length, 0);
    expect(rows.categories).toHaveLength(catalogue.categories.length); // 8
    expect(rows.products).toHaveLength(catalogue.products.length); // 47
    expect(rows.variants).toHaveLength(variantCount);
  });

  it("product rows carry scalar+jsonb fields and category id; variant rows link by product_id", () => {
    const rows = catalogueToRows(catalogue);
    const first = catalogue.products[0];
    const row = rows.products.find((p) => p.id === first.id)!;
    expect(row.category).toBe(first.category);
    expect(row.compliance).toEqual(first.compliance);
    expect(row.status).toBe("active");

    const vrow = rows.variants.find((v) => v.ref === first.variants[0].ref)!;
    expect(vrow.product_id).toBe(first.id);
    expect(vrow.attrs).toEqual(first.variants[0].attrs);
  });

  it("rowsToCatalogue restores product and variant order via sort_order regardless of row order", () => {
    const rows = catalogueToRows(catalogue);
    const shuffledProducts = [...rows.products].reverse();
    const shuffledVariants = [...rows.variants].reverse();
    const rebuilt = rowsToCatalogue(
      { categories: [...rows.categories].reverse(), products: shuffledProducts, variants: shuffledVariants },
      statics,
    );
    expect(rebuilt).toEqual(catalogue);
  });
});
