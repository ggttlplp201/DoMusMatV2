// Phase 2: swap JsonProductRepository for SupabaseProductRepository (same interface).

import { catalogue } from "@/lib/types";
import type { Catalogue, Category, Product, Variant, Commercial } from "@/lib/types";

export interface ProductRepository {
  getManufacturer(): Catalogue["manufacturer"];
  getCategories(): Category[];
  getProducts(): Product[];
  getProductsByCategory(categoryId: string): Product[];
  getProduct(id: string): Product | undefined; // by product slug id
  findByRef(ref: string): { product: Product; variant: Variant } | undefined; // resolve a variant SKU
  getCommercial(): Commercial;
}

// TODO: confirm reference prefix with client (datasheet DMJR-/DMSL- discrepancy)
// TODO: per-variant GLB models
// Note: High Bay special handling is NOT needed here — the ProductRepository treats all products uniformly.

class JsonProductRepository implements ProductRepository {
  private readonly data: Catalogue;
  private readonly productById: Map<string, Product>;
  private readonly variantByRef: Map<string, { product: Product; variant: Variant }>;

  constructor(data: Catalogue) {
    this.data = data;

    this.productById = new Map<string, Product>();
    this.variantByRef = new Map<string, { product: Product; variant: Variant }>();

    for (const product of data.products) {
      this.productById.set(product.id, product);
      for (const variant of product.variants) {
        this.variantByRef.set(variant.ref, { product, variant });
      }
    }
  }

  getManufacturer(): Catalogue["manufacturer"] {
    return this.data.manufacturer;
  }

  getCategories(): Category[] {
    return this.data.categories;
  }

  getProducts(): Product[] {
    return this.data.products;
  }

  getProductsByCategory(categoryId: string): Product[] {
    return this.data.products.filter((p) => p.category === categoryId);
  }

  getProduct(id: string): Product | undefined {
    return this.productById.get(id);
  }

  findByRef(ref: string): { product: Product; variant: Variant } | undefined {
    return this.variantByRef.get(ref);
  }

  getCommercial(): Commercial {
    return this.data.commercial;
  }
}

export const repo: ProductRepository = new JsonProductRepository(catalogue);
