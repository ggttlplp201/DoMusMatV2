// Pure, dependency-free transforms between the Catalogue shape (lib/types.ts) and
// flat DB rows. Both the seed script and loadCatalogue() reuse these, so the
// round-trip test (transform.test.ts) doubles as the migration correctness gate.

import type {
  Catalogue,
  Commercial,
  Product,
  Compliance,
  BimAsset,
  BimMetadata,
  Standardization,
  SupplyChain,
} from "@/lib/types";

export type ProductStatus = "active" | "retired";

export interface CategoryRow {
  id: string;
  name: string;
  name_en: string;
  name_zh: string;
  sort_order: number;
}

export interface ProductRow {
  id: string;
  category: string;
  name: string;
  name_en: string;
  name_zh: string;
  ref_prefix: string;
  description_pt: string;
  description_en: string;
  description_zh: string;
  applications: string[];
  images: string[];
  shared_specs: Record<string, unknown>;
  model3d: string;
  compliance: Compliance;
  bim_assets: BimAsset[];
  bim_metadata: BimMetadata;
  standardization: Standardization;
  supply_chain: SupplyChain;
  status: ProductStatus;
  sort_order: number;
}

export interface VariantRow {
  ref: string;
  product_id: string;
  attrs: Record<string, string | number>;
  sort_order: number;
}

export interface CatalogueRows {
  categories: CategoryRow[];
  products: ProductRow[];
  variants: VariantRow[];
}

export interface CatalogueStatics {
  manufacturer: Catalogue["manufacturer"];
  commercial: Commercial;
}

/** Flatten a Catalogue into DB rows. Order is preserved via sort_order. */
export function catalogueToRows(c: Catalogue): CatalogueRows {
  const categories: CategoryRow[] = c.categories.map((cat, i) => ({
    id: cat.id,
    name: cat.name,
    name_en: cat.name_en,
    name_zh: cat.name_zh,
    sort_order: i,
  }));

  const products: ProductRow[] = [];
  const variants: VariantRow[] = [];

  c.products.forEach((p, pi) => {
    const { variants: productVariants, ...rest } = p;
    products.push({ ...rest, status: "active", sort_order: pi });
    productVariants.forEach((v, vi) => {
      variants.push({ ref: v.ref, product_id: p.id, attrs: v.attrs, sort_order: vi });
    });
  });

  return { categories, products, variants };
}

/** Rebuild a Catalogue from DB rows. Robust to row ordering (sorts by sort_order). */
export function rowsToCatalogue(rows: CatalogueRows, statics: CatalogueStatics): Catalogue {
  const categories = [...rows.categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ sort_order: _drop, ...rest }) => rest);

  const variantsByProduct = new Map<string, VariantRow[]>();
  for (const v of rows.variants) {
    const list = variantsByProduct.get(v.product_id);
    if (list) list.push(v);
    else variantsByProduct.set(v.product_id, [v]);
  }

  const products: Product[] = [...rows.products]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(({ sort_order: _so, status: _st, ...rest }) => {
      const variants = (variantsByProduct.get(rest.id) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((v) => ({ ref: v.ref, attrs: v.attrs }));
      return { ...rest, variants };
    });

  return {
    manufacturer: statics.manufacturer,
    categories,
    products,
    commercial: statics.commercial,
  };
}
