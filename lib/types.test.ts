import { describe, it, expect } from "vitest";
import { catalogue } from "@/lib/types";

describe("DoMusMat Catalogue data backbone", () => {
  it("1. has 8 categories", () => {
    expect(catalogue.categories).toHaveLength(8);
  });

  it("1b. every category has non-empty name_en and name_zh", () => {
    for (const cat of catalogue.categories) {
      expect(cat.name_en, `category ${cat.id} missing name_en`).toBeTruthy();
      expect(cat.name_zh, `category ${cat.id} missing name_zh`).toBeTruthy();
    }
  });

  it("1c. every product has non-empty name_en and name_zh (with real Chinese characters)", () => {
    const chineseChar = /[一-鿿]/;
    for (const p of catalogue.products) {
      expect(p.name_en, `product ${p.id} missing name_en`).toBeTruthy();
      expect(p.name_zh, `product ${p.id} missing name_zh`).toBeTruthy();
      expect(chineseChar.test(p.name_zh), `product ${p.id} name_zh has no Chinese characters`).toBe(true);
    }
  });

  it("2. has 47 products", () => {
    expect(catalogue.products).toHaveLength(47);
  });

  it("3. every product category is a valid category id", () => {
    const categoryIds = new Set(catalogue.categories.map((c) => c.id));
    for (const product of catalogue.products) {
      expect(categoryIds.has(product.category)).toBe(true);
    }
  });

  it("4. exactly one product has model3d === '/models/high_bay_led_bar.glb'", () => {
    const withModel = catalogue.products.filter(
      (p) => p.model3d === "/models/high_bay_led_bar.glb"
    );
    expect(withModel).toHaveLength(1);
    const withoutModel = catalogue.products.filter(
      (p) => p.model3d !== "/models/high_bay_led_bar.glb"
    );
    for (const p of withoutModel) {
      expect(p.model3d).toBe("PLACEHOLDER");
    }
  });

  it("5. High Bay product has 4 variants including DMJR-TP200W003", () => {
    const highBay = catalogue.products.find(
      (p) => p.id === "barra-led-high-bay"
    );
    expect(highBay).toBeDefined();
    expect(highBay!.variants).toHaveLength(4);
    const refs = highBay!.variants.map((v) => v.ref);
    expect(refs).toContain("DMJR-TP200W003");
  });

  it("6. commercial currency and all unit_prices are PLACEHOLDER", () => {
    expect(catalogue.commercial.currency).toBe("PLACEHOLDER");
    for (const value of Object.values(catalogue.commercial.unit_prices)) {
      expect(value).toBe("PLACEHOLDER");
    }
  });

  it("7. at least one corta-fogo door has a real euroclass.value", () => {
    const cortaFogoProducts = catalogue.products.filter((p) =>
      p.id.includes("corta-fogo")
    );
    expect(cortaFogoProducts.length).toBeGreaterThan(0);
    const withRealEuroclass = cortaFogoProducts.filter(
      (p) => p.compliance.euroclass.value !== "PLACEHOLDER"
    );
    expect(withRealEuroclass.length).toBeGreaterThan(0);
  });

  it("8. product ids are unique; published variant refs are unique across catalogue", () => {
    const ids = catalogue.products.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // Collect all non-PLACEHOLDER refs
    const allRefs: string[] = [];
    for (const product of catalogue.products) {
      for (const variant of product.variants) {
        if (variant.ref !== "PLACEHOLDER") {
          allRefs.push(variant.ref);
        }
      }
    }
    const uniqueRefs = new Set(allRefs);
    expect(uniqueRefs.size).toBe(allRefs.length);
  });
});
