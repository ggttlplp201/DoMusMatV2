import { describe, it, expect } from "vitest";
import { repo } from "@/lib/repository";

describe("ProductRepository", () => {
  it("getCategories() has length 8", () => {
    expect(repo.getCategories()).toHaveLength(8);
  });

  it("getProducts() has length 47", () => {
    expect(repo.getProducts()).toHaveLength(47);
  });

  it("getProduct('barra-led-high-bay') is defined and has 4 variants", () => {
    const product = repo.getProduct("barra-led-high-bay");
    expect(product).toBeDefined();
    expect(product!.variants).toHaveLength(4);
  });

  it("getProduct('does-not-exist') is undefined", () => {
    expect(repo.getProduct("does-not-exist")).toBeUndefined();
  });

  it("findByRef('DMJR-TP200W003') resolves to barra-led-high-bay product and correct variant", () => {
    const result = repo.findByRef("DMJR-TP200W003");
    expect(result).toBeDefined();
    expect(result!.product.id).toBe("barra-led-high-bay");
    expect(result!.variant.ref).toBe("DMJR-TP200W003");
  });

  it("findByRef('NOPE') is undefined", () => {
    expect(repo.findByRef("NOPE")).toBeUndefined();
  });

  it("getProductsByCategory('iluminacao-led') returns 12 products", () => {
    const products = repo.getProductsByCategory("iluminacao-led");
    expect(products).toHaveLength(12);
    products.forEach((p) => expect(p.category).toBe("iluminacao-led"));
  });

  it("getCommercial().currency === 'PLACEHOLDER'", () => {
    expect(repo.getCommercial().currency).toBe("PLACEHOLDER");
  });
});
